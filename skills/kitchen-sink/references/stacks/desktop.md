# Desktop: WPF, WinUI, MAUI, Avalonia, WinForms, Qt, GTK, JavaFX, Electron, Tauri, Rust and Go toolkits

Hover and focus really matter on desktop, as does keyboard navigation, density, and window resizing. Include all of them.

## Electron and Tauri

The UI is web. Read the adapter for its web framework too, and follow it. Then add:

- Keep the sink route development-only, and don't expose it through the app menu in packaged builds.
- Check any native title bar or window chrome the design relies on.
- Verify with the project's dev command. With Tauri, keep CSP in mind, so inline styles or scripts may be blocked.

## Native toolkits

| Toolkit | Tokens | Sink location and gate | Force states | Theme and direction |
| --- | --- | --- | --- | --- |
| WPF | `ResourceDictionary` per theme (`Themes/Light.xaml`, `Dark.xaml`), `StaticResource` or `DynamicResource` | `Views/KitchenSinkWindow.xaml`, opened under `#if DEBUG` | `VisualStateManager.GoToState(control, "MouseOver", false)` for controls with visual states. Trigger-based templates can't be forced, so use `live`. | Swap merged dictionaries; `FlowDirection="RightToLeft"` |
| WinUI 3, UWP | `ThemeDictionaries` with Light and Dark, `{ThemeResource}` | Page under `#if DEBUG` | `VisualStateManager.GoToState` with "PointerOver" or "Pressed" | `RequestedTheme`, `FlowDirection` |
| .NET MAUI | `ResourceDictionary` and `AppThemeBinding` | `KitchenSinkPage.xaml` with a route under `#if DEBUG` | `VisualStateManager.GoToState` | `Application.UserAppTheme`, `FlowDirection` |
| Avalonia | `ResourceDictionary.ThemeDictionaries`, with `DynamicResource` | Window under `#if DEBUG` | Pseudo-classes through the interface: `((IPseudoClasses)control.Classes).Set(":pointerover", true)`. Plain `control.Classes.Set(...)` throws for pseudo-classes. | `RequestedThemeVariant`, `FlowDirection` |
| WinForms | A static tokens class | Form under `#if DEBUG` | Owner-drawn only. Otherwise `live`. | Colours set in code, `RightToLeft` and `RightToLeftLayout`. Dark mode support is limited, so note this. |
| Qt Widgets | QSS file, with constants generated from tokens | `KitchenSinkWindow` behind a CMake option, default off | `widget->setProperty("forceHover", true)` plus a matching QSS selector such as `QPushButton[forceHover="true"]`. Set it before first paint, or call `style()->unpolish(w)` and `polish(w)` afterwards. `WA_UnderMouse` doesn't trigger QSS `:hover`. | Reload the stylesheet; `QApplication::setLayoutDirection` |
| Qt Quick (QML) | Singleton `Theme.qml` with properties | `KitchenSink.qml`, separate entry target | Custom controls can bind to a `forceState` property. Otherwise `live`. | Theme singleton; `LayoutMirroring.enabled` |
| GTK | CSS with `@define-color` or named colours, Libadwaita's variables if used | Separate binary or a `--kitchen-sink` flag in dev builds | `gtk_widget_set_state_flags(w, GTK_STATE_FLAG_PRELIGHT, FALSE)` | `AdwStyleManager` or the prefer-dark setting; `gtk_widget_set_default_direction` |
| JavaFX | CSS file with looked-up colours | Separate `KitchenSinkApp` class in a dev source set | `node.pseudoClassStateChanged(PseudoClass.getPseudoClass("hover"), true)` | Swap stylesheet; `setNodeOrientation` |
| egui, iced, Slint | Rust constants that feed the toolkit's style or theme | `examples/kitchen_sink.rs`, which never ships | Usually `live`, with a `forced` style argument for custom widgets | Toolkit's theme setting. RTL support varies, so mark as `na: <reason>` if missing. |
| Wails, Fyne | Wails is web, so use its web framework's adapter. Fyne: a custom `Theme`. | Separate `cmd/kitchensink` | Usually `live` | Theme setting. Check RTL support. |

## Tray and window behaviours

Show the things specific to desktop if the catalog's components don't cover them: menus with keyboard accelerators, context menus, toolbars, resizable panes, and status bars. Add them as extra entries in the manifest.

## Presentation

| Toolkit | Grid that follows the width | Framed group |
| --- | --- | --- |
| WPF, Avalonia | `UniformGrid` with `Columns` set from the width on resize, which gives tiles one size. `WrapPanel` doesn't equalise heights. | `Border` with token brushes |
| WinUI 3 | `ItemsRepeater` with `UniformGridLayout` | `Border` with theme resources |
| .NET MAUI | `FlexLayout` with `Wrap="Wrap"` | `Border` |
| WinForms | `FlowLayoutPanel`, with tile heights set to the tallest | `Panel` drawn with token colours |
| Qt Widgets | `QGridLayout`, rebuilt on resize. Qt has no built-in flow layout. | `QFrame` styled through QSS |
| Qt Quick | `GridLayout` with `columns` bound to the width | `Rectangle` from the theme singleton |
| GTK | `GtkFlowBox` with `homogeneous` set, so tiles share a size | `GtkFrame`, or a box with a CSS class |
| JavaFX | `TilePane`, which gives every tile the same size | `StackPane` with a CSS class |

- Feedback: make each tile a button-like control with the toolkit's own hover and pressed states, such as a `Button` with a custom template in XAML. Keyboard focus and an automation name come with it.
- Reduced motion: follow the system setting, such as `SystemParameters.ClientAreaAnimation` in WPF, `UISettings.AnimationsEnabled` in WinUI and `gtk-enable-animations` in GTK. Where the toolkit exposes none, keep tiles still.
- Decorative colour: .NET's `string.GetHashCode()` changes on every run, so write the hash.
- Other toolkits: use their wrapping layout and container the same way. If nothing wraps, use a fixed column count and note it in the report.
- Electron and Tauri: the web rules in `sink-spec.md`.

## Verify

Build with the project's commands (`dotnet build`, `cmake --build`, `meson compile`, `./gradlew build`, `cargo build --example kitchen_sink`). Run it, and take a screenshot if you have a tool for this. Otherwise, give the user the run command and what to check. Resize the window to its minimum size, then tab through it.

## Pitfalls

- `StaticResource` doesn't react to theme changes in XAML. Use `DynamicResource` or `ThemeResource` where the toggle must apply live.
- Windows-only toolkits can't build on other OSes, and vice versa. If so, say that the code hasn't been compiled.
- `#if DEBUG` needs the project's debug configuration to define it, which is the default in .NET but not in CMake. Use a CMake option there.
- A custom control needs an automation peer or accessible name, so screen readers can read it.
- High contrast mode on Windows replaces colours. Check it on WPF and WinUI if possible.
