# Apple platforms: SwiftUI and UIKit (iOS, macOS, watchOS, tvOS, visionOS)

Building and running requires macOS with Xcode. On any other OS, write the code, run the manifest check, and clearly state in the report that it hasn't been compiled.

## Tokens

- **Colours:** color sets in the asset catalog (`Assets.xcassets`) with Any and Dark appearances, or `Color(light:dark:)` backed by `UIColor { traits in ... }`. Follow what the project does. Generate from `tokens.mjs flatten` JSON.
- **Typography:** prefer Dynamic Type (`.font(.body)`, `.custom(_:size:relativeTo:)`), so text scales.
- **Spacing and radius:** an `enum Spacing { static let s4: CGFloat = 16 }`, or the project's equivalent.
- SwiftUI: expose semantic colours as `extension ShapeStyle where Self == Color`, so `.foregroundStyle(.textMuted)` reads naturally.
- UIKit: `UIColor` and `UIFont` extensions, plus `UIAppearance` or button configurations.

## Where the sink lives and how it's gated

```swift
#if DEBUG
struct KitchenSinkView: View { ... }
#endif
```

Put it in a `KitchenSink/` group. Reach it from a debug-only menu or a launch argument. Add a `#Preview` so that it shows in Xcode canvas without launching the app. Use `NavigationStack` and `List` with one row per section, since one long `VStack` with everything renders slowly. Prefer `LazyVStack` inside sections.

UIKit project: use a `UIViewController` with a collection or table view under `#if DEBUG`, or wrap SwiftUI in `UIHostingController` if the deployment target allows it.

## Forcing states

- Custom SwiftUI styles: a `ButtonStyle` reads `configuration.isPressed`. For generated components, have the style accept an optional forced state.
- System controls can't have pressed or focus states forced. Use `live`.
- `.disabled(true)` gives the real disabled look.
- Hover: real on macOS, iPadOS with a pointer and visionOS. On iPhone use `na: touch only`.
- Focus: `.focused(...)` on macOS, tvOS and text fields.

## Controls

- Theme: `.preferredColorScheme(.dark)` on the root view.
- Direction: `.environment(\.layoutDirection, .rightToLeft)`. Use `.leading` and `.trailing` in generated layout.
- Text scale: `.dynamicTypeSize(.accessibility3)`.
- UIKit: `overrideUserInterfaceStyle` and `semanticContentAttribute`.

## Verify

```bash
xcodebuild -scheme <scheme> -destination 'platform=iOS Simulator,name=<device>' build
xcrun simctl io booted screenshot sink.png
```

List schemes with `xcodebuild -list` and devices with `xcrun simctl list devices`. For a Swift package, use `swift build`.

## Pitfalls

- A file excluded from a target compiles without any error and is never shown. Add new files to the target. New files in folder-synced groups are added automatically on recent Xcode versions, but check older `.pbxproj` setups, because editing that file by hand is fragile. Tell the user if they must add a file in Xcode.
- Check the deployment target before using newer APIs, and use `if #available` where needed.
- Add `accessibilityLabel` to icon-only controls.
- `.sheet` and `.alert` present over everything. Keep them `live`.
