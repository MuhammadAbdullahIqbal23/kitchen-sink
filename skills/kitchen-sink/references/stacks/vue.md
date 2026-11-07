# Vue (Vue 3, Nuxt, Quasar)

## Tokens

- **Plain CSS, Sass or scoped styles:** `tokens.mjs flatten --format css` into a global stylesheet imported in `main.ts`, or listed in `css` in `nuxt.config`.
- **Tailwind or UnoCSS:** map tokens into the theme, as with React. Check the version first.
- **Nuxt UI:** tokens live in `app.config.ts` and CSS variables. Follow the installed version's docs.
- **Vuetify:** the source is `createVuetify({ theme })`. Define `light` and `dark` themes there.
- **PrimeVue:** use its design token presets (`definePreset`).
- **Element Plus, Naive UI, Quasar:** use their theming API (CSS variables, `n-config-provider`, Quasar Sass variables).

## Where the sink lives and how it's gated

| Framework | Location | Gate |
| --- | --- | --- |
| Nuxt | `pages/kitchen-sink.vue`, or `app/pages/` in newer layouts | Remove the page through `pages:extend` in production, shown below |
| Vue with Vue Router | `src/views/KitchenSink.vue` | Add the route inside `if (import.meta.env.DEV)` with a lazy import |
| Vue without a router | Separate entry `kitchen-sink.html` | Not in the production build inputs |
| Histoire or Storybook present | One story file | Not shipped with the app |

On Nuxt, `definePageMeta({ validate })` and route middleware only block the route. The page's code still ships to the browser. Remove the page from production builds instead:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  hooks: {
    "pages:extend"(pages) {
      if (process.env.NODE_ENV === "production") {
        const i = pages.findIndex((p) => p.path === "/kitchen-sink");
        if (i >= 0) pages.splice(i, 1);
      }
    },
  },
});
```

## Forcing states

- Generated components: the `[data-force-state]` selector pattern from `sink-spec.md`. In scoped styles, keep both selectors in one rule.
- Existing or library components: use `live`.
- Reka UI, Radix Vue and Headless UI expose `data-state` or similar attributes. Force through them if the styles use them.

## Controls

- Theme: `document.documentElement.dataset.theme`, or the project's mechanism, such as `useColorMode` (Nuxt) or `useTheme` (Vuetify).
- Direction: `document.documentElement.dir`. Vuetify uses `useRtl`, and Element Plus and Naive UI need a provider setting. For other libraries, check their RTL docs, and report it if there's no support.

## Verify

Use `package.json` scripts: `vue-tsc --noEmit` or `nuxt typecheck`, then `lint`, `build`. Run `dev` and open the route.

## Pitfalls

- With Vue attribute fallthrough, `data-force-state` lands on the root element only. Multi-root components need `v-bind="$attrs"`.
- Nuxt auto-imports components, so the import name might not appear in the file. Use `<ComponentName` as the manifest marker.
- Nuxt SSR plus browser-only values: read them in `onMounted`, or wrap in `<ClientOnly>`.
- Teleported overlays render outside the framed box. Keep them `live`, or use the `disabled` prop on `<Teleport>` for a framed preview.
