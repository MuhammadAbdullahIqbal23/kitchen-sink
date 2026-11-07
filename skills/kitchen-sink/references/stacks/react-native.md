# React Native and Expo

## Tokens

Generate `src/theme/tokens.ts` from `tokens.mjs flatten` JSON, shaped as `{ light, dark }`. Numbers have no units here (`16`, not `"16px"`), and shadows need both iOS `shadow*` props and Android `elevation`, or the unified `boxShadow` on recent versions.

- **NativeWind or Tailwind:** map tokens into the Tailwind theme with CSS variables via `vars()`.
- **React Native Paper, Tamagui, gluestack, RNE, Restyle:** extend their theme. It's the source of truth. Use `library` in the manifest.
- Plain `StyleSheet`: expose a `useTheme()` hook returning tokens for the current scheme.

## Where the sink lives and how it's gated

| Setup | Location | Gate |
| --- | --- | --- |
| Expo Router | `app/kitchen-sink.tsx` is a thin route, with the sink in another folder | Redirect in release builds, and `require` the sink inside `__DEV__`, shown below |
| React Navigation | `screens/KitchenSinkScreen.tsx` | Register inside `{__DEV__ && <Stack.Screen ... />}`, and `require` the screen inside the guard |

A top-level `import` keeps the sink in the release bundle, even when `__DEV__` guards where it's used. Only a `require` inside the guard gets removed:

```tsx
if (__DEV__) {
  const KitchenSink = require("../kitchen-sink/KitchenSink").default;
  return <KitchenSink />;
}
return <Redirect href="/" />;
```

Add a way to open it, such as a deep link (`myapp://kitchen-sink`) or a dev-only menu entry. Use a `SectionList`, or a list that opens one section per screen, since a single long `ScrollView` with every sample renders slowly.

## Forcing states

- There's no CSS hover. `Pressable` receives `pressed`, `hovered` and `focused` in its style callback. Generated components can take an optional `forceState` prop passed into that callback.
- Hover: `na: touch only` on phones. Keep it for web and tablets with pointers if the app targets them.
- Focus: real on text inputs, and otherwise usually relevant to keyboards and TV only.

## Controls

- Theme: `Appearance.setColorScheme()` on recent versions or a local override in the project's theme context. Use the project's mechanism if it has one.
- Direction: `I18nManager.forceRTL()` requires an app restart, which is a poor fit for a toggle. Offer it with a reload using `expo-updates` or `DevSettings.reload()`, or mirror a section by wrapping it in `direction: "rtl"` style. Say which you chose.
- Text scale: sample with `allowFontScaling` on and test via device settings. Show a preview by multiplying sizes only in the sink if needed.

## Verify

`tsc --noEmit`, lint, then `npx expo start` or `npx react-native run-ios` or `run-android`. Take simulator screenshots with `xcrun simctl io booted screenshot` and `adb exec-out screencap -p`. Without a simulator, say so. Expo web can stand in for a rough layout check, but it doesn't verify native rendering.

## Pitfalls

- Keep touch targets at 44 points or more (`hitSlop` helps).
- Apply safe area insets with `react-native-safe-area-context` if installed.
- `Modal` covers the screen, so keep overlays `live`.
- Text must be inside `<Text>`, or it crashes.
- Accessibility props differ: `accessibilityRole`, `accessibilityState`, `accessibilityLabel`.
- Use `start` and `end` style names rather than `left` and `right`, so RTL works.
