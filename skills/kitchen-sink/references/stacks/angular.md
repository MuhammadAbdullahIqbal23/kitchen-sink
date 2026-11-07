# Angular

Check the version in `package.json`. Match the project's style: standalone components or NgModules, signals or decorators, and new control flow (`@if`) or structural directives (`*ngIf`).

## Tokens

- **Plain CSS or Sass:** `tokens.mjs flatten --format css` into a file added to `styles` in `angular.json`, or imported from `styles.scss`.
- **Angular Material:** the source of truth is the Sass theme, using the `mat.theme` mixin and system variables in recent versions. Use its token overrides rather than deep selectors.
- **PrimeNG:** use `providePrimeNG` with a preset.
- **Tailwind:** map tokens into the theme.

## Where the sink lives and how it's gated

Create `src/app/kitchen-sink/kitchen-sink.component.ts`, and use `fileReplacements` so production builds never see the route. Don't gate with `isDevMode()`: the route disappears, but its lazy chunk still ships in the production output.

```ts
// src/app/kitchen-sink/kitchen-sink.routes.ts
export const kitchenSinkRoutes: Routes = [
  { path: "kitchen-sink", loadComponent: () => import("./kitchen-sink.component").then((m) => m.KitchenSinkComponent) },
];

// src/app/kitchen-sink/kitchen-sink.routes.prod.ts
export const kitchenSinkRoutes: Routes = [];

// src/app/app.routes.ts
export const routes: Routes = [
  ...kitchenSinkRoutes,
  // Keep this spread above any wildcard route.
];
```

```json
// angular.json, under architect.build.configurations.production
"fileReplacements": [
  { "replace": "src/app/kitchen-sink/kitchen-sink.routes.ts", "with": "src/app/kitchen-sink/kitchen-sink.routes.prod.ts" }
]
```

Storybook present: add one story instead.

## Forcing states

- Generated components: the `[data-force-state]` selector pattern from `sink-spec.md`. Default view encapsulation handles this fine as long as both selectors are in the component's styles.
- Angular Material: components have internal state classes such as `cdk-focused`. These are private API, so use `live`, and use real inputs like `disabled` for the rest.
- Reactive form states: build real `FormControl`s, and mark them touched with errors set to show validation.

## Controls

- Theme: `document.documentElement` attribute via `DOCUMENT` injection, or a class such as `.dark-theme`. Follow the project's existing approach.
- Direction: `Directionality` from `@angular/cdk/bidi` with the `dir` attribute. Set it on a wrapper with `[dir]`, which CDK components respect.

## Verify

`ng build`, `ng lint`, and `ng test` if the project uses them. Run `ng serve` and open the route.

## Pitfalls

- A wildcard route above the sink route swallows it.
- Standalone components must import every component they render. A missing import fails at build, or silently renders an unknown element if `CUSTOM_ELEMENTS_SCHEMA` is set.
- With `ChangeDetectionStrategy.OnPush`, theme toggles must update through signals or `markForCheck`.
- Overlays from `MatDialog` open from code, so give each a trigger button and mark it `live`.
