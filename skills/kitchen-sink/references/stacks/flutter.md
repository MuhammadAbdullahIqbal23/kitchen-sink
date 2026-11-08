# Flutter

## Tokens

Generate `lib/theme/app_tokens.dart` from `tokens.mjs flatten` JSON. Colours become `Color(0xFFRRGGBB)` and dimensions become doubles with no units.

- Build `ThemeData` for light and dark, setting `colorScheme`, `textTheme`, and component themes (`filledButtonTheme`, `inputDecorationTheme`, and so on).
- Keep tokens with no Material equivalent in a `ThemeExtension<AppTokens>`, including `lerp` and `copyWith`, and read them with `Theme.of(context).extension<AppTokens>()!`.
- If the project already has a theme, extend that one rather than creating another.
- The verifier's colour scan skips files listed in `tokens.outputs`, so list the tokens file there.

## Where the sink lives and how it's gated

A separate entry point keeps the sink out of the release app completely:

```
lib/kitchen_sink/main.dart        # void main() => runApp(const KitchenSinkApp());
lib/kitchen_sink/sections/...
```

Run with `flutter run -t lib/kitchen_sink/main.dart`. Gate: `separate entry point, never built by the release target`.

If the project already uses Widgetbook, add use cases there instead.

Render real widgets with `ListView.builder` or `CustomScrollView` slivers, so long pages stay smooth.

## Forcing states

`statesController` forces a state only for properties resolved through `WidgetStateProperty`. Material's default hover and pressed overlay is drawn by `InkWell` from real pointer events, so a default-styled button looks unchanged when forced. Style the states from tokens, and forcing then works:

```dart
final buttonStyle = ButtonStyle(
  backgroundColor: WidgetStateProperty.resolveWith((states) {
    if (states.contains(WidgetState.pressed)) return tokens.actionPrimaryBgActive;
    if (states.contains(WidgetState.hovered)) return tokens.actionPrimaryBgHover;
    return tokens.actionPrimaryBg;
  }),
  side: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.focused)
      ? BorderSide(color: tokens.borderFocus, width: 2)
      : BorderSide.none),
);

FilledButton(
  style: buttonStyle,
  statesController: WidgetStatesController({WidgetState.hovered}),
  onPressed: () {},
  child: const Text('Save'),
);
```

- Put this style in `filledButtonTheme` and the like, rather than on each button, so forced samples and production buttons share it.
- If an existing widget relies on default overlays, or doesn't accept `statesController`, use `live`. Always compare the forced samples on screen. If they look identical, forcing isn't working, so don't record them as `forced`.
- `onPressed: null` gives the real disabled state.
- Text fields: `decoration: InputDecoration(errorText: ...)` gives the error state, and `enabled: false` or `readOnly: true` the others.
- Hover: real on web and desktop, otherwise `na: touch only`. Keep the forced sample anyway if the widget supports it, labelled clearly.

## Controls

Hold the settings in a small `ChangeNotifier` above `MaterialApp`:

- Theme: `MaterialApp(themeMode: ...)`.
- Direction: wrap with `Directionality`, or use `builder:` in `MaterialApp`. Also supply a matching `locale` if the widgets need one. Use `EdgeInsetsDirectional` and `AlignmentDirectional` in generated widgets, so they flip.
- Text scale: wrap with `MediaQuery` and `textScaler: TextScaler.linear(2.0)`.
- Dialogs: `showDialog` for `live`. `Dialog` itself can render inline in a framed `SizedBox` for `static`.

## Presentation

- Grid: `GridView` and `SliverGrid` give every cell a fixed aspect ratio or extent, which clips tiles at large text sizes. For the index, use `LayoutBuilder` to work out the column count, then rows of `IntrinsicHeight` around a `Row` with `crossAxisAlignment: CrossAxisAlignment.stretch` and `Expanded` tiles, so a row shares a height.
- Frames: `Card` or the project's surface widget, themed through `cardTheme`.
- Feedback: an `InkWell` inside the card, so the theme's hover, focus and splash colours show. Wrap the tile in `Semantics(button: true)` with the title as its label. `MediaQuery.disableAnimationsOf(context)` says when to drop extra animation.
- Decorative colour: Dart's `String.hashCode` isn't guaranteed to stay the same between runs, so write the hash. Pick from the `ColorScheme` container roles (`primaryContainer`, `secondaryContainer`, `tertiaryContainer`) with their matching `on…` colours.

## Verify

```bash
flutter analyze
flutter test
flutter run -t lib/kitchen_sink/main.dart -d chrome
```

Web gives quick screenshots through a browser tool if the project enables web. Otherwise use a device or `-d windows`, `-d macos`. A golden test is a good follow-up for regression checks. Offer it, but don't add it unasked.

## Pitfalls

- `Row` overflow shows a red and yellow stripe in debug. Treat any stripe as a bug. Wrap samples with `Wrap` for narrow widths.
- Material 2 and Material 3 widgets look different. Check `useMaterial3`, and match the project.
- Cupertino widgets have their own theming through `CupertinoThemeData`. Include them only if the project uses them.
- Add `Semantics` to custom widgets, since generated ones don't get it automatically.
- A manifest `marker` should be the constructor name, such as `AppButton(`.
