# Verification

Run the levels in order. Each one catches what the last one can't. Say in the report which levels ran and which didn't. Use the project's own tools and keep the effort in proportion to the sink. Write a throwaway test harness only when it's the one way to see the result.

## Level 1: Manifest and tokens

```bash
node <skill-dir>/scripts/verify-sink.mjs <project-dir>
```

Checks coverage for the tier, that every state is accounted for, that entry files render each component's marker, foundations, controls, compositions, gating, generated files free of hard-coded colours, no lorem ipsum, and tokens with contrast.

It reads text only, so a pass doesn't prove the sink works. Fix the root cause of a failure. Don't edit the manifest until it passes unless the manifest was wrong. Marking an unbuilt state `static` would make the whole report a lie.

Without Node: walk through the same list by hand and say so in the report.

## Level 2: Build

Use the project's own commands, found in its scripts, Makefile, README or CI config. Run its type checker, linter and build, or the adapter's equivalent. If these failed before your change, say that, and don't fix unrelated problems. Your new files must be clean.

For gated sinks, also confirm the gate. Build for production where practical, then search the output for a distinctive string from the sink. A route that returns 404 can still ship all of its code to the browser, so checking the route alone isn't enough. If the string is there and the stack can't avoid it, say so in the report. Then check the sink still opens in development, since a gate that removes it everywhere also passes the search.

## Level 3: Run and look

Start the sink and look at it. Use a browser tool, simulator, emulator or screenshot tool if you have one. Otherwise run the program and capture its output or ask the user to open it. For each combination below, take a screenshot and read it:

| Check | Web | Native |
| --- | --- | --- |
| Each theme the tokens define, wide | Yes | Yes |
| Right-to-left | Yes | Yes, or simulator setting |
| Narrowest supported width | 375 px, or narrower if the project supports it | Smallest supported device or window |
| Largest text size | 200% browser zoom | Largest system font scale |

Look for:

- Horizontal scrollbar or anything clipped
- Text or icons that disappear in dark mode
- Icons and chevrons that don't flip in right-to-left, and margins on the wrong side
- States that look the same when they should differ
- Focus rings that are missing or hidden by overflow
- Loading states that shift layout
- Overlays that open behind things
- Errors in the console or runtime log

On the web, overflow is easy to miss in a screenshot, so measure it at each width. `document.documentElement.scrollWidth > document.documentElement.clientWidth` means the page scrolls sideways, and this lists the elements wider than the screen, outermost first. The innermost ones are usually the cause:

```js
[...document.querySelectorAll("body *")]
  .filter((e) => e.getBoundingClientRect().width > document.documentElement.clientWidth)
  .map((e) => e.tagName + " " + e.className);
```

If you can't open the sink in any browser or device, say that narrow-width layout is unchecked. Reading the code doesn't reliably catch this.

Screenshots taken right after a theme switch can catch colours mid-transition, and hidden or background windows may delay them further. Before calling a colour wrong, wait a moment or read the computed value.

Then exercise the live items: tab through the page, open and close each overlay with the keyboard, and confirm focus returns. Reload to confirm theme choice persists if you made it persist.

### Presentation

Check the overview, section index, component frames and controls at the narrowest supported width, in every theme, in right-to-left and at the largest text size. Do it on every platform code path the project has, such as iOS and Android, web and native, or each desktop OS whose rendering differs, since one platform passing says nothing about another. Combine checks where it's cheap: the narrowest width with the largest text finds most overflow.

Mark a check that doesn't apply as `na: <reason>` in the report, as with states. For example, text size in a terminal is `na: the terminal emulator sets the font size`.

Look for tiles in a row with different heights, labels that crowd the samples, controls that cover content, and decorative colours that change on reload.

Framing a sample inside another framed area narrows it by that frame's padding and border, and the loss adds up with each level. This is a common source of overflow at large text sizes, so check the most deeply framed samples first.

Where the stack allows it, back the screenshots with an automated render or UI test that fails on overflow and clipping, at the narrowest width and the largest text size. Use the project's own test tools. If none fit, run the test once without adding it to the project, or ask before adding a dependency. Offer to keep it as a regression check.

| Stack | Test that fails on overflow |
| --- | --- |
| Web | A browser test or browser tool session that fails when the `scrollWidth` check above finds anything, or when an element with hidden overflow has a `scrollWidth` larger than its `clientWidth`. Intended truncation, such as an ellipsis edge case, is fine. For 200% zoom, halve the viewport width, which gives the same layout. |
| Flutter | A widget test with a small `tester.view.physicalSize` and a `MediaQuery` set to `TextScaler.linear(2.0)` or more. Overflow errors fail the test by themselves. |
| Compose | A UI test using `DeviceConfigurationOverride` with `FontScale` and `ForcedSize`, which checks `hasVisualOverflow` on each text node's `TextLayoutResult`. Check that the installed test library has these. |
| SwiftUI and UIKit | A UI test launched with `-UIPreferredContentSizeCategoryName UICTContentSizeCategoryAccessibilityXXXL` on the smallest simulator, which checks that each element's frame sits inside the window. |
| Terminal | Render a frame at the smallest supported size, and fail if a line is wider than the terminal or a border is cut off. |
| Others | Usually no practical automated check. Say so, and rely on screenshots. |

## Level 4: Accessibility scan

Web: if the project already has axe, Pa11y or Lighthouse, use it. If you have a browser tool, you can inject axe-core in that session without adding a dependency. Native: use the platform's accessibility inspector if available. Scanners catch only part of the problems, so the keyboard pass from Level 3 still matters.

Findings in existing components go in the report. Fix findings in what you generated.

## When things can't run

Be plain about it. Common cases: no simulator on this machine, a backend the app needs, missing licence keys for a commercial library, or a platform that needs a different OS (Xcode on Windows, for example). Finish the levels you can, then give the user the exact command to run and what to check.

## Finishing

Fix and recheck for up to three rounds. If problems remain after that, stop and list them. A clear list helps the user more than more rounds of guessing.
