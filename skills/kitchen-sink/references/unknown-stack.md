# Unknown stacks and manual detection

The skill should work on any stack, including ones invented after it was written. The sink's contract in `sink-spec.md` doesn't depend on a framework. Only the way you express it changes.

## Manual detection, when Node is unavailable

Look at the project root and up to a few levels below it. Skip dependency and build folders.

| Find this | Containing or meaning | Adapter |
| --- | --- | --- |
| `package.json` | `expo` or `react-native` | `react-native` |
| | `next`, `react`, `gatsby`, `@remix-run/react` | `react` |
| | `nuxt`, `vue`, `quasar` | `vue` |
| | `@sveltejs/kit`, `svelte` | `svelte` |
| | `@angular/core` | `angular` |
| | `astro`, `solid-js`, `lit`, `@stencil/core`, `ember-source`, `preact`, `alpinejs`, `htmx.org` | `web-other` |
| | `ink` | `terminal` |
| | `electron`, `@tauri-apps/api` | `desktop` plus the web adapter |
| `pubspec.yaml` | flutter | `flutter` |
| `*.xcodeproj`, `Package.swift` | | `apple` |
| `build.gradle(.kts)` | Android plugin or Compose | `android` |
| `*.csproj` | WPF, MAUI, WinUI, Avalonia, WinForms | `desktop` |
| | Blazor, Web SDK | `server-rendered` |
| `Gemfile`, `composer.json`, `mix.exs`, `manage.py`, `pom.xml` with Thymeleaf | Rails, Laravel, Symfony, Phoenix, Django, Flask, Spring | `server-rendered` |
| `theme.liquid`; `functions.php` with `style.css` | Shopify, WordPress | `server-rendered` |
| `go.mod` | `bubbletea` / `templ` / `wails` or `fyne` | `terminal` / `server-rendered` / `desktop` |
| `Cargo.toml` | `ratatui` / `leptos`, `dioxus`, `yew` / `egui`, `iced`, `slint` | `terminal` / `web-other` / `desktop` |
| `requirements.txt`, `pyproject.toml` | `textual` / `pyside`, `pyqt` | `terminal` / `desktop` |
| `CMakeLists.txt`, `*.pro`, `meson.build` | Qt, GTK | `desktop` |
| `project.godot`, `ProjectSettings/`, `*.uproject` | Godot, Unity, Unreal | `game-engine` |
| Only `.html` files | | `web-other` |

## Protocol for a stack with no adapter

Work through these in order. Keep notes as you go, because they are the raw material for a new adapter.

### 1. Understand how UI is built here

Answer these from the project's code and the framework's official docs (search for them if you have web access). Prefer docs for the installed version:

1. What is a reusable UI unit (component, widget, partial, view, control)?
2. How does styling or theming work? Where would design tokens live?
3. How do you add a screen or page?
4. How do you run it locally, and how do you build it?
5. How do you exclude something from a release build? Prefer a build-time mechanism over a check at run time, which usually still ships the code.

### 2. Find the nearest adapter and read it

Borrow the closest approach:

| Your stack resembles | Read |
| --- | --- |
| Component framework that renders to the DOM | `web-other` |
| HTML templates rendered on a server | `server-rendered` |
| Declarative native UI | `flutter` or `apple` |
| Retained-mode desktop toolkit | `desktop` |
| Character-cell UI | `terminal` |
| Scene-based UI | `game-engine` |

### 3. Map the contract

Fill this in before writing code, and show it to the user with the plan:

| Contract item | In this stack |
| --- | --- |
| Tokens become | |
| Sink lives at | |
| Excluded from production by | |
| Theme switching uses | |
| Right-to-left or locale switching uses | |
| Hover and focus can be forced by | |
| Tiles, frames and their feedback are built from | |
| Build and test commands | |

### 4. Adapt the catalog

Not every component exists everywhere. A low-code platform might provide only ten, and a terminal has no tooltips. Render what exists, and put each other component in `gaps` with its reason. Mark platform-impossible states as `na: <reason>`.

Some platforms can't express parts of the contract. Don't force them. Where the manifest can't apply, for example a hosted no-code tool with no files, deliver the closest honest result, such as a step-by-step build list, and say so.

### 5. Verify and report

Follow `verify.md`. Level 1 still works on any stack with a manifest, because it only reads text.

### 6. Offer to contribute

Tell the user the contract table can become a new adapter in this skill's repository, and offer to draft it. See `CONTRIBUTING.md` in the repository for the format.
