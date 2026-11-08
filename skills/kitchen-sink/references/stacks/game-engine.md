# Game engines: Unity, Unreal, Godot

Game UIs are usually navigated by gamepad and keyboard as well as pointer, and they need to read at a distance. Add these needs to the sink:

- **Input:** focus navigation through every sample with gamepad and keyboard. Treat focus as the primary state, and show the input-prompt glyphs if the game has them.
- **Resolution:** show it at the lowest and highest supported resolutions, plus ultrawide. Add a safe-area overlay for TV and console.
- **Text:** localised text often runs far longer. Use the long samples from `sink-spec.md`.

## By engine

| Engine | Tokens | Sink and gate | Forcing states | Theme and direction |
| --- | --- | --- | --- | --- |
| Unity UI Toolkit | USS custom properties (`--color-bg-canvas`) in a `tokens.uss`, with one theme stylesheet per mode | `Assets/KitchenSink/KitchenSink.unity` and `.uxml`, in a scene not listed in Build Settings. Or an editor window under an `Editor` folder. | USS pseudo-states are set by the engine, so use `live`, or add a USS class with the same styles (`.force-hover`) | Swap stylesheet; RTL support depends on the Unity version |
| Unity uGUI | ScriptableObject with colours and sizes, read by small applier scripts | Same scene approach | `Selectable` shows states from code: use a subclass exposing `DoStateTransition`, or `ColorBlock` samples. | Swap ScriptableObject. RTL needs TextMeshPro's RTL flag and layout mirroring by hand. |
| Unreal UMG | Data Table or a Primary Data Asset, plus `FSlateBrush` and style assets. Common UI style assets if the project uses them. | `WBP_KitchenSink` in a `Developer` or `Dev` folder, excluded from cooking via Packaging settings, and opened by a console command | `UButton` styles: duplicate `Normal` with `Hovered` values for a static sample. Otherwise `live`. | Swap style data asset; set `FlowDirectionPreference` and culture for RTL |
| Godot | `Theme` resource (`.tres`), with `theme_override_*` only in samples that need it. Generate a `tokens.gd` autoload for values. | `res://kitchen_sink/kitchen_sink.tscn`, excluded in export presets using a filter | Controls use a `StyleBox` per state, so you can apply the hover stylebox as the `normal` override to render a static sample | Swap `Theme`; `layout_direction` set to RTL on the root `Control` |

## Foundations mapping

- Colour, typography, spacing and radius exist, usually through assets rather than code.
- Elevation: show drop shadow assets if used, otherwise `na: <reason>`.
- Motion: show UI animation clips or tween curves. Provide a replay button.
- A manifest `marker` can be the prefab, scene or widget name that appears in the scene or asset text file. Binary assets can't be scanned, so make `entry.files` a text format: Unity scenes with Force Text serialization, Godot `.tscn`, or a C++ or C# file that spawns them. For Unreal, use a source file or a text list of widgets, since Blueprints are binary. Say so in the report.

## Catalog mapping

Keep what the game needs: button, slider, checkbox, select, tabs, list, progress, dialog, tooltip, text input. Add game-specific samples as extra entries where relevant: HUD bars, inventory slots, key-binding rows, notifications, health and resource bars. Mark web-specific components such as breadcrumb, pagination and date picker as gaps with `not used in this game`.

## Presentation

Build it from the engine's own UI panels and the game's theme, so it looks like the game rather than a web page:

- Grid: in Unity UI Toolkit, a container with `flex-direction: row` and `flex-wrap: wrap`. In uGUI, `GridLayoutGroup`, whose cells have a fixed size, so check long localised text. In Unreal, `UWrapBox` or `UUniformGridPanel`. In Godot, `HFlowContainer`, or `GridContainer` with `columns` updated on resize.
- Frames: the theme's panel style, such as a USS class built from tokens, a `PanelContainer` with the theme's `StyleBox` in Godot, or a `UBorder` with the style asset in UMG.
- Feedback: focus is the primary state, so each tile shows the theme's focus style under gamepad and keyboard as well as hover.
- Reduced motion and text size: follow the game's own accessibility settings. If it has none, mark them `na: <reason>`.
- Decorative colour: write the hash yourself. C#'s `string.GetHashCode()` isn't guaranteed to stay the same between runs.

## Verify

The engines are heavy and typically need an installed editor at a specific version:

- Godot: `godot --headless --path . --quit` for a basic load check.
- Unity: `Unity -batchmode -projectPath . -quit -logFile -` with the project's exact editor version.
- Unreal: compile through the project's build tools.

If the editor isn't available, say that the sink hasn't been opened, and give the steps. Scenes and assets written by hand may need an editor reimport, so tell the user to expect that.

## Pitfalls

- Editing binary assets by hand isn't possible. Prefer text formats, or scripts that build the scene at runtime.
- Unity `.meta` files must stay paired with their assets. Let the editor generate them.
- Check the engine version before using UI APIs, since these change between major releases.
