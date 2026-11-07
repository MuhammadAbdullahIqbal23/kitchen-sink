#!/usr/bin/env node
// Detects a project's UI stack and prints a JSON report. Reads files only. No dependencies.
// Usage: node detect-stack.mjs [project-dir]

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, basename, resolve, dirname, sep } from "node:path";

const IGNORED = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build", "out", "target", "vendor", "bin", "obj",
  ".next", ".nuxt", ".svelte-kit", ".angular", ".output", ".turbo", ".cache", ".dart_tool", ".gradle",
  ".idea", ".vscode", "Pods", "DerivedData", "__pycache__", ".venv", "venv", "env", "coverage",
  "Library", "Temp", "Binaries", "Intermediate", "Saved", "public", "storybook-static", ".expo",
  // Agent folders. A project-level install puts this skill here, and its files aren't the project's.
  ".claude", ".agents", ".agent", ".cursor", ".codex", ".gemini", ".windsurf", ".opencode", ".continue", ".cline", ".roo", ".kiro", ".goose",
]);
// Files that don't count as project content when deciding whether a folder is empty.
const NOT_CONTENT = /^(\..*|skills-lock\.json|readme(\..*)?|licen[cs]e(\..*)?)$/i;
const MAX_DEPTH = 4;
const MAX_ENTRIES = 30000;

const root = resolve(process.argv[2] || ".");
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`Not a directory: ${root}`);
  process.exit(2);
}

const toPosix = (p) => p.split(sep).join("/");
const rel = (p) => toPosix(relative(root, p)) || ".";
const read = (p) => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
};
const readJson = (p) => {
  try {
    return JSON.parse(read(p).replace(/^﻿/, ""));
  } catch {
    return null;
  }
};

const files = [];
const dirs = [];
let visited = 0;
let truncated = false;
(function walk(dir, depth) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  // Installers use many folder names, so also recognise any installed skill by its SKILL.md.
  if (dir !== root && entries.some((e) => e.isFile() && e.name === "SKILL.md")) return;
  for (const entry of entries) {
    if (++visited > MAX_ENTRIES) {
      truncated = true;
      return;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED.has(entry.name)) continue;
      dirs.push(full);
      if (entry.name.endsWith(".xcodeproj") || entry.name.endsWith(".xcworkspace")) continue;
      if (depth < MAX_DEPTH) walk(full, depth + 1);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
})(root, 0);

const candidates = [];
const add = (adapter, framework, file, evidence, confidence = "high") => {
  candidates.push({
    adapter,
    framework,
    path: rel(dirname(file)),
    manifest: rel(file),
    evidence,
    confidence,
  });
};

const has = (text, re) => re.test(text);
const named = (name) => files.filter((f) => basename(f) === name);
const matching = (re) => files.filter((f) => re.test(basename(f)));

// ---------- JavaScript and TypeScript ----------
const JS_RULES = [
  ["react-native", "expo", ["expo"]],
  ["react-native", "react-native", ["react-native"]],
  ["react", "next", ["next"]],
  ["react", "react-router", ["@remix-run/react", "@react-router/dev"]],
  ["react", "gatsby", ["gatsby"]],
  ["react", "tanstack-start", ["@tanstack/react-start"]],
  ["vue", "nuxt", ["nuxt"]],
  ["vue", "quasar", ["quasar"]],
  ["svelte", "sveltekit", ["@sveltejs/kit"]],
  ["angular", "angular", ["@angular/core"]],
  ["web-other", "astro", ["astro"]],
  ["web-other", "solid", ["solid-js"]],
  ["web-other", "qwik", ["@builder.io/qwik", "@qwik.dev/core"]],
  ["web-other", "lit", ["lit"]],
  ["web-other", "stencil", ["@stencil/core"]],
  ["web-other", "ember", ["ember-source"]],
  ["web-other", "preact", ["preact"]],
  ["web-other", "alpine", ["alpinejs"]],
  ["web-other", "htmx", ["htmx.org"]],
  ["web-other", "email", ["@react-email/components", "react-email", "mjml"]],
  ["terminal", "ink", ["ink"]],
  ["react", "react", ["react"]],
  ["vue", "vue", ["vue"]],
  ["svelte", "svelte", ["svelte"]],
];
const DESKTOP_SHELLS = [
  ["electron", ["electron"]],
  ["tauri", ["@tauri-apps/api", "@tauri-apps/cli"]],
];
const STYLING = {
  tailwindcss: "tailwind", "@tailwindcss/vite": "tailwind", "styled-components": "styled-components",
  "@emotion/react": "emotion", sass: "sass", "sass-embedded": "sass", less: "less",
  "@vanilla-extract/css": "vanilla-extract", unocss: "unocss", "@pandacss/dev": "panda",
  "bootstrap": "bootstrap", nativewind: "nativewind", "@stylexjs/stylex": "stylex",
};
const LIBRARIES = [
  "@mui/material", "@mui/joy", "@chakra-ui/react", "antd", "@mantine/core", "@radix-ui/themes",
  "radix-ui", "@headlessui/react", "@headlessui/vue", "@ark-ui/react", "@ark-ui/vue", "@ark-ui/svelte",
  "react-aria-components", "@base-ui-components/react", "@base-ui/react", "@heroui/react", "@nextui-org/react",
  "vuetify", "primevue", "@nuxt/ui", "element-plus", "naive-ui", "radix-vue", "reka-ui", "@angular/material",
  "primeng", "ng-zorro-antd", "@ng-bootstrap/ng-bootstrap", "@skeletonlabs/skeleton", "bits-ui",
  "melt", "@melt-ui/svelte", "flowbite", "daisyui", "react-bootstrap", "react-native-paper", "tamagui",
  "@gluestack-ui/themed", "@rneui/themed", "@shopify/restyle", "@shopify/polaris", "@fluentui/react-components",
  "@carbon/react", "@adobe/react-spectrum", "semantic-ui-react",
];
const packageJsons = named("package.json");
const styling = new Set();
const libraries = new Set();
const scriptsByPath = {};
let workspaceRoots = [];

for (const file of packageJsons) {
  const pkg = readJson(file);
  if (!pkg) continue;
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  if (pkg.workspaces) workspaceRoots.push(rel(file));
  if (pkg.scripts) scriptsByPath[rel(dirname(file))] = pkg.scripts;
  for (const [dep, style] of Object.entries(STYLING)) if (deps[dep]) styling.add(style);
  for (const lib of LIBRARIES) if (deps[lib]) libraries.add(lib);
  for (const [adapter, framework, names] of JS_RULES) {
    const hit = names.find((n) => deps[n]);
    if (hit) {
      add(adapter, framework, file, [`dependency "${hit}" in package.json`, `version ${deps[hit]}`]);
      break;
    }
  }
  for (const [shell, names] of DESKTOP_SHELLS) {
    const hit = names.find((n) => deps[n]);
    if (hit) add("desktop", shell, file, [`dependency "${hit}"; UI is web, also read the web adapter`], "medium");
  }
}

// ---------- Mobile ----------
for (const file of named("pubspec.yaml")) {
  const text = read(file);
  if (has(text, /^\s*flutter:\s*$/m) || has(text, /sdk:\s*flutter/)) {
    add("flutter", "flutter", file, ["flutter sdk in pubspec.yaml"]);
    if (has(text, /widgetbook/)) libraries.add("widgetbook");
  }
}
for (const dir of dirs.filter((d) => /\.(xcodeproj|xcworkspace)$/.test(d))) {
  add("apple", "xcode", join(dir, "project.pbxproj"), [`Xcode project ${basename(dir)}`]);
}
for (const file of named("Package.swift")) {
  const text = read(file);
  const ui = /\.(iOS|macOS|tvOS|watchOS|visionOS)\(/.test(text);
  add("apple", "swift-package", file, [ui ? "Package.swift with Apple platforms" : "Package.swift"], ui ? "high" : "low");
}
for (const file of matching(/^build\.gradle(\.kts)?$/)) {
  const text = read(file);
  if (has(text, /javafx|org\.openjfx/i)) add("desktop", "javafx", file, ["JavaFX in Gradle build"]);
  else if (has(text, /org\.jetbrains\.compose|compose-multiplatform/)) add("android", "compose-multiplatform", file, ["Compose Multiplatform plugin"]);
  else if (has(text, /compose\s*[=(]\s*true|androidx\.compose|kotlin\.plugin\.compose|plugin\.compose/)) add("android", "jetpack-compose", file, ["Compose in Gradle build"]);
  else if (has(text, /com\.android\.(application|library)|android\s*\{/)) add("android", "android-views", file, ["Android plugin without Compose"], "medium");
}

// ---------- .NET ----------
for (const file of matching(/\.csproj$|\.fsproj$|\.vbproj$/)) {
  const text = read(file);
  if (/<UseWPF>\s*true/i.test(text)) add("desktop", "wpf", file, ["UseWPF in project file"]);
  else if (/<UseMaui>\s*true/i.test(text)) add("desktop", "maui", file, ["UseMaui in project file"]);
  else if (/Microsoft\.WindowsAppSDK/i.test(text)) add("desktop", "winui", file, ["Windows App SDK reference"]);
  else if (/Avalonia/i.test(text)) add("desktop", "avalonia", file, ["Avalonia reference"]);
  else if (/<UseWindowsForms>\s*true/i.test(text)) add("desktop", "winforms", file, ["UseWindowsForms in project file"]);
  else if (/BlazorWebAssembly|Microsoft\.AspNetCore\.Components/i.test(text)) add("server-rendered", "blazor", file, ["Blazor reference"]);
  else if (/Microsoft\.NET\.Sdk\.Web/i.test(text)) add("server-rendered", "aspnet-razor", file, ["Web SDK in project file"]);
}

// ---------- Server-rendered and other languages ----------
for (const file of named("Gemfile")) {
  const text = read(file);
  if (has(text, /['"]rails['"]/)) add("server-rendered", "rails", file, ["rails gem"]);
  if (has(text, /view_component/)) libraries.add("view_component");
  if (has(text, /lookbook/)) libraries.add("lookbook");
}
for (const file of files.filter((f) => /^(requirements.*\.txt|pyproject\.toml|Pipfile)$/.test(basename(f)))) {
  const text = read(file).toLowerCase();
  if (/\bdjango\b/.test(text)) add("server-rendered", "django", file, ["django dependency"]);
  else if (/\bflask\b/.test(text)) add("server-rendered", "flask", file, ["flask dependency"]);
  else if (/\bfastapi\b/.test(text) && /jinja2/.test(text)) add("server-rendered", "fastapi-jinja", file, ["fastapi with jinja2"]);
  if (/\btextual\b/.test(text)) add("terminal", "textual", file, ["textual dependency"]);
  if (/\bpyside[26]?\b|\bpyqt[56]?\b/.test(text)) add("desktop", "qt-python", file, ["Qt for Python dependency"]);
  if (/\bkivy\b/.test(text)) add("desktop", "kivy", file, ["kivy dependency"], "medium");
  if (/\bstreamlit\b|\bgradio\b|\bnicegui\b|\bdash\b/.test(text)) add("unknown", "python-app-framework", file, ["Python app framework; use the unknown-stack protocol"], "medium");
}
for (const file of named("composer.json")) {
  const pkg = readJson(file);
  const deps = { ...pkg?.require, ...pkg?.["require-dev"] };
  if (deps["laravel/framework"]) add("server-rendered", "laravel", file, ["laravel/framework"]);
  else if (deps["symfony/framework-bundle"]) add("server-rendered", "symfony", file, ["symfony/framework-bundle"]);
  if (deps["livewire/livewire"]) libraries.add("livewire");
}
for (const file of named("functions.php")) {
  if (existsSync(join(dirname(file), "style.css"))) add("server-rendered", "wordpress", file, ["theme functions.php with style.css"], "medium");
}
for (const file of files.filter((f) => basename(f) === "theme.liquid")) {
  add("server-rendered", "shopify", file, ["Liquid theme layout"]);
}
for (const file of named("mix.exs")) {
  if (has(read(file), /:phoenix\b/)) add("server-rendered", "phoenix", file, ["phoenix dependency"]);
}
for (const file of named("pom.xml")) {
  const text = read(file);
  if (/thymeleaf/i.test(text)) add("server-rendered", "spring-thymeleaf", file, ["thymeleaf dependency"]);
  else if (/org\.openjfx|javafx/i.test(text)) add("desktop", "javafx", file, ["JavaFX dependency"]);
  else if (/vaadin/i.test(text)) add("unknown", "vaadin", file, ["Vaadin; use the unknown-stack protocol"], "medium");
}
for (const file of named("go.mod")) {
  const text = read(file);
  if (/charmbracelet\/bubbletea/.test(text)) add("terminal", "bubbletea", file, ["bubbletea module"]);
  if (/a-h\/templ/.test(text)) add("server-rendered", "go-templ", file, ["templ module"]);
  if (/wailsapp\/wails|fyne\.io\/fyne/.test(text)) add("desktop", "go-desktop", file, ["wails or fyne module"]);
}
for (const file of named("Cargo.toml")) {
  const text = read(file);
  if (/\bratatui\b/.test(text)) add("terminal", "ratatui", file, ["ratatui crate"]);
  if (/\btauri\b/.test(text)) add("desktop", "tauri", file, ["tauri crate; UI is web, also read the web adapter"], "medium");
  if (/\b(leptos|dioxus|yew)\b/.test(text)) add("web-other", "rust-wasm", file, ["Rust web UI crate"]);
  if (/\b(egui|eframe|iced|slint|gtk4?)\b/.test(text)) add("desktop", "rust-desktop", file, ["Rust desktop UI crate"]);
}
for (const file of named("CMakeLists.txt")) {
  const text = read(file);
  if (/find_package\s*\(\s*Qt/i.test(text)) add("desktop", "qt", file, ["Qt in CMake"]);
  else if (/gtk/i.test(text)) add("desktop", "gtk", file, ["GTK in CMake"], "medium");
}
for (const file of matching(/\.pro$/)) add("desktop", "qt", file, ["qmake project"], "medium");
for (const file of named("meson.build")) {
  if (/gtk/i.test(read(file))) add("desktop", "gtk", file, ["GTK in Meson"]);
}

// ---------- Game engines ----------
for (const file of named("project.godot")) add("game-engine", "godot", file, ["project.godot"]);
for (const file of named("ProjectVersion.txt")) {
  if (basename(dirname(file)) === "ProjectSettings") add("game-engine", "unity", file, ["Unity ProjectSettings"]);
}
for (const file of matching(/\.uproject$/)) add("game-engine", "unreal", file, ["Unreal project file"]);

// ---------- Plain web, used only when nothing else matched ----------
if (candidates.length === 0) {
  const html = files.filter((f) => /\.html?$/i.test(f));
  if (html.length > 0) add("web-other", "html", html[0], [`${html.length} HTML file(s) and no framework manifest`], "medium");
}

// ---------- Rank: high confidence first, then closest to the root ----------
const rank = { high: 0, medium: 1, low: 2 };
const depthOf = (p) => (p === "." ? 0 : p.split("/").length);
candidates.sort((a, b) => rank[a.confidence] - rank[b.confidence] || depthOf(a.path) - depthOf(b.path));
const unique = [];
const seen = new Set();
for (const c of candidates) {
  const key = `${c.adapter}|${c.framework}|${c.path}`;
  if (!seen.has(key)) {
    seen.add(key);
    unique.push(c);
  }
}

// ---------- Token sources ----------
const TOKEN_FILE = /(^|[._-])tokens?([._-]|\.)|^tailwind\.config\.|^unocss\.config\.|^uno\.config\.|^panda\.config\.|^theme\.(ts|tsx|js|mjs|json|dart|kt|swift|css|scss)$|^_?variables\.(css|scss|less)$|^colors\.(ts|js|json|xml|kt|dart|swift)$|^Color\.kt$|^Theme\.kt$|^Type\.kt$|^app_theme\.dart$|^(Colors|Resources|Styles|Themes)\.xaml$|^themes?\.xml$|^components\.json$|^(_tokens|globals?|app|index|main)\.(css|scss)$/i;
const tokenSources = files
  .filter((f) => TOKEN_FILE.test(basename(f)))
  .map((f) => {
    const name = basename(f);
    if (/^(globals?|app|index|main)\.(css|scss)$/i.test(name) && !/--[\w-]+\s*:|@theme|\$[\w-]+\s*:/.test(read(f))) return null;
    return rel(f);
  })
  .filter(Boolean)
  .concat(dirs.filter((d) => d.endsWith(".xcassets")).map(rel))
  .slice(0, 40);

// ---------- Existing showcases ----------
const showcase = [];
if (dirs.some((d) => basename(d) === ".storybook")) showcase.push("storybook");
if (files.some((f) => /\.stories\.\w+$/.test(f))) showcase.push("stories");
if (files.some((f) => /^histoire\.config/.test(basename(f)))) showcase.push("histoire");
if (dirs.some((d) => basename(d) === ".ladle")) showcase.push("ladle");
if (libraries.has("widgetbook")) showcase.push("widgetbook");
if (libraries.has("lookbook")) showcase.push("lookbook");
const sinkHits = files.filter((f) => /kitchen[-_ ]?sink|style[-_ ]?guide|component[-_ ]?gallery/i.test(toPosix(relative(root, f))));
if (sinkHits.length) showcase.push(...sinkHits.slice(0, 5).map(rel));
const manifest = files.find((f) => basename(f) === "kitchen-sink.manifest.json");

// ---------- Component folders ----------
const COMPONENT_DIR = /^(components?|ui|widgets?|views?|primitives|design-?system|ds|atoms|molecules|organisms|shared|Controls|Views|composables)$/i;
const SOURCE_FILE = /\.(tsx|jsx|vue|svelte|astro|ts|js|dart|swift|kt|xaml|axaml|razor|erb|blade\.php|heex|html|qml|cs|py|rs|go)$/i;
const componentDirs = dirs
  .filter((d) => COMPONENT_DIR.test(basename(d)))
  .map((d) => ({
    path: rel(d),
    files: files.filter((f) => f.startsWith(d + sep) && SOURCE_FILE.test(f)).length,
  }))
  .filter((d) => d.files > 0)
  .sort((a, b) => b.files - a.files)
  .slice(0, 12);

// ---------- Tooling ----------
const rootHas = (n) => existsSync(join(root, n));
const packageManager = rootHas("bun.lockb") || rootHas("bun.lock") ? "bun"
  : rootHas("pnpm-lock.yaml") ? "pnpm"
  : rootHas("yarn.lock") ? "yarn"
  : rootHas("package-lock.json") ? "npm"
  : packageJsons.length ? "npm"
  : null;
const monorepo = workspaceRoots.length > 0 || ["pnpm-workspace.yaml", "turbo.json", "nx.json", "melos.yaml", "lerna.json"].some(rootHas);

const primary = unique[0] || null;
const distinctApps = new Set(unique.filter((c) => c.confidence === "high").map((c) => c.path));

const report = {
  root: toPosix(root),
  empty: files.every((f) => NOT_CONTENT.test(basename(f))),
  primary,
  candidates: unique,
  ambiguous: distinctApps.size > 1,
  adapterFile: primary ? `references/stacks/${primary.adapter === "unknown" ? "../unknown-stack" : primary.adapter}.md` : null,
  styling: [...styling],
  componentLibraries: [...libraries],
  shadcn: files.some((f) => basename(f) === "components.json"),
  tokenSources,
  existingShowcase: [...new Set(showcase)],
  existingManifest: manifest ? rel(manifest) : null,
  componentDirs,
  monorepo,
  packageManager,
  scripts: primary ? scriptsByPath[primary.path] || null : null,
  truncated,
};
if (report.adapterFile) report.adapterFile = report.adapterFile.replace("stacks/../", "");

console.log(JSON.stringify(report, null, 2));
