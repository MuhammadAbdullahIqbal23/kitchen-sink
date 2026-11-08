# Other web: plain HTML, Astro, Solid, Qwik, Lit, Stencil, Ember, Preact, Alpine, htmx, Rust WASM, email

## Plain HTML and CSS (the baseline)

No build step and no install. It opens by double-clicking the file, which makes it the default for an empty project.

```
kitchen-sink/
  index.html
  tokens.css      # from: tokens.mjs flatten design-tokens.json --format css
  components.css  # generated components, which use only var(--token)
  kitchen-sink.css  # layout of the sink itself
  kitchen-sink.js   # theme and direction controls, overlay triggers
```

- Use native elements first: `<button>`, `<dialog>`, `<details>`, `<input type="date">`, `<select>`, `popover`. They bring keyboard and accessibility behaviour at no cost.
- Gate: keep the folder out of the deployed directory, and state that in `entry.gate`.
- Forcing states: the `[data-force-state]` selector pattern from `sink-spec.md`.
- Theme: `document.documentElement.dataset.theme`. Direction: `document.documentElement.dir`. Save both in `localStorage`, guarded for `file://` restrictions.
- Use logical properties (`margin-inline-start`, `inset-inline-end`) so RTL works by itself.
- Verify: open it in a browser. A plain static server is only needed if a feature requires it.

## Framework notes

| Stack | Sink location | Gate | Notes |
| --- | --- | --- | --- |
| Astro | `src/dev-pages/kitchen-sink.astro`, outside `src/pages` | An integration in `astro.config` that calls `injectRoute({ pattern: "/kitchen-sink", entrypoint: "./src/dev-pages/kitchen-sink.astro" })` from `astro:config:setup` only when `command === "dev"`. Returning a 404 `Response` from a page isn't enough, because static builds still write a blank `kitchen-sink/index.html`. | Islands need `client:*` directives to be interactive. Theme toggle script goes in a plain `<script>`. |
| Solid, Preact | Same as the React adapter: Vite route or separate entry | `import.meta.env.DEV` | Props and refs differ from React. Solid's `dir` and reactive `class` need its own idioms. |
| Qwik | `src/routes/kitchen-sink/index.tsx` | `onGet` returning 404 when not dev | Use `useVisibleTask$` sparingly. |
| Lit, Stencil, web components | `kitchen-sink.html` loaded by the dev server | Not in build inputs | CSS variables cross shadow DOM, so tokens work. Other selectors don't. Forced states need `:host([data-force-state~="hover"])` or a reflected property. Use `<wc-` tag names as markers. |
| Ember | `app/routes/kitchen-sink` with a template | Route check `config.environment` | Match Classic or Polaris conventions. |
| Alpine, htmx | Plain HTML page, served by the project | As for plain HTML or the server's dev check | `x-data` for controls. Stub htmx requests so the page makes no network calls. |
| Leptos, Dioxus, Yew | A dev-only route behind a Cargo feature, such as `--features kitchen-sink` | Feature off by default | Tokens via CSS file. Build with `trunk` or the project's tool. |

## Presentation

- Plain HTML: the web rules in `sink-spec.md` go in `kitchen-sink.css`, and the colour hash in `kitchen-sink.js`, which sets a variable on each tile: `tile.style.setProperty("--decor", "var(" + decor(tile.id, entries) + ")")`.
- Web components: keep the grid and frames in light DOM, where the sink's stylesheet reaches them. Inside a shadow root, style only through tokens and `::part()`.
- Astro: compute decorative colour and manifest counts in the frontmatter, so they're fixed at build time and need no script.
- Solid, Preact, Qwik: as for React. Compute colour during render, never randomly.

## Email (React Email, MJML)

Email clients ignore most modern CSS, so the usual contract changes:

- Tokens are inlined literals at build time, not CSS variables.
- Forcing hover, focus and RTL controls doesn't apply. Mark as `na: email clients do not support this`.
- Build one template that shows all blocks: buttons, headings, tables, images, footers.
- Verify by rendering with the tool's preview, and suggest a client-testing service for real clients.
- Dark mode support varies by client. Report what you tested.
- Presentation: no grid, hover or reduced motion. Use one column of bordered table cells, and mark tile feedback `na: email clients don't support hover`.
