#!/usr/bin/env node
// Checks a built kitchen sink against its manifest. Reads files only. No dependencies.
// Usage: node verify-sink.mjs <project-dir> [--manifest path] [--json]
// Exit 0 when there are no errors, 1 when there are errors, 2 when it cannot run.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { check as checkTokens } from "./tokens.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(here, "..", "assets", "component-catalog.json"), "utf8"));
const TIER_ORDER = ["starter", "standard", "complete"];
const FOUNDATIONS = ["color", "typography", "spacing", "radius", "elevation", "motion"];

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--manifest");
const root = resolve(positional[0] || ".");
const asJson = args.includes("--json");

function findManifest() {
  const explicit = flag("--manifest");
  if (explicit) return resolve(explicit);
  const direct = join(root, "kitchen-sink.manifest.json");
  if (existsSync(direct)) return direct;
  const SKIP = new Set(["node_modules", ".git", "dist", "build", "target", ".next", ".dart_tool"]);
  const stack = [[root, 0]];
  while (stack.length) {
    const [dir, depth] = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isFile() && entry.name === "kitchen-sink.manifest.json") return full;
      if (entry.isDirectory() && !SKIP.has(entry.name) && depth < 4) stack.push([full, depth + 1]);
    }
  }
  return null;
}

const manifestPath = findManifest();
if (!manifestPath || !existsSync(manifestPath)) {
  console.error(`No kitchen-sink.manifest.json found under ${root}. Write it as described in references/sink-spec.md, then run this again.`);
  process.exit(2);
}
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8").replace(/^﻿/, ""));
} catch (e) {
  console.error(`Manifest is not valid JSON: ${e.message}`);
  process.exit(2);
}

const base = dirname(manifestPath);
const errors = [];
const warnings = [];
const inProject = (p) => resolve(base, p);
const fileExists = (p) => existsSync(inProject(p));
const readProject = (p) => {
  try {
    return readFileSync(inProject(p), "utf8");
  } catch {
    return "";
  }
};

// ---------- Basics ----------
const SCOPES = ["existing", "system"];
const scope = manifest.scope ?? "system";
if (!SCOPES.includes(scope)) errors.push(`scope must be one of ${SCOPES.join(", ")}. Found: ${scope}`);
if (scope === "system" && !TIER_ORDER.includes(manifest.tier)) errors.push(`tier must be one of ${TIER_ORDER.join(", ")}. Found: ${manifest.tier}`);
const entry = manifest.entry || {};
const entryFiles = entry.files || [];
if (!entryFiles.length) errors.push("entry.files must list the files that render the kitchen sink.");
for (const f of entryFiles) if (!fileExists(f)) errors.push(`entry.files points to a missing file: ${f}`);
if (!entry.run) warnings.push("entry.run is empty, so nobody can tell how to open the sink.");
if (!entry.gate) errors.push('entry.gate must say how the sink stays out of production builds, or "none: <reason>".');

// ---------- Foundations ----------
const foundations = manifest.foundations || {};
for (const f of FOUNDATIONS) {
  if (!foundations[f]) errors.push(`Foundation section "${f}" is missing. Set it to true once rendered, or "na: <reason>".`);
}
for (const [name, value] of Object.entries(foundations)) {
  if (typeof value === "string" && !/^na:\s*\S/.test(value)) errors.push(`Foundation "${name}" must be true or "na: <reason>".`);
}

// ---------- Controls ----------
const controls = manifest.controls || {};
for (const c of ["theme", "direction"]) {
  if (controls[c] === undefined || controls[c] === false) errors.push(`Control "${c}" is missing. Set it to true once working, or "na: <reason>".`);
}

// ---------- Compositions ----------
const compositionsNa = typeof manifest.compositions === "string" && /^na:\s*\S/.test(manifest.compositions);
const hasCompositions = Array.isArray(manifest.compositions) && manifest.compositions.length > 0;
if (scope === "existing") {
  if (!compositionsNa && !hasCompositions) errors.push('compositions must list a real screen, or be "na: <reason>".');
} else if (!hasCompositions) {
  errors.push("compositions is empty. Show at least one real screen assembled from the components.");
}

// ---------- Components ----------
const allEntryText = entryFiles.map(readProject).join("\n");
const byId = new Map((manifest.components || []).map((c) => [c.id, c]));
const gaps = new Map((manifest.gaps || []).map((g) => [g.id, g]));
const catalogById = new Map(catalog.components.map((c) => [c.id, c]));
const tierLimit = TIER_ORDER.indexOf(manifest.tier);
const required = scope === "existing"
  ? (manifest.components || []).map((c) => catalogById.get(c.id) || { id: c.id, name: c.name || c.id, states: Object.keys(c.states || {}) })
  : catalog.components.filter((c) => TIER_ORDER.indexOf(c.tier) <= tierLimit);
const SOURCES = ["existing", "generated", "library", "wrapped"];
let covered = 0;

if (scope === "existing") {
  if (required.length === 0) errors.push("components is empty. Existing scope must show what the project has.");
  for (const c of manifest.components || []) {
    if (c.source === "generated") errors.push(`${c.id}: existing scope generates nothing, but this is marked generated. Remove it, or use system scope if the user asked to build one.`);
  }
}

for (const spec of required) {
  const comp = byId.get(spec.id);
  if (!comp) {
    const gap = gaps.get(spec.id);
    if (!gap) errors.push(`${spec.name} (${spec.id}) is in the ${manifest.tier} tier but is neither in components nor in gaps.`);
    else if (!gap.reason) errors.push(`Gap ${spec.id} needs a reason.`);
    continue;
  }
  covered++;
  const prefix = `${spec.name}:`;
  if (!SOURCES.includes(comp.source)) errors.push(`${prefix} source must be one of ${SOURCES.join(", ")}.`);
  if (!catalogById.has(spec.id) && Object.keys(comp.states || {}).length === 0) errors.push(`${prefix} list the states this component has.`);
  if (comp.source !== "library" && !comp.path) errors.push(`${prefix} path is required unless source is "library".`);
  if (comp.path && !fileExists(comp.path)) errors.push(`${prefix} path does not exist: ${comp.path}`);
  if (!comp.marker) {
    errors.push(`${prefix} marker is required. Use a string that only appears when the real component is rendered, such as its import name or class.`);
  } else if (allEntryText && !allEntryText.includes(comp.marker)) {
    errors.push(`${prefix} marker "${comp.marker}" is not in entry.files, so the sink may not be rendering the real component.`);
  }
  const states = comp.states || {};
  for (const state of spec.states) {
    const value = states[state];
    if (value === undefined) errors.push(`${prefix} state "${state}" is not accounted for.`);
    else if (!/^(static|forced|live)$/.test(value) && !/^na:\s*\S/.test(value)) {
      errors.push(`${prefix} state "${state}" must be static, forced, live or "na: <reason>". Found: ${value}`);
    }
  }
  if (spec.variants && !(comp.variants || []).length) errors.push(`${prefix} list its variants, or the closest ones the project has.`);
  // In existing scope a component may simply have no sizes, so only system scope expects them.
  if (scope === "system" && spec.sizes && !(comp.sizes || []).length) warnings.push(`${prefix} no sizes listed, while the catalog expects them.`);
  if (spec.edge && !(comp.edge || []).length) warnings.push(`${prefix} no edge cases listed.`);
}
for (const [id] of gaps) {
  if (byId.has(id)) warnings.push(`${id} is in both components and gaps.`);
}

// ---------- Hard-coded values in generated files ----------
const scannable = new Set([".css", ".scss", ".less", ".tsx", ".jsx", ".ts", ".js", ".vue", ".svelte", ".astro", ".html", ".dart", ".swift", ".kt", ".xaml", ".axaml", ".qml", ".erb", ".heex", ".php", ".razor", ".cshtml", ".py", ".rs", ".go", ".tcss", ".uss"]);
const tokenOutputs = new Set(manifest.tokens?.outputs || []);
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d|\bhsla?\(\s*\d|\bColor\(0x[0-9a-fA-F]+\)|\bColor\.fromRGBO\(|\bUIColor\(red:|\bColor\(red:/g;
const hardcoded = [];
const toScan = (manifest.components || []).filter((c) => c.source === "generated" && c.path).map((c) => c.path).concat(manifest.generatedFiles || []);
function scanFile(path) {
  if (tokenOutputs.has(path) || !scannable.has(extname(path).toLowerCase())) return;
  const text = readProject(path);
  text.split(/\r?\n/).forEach((line, i) => {
    if (/token-exempt/.test(line)) return;
    const stripped = line.replace(/href=["']#[^"']*["']/g, "").replace(/(aria-[a-z]+|id|for|data-[a-z-]+)=["'][^"']*["']/g, "");
    const hits = stripped.match(COLOR_LITERAL);
    if (hits) hardcoded.push(`${path}:${i + 1} ${hits[0]}`);
  });
}
for (const p of new Set(toScan)) {
  const full = inProject(p);
  if (existsSync(full) && statSync(full).isDirectory()) continue;
  scanFile(p);
}
if (hardcoded.length) {
  errors.push(`Hard-coded colours in generated files (use tokens, or mark a deliberate line "token-exempt"):\n    ${hardcoded.slice(0, 20).join("\n    ")}${hardcoded.length > 20 ? `\n    ...and ${hardcoded.length - 20} more` : ""}`);
}

// ---------- Placeholder copy ----------
if (/lorem ipsum/i.test(allEntryText)) errors.push("The sink contains lorem ipsum. Use realistic copy, because real text is what reveals layout problems.");

// ---------- Tokens ----------
if (manifest.tokens?.source) {
  if (!fileExists(manifest.tokens.source)) errors.push(`tokens.source does not exist: ${manifest.tokens.source}`);
  else if (/\.json$/i.test(manifest.tokens.source) && manifest.tokens.format !== "other") {
    try {
      const result = checkTokens(JSON.parse(readProject(manifest.tokens.source)));
      errors.push(...result.errors.map((e) => `Tokens: ${e}`));
    } catch (e) {
      errors.push(`Tokens file cannot be parsed: ${e.message}`);
    }
  }
} else {
  errors.push("tokens.source must point to where the design tokens live.");
}

const report = {
  manifest: manifestPath,
  scope,
  tier: manifest.tier,
  required: required.length,
  covered,
  gaps: required.filter((c) => !byId.has(c.id) && gaps.has(c.id)).map((c) => c.id),
  errors,
  warnings,
  pass: errors.length === 0,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Manifest: ${manifestPath}`);
  console.log(scope === "existing"
    ? `Scope: existing. Components rendered: ${covered}.`
    : `Scope: system. Tier: ${report.tier}. Components rendered: ${covered} of ${required.length}. Declared gaps: ${report.gaps.length}.`);
  for (const w of warnings) console.log(`WARN  ${w}`);
  for (const e of errors) console.log(`FAIL  ${e}`);
  console.log(report.pass ? "PASS: manifest checks passed. This does not replace building and looking at the sink." : `${errors.length} error(s).`);
}
process.exit(report.pass ? 0 : 1);
