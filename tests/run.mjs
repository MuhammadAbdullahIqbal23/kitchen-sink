// Tests for the skill's helper scripts. No dependencies. Run: node tests/run.mjs
import { mkdirSync, writeFileSync, rmSync, mkdtempSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { generate, check, flatten, toCss, contrast } from "../skills/kitchen-sink/scripts/tokens.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scripts = resolve(here, "../skills/kitchen-sink/scripts");
const catalog = JSON.parse(readFileSync(resolve(here, "../skills/kitchen-sink/assets/component-catalog.json"), "utf8"));

let passed = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ---------- Tokens: every brand colour must produce an accessible system ----------
function colourSweep() {
  const out = ["#000000", "#ffffff", "#808080", "#ffff00", "#00ff00", "#00ffff", "#ff00ff", "#ff0000", "#0000ff", "#111111", "#eeeeee", "#fafafa", "#ffd600", "#7f7f00", "#767676", "#777777"];
  for (let r = 0; r <= 255; r += 51) for (let g = 0; g <= 255; g += 51) for (let b = 0; b <= 255; b += 51) {
    out.push("#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join(""));
  }
  return out;
}
const sweep = colourSweep();
test(`token generation passes contrast for ${sweep.length} brand colours`, () => {
  const bad = [];
  for (const primary of sweep) {
    const result = check(generate({ primary }).tokens);
    if (!result.ok) bad.push(`${primary}: ${result.errors[0]}`);
  }
  assert(bad.length === 0, `${bad.length} failed. First: ${bad.slice(0, 8).join(" | ")}`);
});
test("brand colour appears exactly as supplied", () => {
  for (const primary of ["#4f46e5", "#e11d48", "#ffd600", "#0f172a"]) {
    const flat = flatten(generate({ primary }).tokens);
    assert(flat.light["color.action.primary.bg"] === primary, `${primary} became ${flat.light["color.action.primary.bg"]}`);
  }
});
test("hover and active differ from rest in both modes", () => {
  for (const primary of sweep.slice(0, 60)) {
    const flat = flatten(generate({ primary }).tokens);
    for (const mode of ["light", "dark"]) {
      const get = (k) => flat[mode][`color.action.primary.${k}`] ?? flat.light[`color.action.primary.${k}`];
      assert(get("bg") !== get("bgHover"), `${primary} ${mode}: hover equals rest`);
      assert(get("bgHover") !== get("bgActive"), `${primary} ${mode}: active equals hover`);
    }
  }
});
test("custom feedback colours and options are honoured", () => {
  const { tokens } = generate({ primary: "#2255aa", danger: "#b00020", radius: "pill", density: "compact", "font-sans": "Inter" });
  const flat = flatten(tokens);
  assert(Object.values(flat.light).includes("#b00020") || JSON.stringify(tokens).includes("#b00020"), "danger colour missing");
  assert(flat.light["radius.control"] === "9999px", "pill radius not applied");
  assert(flat.light["size.control.md"] === "32px", "density not applied");
  assert(flat.light["font.family.sans"].startsWith("Inter"), "font not applied");
});
test("danger stays apart from a red brand", () => {
  const rgbHue = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
    if (d === 0) return 0;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const gap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  for (const primary of ["#e11d48", "#dc2626", "#ef4444", "#b91c1c", "#ea580c", "#c2410c", "#ff0000", "#be123c"]) {
    const { tokens, warnings } = generate({ primary });
    const flat = flatten(tokens);
    const danger = flat.light["color.action.danger.bg"];
    assert(gap(rgbHue(primary), rgbHue(danger)) >= 15, `${primary} vs danger ${danger} are too close in hue`);
    assert(warnings.some((w) => w.includes("danger")), `${primary}: no warning about moving danger`);
  }
  const blue = generate({ primary: "#2563eb" });
  assert(!blue.warnings.some((w) => w.includes("danger")), "blue brand should not move danger");
  const own = flatten(generate({ primary: "#e11d48", danger: "#7f1d1d" }).tokens);
  assert(JSON.stringify(own).includes("#7f1d1d"), "supplied danger was ignored");
});
test("invalid input is rejected", () => {
  let threw = false;
  try {
    generate({ primary: "blue" });
  } catch {
    threw = true;
  }
  assert(threw, "accepted a non-hex primary");
});
test("check catches broken aliases, cycles, and bad contrast", () => {
  const base = generate({ primary: "#4f46e5" }).tokens;
  const broken = structuredClone(base);
  broken.color.text.default.$value = "{color.nope}";
  assert(check(broken).errors.some((e) => e.includes("Broken alias")), "broken alias missed");
  const cycle = structuredClone(base);
  cycle.color.text.default.$value = "{color.text.muted}";
  cycle.color.text.muted.$value = "{color.text.default}";
  assert(check(cycle).errors.some((e) => e.includes("Circular")), "cycle missed");
  const low = structuredClone(base);
  low.color.text.default.$value = "{color.palette.neutral.200}";
  assert(check(low).errors.some((e) => e.includes("Contrast")), "low contrast missed");
  const missing = structuredClone(base);
  delete missing.color.border;
  assert(check(missing).errors.some((e) => e.includes("color.border.focus")), "missing token missed");
});
test("flatten produces usable CSS with dark overrides", () => {
  const css = toCss(flatten(generate({ primary: "#4f46e5" }).tokens));
  for (const needle of [":root", '[data-theme="dark"]', "--color-bg-canvas:", "--typography-h1-font-size:", "--shadow-md:", "--motion-easing-standard: cubic-bezier", "--color-action-primary-bg-hover:"]) {
    assert(css.includes(needle), `missing ${needle}`);
  }
  assert(!css.includes("[object Object]"), "object leaked into CSS");
  assert(!css.includes("undefined"), "undefined leaked into CSS");
});
test("contrast matches known WCAG values", () => {
  assert(Math.abs(contrast("#000000", "#ffffff") - 21) < 0.01, "black on white");
  assert(Math.abs(contrast("#767676", "#ffffff") - 4.54) < 0.02, "#767676 on white");
});

// ---------- Catalog ----------
test("catalog is well formed", () => {
  const ids = new Set();
  const tiers = Object.keys(catalog.tiers);
  for (const c of catalog.components) {
    assert(!ids.has(c.id), `duplicate id ${c.id}`);
    ids.add(c.id);
    assert(tiers.includes(c.tier), `bad tier on ${c.id}`);
    assert(c.states?.length, `no states on ${c.id}`);
    assert(c.a11y, `no a11y note on ${c.id}`);
    for (const s of c.states) assert(catalog.stateDefinitions[s], `${c.id} uses undefined state ${s}`);
  }
});

// ---------- Stack detection ----------
const work = mkdtempSync(join(tmpdir(), "kitchen-sink-test-"));
function fixture(name, files) {
  const dir = join(work, name);
  mkdirSync(dir, { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}
function detect(dir) {
  const run = spawnSync(process.execPath, [join(scripts, "detect-stack.mjs"), dir], { encoding: "utf8" });
  assert(run.status === 0, run.stderr);
  return JSON.parse(run.stdout);
}
const pkg = (deps, extra = {}) => JSON.stringify({ dependencies: deps, ...extra });
const CASES = [
  ["react-vite", { "package.json": pkg({ react: "19", "react-dom": "19" }) }, "react", "react"],
  ["nextjs", { "package.json": pkg({ next: "16", react: "19" }) }, "react", "next"],
  ["remix", { "package.json": pkg({ "@remix-run/react": "2", react: "19" }) }, "react", "react-router"],
  ["expo", { "package.json": pkg({ expo: "54", react: "19", "react-native": "0.81" }) }, "react-native", "expo"],
  ["rn", { "package.json": pkg({ react: "19", "react-native": "0.81" }) }, "react-native", "react-native"],
  ["vue", { "package.json": pkg({ vue: "3" }) }, "vue", "vue"],
  ["nuxt", { "package.json": pkg({ nuxt: "4", vue: "3" }) }, "vue", "nuxt"],
  ["svelte", { "package.json": pkg({ "@sveltejs/kit": "2", svelte: "5" }) }, "svelte", "sveltekit"],
  ["angular", { "package.json": pkg({ "@angular/core": "20" }) }, "angular", "angular"],
  ["astro", { "package.json": pkg({ astro: "5" }) }, "web-other", "astro"],
  ["solid", { "package.json": pkg({ "solid-js": "1" }) }, "web-other", "solid"],
  ["lit", { "package.json": pkg({ lit: "3" }) }, "web-other", "lit"],
  ["html", { "index.html": "<!doctype html>" }, "web-other", "html"],
  ["ink", { "package.json": pkg({ ink: "6", react: "19" }) }, "terminal", "ink"],
  ["flutter", { "pubspec.yaml": "name: a\ndependencies:\n  flutter:\n    sdk: flutter\n" }, "flutter", "flutter"],
  ["swiftui", { "App.xcodeproj/project.pbxproj": "x" }, "apple", "xcode"],
  ["compose", { "app/build.gradle.kts": "android { buildFeatures { compose = true } }" }, "android", "jetpack-compose"],
  ["android-views", { "app/build.gradle": "plugins { id 'com.android.application' }" }, "android", "android-views"],
  ["cmp", { "build.gradle.kts": 'plugins { id("org.jetbrains.compose") }' }, "android", "compose-multiplatform"],
  ["wpf", { "A.csproj": "<Project><PropertyGroup><UseWPF>true</UseWPF></PropertyGroup></Project>" }, "desktop", "wpf"],
  ["maui", { "A.csproj": "<Project><PropertyGroup><UseMaui>true</UseMaui></PropertyGroup></Project>" }, "desktop", "maui"],
  ["blazor", { "A.csproj": '<Project Sdk="Microsoft.NET.Sdk.BlazorWebAssembly"></Project>' }, "server-rendered", "blazor"],
  ["razor", { "A.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>' }, "server-rendered", "aspnet-razor"],
  ["rails", { Gemfile: "gem 'rails'" }, "server-rendered", "rails"],
  ["django", { "requirements.txt": "Django==5" }, "server-rendered", "django"],
  ["flask", { "pyproject.toml": 'dependencies = ["flask"]' }, "server-rendered", "flask"],
  ["laravel", { "composer.json": JSON.stringify({ require: { "laravel/framework": "12" } }) }, "server-rendered", "laravel"],
  ["phoenix", { "mix.exs": "{:phoenix, \"~> 1.8\"}" }, "server-rendered", "phoenix"],
  ["spring", { "pom.xml": "<artifactId>spring-boot-starter-thymeleaf</artifactId>" }, "server-rendered", "spring-thymeleaf"],
  ["wordpress", { "functions.php": "<?php", "style.css": "/* Theme Name: x */" }, "server-rendered", "wordpress"],
  ["shopify", { "layout/theme.liquid": "x" }, "server-rendered", "shopify"],
  ["templ", { "go.mod": "require github.com/a-h/templ v0.3" }, "server-rendered", "go-templ"],
  ["textual", { "requirements.txt": "textual==1" }, "terminal", "textual"],
  ["ratatui", { "Cargo.toml": 'ratatui = "0.29"' }, "terminal", "ratatui"],
  ["bubbletea", { "go.mod": "require github.com/charmbracelet/bubbletea v1" }, "terminal", "bubbletea"],
  ["qt", { "CMakeLists.txt": "find_package(Qt6 REQUIRED)" }, "desktop", "qt"],
  ["pyside", { "requirements.txt": "PySide6" }, "desktop", "qt-python"],
  ["gtk", { "meson.build": "dependency('gtk4')" }, "desktop", "gtk"],
  ["javafx", { "pom.xml": "<groupId>org.openjfx</groupId>" }, "desktop", "javafx"],
  ["godot", { "project.godot": "x" }, "game-engine", "godot"],
  ["unity", { "ProjectSettings/ProjectVersion.txt": "x" }, "game-engine", "unity"],
  ["unreal", { "Game.uproject": "{}" }, "game-engine", "unreal"],
  ["streamlit", { "requirements.txt": "streamlit" }, "unknown", "python-app-framework"],
];
for (const [name, files, adapter, framework] of CASES) {
  test(`detect ${name}`, () => {
    const report = detect(fixture(name, files));
    assert(report.primary?.adapter === adapter, `adapter ${report.primary?.adapter}, wanted ${adapter}`);
    assert(report.primary?.framework === framework, `framework ${report.primary?.framework}, wanted ${framework}`);
    const adapterPath = resolve(scripts, "..", report.adapterFile);
    readFileSync(adapterPath);
  });
}
test("detect handles empty and unknown projects", () => {
  const empty = detect(fixture("empty", {}));
  assert(empty.empty === true && empty.primary === null, "empty project misreported");
  const odd = detect(fixture("odd", { "main.zig": "const std = @import(\"std\");" }));
  assert(odd.empty === false && odd.primary === null, "unknown project misreported");
});
test("detect ignores this skill when it's installed inside the project", () => {
  const installed = {
    "SKILL.md": "---\nname: kitchen-sink\n---\n",
    "references/tokens.md": "x",
    "scripts/tokens.mjs": "x",
    "assets/component-catalog.json": "{}",
    "references/sink-spec.md": "kitchen sink",
    "evals/case/files/package.json": pkg({ react: "19" }),
  };
  const withSkill = (extra) => {
    const files = { "skills-lock.json": "{}", ".gitignore": "x", ...extra };
    for (const [path, text] of Object.entries(installed)) {
      files[`.claude/skills/kitchen-sink/${path}`] = text;
      files[`.agents/skills/kitchen-sink/${path}`] = text;
      files[`agent/skills/kitchen-sink/${path}`] = text;
    }
    return files;
  };
  const empty = detect(fixture("installed-empty", withSkill({})));
  assert(empty.empty === true, "project with only the skill should count as empty");
  assert(empty.primary === null, `primary ${JSON.stringify(empty.primary)}`);
  assert(empty.tokenSources.length === 0, `tokens ${empty.tokenSources}`);
  assert(empty.existingShowcase.length === 0, `showcase ${empty.existingShowcase}`);
  const real = detect(fixture("installed-real", withSkill({ "package.json": pkg({ vue: "3" }), "src/tokens.css": "x" })));
  assert(real.empty === false && real.primary?.framework === "vue", "real project should still be detected");
  assert(real.tokenSources.join() === "src/tokens.css", `tokens ${real.tokenSources}`);
  assert(real.existingShowcase.length === 0, `showcase ${real.existingShowcase}`);
});
test("detect still counts a folder with real content as not empty", () => {
  assert(detect(fixture("readme-only", { "README.md": "x", "LICENSE": "x" })).empty === true, "README and LICENSE alone are empty");
  assert(detect(fixture("notes", { "README.md": "x", "notes.txt": "x" })).empty === false, "other files are content");
});
test("detect ignores node_modules and survives bad manifests", () => {
  const dir = fixture("noise", { "node_modules/x/package.json": pkg({ next: "1" }), "package.json": "{not json", "pubspec.yaml": "flutter:\n  uses: true\n" });
  const report = detect(dir);
  assert(report.primary?.adapter === "flutter", `got ${report.primary?.adapter}`);
});
test("detect finds styling, libraries, tokens, showcases, and component folders", () => {
  const report = detect(fixture("rich", {
    "package.json": pkg({ next: "16", react: "19", tailwindcss: "4", "@mui/material": "7" }),
    "tailwind.config.ts": "x",
    "src/styles/tokens.json": "{}",
    "src/app/globals.css": ":root { --brand: #fff; }",
    ".storybook/main.ts": "x",
    "src/components/Button.tsx": "x",
    "src/components/Input.tsx": "x",
    "components.json": "{}",
    "pnpm-lock.yaml": "",
  }));
  assert(report.styling.includes("tailwind"), "tailwind");
  assert(report.componentLibraries.includes("@mui/material"), "mui");
  assert(report.tokenSources.includes("tailwind.config.ts"), "tailwind config");
  assert(report.tokenSources.includes("src/styles/tokens.json"), "tokens.json");
  assert(report.tokenSources.includes("src/app/globals.css"), "globals.css");
  assert(report.existingShowcase.includes("storybook"), "storybook");
  assert(report.componentDirs[0]?.path === "src/components", "component dir");
  assert(report.shadcn === true, "shadcn");
  assert(report.packageManager === "pnpm", "package manager");
});
test("detect flags a monorepo with several apps", () => {
  const report = detect(fixture("mono", {
    "package.json": JSON.stringify({ workspaces: ["apps/*"] }),
    "apps/web/package.json": pkg({ next: "16", react: "19" }),
    "apps/mobile/package.json": pkg({ expo: "54", react: "19", "react-native": "0.81" }),
  }));
  assert(report.monorepo === true, "monorepo");
  assert(report.ambiguous === true, "ambiguous");
  assert(report.candidates.length === 2, `candidates ${report.candidates.length}`);
});

// ---------- Verifier ----------
function verify(dir) {
  const run = spawnSync(process.execPath, [join(scripts, "verify-sink.mjs"), dir, "--json"], { encoding: "utf8" });
  return { status: run.status, report: run.stdout ? JSON.parse(run.stdout) : null, stderr: run.stderr };
}
function goodManifest() {
  const starter = catalog.components.filter((c) => c.tier === "starter");
  return {
    tier: "starter",
    entry: { files: ["sink.html"], run: "open sink.html", gate: "none: static file outside the deployed folder" },
    tokens: { source: "tokens.json", outputs: ["tokens.css"] },
    foundations: { color: true, typography: true, spacing: true, radius: true, elevation: true, motion: true },
    controls: { theme: true, direction: true },
    compositions: ["Sign-in form"],
    generatedFiles: ["c.css"],
    components: starter.map((c) => ({
      id: c.id,
      source: "generated",
      path: "c.css",
      marker: `ks-${c.id}`,
      variants: c.variants || [],
      sizes: c.sizes || [],
      edge: c.edge || [],
      states: Object.fromEntries(c.states.map((s) => [s, "static"])),
    })),
    gaps: [],
  };
}
function sinkFixture(name, mutate = () => {}, overrides = {}) {
  const manifest = goodManifest();
  mutate(manifest);
  const html = catalog.components.filter((c) => c.tier === "starter").map((c) => `<div class="ks-${c.id}"></div>`).join("\n");
  return fixture(name, {
    "kitchen-sink.manifest.json": JSON.stringify(manifest),
    "sink.html": html,
    "c.css": ".a { color: var(--color-text-default); }",
    "tokens.json": JSON.stringify(generate({ primary: "#4f46e5" }).tokens),
    "tokens.css": ":root { --x: #fff; }",
    ...overrides,
  });
}
test("verify passes a complete sink", () => {
  const { status, report } = verify(sinkFixture("good"));
  assert(status === 0, JSON.stringify(report?.errors));
  assert(report.covered === report.required, "coverage count");
});
const VERIFY_FAILS = [
  ["missing component", (m) => m.components.shift(), {}, "neither in components nor in gaps"],
  ["fake render", () => {}, { "sink.html": "<p>nothing real here</p>" }, "may not be rendering the real component"],
  ["unaccounted state", (m) => delete m.components[0].states.hover, {}, 'state "hover"'],
  ["bare na", (m) => (m.components[0].states.hover = "na"), {}, "must be static"],
  ["hard-coded colour", () => {}, { "c.css": ".a { color: #ff0000; }" }, "Hard-coded colours"],
  ["modern colour literal", () => {}, { "c.css": ".a { color: oklch(62% 0.19 250); }" }, "Hard-coded colours"],
  ["computed decorative colour", (m) => m.generatedFiles.push("decor.js"), { "decor.js": "tile.style.background = `hsl(${hash(name) % 360} 70% 50%)`;" }, "Hard-coded colours"],
  ["lorem ipsum", () => {}, { "sink.html": catalog.components.filter((c) => c.tier === "starter").map((c) => `ks-${c.id}`).join(" ") + " Lorem ipsum" }, "lorem ipsum"],
  ["no gate", (m) => delete m.entry.gate, {}, "entry.gate"],
  ["no foundations", (m) => delete m.foundations.motion, {}, 'Foundation section "motion"'],
  ["no compositions", (m) => (m.compositions = []), {}, "compositions is empty"],
  ["missing rtl", (m) => delete m.controls.direction, {}, 'Control "direction"'],
  ["bad tokens", () => {}, { "tokens.json": "{}" }, "Missing required token"],
  ["reasonless gap", (m) => { m.gaps = [{ id: m.components.shift().id }]; }, {}, "needs a reason"],
];
for (const [name, mutate, overrides, expected] of VERIFY_FAILS) {
  test(`verify rejects ${name}`, () => {
    const { status, report } = verify(sinkFixture(`bad-${name.replace(/\W/g, "-")}`, mutate, overrides));
    assert(status === 1, `exit ${status}`);
    assert(report.errors.some((e) => e.includes(expected)), `wanted "${expected}", got ${JSON.stringify(report.errors).slice(0, 300)}`);
  });
}
test("verify accepts colours derived from tokens", () => {
  const { status, report } = verify(sinkFixture("derived-colour", (m) => m.generatedFiles.push("decor.js"), {
    "c.css": ".a { background: color-mix(in oklch, var(--color-bg-surface) 80%, transparent); color: oklch(from var(--color-text-default) l c h); border-color: rgb(var(--brand-rgb)); }",
    "decor.js": "const decor = (name, entries) => entries[hash(name) % entries.length];\ntile.style.setProperty('--decor', `var(${decor(tile.id, entries)})`);",
  }));
  assert(status === 0, JSON.stringify(report?.errors));
});
test("verify accepts honest na and gaps", () => {
  const { status, report } = verify(sinkFixture("honest", (m) => {
    m.components[0].states.hover = "na: touch only";
    m.gaps = [{ id: m.components.pop().id, reason: "no such widget on this platform" }];
    m.controls.direction = "na: app ships in English only";
  }));
  assert(status === 0, JSON.stringify(report?.errors));
  assert(report.gaps.length === 1, "gap count");
});
function existingManifest(mutate = () => {}) {
  const manifest = {
    scope: "existing",
    entry: { files: ["sink.html"], run: "open sink.html", gate: "dev only route" },
    tokens: { source: "theme.css", format: "other" },
    foundations: { color: true, typography: true, spacing: "na: project defines none", radius: "na: project defines none", elevation: "na: project defines none", motion: "na: project defines none" },
    controls: { theme: "na: light only", direction: "na: English only" },
    compositions: "na: only one widget",
    components: [
      { id: "button", source: "existing", path: "c.css", marker: "AppButton", variants: ["solid"], sizes: ["md"], edge: ["long label"],
        states: { default: "static", hover: "live", focus: "live", active: "live", disabled: "static", loading: "static" } },
      { id: "trail-map", name: "Trail Map", source: "existing", path: "c.css", marker: "TrailMap", states: { default: "static", empty: "static" } },
    ],
  };
  mutate(manifest);
  return manifest;
}
function existingFixture(name, mutate) {
  return fixture(name, {
    "kitchen-sink.manifest.json": JSON.stringify(existingManifest(mutate)),
    "sink.html": "AppButton TrailMap",
    "c.css": ".a {}",
    "theme.css": ":root { --x: 1px; }",
  });
}
test("verify existing scope passes one real widget and needs no tier or gaps", () => {
  const { status, report } = verify(existingFixture("existing-good"));
  assert(status === 0, JSON.stringify(report?.errors));
  assert(report.covered === 2, `covered ${report.covered}`);
  assert(report.scope === "existing", "scope not reported");
});
const EXISTING_FAILS = [
  ["generated component", (m) => (m.components[0].source = "generated"), "generates nothing"],
  ["no components", (m) => (m.components = []), "components is empty"],
  ["unaccounted catalog state", (m) => delete m.components[0].states.hover, 'state "hover"'],
  ["custom component without states", (m) => (m.components[1].states = {}), "list the states"],
  ["fake render", (m) => (m.components[0].marker = "Nope"), "may not be rendering"],
  ["empty compositions", (m) => (m.compositions = []), "compositions must list"],
  ["unknown scope", (m) => (m.scope = "everything"), "scope must be"],
];
for (const [name, mutate, expected] of EXISTING_FAILS) {
  test(`verify existing scope rejects ${name}`, () => {
    const { status, report } = verify(existingFixture(`existing-${name.replace(/\W/g, "-")}`, mutate));
    assert(status === 1, `exit ${status}`);
    assert(report.errors.some((e) => e.includes(expected)), `wanted "${expected}", got ${JSON.stringify(report.errors).slice(0, 300)}`);
  });
}
test("verify treats a manifest with no scope as system", () => {
  const { status, report } = verify(sinkFixture("no-scope", (m) => m.components.shift()));
  assert(status === 1 && report.scope === "system", "missing scope should behave as system");
});
test("verify reports a missing manifest with exit 2", () => {
  const { status } = verify(fixture("nomanifest", { "a.txt": "x" }));
  assert(status === 2, `exit ${status}`);
});

rmSync(work, { recursive: true, force: true });

for (const f of failures) console.log(`FAIL ${f}`);
console.log(`${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
