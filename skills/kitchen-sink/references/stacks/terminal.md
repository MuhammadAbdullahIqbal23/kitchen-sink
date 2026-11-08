# Terminal UIs: Textual, Ratatui, Bubble Tea, Ink

Terminals change the contract a lot. Express what exists honestly, and don't simulate what doesn't.

## Foundations

| Foundation | In a terminal |
| --- | --- |
| Colour | Yes. Use ANSI or true colour, and test `NO_COLOR` and 16-colour fallback if the toolkit allows. |
| Typography | Bold, dim, italic, underline, reverse. No font sizes. Set `typography` to true and show these. |
| Spacing | Character cells: padding and margin in cells and lines. |
| Radius | `na: terminals use box-drawing characters` (or show rounded border styles if the toolkit has them) |
| Elevation | `na: no shadows in a character grid` (show borders and layers instead) |
| Motion | Spinner and progress frames only |

Colour tokens: map `flatten` output to the toolkit's colours, then expect them to differ with the user's terminal theme. Don't force a background unless the app already does.

## Catalog mapping

- Keep: button, text input, select, checkbox, radio, switch, tabs, table, list, tree, progress, spinner, badge, alert, dialog (modal screen), toast, breadcrumb, pagination, stepper.
- Usually gaps with a reason: tooltip, hover card, avatar, carousel, date picker unless the toolkit provides one, file upload, slider without mouse.
- Hover: `na: terminals have no reliable hover`, except toolkits with mouse support such as Textual, where it can be `live`.
- Direction: `na: terminal RTL rendering depends on the terminal emulator`.
- Theme: true only if the toolkit or app has theme switching. Otherwise `na: inherits the terminal theme`.

## By toolkit

| Toolkit | Tokens | Sink entry and gate | Forcing states |
| --- | --- | --- | --- |
| Textual (Python) | `.tcss` file with `$variables`, or a registered `Theme` | `python -m <pkg>.kitchen_sink`, a module excluded from entry points | Pair the real pseudo-class with your own class in `.tcss`, as in `Button:hover, Button.-force-hover`, or call `.focus()`. Use `disabled=True` for real states. |
| Ratatui (Rust) | `const` `Style` and `Color` values in a `theme.rs` | `examples/kitchen_sink.rs`, run with `cargo run --example kitchen_sink` | Widgets are pure functions of state, so simply pass a focused or selected style (`forced`) |
| Bubble Tea (Go) | Lip Gloss styles in `theme.go`, using `AdaptiveColor` for light and dark | `cmd/kitchensink/main.go` | Bubbles expose `Focus()` and `Blur()`, and styles are explicit, so `forced` works well |
| Ink (React) | Theme object with colour names or hex | `examples/kitchen-sink.tsx`, excluded from the published `files` | Props and `useFocus` |

Terminal pages have to scroll or page. Use tabs or a section list with keyboard navigation, and always show how to quit.

## Presentation

A character grid has no gradients, shadows or hover cards. Build the same patterns from what terminals do have:

- Overview: a bordered panel at the top with the name, stack, scope and counts from the manifest.
- Section index: bordered boxes that reflow with the terminal width, all with the same number of lines so a row lines up. When the terminal is too narrow for two boxes, switch to a list with one line of description per entry.
- Frames: box-drawing borders in the theme's border colour, rounded if the toolkit has them, with the component's name in the border title. Textual has `border_title`, Ratatui `Block::bordered().title(…)`, Lip Gloss `RoundedBorder()`, and Ink `<Box borderStyle="round">`.
- Feedback: the focused tile in reverse video or the theme's highlight colour, plus a marker such as `›`, because colour may be stripped.
- Sample labels: the dim style.
- Decorative colour: a hand-written hash into a fixed list of theme colours, paired with a letter or symbol so it still reads under `NO_COLOR`. Python's `hash()` changes on every run, so use `zlib.crc32` in Textual.
- Reduced motion: `na: terminals have no reduced-motion setting`. Text size: `na: the terminal emulator sets the font size`.

## Verify

Run the project's checks (`pytest`, `cargo test`, `go test ./...`, `tsc`). To see the result:

- Textual: `app.run_test()` with `pilot`, and `app.export_screenshot()` for an SVG.
- Ratatui: `TestBackend` renders to a buffer you can print and read.
- Bubble Tea: `teatest`, or call `View()` directly and print it.
- Ink: `ink-testing-library`'s `lastFrame()`.

Test at 80 by 24 and at a wide size. A small terminal is the equivalent of a narrow phone. Don't use the toolkit's testing library unless it's installed or the user agrees. A direct render or a printed frame works too.

## Pitfalls

- Wide characters (CJK, emoji) take two cells and can break alignment. Include one in edge cases.
- Colour alone can't carry meaning, since it may be stripped. Pair it with symbols.
- Restore the terminal on exit and on panic, or the user's shell is left broken.
