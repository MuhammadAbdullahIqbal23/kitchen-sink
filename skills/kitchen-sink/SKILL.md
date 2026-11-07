---
name: kitchen-sink
description: Build a kitchen sink, one living page or screen showing every design token, component, variant, size and state of a design system, in any tech stack (React, Next.js, Vue, Svelte, Angular, plain HTML, Rails, Django, Laravel, React Native, Flutter, SwiftUI, Jetpack Compose, desktop, terminal, game engines, or anything else). Detects the stack, shows what the project already has, generates a new system from a small brand input when asked to build one, and verifies the result. Use whenever the user wants a kitchen sink, component showcase, gallery or playground, UI inventory, style guide page, or design system preview, wants to start or bootstrap a design system, or asks to see all their components in one place, even if they never say "kitchen sink".
license: MIT
compatibility: Works in any agent that can read and edit files and run shell commands. Helper scripts need Node 18+ and have manual fallbacks when Node is absent.
metadata:
  version: "1.0.1"
---

# Kitchen Sink

A kitchen sink is one place that renders every token, component, variant, size and state of a design system. People use it to spot inconsistencies, review changes, and see what already exists before building something new.

It only has value if it tells the truth. Keep these ideas in mind throughout:

- **Render the real thing.** Import and render the project's actual components. A lookalike copy drifts away from production and hides the bugs the sink exists to expose.
- **Fit the project.** Follow its language, folder layout, naming and styling. Reuse its tokens and components. The sink should look like a teammate wrote it.
- **Report gaps honestly.** Anything not shown is declared in the manifest with a reason. A declared gap is useful, and a silent one misleads the team.
- **Build what was asked for.** Someone who wants to see what they have doesn't want new components, new tokens or a bigger codebase to maintain. Scope comes from their request, not from the catalog.
- **Keep the user's effort small.** Infer what you can, ask only what changes the result, and state your assumptions.

Paths below such as `scripts/tokens.mjs` are relative to this skill's folder. Run scripts by their full path from the user's project. They read the project and only write where told.

## Workflow

### 1. Detect the stack

```bash
node <skill-dir>/scripts/detect-stack.mjs <project-dir>
```

The JSON report gives the primary stack, adapter file, styling, component libraries, token sources, existing showcases and component folders. Without Node, look at the project's manifest files yourself using the table in [references/unknown-stack.md](references/unknown-stack.md).

Then read the adapter the report names, and only that one (plus the web adapter it points to for Electron or Tauri). Adapter guidance can lag behind the framework, so trust the installed version in the project's manifest over the adapter, and check current docs if an API has changed.

Handle these cases before moving on:

| Situation | What to do |
| --- | --- |
| Empty folder | Use the stack the user named. If they named none, ask, and suggest plain HTML and CSS because it needs no install. Scaffold with the framework's official tool. |
| `ambiguous: true`, several apps | Pick the app the user mentioned, or the shared UI package if one exists. Ask if it is still unclear. |
| No primary stack | Follow [references/unknown-stack.md](references/unknown-stack.md). |
| `existingManifest` present | This is a rerun. See "Reruns" below. |
| Storybook, Histoire, Widgetbook or Lookbook present | Build the sink inside that tool as one page, so the team keeps one showcase. Offer a standalone route only if they ask. |

### 2. Decide the scope

This choice matters more than any other, because it decides how much code lands in the user's project. Go by what they asked for:

| Scope | The user wants | Signals | Result |
| --- | --- | --- | --- |
| `existing` | To see what they have | "what we have", "our components", "our widgets", "the UI bits we use", "document", "review", "show all my components" | The project's own UI, in every state it supports. Generates nothing. |
| `system` | To get a design system | Empty project, "start", "build out", "bootstrap", "create a design system", "we keep reinventing", "add the missing components" | A tier of the catalog, with tokens and generated components. |

If the project has UI and the request is ambiguous, choose `existing` and offer to build out in your report. Adding later is easy, while unwanted code is a burden they have to review and remove. An empty project is always `system`.

**In `existing` scope:**

- Show only what the project defines or actually uses. A library component belongs on the page only if the project's code uses it directly. A widget that exists only in the library's documentation doesn't belong, however well it might suit them.
- Add no components and no tokens, and don't edit existing theme or component files. Touch existing files only where wiring the sink requires it, such as a route, and keep that as small as you can.
- Foundations show the tokens the project defines. Mark the rest `na: project defines none`.
- The catalog is your checklist for states, variants and edge cases of the components that exist. It is not a to-do list of components to add.
- Don't list every catalog component the project lacks. One sentence offering to build out is enough.
- Compositions are optional when there's too little UI to compose. Reuse a real screen if one exists.

Steps 3 and 5 below apply to `system` scope only. In `existing` scope, read the project's tokens, then go straight to the inventory and the sink.

### 3. Gather the design input and establish tokens

Read [references/intake.md](references/intake.md). Collect evidence from the project first, then ask at most five questions in a single message, covering only what you could not infer. If the user wants speed or cannot answer, use the defaults there and list your assumptions in the report.

Read [references/tokens.md](references/tokens.md). If the project has tokens, they stay the source of truth, and you only add what is missing. Otherwise generate them:

```bash
node <skill-dir>/scripts/tokens.mjs generate --primary "#4f46e5" --out design-tokens.json
```

### 4. Take inventory

Read `assets/component-catalog.json`, which lists each component's tier, aliases, variants, sizes, states, edge cases and accessibility needs. Match the project's components to it using names and aliases, then read the source to confirm. A project component with no catalog match still goes on the page, with your own id for it. Classify each one:

| Class | Meaning | Action |
| --- | --- | --- |
| `existing` | The project has it | Render it as is |
| `library` | An installed library provides it | Render it, themed with the tokens |
| `wrapped` | Library component behind a project wrapper | Render the wrapper |
| missing | Nothing provides it | `system` scope: generate it, then mark `generated` |

Tell the user the plan in a few lines: stack, scope, how many components are found, how many will be generated, and where the sink will live. Proceed unless they object. If the plan means generating more than about 15 components, get a yes first, since that adds a lot of code to their project.

### 5. Build what is missing (`system` scope)

Generate missing tokens and components in the project's own conventions, in its usual component folder. These rules protect the user's project:

- Keep existing components working exactly as before. When the system needs something an existing component lacks, such as a `danger` variant for destructive actions, add it as an optional, backward-compatible prop and list the change in the report. Otherwise a destructive dialog ends up on a brand-coloured button. Never rename, remove or restyle what's already there.
- Add no dependencies without asking. Build on what is installed.
- Style only through tokens. A raw colour in a component is a theming bug waiting to surface in dark mode.
- Meet the `a11y` note in the catalog for every component you generate.
- Combobox, date picker and similar patterns are hard to get right by hand. Use the native control or an installed library when possible. If you hand-roll one, say so in the report and suggest a tested library before production use.

### 6. Build the sink

Read [references/sink-spec.md](references/sink-spec.md) and build to it, using the adapter's location, gating and state techniques. Then write `kitchen-sink.manifest.json` as described there.

### 7. Verify

Read [references/verify.md](references/verify.md). In short:

```bash
node <skill-dir>/scripts/verify-sink.mjs <project-dir>
```

Then build the project, run the sink, and look at it. Check light and dark, left-to-right and right-to-left, and a narrow width. Fix what you find, up to three rounds, then report what remains.

### 8. Report

Keep it short and use this structure:

```
## Kitchen sink ready
Open: <command and URL or screen>
Stack: <stack> | Scope: <existing or system> | Rendered: <n> | Gaps: <n>

Found <n> existing, generated <n>, library <n>.
Verified: <what actually ran and what you looked at>
Not verified: <what could not run, and why>

Issues:
- <component or state>: <reason>

Assumptions:
- <anything you defaulted, and how to change it>
```

Claim only what you ran. If no simulator was available, say the sink has not been seen running. Mention each issue once, and leave out sections with nothing to say. In `existing` scope, close with one sentence offering to build out the missing pieces. For a stack with no adapter, also offer to turn your contract table into a new adapter, as `unknown-stack.md` describes.

## Reruns

When `kitchen-sink.manifest.json` exists, update instead of starting over. Compare the manifest with the current code, add what is new, remove what was deleted, and keep the user's manual edits to the sink. Treat the sink's files as theirs from the moment they were written. Rerun step 7 and report only what changed.

## Reference map

| File | Read when |
| --- | --- |
| `references/intake.md` | Step 3 |
| `references/tokens.md` | Step 3 |
| `assets/component-catalog.json` | Step 4 |
| `references/sink-spec.md` | Step 6 |
| `references/verify.md` | Step 7 |
| `references/stacks/<adapter>.md` | Step 1, the detected adapter only |
| `references/unknown-stack.md` | No adapter fits, or Node is unavailable |

Adapters: `react`, `vue`, `svelte`, `angular`, `web-other`, `server-rendered`, `react-native`, `flutter`, `apple`, `android`, `desktop`, `terminal`, `game-engine`.
