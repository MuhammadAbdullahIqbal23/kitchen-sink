# Svelte and SvelteKit

Check the Svelte major version in `package.json`. Svelte 5 uses runes (`$state`, `$props`, snippets) and older projects use `export let` and slots. Match what the project uses.

## Tokens

- **Plain CSS:** `tokens.mjs flatten --format css` into a global stylesheet imported from the root `+layout.svelte`, or `app.css`.
- **Tailwind:** map tokens into the theme. Check the version first.
- **Skeleton, Flowbite, shadcn-svelte:** follow their theme system, usually CSS variables.

## Where the sink lives and how it's gated

| Framework | Location | Gate |
| --- | --- | --- |
| SvelteKit | `src/routes/kitchen-sink/+page.svelte` renders a component loaded by `+page.ts`, shown below | `import.meta.env.DEV` around a dynamic import |
| SvelteKit static adapter | Same | Add `export const prerender = false`, and confirm the gate holds with a production build |
| Svelte with Vite | Separate entry `kitchen-sink.html` | Not in the build inputs |

The check must be `import.meta.env.DEV`, which the bundler can remove. A `dev` import from `$app/environment` leaves the sink's code in the output, and so does `if (!dev) error(404)` with the sink in `+page.svelte`, even though the route returns 404.

```ts
// src/routes/kitchen-sink/+page.ts
import { error } from "@sveltejs/kit";

export async function load() {
  if (import.meta.env.DEV) {
    const { default: Sink } = await import("../../lib/kitchen-sink/KitchenSink.svelte");
    return { Sink };
  }
  error(404);
}
```

```svelte
<!-- src/routes/kitchen-sink/+page.svelte -->
<script>
  let { data } = $props();
</script>
<data.Sink />
```

SvelteKit 3 removed the `$lib` alias (build error `module_removed_lib`). Use relative imports there, and keep `$lib` on older versions if the project does.

## Forcing states

- Generated components: the `[data-force-state]` selector pattern from `sink-spec.md`. Svelte removes scoped selectors it can't match, so `data-force-state` must appear in that component's markup, as `data-force-state={force}` or through `{...rest}`. Both keep the rule. If neither is there, the rule is dropped with a `css_unused_selector` warning.
- Existing and library components: use `live`. Bits UI and Melt UI expose `data-state`, which you may be able to force.

## Controls

- Theme: `document.documentElement.dataset.theme` inside `onMount` or a `$effect`, or the project's mechanism such as `mode-watcher`.
- Direction: `document.documentElement.dir`. Svelte has no global direction API, so generated components should use logical CSS properties.

## Verify

`svelte-check`, `lint`, and `build` from `package.json`. Run `dev` and open the route.

## Pitfalls

- A component's `class` prop may not reach the root element, so custom attributes might not either. Check before relying on them.
- Don't touch `document` at module scope on SvelteKit, because it runs on the server.
- Keep overlays `live`.
