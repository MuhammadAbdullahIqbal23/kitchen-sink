# Changelog

## 1.1.0

- Sinks now have a deliberate presentation, built only from the project's own tokens and components: an overview with counts from the manifest, a tiled section index, framed component blocks with a source note, muted sample labels, compact controls, and tile feedback that respects reduced motion. Decorative colour comes from the palette through a stable hash of the item's name. The spec includes text mocks.
- Every stack adapter says how to build these patterns with its usual tools, with fallbacks such as box-drawing frames in terminals and engine UI panels in game engines.
- Verification checks the presentation at the narrowest width, in every theme, in right-to-left and at the largest text size, on every platform the project targets, with an automated overflow test where the stack allows it.
- `verify-sink.mjs` also flags modern colour functions such as `oklch()` and colours built from interpolated values in generated files.
