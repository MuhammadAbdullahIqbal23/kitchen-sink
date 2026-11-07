# Android: Jetpack Compose, Compose Multiplatform, XML Views

## Tokens

- **Compose:** `ui/theme/Color.kt`, `Type.kt` and `Theme.kt`, generated from `tokens.mjs flatten` JSON. Build `lightColorScheme` and `darkColorScheme` for `MaterialTheme`. Keep tokens with no Material equivalent in a custom `@Immutable data class` provided through a `staticCompositionLocalOf`.
- **XML Views:** `res/values/colors.xml`, `res/values-night/colors.xml`, `dimens.xml`, and theme attributes in `themes.xml`. Use `?attr/` references in layouts.
- If the app supports dynamic colour, show both dynamic and brand versions, or state which is used.
- List the theme files in `tokens.outputs` so the hard-coded colour scan skips them.

## Where the sink lives and how it's gated

Use the debug source set, which release builds never compile:

```
app/src/debug/java/<package>/kitchensink/KitchenSinkActivity.kt
app/src/debug/AndroidManifest.xml   # declares the activity
```

Open with `adb shell am start -n <appId>/<package>.kitchensink.KitchenSinkActivity`, or add a launcher entry in the debug manifest. Use `LazyColumn` with sections, so a long page stays smooth.

Compose Multiplatform: put the sink in `commonMain`, and add a dev-only entry per target (`desktopMain` is the fastest to run). Keep it out of release targets using a separate run configuration or source set.

## Forcing states

Compose interaction state comes from `MutableInteractionSource`. Material components accept one, so you can emit an interaction to force the state on real components:

```kotlin
val source = remember { MutableInteractionSource() }
LaunchedEffect(Unit) { source.emit(PressInteraction.Press(Offset.Zero)) }
Button(onClick = {}, interactionSource = source) { Text("Pressed") }
```

- The same works for `HoverInteraction.Enter` and `FocusInteraction.Focus`. Check visually, because some components animate these or only use them for ripples. Fall back to `live` if a state doesn't show.
- `enabled = false` and `isError = true` provide real states.
- Hover: `na: touch only`, unless the app supports desktop, ChromeOS or mouse input.

XML Views: `view.isPressed = true`, `view.isHovered = true`, and `view.isEnabled = false` can drive state lists. Focus needs `requestFocus`, so usually `live`.

## Controls

- Theme: pass `darkTheme` into the app theme from state.
- Direction: `CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl)`. Use `start` and `end` padding in generated code. XML: `layoutDirection="rtl"`, plus `android:supportsRtl="true"`.
- Text scale: override `LocalDensity` with a changed `fontScale`.

## Verify

```bash
./gradlew assembleDebug lintDebug
./gradlew installDebug
adb exec-out screencap -p > sink.png
```

Add `@Preview` functions with `uiMode` and `locale = "ar"` where useful. They let Android Studio show themes side by side. On Windows use `gradlew.bat`. With no emulator or device, say the sink hasn't been seen running.

## Pitfalls

- A debug manifest entry needs `android:exported="true"` for launching through `adb` from outside the app.
- Check the Compose BOM and Material version in the Gradle files. Some APIs (`Modifier.hoverable`, `Material3` components) differ across versions.
- Touch targets: `Modifier.minimumInteractiveComponentSize()`.
- Custom composables need `Modifier.semantics` with a role and state.
- Don't edit a `release` signing or build configuration for this work.
