# Kitchen Sink

An [Agent Skill](https://agentskills.io) that builds a kitchen sink for any tech stack: one living page or screen showing every design token, component, variant, size and state of a design system.

You say something like "show me all my components in one place". The agent then:

1. **Detects your stack** from the project's files.
2. **Decides the scope** from what you asked for:
   - **Show what exists:** "show our components" gets a page of your own UI in every state it supports. Nothing new is generated, and your theme and component files are left alone.
   - **Build a system:** "start a design system" or an empty folder gets tokens and a tier of components, generated in your project's own conventions.
3. **Asks at most five questions**, and only about what it couldn't work out. Give it one brand colour and it can build the rest.
4. **Builds the sink** with theme and right-to-left controls, every state on show, and real screens composed from the parts.
5. **Verifies it**, then tells you what ran, what didn't, and what's still missing.

See [examples/html-starter](examples/html-starter) for a real result. Open its `index.html` in a browser.

## Install

The skill is the folder [`skills/kitchen-sink`](skills/kitchen-sink).

**Claude Code:** install it with the community installer, adding `-g` to install for all your projects.

```bash
npx skills add MuhammadAbdullahIqbal23/kitchen-sink --agent claude-code
```

Or copy it into your skills folder yourself.

```bash
git clone https://github.com/MuhammadAbdullahIqbal23/kitchen-sink.git
```

```bash
mkdir -p ~/.claude/skills
```

```bash
cp -r kitchen-sink/skills/kitchen-sink ~/.claude/skills/
```

Copy into the `skills` folder, not onto `skills/kitchen-sink`: if that folder already exists, `cp` puts a second copy inside it. To update, delete the old `~/.claude/skills/kitchen-sink` first, so files removed in the new version don't linger.

To share it with a team, use `.claude/skills/kitchen-sink` inside your project instead.

**Claude apps:** upload `kitchen-sink.skill` from the repository's releases in your skills settings.

**Other agents:** the skill follows the open [Agent Skills format](https://agentskills.io/specification), so it should work wherever that format is supported. Check your agent's docs for its skills folder, or use the community installer ([vercel-labs/skills](https://github.com/vercel-labs/skills)), which asks which agents to install for. It has only been tested here with Claude Code and its shared `.agents/skills` folder:

```bash
npx skills add MuhammadAbdullahIqbal23/kitchen-sink
```

## Use

Just ask. These all work:

- "Build a kitchen sink for this app"
- "I want a page showing all our components and their states"
- "Start a design system for me. Brand colour is #e11d48, plain HTML is fine"
- "Add a component gallery to our Flutter app"

Helper scripts need Node 18 or newer. Without Node, the skill falls back to manual steps and says so in its report.

## What it covers

| Adapter | Stacks |
| --- | --- |
| `react` | React, Next.js, Vite, React Router, Gatsby, TanStack Start, with Tailwind, shadcn/ui, MUI, Chakra, Mantine, Ant Design and others |
| `vue` | Vue, Nuxt, Quasar, Vuetify, PrimeVue, Element Plus |
| `svelte` | Svelte, SvelteKit, Skeleton, Bits UI |
| `angular` | Angular, Angular Material, PrimeNG |
| `web-other` | Plain HTML, Astro, Solid, Qwik, Lit, Stencil, Ember, Preact, Alpine, htmx, Leptos, Dioxus, Yew, email |
| `server-rendered` | Rails, Django, Flask, Laravel, Symfony, Phoenix, Spring, ASP.NET, Blazor, Go templ, WordPress, Shopify |
| `react-native` | React Native, Expo, NativeWind, Paper, Tamagui |
| `flutter` | Flutter, Widgetbook |
| `apple` | SwiftUI, UIKit |
| `android` | Jetpack Compose, Compose Multiplatform, XML Views |
| `desktop` | WPF, WinUI, MAUI, Avalonia, WinForms, Qt, GTK, JavaFX, Electron, Tauri, egui, iced, Slint, Wails, Fyne |
| `terminal` | Textual, Ratatui, Bubble Tea, Ink |
| `game-engine` | Unity, Unreal, Godot |

Any other stack goes through the [unknown-stack protocol](skills/kitchen-sink/references/unknown-stack.md): learn how UI works there, borrow from the nearest adapter, map the contract, and declare gaps honestly. No skill can truly know every stack, so this fallback is what lets it try on the ones nobody wrote down.

The [component catalog](skills/kitchen-sink/assets/component-catalog.json) has three cumulative tiers: starter (17 components), standard (38) and complete (62). When building a system, it's the list of what to generate. When showing what exists, it's only a checklist of states and edge cases for the components you already have.

## How far each part has been tested

Treat this as the honest state of the project, and please help improve it.

| Level | What it means | Covers |
| --- | --- | --- |
| Agent evals | Fresh agents ran realistic prompts with and without the skill, and builds and tests ran | Plain HTML, React with Vite and Tailwind, Flutter, Streamlit (no adapter) |
| Viewed on screen | A finished sink was opened in a browser and checked in light, dark and right-to-left | Plain HTML, the React build-out eval result (which overflowed at phone width, see below), and first-round results for React and Flutter |
| Key claims run | An adapter's main advice was run on the real toolchain: production gates, forced states, theme and direction | See the table below |
| Detection tested | Stack detection is covered by tests, but the build guidance hasn't been run | Everything else |

Which claims have been run on real toolchains:

| Adapter | Run | Not run |
| --- | --- | --- |
| `react` | Vite with a router, Next.js gates | React Router, Gatsby, Pages Router, library theming |
| `vue` | Vue Router and Nuxt gates | Forced states, library theming |
| `svelte` | SvelteKit gate, scoped selector behaviour | Static adapter, library theming |
| `angular` | Production gate | Forced states, Angular Material |
| `web-other` | Plain HTML (full sink), Astro and Solid gates | Qwik, Lit, Stencil, Ember, Alpine, htmx, Rust, email |
| `server-rendered` | Django, Flask, Razor and Blazor Server gates | Rails, Laravel, Symfony, Phoenix, Spring, templ, WordPress, Shopify, Blazor WebAssembly |
| `react-native` | Release gate, in web and Android bundles from Expo | Running on a device, Expo Router's route file, React Navigation |
| `flutter` | Agent evals, forced states, web build | Running on a device |
| `android` | Compose on an emulator: gate, forced states, dark, right-to-left | XML Views, Compose Multiplatform |
| `desktop` | WPF, Avalonia and Qt Widgets, comparing rendered pixels | WinUI, MAUI, WinForms, QML, GTK, JavaFX, egui, iced, Slint, Wails, Fyne, Electron, Tauri |
| `terminal` | Textual, Ink | Ratatui, Bubble Tea |
| `apple` | Nothing, since it needs macOS | Everything |
| `game-engine` | Nothing, since no engine was installed | Everything |

Versions used: Next.js 16.4, Nuxt 4.6, SvelteKit 3.1, Angular 22.2, Astro 7.4, Expo 58, Vue 3.5, .NET 9, Django 6.1, Flask 3.1, Avalonia 12.1, PySide6 6.12, Textual 8.2, Ink 8.0, Compose BOM 2025.01.

Running these claims was worth it. Six of 16 production gates tested didn't do what the adapter first said: Next.js, Nuxt, SvelteKit, Angular and Expo still shipped the sink's code, and Astro wrote a blank page. Avalonia's forced-state advice threw an exception, and part of the Qt advice had no effect. All are fixed and retested on the toolchains above, apart from the corrected Expo Router and React Navigation snippets, which use the tested `require` technique but weren't run themselves. The advice for stacks in the "Not run" column was written the same way and likely has similar errors.

**Eval results** (second round, after fixing what the first round found): with the skill, 38 of 39 checks passed; without it, 28 of 39. The skill's clearest wins are building a system from nothing (dialogs, loading states, dark mode and right-to-left all present) and stacks with no adapter (honest notes on what the platform can't do). When asked only to show existing components, it now stays in scope: the Flutter run went from 2,713 added lines in the first round to 638, with no theme edits. These are one run per prompt, graded by the skill's author, so treat them as a sanity check rather than a benchmark. Three of those checks can only be met by a skill run; without them it's 36 of 36 against 28 of 36.

Eval agents had no browser, so passing checks don't mean a page looks right. Opening the React build-out result showed it worked in dark and right-to-left but was 602 px wide on a 375 px screen, which no check had caught. The skill now covers this, along with fixes for two other findings from that round, but those changes haven't been through a further eval round.

The Flutter test is why this table exists. The adapter's first version compiled cleanly but its forced states had no visible effect, which only showed up on screen. Expect similar mistakes in the untested adapters, and treat them as a strong starting point. The skill tells agents to check adapter advice against the project's installed versions and on screen.

Automated tests cover detection for 43 project types, token generation for 232 brand colours (72 contrast pairs in both themes, across every surface), danger colours kept apart from red brands, and the verifier's checks for both scopes. Run them with:

```bash
node tests/run.mjs
```

## Project layout

```
skills/kitchen-sink/     The skill
  SKILL.md               Workflow
  references/            Intake, tokens, sink spec, verification, stack adapters
  assets/                Component catalog
  scripts/               detect-stack, tokens, verify-sink (Node, no dependencies)
  evals/                 Test prompts for evaluating the skill
examples/html-starter/   A real generated kitchen sink
tests/                   Tests for the scripts
```

## Contributing

Adapter fixes and new adapters are the most useful help, especially from people who use the stack daily. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
