# React (Next.js, Vite, React Router, Gatsby, TanStack Start)

## Tokens

- **Tailwind 4:** map tokens into `@theme` in the main CSS file, and dark values under a `[data-theme="dark"]` block. Tailwind 3: extend `theme` in `tailwind.config` with `var(--color-...)` references. Check the installed version first, since the setup differs.
- **shadcn/ui (`components.json`):** tokens already exist as CSS variables in the globals file. Map to them, and add new semantic variables only where they're missing.
- **CSS Modules, Sass, plain CSS:** run `tokens.mjs flatten --format css` into a stylesheet imported at the root.
- **CSS-in-JS:** styled-components or Emotion use the existing `ThemeProvider` with an object built from `flatten` JSON. Prefer CSS variables for values if the project already uses them.
- **MUI, Chakra, Mantine, Ant Design, Radix Themes:** the library theme is the source of truth. Extend through its theme API and render library components themed. Use `library` or `wrapped` in the manifest.

## Where the sink lives and how it's gated

| Framework | Location | Gate |
| --- | --- | --- |
| Next.js App Router | `app/kitchen-sink/page.dev.tsx` (or under `src/`), with interactive parts in a `"use client"` child. | `pageExtensions` in `next.config`, shown below |
| Next.js Pages Router | `pages/kitchen-sink.dev.tsx` | Same `pageExtensions` approach |
| Vite with a router | Add a lazy route | Only register the route inside `if (import.meta.env.DEV)`, so bundlers drop it |
| Vite without a router | Separate entry: `kitchen-sink.html` plus `src/kitchen-sink/main.tsx`. Don't add it to `rollupOptions.input`. | Not part of the production build |
| React Router framework or Remix | Route module | Leave it out of the route config in production builds, and confirm by searching the output. A loader that throws 404 still ships the page's code. |
| Storybook present | `src/KitchenSink.stories.tsx`, one story with `layout: "fullscreen"` | Storybook isn't shipped with the app |

On Next.js, don't gate with `notFound()` or `{ notFound: true }`. The route returns 404, but the sink still lands in the browser chunks. Make the page invisible to production builds instead:

```js
// next.config.mjs. Merge with the project's existing pageExtensions, if any.
const isDev = process.env.NODE_ENV !== "production";
export default {
  pageExtensions: isDev ? ["dev.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
};
```

**Tailwind leak:** Tailwind scans the whole project, so the sink's classes end up in the production stylesheet even when its code doesn't ship. Exclude the sink folder with `@source not "./kitchen-sink";` in the main CSS (Tailwind 4.1 or newer), and give the sink a small stylesheet of its own that sources that folder. Compare the production CSS before and after.

Split sections into files if the page grows past a few hundred lines. List all of them in `entry.files`, and use them for markers.

## Forcing states

- Your generated components: the `[data-force-state]` selector pattern from `sink-spec.md`. Tailwind: add the variant with `@custom-variant force-hover (&[data-force-state~="hover"])` in v4 or a plugin in v3, or just write the CSS rule.
- Existing components: if they use CSS `:hover`, leave them alone and use `live`. If Storybook has `storybook-addon-pseudo-states` installed, use it.
- Radix, Base UI and React Aria expose `data-state`, `data-hovered` and `data-focus-visible` and so on. Components styled through those can often be forced by passing the attribute.
- Dialogs and popovers from headless libraries usually accept `open` and render in a portal. Keep them `live`, or pass a portal container to render them inside a framed box.

## Controls

- Theme: set `document.documentElement.dataset.theme`, or call the project's existing mechanism, like `next-themes` `setTheme`. Don't add a second theme system.
- Direction: set `document.documentElement.dir`. Radix needs `DirectionProvider`, MUI needs `theme.direction` plus an RTL style setup, and Mantine has `DirectionProvider`. Use them if they exist. Logical properties (`margin-inline-start`, Tailwind `ms-*`) make generated components flip correctly.
- SSR: avoid a theme flash and hydration mismatches. Read saved values in `useEffect`, or use the project's provider.

## Verify

Use the scripts in `package.json`: `tsc --noEmit` if there's no type-check script, then `lint`, `build`. Run `dev` and open the route.

## Pitfalls

- A server component importing an interactive library component fails without a `"use client"` boundary.
- Barrel imports may pull heavy code into the sink. That's fine for a dev-only route, but it isn't if the gate is a runtime check that still bundles it for production. Prefer build-time exclusion when bundle size matters.
- Rendering every overlay open at once breaks focus and scroll. Don't.
- Each sample needs unique `id` and `name` values, or `useId`, since duplicate IDs break labels and radio groups.
- React Native Web projects should use the `react-native` adapter.
