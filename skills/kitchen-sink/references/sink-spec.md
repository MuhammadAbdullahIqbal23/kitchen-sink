# Kitchen sink specification

The contract for what a kitchen sink contains on any platform. The adapter says how to do each thing in the detected stack.

## Contents

- Page structure
- Controls
- Foundations
- Component blocks
- Showing states
- Content rules
- Compositions
- Safety and gating
- Manifest

## Page structure

In this order, on one scrollable surface, or as one route with sections. On platforms where a single screen would be unusable, use a simple list that opens one section per screen.

In `existing` scope, keep this structure but include only what the project has. A project with one widget gets a short page, and that's the correct result.

1. **Header:** project name, stack, and scope. In `system` scope, add the tier and a coverage count such as "36 of 38".
2. **Controls:** sticky, always reachable.
3. **Section navigation:** jump links or a list, one per section, grouped by catalog category.
4. **Foundations:** colour, typography, spacing, radius, elevation, motion, and icons if the project has a set.
5. **Components:** grouped by catalog `category`, in the catalog's order within each group.
6. **Compositions:** a few real screens.
7. **Coverage:** in `system` scope, declared gaps and their reasons, visible on the page. In `existing` scope, only states or variants that can't be shown.

Make it easy to search with the browser's find, and give each section a stable anchor or route so a link can go straight to it.

The page must fit the narrowest supported screen without sideways scrolling, because a sink that breaks on a phone can't be used to review phone layouts. Wide samples such as tables scroll inside their own container. On the web, the usual causes are grid or flex children that can't shrink (give them `min-width: 0`), inputs at their default width in a tight row (`width: 100%`), and long file paths or tokens (`overflow-wrap: anywhere`).

## Controls

| Control | Required | Purpose |
| --- | --- | --- |
| Theme | Yes, or `na: <reason>` if the product has one theme | Switches every mode the tokens define. Remember the choice across reloads where easy. |
| Direction | Yes, or `na: <reason>` | Switches left-to-right and right-to-left. Reveals layouts built with left and right instead of start and end. |
| Text scale | Touch platforms and desktop if available | 100%, 150%, 200%. Reveals clipped text. |
| Density | If tokens define it | Compact and comfortable. |
| Reduced motion | Optional | Preview of the reduced-motion behaviour. |

Controls apply to the sink's whole content, and they must use the same mechanism the product will use (for example the real theme provider). Otherwise the sink proves nothing about real theming.

## Foundations

| Section | Show |
| --- | --- |
| Colour | Palette ramps and semantic tokens. For each: swatch, token name, value in the current theme. For text and fill pairs, show the contrast ratio. |
| Typography | Each style rendered with a realistic sentence, with name, size, weight and line height. |
| Spacing | Each step as a visible bar with name and value. |
| Radius | A box per step, with name and value. |
| Elevation | A surface per shadow, on both canvas and surface backgrounds. |
| Motion | Each duration and easing, with a button that replays it. Nothing loops by itself. |
| Icons | The project's icon set, if any, as a searchable grid with names. |

Read values from the tokens at render time where the platform allows it, so documentation can't fall out of date.

## Component blocks

Give every component a block with:

1. **Heading and anchor:** the component's name in this project, and its catalog `id` if different.
2. **Variants by state:** a labelled grid with variants on one axis and states on the other. Label every row and column, because an unlabelled sample can't be reviewed.
3. **Sizes:** one row per size.
4. **Edge cases:** every `edge` entry in the catalog that applies.
5. **In context:** a small realistic use, when the block alone doesn't show how it's used.

Catalog variant names are a guide. Use the project's real variants and names. If a project's Button has `solid` and `outline`, show those, and don't invent the rest.

## Showing states

Every catalog state must be visible or accounted for, and the manifest records how:

| Value | Meaning | Use it when |
| --- | --- | --- |
| `static` | Rendered through the component's real props | Disabled, loading, error, checked, selected, filled. |
| `forced` | Interaction state rendered without interaction | Hover, focus and active, when you can force them without changing the component's styling logic. |
| `live` | Works on interaction, with a visible prompt such as "Hover me" | Forcing isn't possible, as with third-party components or portals. |
| `na: <reason>` | Doesn't apply | Hover on touch-only platforms. Always give the reason. |

Forcing hover and focus is what lets someone review every state at once and lets screenshot tests catch regressions, so use it where you can. Ask the adapter how. On the web, for components you generate, write one selector for both real and forced states:

```css
.button:hover, .button[data-force-state~="hover"] { background: var(--color-action-primary-bg-hover); }
.button:focus-visible, .button[data-force-state~="focus"] { outline: 2px solid var(--color-border-focus); }
```

Never add showcase-only branches to existing components just to force states. Use `live` for those instead. A forcing technique can compile and still change nothing, so compare forced samples on screen before recording them as `forced`.

**Overlays** (dialog, drawer, menu, popover, tooltip, toast): nothing should open by itself on page load, because focus traps and scroll locks would break the rest of the sink. Show a trigger that opens the real overlay, labelled `live`. Where the component allows it, also show its open appearance inline in a clearly framed box (`static`).

**Loading and animation:** show them running, but keep the page calm. Honour reduced motion.

## Content rules

Real text reveals real layout problems, so write copy a real product would use.

- No "lorem ipsum", "foo", "test" or "Button 1". Fit the project's domain if you can tell what it is.
- Use these for overflow and localisation edge cases:

| Case | Sample |
| --- | --- |
| Long unbroken word | `Kraftfahrzeughaftpflichtversicherung` |
| Long sentence | `Your subscription renews automatically on 14 March unless you cancel it first` |
| Right-to-left | `حفظ التغييرات` |
| CJK | `保存更改` |
| Large number | `1,234,567.89` |
| Accents and tall glyphs | `Ångström Ñandú Ệ` |

- Use neutral avatar placeholders such as initials. Never use real people's names or photos, or anything that looks like real personal data.

## Compositions

Components that look fine alone can still clash together. In `system` scope, build at least two screens using only the system's components and tokens, chosen to suit the product. In `existing` scope, use a real screen from the app if there is one, otherwise set `compositions` to `"na: <reason>"`. Good defaults for `system` scope:

- A sign-in or settings form, with validation errors showing.
- A data list or table page, with filters and an empty state.
- A dashboard or detail page, with cards, stats and navigation.

## Safety and gating

- Keep the sink out of production builds, because it exposes internals and adds weight. Prefer leaving it out at build time. A check at run time that returns 404 usually still ships the code, so use one only where the code stays on the server or the stack offers nothing better. Record the method in `entry.gate`.
- If the method can't work in a stack, use `"none: <reason>"` and raise it in the report.
- On web, add `noindex` when the sink runs on a deployed preview.
- No analytics, external network calls or remote images. The sink should work offline.
- Dialogs and forms in the sink don't submit anywhere or call real APIs. Stub their actions.

## Manifest

Write `kitchen-sink.manifest.json` at the root of the app or UI package. Paths are relative to it. `verify-sink.mjs` reads it, and reruns use it to find what changed.

```json
{
  "version": 1,
  "stack": { "adapter": "react", "framework": "next" },
  "scope": "system",
  "tier": "standard",
  "entry": {
    "files": ["src/app/kitchen-sink/page.dev.tsx", "src/app/kitchen-sink/sections.tsx"],
    "run": "npm run dev",
    "url": "/kitchen-sink",
    "gate": "page.dev.tsx, only seen by pageExtensions outside production"
  },
  "tokens": { "source": "design-tokens.json", "outputs": ["src/styles/tokens.css"] },
  "foundations": {
    "color": true, "typography": true, "spacing": true,
    "radius": true, "elevation": true, "motion": true, "icons": "na: project has no icon set"
  },
  "controls": { "theme": true, "direction": true, "textScale": false, "density": false },
  "compositions": ["Settings form", "Orders table"],
  "generatedFiles": ["src/components/ui/tabs.css"],
  "components": [
    {
      "id": "button",
      "source": "existing",
      "path": "src/components/ui/button.tsx",
      "marker": "<Button",
      "variants": ["solid", "outline", "ghost"],
      "sizes": ["sm", "md"],
      "edge": ["long label", "icon plus label"],
      "states": {
        "default": "static", "hover": "live", "focus": "live", "active": "live",
        "disabled": "static", "loading": "na: component has no loading prop"
      }
    }
  ],
  "gaps": [
    { "id": "date-picker", "reason": "No library installed, and the user chose not to add one." }
  ]
}
```

Field notes:

- `scope`: `existing` or `system`, from step 2 of the workflow. `tier` and `gaps` apply to `system` scope and are left out of `existing` scope.
- `components[].id`: the catalog id, or your own id for a project component with no catalog match.
- `tokens.source`: the source of truth. If it's a JSON file in another format, add `"format": "other"` to skip the structure check.
- `tokens.outputs`: generated token code. These files are exempt from the hard-coded colour scan.
- `components[].source`: `existing`, `generated`, `library` or `wrapped`. `path` is required unless it's `library`.
- `components[].marker`: text in `entry.files` that appears only if the real component is rendered, such as `<Button` or `.ks-tabs`. This guards against a sink that renders lookalikes, so choose something specific.
- `states`: one entry per catalog state for that component. For a component with no catalog match, list the states it has.
- `generatedFiles`: anything else you generated. These get scanned for hard-coded colours too. Mark a deliberate literal with a `token-exempt` comment on the same line.
- In `system` scope, every component in the tier appears in `components` or `gaps`. In `existing` scope, no component may be `generated`.
