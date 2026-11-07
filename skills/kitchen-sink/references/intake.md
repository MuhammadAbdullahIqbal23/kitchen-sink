# Design intake

For `system` scope. In `existing` scope there's nothing to design, so skip this file.

Goal: learn enough to build a credible design system while asking the user as little as possible. Asking for something the repo already answers costs the user time and erodes their trust.

## Collect evidence first

Use the strongest source available for each decision. When sources disagree, the higher one wins, and you mention the conflict in the report.

| Priority | Source | How to use it |
| --- | --- | --- |
| 1 | Explicit user instruction | Follow it, even if the code disagrees. |
| 2 | Token sources in code (`tokenSources` from detection) | Read them. They are the current truth. |
| 3 | Installed component library theme | Read the theme config and overrides. |
| 4 | Figma link or tool | If a Figma tool is available, read variables and styles. If not, ask for an export or screenshot. |
| 5 | Brand guidelines, PDF or docs in the repo | Extract colours, fonts and voice. |
| 6 | Live website URL given by the user | Read its CSS for colours, fonts, radius and spacing. Only sample what you were pointed to. |
| 7 | Screenshot or logo | Estimate colours and tone, and mark them as estimates in the report. |
| 8 | Colours used in existing components | Count the literal values. The most frequent saturated colour is likely the brand. |
| 9 | Defaults below | Use them, and list them as assumptions. |

## What you need

| Decision | Required? | Default |
| --- | --- | --- |
| Primary colour | Yes | `#3b5bdb`, flagged as a placeholder |
| Tier | Yes | `standard`, or `starter` for a small app or empty project |
| Light and dark themes | Yes | Both |
| Font | No | Project's current font, otherwise the system stack |
| Corner style | No | `soft` |
| Density | No | `comfortable` |
| Neutral tint | No | `tinted` |
| Feedback colours | No | Generated hues |
| Supported languages and right-to-left | No | Direction control included |
| Target surfaces | No | Inferred from the stack |

## Ask at most five questions

Send one message with all the questions, each with a suggested default, so the user can reply "defaults" and move on. Skip anything the evidence already answered. Use the agent's question tool if it has one.

Question bank, most valuable first:

1. **Brand:** "What's your main brand colour? A hex code, logo, website or Figma link all work."
2. **Scope:** "How complete should it be? Starter is about 17 components, Standard about 38 (recommended), Complete about 62."
3. **Themes:** "Light and dark, or just one?"
4. **Personality:** "Sharp and dense like a pro tool, soft and airy like a consumer app, or match something you like?" This maps to radius and density.
5. **Font:** "Any font to use, or keep the system font?"

Personality mapping:

| Answer | `--radius` | `--density` |
| --- | --- | --- |
| Professional, dense, data-heavy | `sharp` | `compact` |
| Balanced, general product | `soft` | `comfortable` |
| Friendly, consumer | `round` | `comfortable` |
| Playful, bold | `pill` | `spacious` |

## When not to ask

If the user said "just do it" or "use defaults", or the agent is running without a human, ask nothing. Pick from evidence and defaults, and report the assumptions. A placeholder primary colour must always be called out, since it is the first thing they will want to change.

If they gave a brand name but no colour, do not invent or recall the brand's colours from memory as fact. Use one they supply or a site they point to, or use the placeholder and say so.
