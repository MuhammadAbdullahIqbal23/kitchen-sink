# Design tokens

Tokens let every component draw from one set of decisions. Components use semantic names such as `color.text.muted`. Semantic names point at raw palette values, and that indirection is what makes dark mode and rebranding cheap.

## Choose a path

| Situation | Path |
| --- | --- |
| Project has tokens (CSS variables, Tailwind theme, `ThemeData`, asset catalog, XAML resources) | **Keep them as the source of truth.** Add only what is missing, in the same format. Do not move them into a new system. |
| Project uses a library theme (MUI, Vuetify, Material) | The library theme is the source. Extend it through the library's own theming API. |
| Project has no tokens | **Generate** `design-tokens.json`, then port it to native code. |

## Generate

```bash
node <skill-dir>/scripts/tokens.mjs generate --primary "#4f46e5" \
  --radius soft --density comfortable --out design-tokens.json
```

Options: `--primary`, `--neutral tinted|gray`, `--success`, `--warning`, `--danger`, `--info` (hex), `--font-sans`, `--font-mono`, `--radius sharp|soft|round|pill`, `--density compact|comfortable|spacious`, `--type-scale` (default `1.25`).

The generator builds palettes in OKLCH, keeps the brand colour exactly as supplied, picks readable text colours, and checks contrast before finishing. Read its warnings and pass them on. A pale brand colour such as yellow, for example, needs a border on filled buttons in light mode.

## Validate and port

```bash
node <skill-dir>/scripts/tokens.mjs check design-tokens.json
node <skill-dir>/scripts/tokens.mjs flatten design-tokens.json
node <skill-dir>/scripts/tokens.mjs flatten design-tokens.json --format css > tokens.css
```

`flatten` prints resolved values per mode, which is what you need to write `ThemeData`, a Swift extension, XAML resources or anything else. The adapter shows the target format. Generate native token code from the JSON, and keep the JSON as the source when you generated it.

## Without Node

Write the tokens by hand using the shape below and the required list. Choose a palette with steps from light to dark for brand and neutral. Check contrast for the pairs listed under "Contrast rules" by calculation, and say in the report that the automated check did not run.

## File format

Generated files follow the [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/), so tools like Style Dictionary and Figma plugins can read them. The spec's theming is a separate module, so modes are stored in an extension, which conforming tools preserve:

```json
{
  "color": {
    "palette": {
      "neutral": {
        "50": { "$type": "color", "$value": { "colorSpace": "srgb", "components": [0.98, 0.98, 0.99], "hex": "#fafafc" } },
        "900": { "$type": "color", "$value": { "colorSpace": "srgb", "components": [0.1, 0.1, 0.11], "hex": "#1a1a1c" } }
      }
    },
    "text": {
      "default": {
        "$type": "color",
        "$value": "{color.palette.neutral.900}",
        "$extensions": { "io.kitchen-sink": { "modes": { "dark": "{color.palette.neutral.50}" } } }
      }
    }
  },
  "space": { "4": { "$type": "dimension", "$value": { "value": 16, "unit": "px" } } }
}
```

## Required tokens

Map existing project tokens to these concepts, even if the names differ. In a project with its own tokens, record the mapping in your head and fill real gaps only.

| Group | Tokens |
| --- | --- |
| Background | `color.bg.canvas`, `surface`, `raised`, `sunken`, `inverse`, `overlay` |
| Text | `color.text.default`, `muted`, `disabled`, `inverse`, `link` |
| Border | `color.border.default`, `strong`, `focus` |
| Actions | `color.action.{primary,secondary,danger}.{bg,bgHover,bgActive,fg}` |
| Feedback | `color.feedback.{success,warning,danger,info}.{bg,fg,border,solid,onSolid}` |
| Space | `space.{0,1,2,3,4,5,6,8,10,12,16,20}` in steps of 4 px |
| Radius | `radius.{none,sm,md,lg,xl,full,control}` |
| Size | `size.control.{sm,md,lg}`, `size.touchTarget`, `size.icon.{sm,md,lg}` |
| Border width | `border.width.{thin,thick}` |
| Font | `font.family.{sans,mono}`, `font.weight.{regular,medium,semibold,bold}` |
| Type styles | `typography.{display,h1,h2,h3,h4,bodyLg,body,bodySm,label,caption,code}` |
| Elevation | `shadow.{sm,md,lg}` |
| Motion | `motion.duration.{fast,base,slow}`, `motion.easing.{standard,enter,exit}` |
| Other | `opacity.disabled`, `layer.{dropdown,sticky,overlay,modal,toast,tooltip}`, `breakpoint.{sm,md,lg,xl}` |

Platforms can skip what does not exist for them (terminals have no shadows or radius, for example). Mark those as `"na: <reason>"` under `foundations` in the manifest.

## Contrast rules

Based on WCAG 2.2 AA. The `check` command enforces all of these in every mode:

- Text on its background: at least 4.5:1. This covers default and muted text on canvas, surface and raised, links on canvas and surface, inverse text, and text on every action state and feedback fill.
- Control boundaries and focus rings against their background: at least 3:1.
- Disabled text is exempt, but must still look intentional.

If a project's existing tokens fail a pair, leave them alone, show the failure in the sink's colour section, and flag it in the report. Changing brand values is the team's decision.
