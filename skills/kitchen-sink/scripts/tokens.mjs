#!/usr/bin/env node
// Design token helper. No dependencies.
//
//   node tokens.mjs generate --primary "#4f46e5" [--neutral tinted|gray] [--success "#.."] [--warning "#.."]
//        [--danger "#.."] [--info "#.."] [--font-sans "Inter"] [--font-mono "JetBrains Mono"]
//        [--radius sharp|soft|round|pill] [--density compact|comfortable|spacious] [--type-scale 1.25]
//        [--out design-tokens.json]
//   node tokens.mjs check <tokens.json>     Required tokens, aliases, and contrast in every mode. Exit 1 on failure.
//   node tokens.mjs flatten <tokens.json> [--format json|css]    Resolved values per mode, for porting to any platform.

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const EXT = "io.kitchen-sink";

// ---------- Colour maths (sRGB, WCAG contrast, OKLCH) ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function parseHex(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(String(hex).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
}
const channel = (c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, "0");
const rgbToHex = ({ r, g, b }) => `#${channel(r)}${channel(g)}${channel(b)}`;

function luminance(hex) {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function hexToOklch(hex) {
  const { r, g, b } = parseHex(hex);
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180) / Math.PI };
}
function oklchToLinear(L, C, H) {
  const A = C * Math.cos((H * Math.PI) / 180);
  const B = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}
function oklchToHex(L, C, H) {
  // Reduce chroma until the colour fits in sRGB, which keeps hue and lightness.
  let chroma = C;
  let rgb = oklchToLinear(L, chroma, H);
  const fits = (c) => [c.r, c.g, c.b].every((v) => v >= -0.0005 && v <= 1.0005);
  while (!fits(rgb) && chroma > 0) {
    chroma = Math.max(0, chroma - 0.002);
    rgb = oklchToLinear(L, chroma, H);
  }
  return rgbToHex({ r: toGamma(clamp01(rgb.r)), g: toGamma(clamp01(rgb.g)), b: toGamma(clamp01(rgb.b)) });
}

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const LIGHTNESS = [0.98, 0.955, 0.905, 0.84, 0.75, 0.65, 0.56, 0.48, 0.4, 0.32, 0.24];
const CHROMA_CURVE = [0.1, 0.2, 0.4, 0.65, 0.85, 1, 1, 0.9, 0.75, 0.6, 0.45];

function scale(C, H, exact) {
  const out = {};
  STEPS.forEach((step, i) => (out[step] = oklchToHex(LIGHTNESS[i], C * CHROMA_CURVE[i], H)));
  if (exact) {
    // Pin the given colour to the nearest step, so the brand appears exactly as supplied.
    const { L } = hexToOklch(exact);
    let nearest = 0;
    LIGHTNESS.forEach((v, i) => {
      if (Math.abs(v - L) < Math.abs(LIGHTNESS[nearest] - L)) nearest = i;
    });
    out[STEPS[nearest]] = exact.toLowerCase();
  }
  return out;
}
// Neutrals span further than brand colours, because dark surfaces need to sit well below mid-tones.
const NEUTRAL_LIGHTNESS = [0.985, 0.965, 0.92, 0.87, 0.72, 0.58, 0.5, 0.42, 0.34, 0.25, 0.18];
// Tint fades toward white, since near-white surfaces read as coloured at chroma that looks grey in the mid-tones.
const NEUTRAL_CHROMA_CURVE = [0.2, 0.3, 0.45, 0.6, 0.8, 1, 1, 1, 1, 1, 1];
function neutralScale(C, H) {
  const out = {};
  STEPS.forEach((step, i) => (out[step] = oklchToHex(NEUTRAL_LIGHTNESS[i], C * NEUTRAL_CHROMA_CURVE[i], H)));
  return out;
}
const stepOf = (scaleObj, hex) => STEPS.find((s) => scaleObj[s] === hex.toLowerCase());

// ---------- Token constructors (DTCG 2025.10 shapes) ----------
function colorToken(hex) {
  const { r, g, b, a } = parseHex(hex);
  const round = (x) => Math.round(x * 10000) / 10000;
  const value = { colorSpace: "srgb", components: [round(r), round(g), round(b)], hex: hex.slice(0, 7).toLowerCase() };
  if (a !== 1) value.alpha = round(a);
  return { $type: "color", $value: value };
}
const dim = (value, unit = "px") => ({ value, unit });
const dimToken = (value, unit = "px") => ({ $type: "dimension", $value: dim(value, unit) });
const semantic = (light, dark) => ({
  $type: "color",
  $value: `{${light}}`,
  $extensions: { [EXT]: { modes: { dark: `{${dark}}` } } },
});

// ---------- Generate ----------
const DEFAULT_SANS = ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"];
const DEFAULT_MONO = ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"];

export function generate(options = {}) {
  const primary = (options.primary || "#3b5bdb").toLowerCase();
  if (!parseHex(primary)) throw new Error(`--primary is not a hex colour: ${options.primary}`);
  const warnings = [];
  const brandLch = hexToOklch(primary);
  const hue = Number.isNaN(brandLch.H) ? 0 : brandLch.H;
  const neutralChroma = options.neutral === "gray" || brandLch.C < 0.01 ? 0 : 0.012;

  const hueOf = (hex, fallback) => (hex ? hexToOklch(hex).H : fallback);
  const chromaOf = (hex, fallback) => (hex ? Math.max(hexToOklch(hex).C, 0.05) : fallback);

  // A red brand would make Save and Delete look alike, so move danger away from it. A supplied --danger always wins.
  const DEFAULT_DANGER_HUE = 27;
  const MIN_DANGER_DISTANCE = 25;
  const hueDelta = (a, b) => ((a - b + 540) % 360) - 180;
  const brandIsColourful = brandLch.C >= 0.08;
  const fromDefault = hueDelta(hue, DEFAULT_DANGER_HUE);
  let dangerHue = DEFAULT_DANGER_HUE;
  if (!options.danger && brandIsColourful && Math.abs(fromDefault) < MIN_DANGER_DISTANCE) {
    // Stay below the default warning hue (75), so danger doesn't turn into warning.
    dangerHue = fromDefault < 0 ? Math.min(hue + MIN_DANGER_DISTANCE, 42) : hue - MIN_DANGER_DISTANCE;
  }

  const palettes = {
    brand: scale(Math.max(brandLch.C, 0.0), hue, primary),
    neutral: neutralScale(neutralChroma, hue),
    success: scale(chromaOf(options.success, 0.16), hueOf(options.success, 150), options.success),
    warning: scale(chromaOf(options.warning, 0.16), hueOf(options.warning, 75), options.warning),
    danger: scale(chromaOf(options.danger, 0.2), hueOf(options.danger, dangerHue), options.danger),
    info: scale(chromaOf(options.info, 0.15), hueOf(options.info, 245), options.info),
  };

  const color = { palette: { white: colorToken("#ffffff"), black: colorToken("#000000") } };
  for (const [name, s] of Object.entries(palettes)) {
    color.palette[name] = {};
    for (const step of STEPS) color.palette[name][step] = colorToken(s[step]);
  }

  const ref = (name, step) => `color.palette.${name}.${step}`;
  const WHITE = "color.palette.white";
  const BLACK = "color.palette.black";
  const neutral = palettes.neutral;
  const canvas = { light: "#ffffff", dark: neutral[950] };

  // Pick the text colour for a fill, then move hover and active in whichever direction raises contrast with it.
  function actionSet(name, startLight, startDark) {
    const s = palettes[name];
    const fgFor = (bg) => {
      if (contrast("#ffffff", bg) >= 4.5) return { token: WHITE, hex: "#ffffff" };
      if (contrast(neutral[950], bg) >= 4.5) return { token: ref("neutral", 950), hex: neutral[950] };
      return { token: BLACK, hex: "#000000" };
    };
    const walk = (start) => {
      const idx = STEPS.indexOf(start);
      const fg = fgFor(s[start]);
      const dir = fg.hex === "#ffffff" ? 1 : -1;
      const at = (i) => STEPS[Math.min(STEPS.length - 1, Math.max(0, i))];
      let hover = at(idx + dir);
      let active = at(idx + 2 * dir);
      if (hover === start) hover = at(idx - dir);
      if (active === hover || active === start) active = at(idx - 2 * dir);
      return { start, hover, active, fg };
    };
    const l = walk(startLight);
    const d = walk(startDark);
    return {
      bg: semantic(ref(name, l.start), ref(name, d.start)),
      bgHover: semantic(ref(name, l.hover), ref(name, d.hover)),
      bgActive: semantic(ref(name, l.active), ref(name, d.active)),
      fg: semantic(l.fg.token, d.fg.token),
    };
  }

  const brand = palettes.brand;
  const brandStep = stepOf(brand, primary);
  let darkBrandStep = brandStep;
  if (contrast(brand[darkBrandStep], canvas.dark) < 3) {
    // Brand is too dark to read on a dark canvas, so climb to the nearest step that is visible.
    darkBrandStep = [...STEPS].reverse().find((s) => s <= brandStep && contrast(brand[s], canvas.dark) >= 3) ?? 400;
  }
  if (dangerHue !== DEFAULT_DANGER_HUE) {
    warnings.push(`Primary ${primary} is close to the usual danger red, so danger moved to ${palettes.danger[600]} to keep them apart. Use --danger to choose your own. Danger buttons should also carry an icon or clear wording.`);
  }
  if (contrast(primary, canvas.light) < 3) {
    warnings.push(`Primary ${primary} has ${contrast(primary, canvas.light).toFixed(2)}:1 against a white canvas. Give filled primary buttons a visible border in light mode.`);
  }
  // Links and focus rings sit on every surface, so they must clear the minimum on the worst of them.
  // Every background a control can sit on: canvas, surface, raised and sunken in each mode.
  const surfaces = { light: [canvas.light, neutral[50], neutral[100]], dark: [canvas.dark, neutral[900], neutral[800]] };
  const neutralPassing = (candidates, mode, min) =>
    candidates.find((s) => surfaces[mode].every((on) => contrast(neutral[s], on) >= min));
  const strongLight = neutralPassing(STEPS.filter((s) => s >= 500), "light", 3) ?? 950;
  const strongDark = neutralPassing([...STEPS].reverse().filter((s) => s <= 500), "dark", 3) ?? 50;
  const firstPassing = (candidates, mode, min) =>
    candidates.find((s) => surfaces[mode].every((on) => contrast(brand[s], on) >= min));
  const darker = STEPS.filter((s) => s >= 500);
  const lighter = [...STEPS].reverse().filter((s) => s <= 500);
  const linkLight = firstPassing(darker, "light", 4.5) ?? 950;
  const linkDark = firstPassing(lighter, "dark", 4.5) ?? 50;
  const focusLight = firstPassing([brandStep, ...darker], "light", 3) ?? 950;
  const focusDark = firstPassing([darkBrandStep, ...lighter], "dark", 3) ?? 50;

  color.bg = {
    canvas: { $type: "color", $value: `{${WHITE}}`, $extensions: { [EXT]: { modes: { dark: `{${ref("neutral", 950)}}` } } } },
    surface: semantic(ref("neutral", 50), ref("neutral", 900)),
    raised: { $type: "color", $value: `{${WHITE}}`, $extensions: { [EXT]: { modes: { dark: `{${ref("neutral", 800)}}` } } } },
    sunken: semantic(ref("neutral", 100), ref("neutral", 950)),
    inverse: semantic(ref("neutral", 900), ref("neutral", 100)),
    overlay: {
      $type: "color",
      $value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.5, hex: "#000000" },
      $extensions: { [EXT]: { modes: { dark: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.7, hex: "#000000" } } } },
    },
  };
  color.text = {
    default: semantic(ref("neutral", 900), ref("neutral", 50)),
    muted: semantic(ref("neutral", 700), ref("neutral", 300)),
    disabled: semantic(ref("neutral", 400), ref("neutral", 600)),
    inverse: semantic(ref("neutral", 50), ref("neutral", 900)),
    link: semantic(ref("brand", linkLight), ref("brand", linkDark)),
  };
  color.border = {
    default: semantic(ref("neutral", 200), ref("neutral", 800)),
    strong: semantic(ref("neutral", strongLight), ref("neutral", strongDark)),
    focus: semantic(ref("brand", focusLight), ref("brand", focusDark)),
  };
  color.action = {
    primary: actionSet("brand", brandStep, darkBrandStep),
    secondary: {
      bg: semantic(ref("neutral", 100), ref("neutral", 800)),
      bgHover: semantic(ref("neutral", 200), ref("neutral", 700)),
      bgActive: semantic(ref("neutral", 300), ref("neutral", 600)),
      fg: semantic(ref("neutral", 900), ref("neutral", 50)),
    },
    // Starts at 500 in dark mode, since the lighter walk for hover and active would wash out from 400.
    danger: actionSet("danger", 600, 500),
  };
  color.feedback = {};
  for (const name of ["success", "warning", "danger", "info"]) {
    const s = palettes[name];
    const onSolid = (bg) => (contrast("#ffffff", bg) >= 4.5 ? WHITE : contrast(neutral[950], bg) >= 4.5 ? ref("neutral", 950) : BLACK);
    color.feedback[name] = {
      bg: semantic(ref(name, 100), ref(name, 950)),
      fg: semantic(ref(name, 800), ref(name, 200)),
      border: semantic(ref(name, 300), ref(name, 700)),
      solid: semantic(ref(name, 600), ref(name, 400)),
      onSolid: semantic(onSolid(s[600]), onSolid(s[400])),
    };
  }

  const radiusPresets = {
    sharp: [0, 0, 2, 2],
    soft: [4, 8, 12, 16],
    round: [8, 12, 16, 24],
    pill: [8, 12, 16, 24],
  };
  const radiusName = options.radius || "soft";
  if (!radiusPresets[radiusName]) throw new Error(`--radius must be one of ${Object.keys(radiusPresets).join(", ")}`);
  const [rSm, rMd, rLg, rXl] = radiusPresets[radiusName];

  const densities = { compact: [28, 32, 40], comfortable: [32, 40, 48], spacious: [36, 44, 52] };
  const densityName = options.density || "comfortable";
  if (!densities[densityName]) throw new Error(`--density must be one of ${Object.keys(densities).join(", ")}`);
  const [cSm, cMd, cLg] = densities[densityName];

  const ratio = Number(options["type-scale"] || 1.25);
  const sizeAt = (n) => Math.round(16 * ratio ** n);
  const typo = (size, weight, lineHeight, family = "{font.family.sans}") => ({
    $type: "typography",
    $value: { fontFamily: family, fontSize: dim(size), fontWeight: weight, letterSpacing: dim(0), lineHeight },
  });
  const easing = (v) => ({ $type: "cubicBezier", $value: v });
  const dur = (v) => ({ $type: "duration", $value: { value: v, unit: "ms" } });
  const shadow = (y, blur, spread, alpha) => ({
    $type: "shadow",
    $value: {
      color: { colorSpace: "srgb", components: [0, 0, 0], alpha, hex: "#000000" },
      offsetX: dim(0),
      offsetY: dim(y),
      blur: dim(blur),
      spread: dim(spread),
    },
  });
  const num = (v) => ({ $type: "number", $value: v });

  const space = {};
  for (const n of [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20]) space[n] = dimToken(n * 4);

  const fontSans = options["font-sans"] ? [options["font-sans"], ...DEFAULT_SANS] : DEFAULT_SANS;
  const fontMono = options["font-mono"] ? [options["font-mono"], ...DEFAULT_MONO] : DEFAULT_MONO;

  const tokens = {
    $description: `Generated by the kitchen-sink skill from primary ${primary}. Follows DTCG format 2025.10. Dark values live in $extensions["${EXT}"].modes.dark.`,
    color,
    space,
    radius: {
      none: dimToken(0),
      sm: dimToken(rSm),
      md: dimToken(rMd),
      lg: dimToken(rLg),
      xl: dimToken(rXl),
      full: dimToken(9999),
      control: dimToken(radiusName === "pill" ? 9999 : rMd),
    },
    size: {
      control: { sm: dimToken(cSm), md: dimToken(cMd), lg: dimToken(cLg) },
      touchTarget: dimToken(44),
      icon: { sm: dimToken(16), md: dimToken(20), lg: dimToken(24) },
    },
    border: { width: { thin: dimToken(1), thick: dimToken(2) } },
    font: {
      family: {
        sans: { $type: "fontFamily", $value: fontSans },
        mono: { $type: "fontFamily", $value: fontMono },
      },
      weight: {
        regular: { $type: "fontWeight", $value: 400 },
        medium: { $type: "fontWeight", $value: 500 },
        semibold: { $type: "fontWeight", $value: 600 },
        bold: { $type: "fontWeight", $value: 700 },
      },
    },
    typography: {
      display: typo(sizeAt(5), 700, 1.1),
      h1: typo(sizeAt(4), 700, 1.15),
      h2: typo(sizeAt(3), 600, 1.2),
      h3: typo(sizeAt(2), 600, 1.25),
      h4: typo(sizeAt(1), 600, 1.3),
      bodyLg: typo(18, 400, 1.5),
      body: typo(16, 400, 1.5),
      bodySm: typo(14, 400, 1.45),
      label: typo(14, 500, 1.3),
      caption: typo(12, 400, 1.35),
      code: typo(14, 400, 1.5, "{font.family.mono}"),
    },
    shadow: { sm: shadow(1, 2, 0, 0.1), md: shadow(4, 12, -2, 0.14), lg: shadow(12, 32, -6, 0.2) },
    motion: {
      duration: { fast: dur(100), base: dur(180), slow: dur(280) },
      easing: {
        standard: easing([0.2, 0, 0, 1]),
        enter: easing([0, 0, 0.2, 1]),
        exit: easing([0.4, 0, 1, 1]),
      },
    },
    opacity: { disabled: num(0.5) },
    layer: { dropdown: num(1000), sticky: num(1100), overlay: num(1200), modal: num(1300), toast: num(1400), tooltip: num(1500) },
    breakpoint: { sm: dimToken(640), md: dimToken(768), lg: dimToken(1024), xl: dimToken(1280) },
  };
  return { tokens, warnings };
}

// ---------- Read tokens ----------
const isToken = (node) => node && typeof node === "object" && "$value" in node;

function lookup(tokens, path) {
  return path.split(".").reduce((node, key) => (node && typeof node === "object" ? node[key] : undefined), tokens);
}
function valueFor(node, mode) {
  const modes = node.$extensions?.[EXT]?.modes;
  return mode !== "light" && modes && mode in modes ? modes[mode] : node.$value;
}
function resolve(tokens, value, mode, trail = []) {
  if (typeof value === "string") {
    const m = /^\{([^{}]+)\}$/.exec(value);
    if (m) {
      if (trail.includes(m[1])) throw new Error(`Circular alias: ${[...trail, m[1]].join(" -> ")}`);
      const target = lookup(tokens, m[1]);
      if (!isToken(target)) throw new Error(`Broken alias: {${m[1]}}`);
      return resolve(tokens, valueFor(target, mode), mode, [...trail, m[1]]);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => resolve(tokens, v, mode, trail));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolve(tokens, v, mode, trail);
    return out;
  }
  return value;
}
function walkTokens(node, path = [], out = []) {
  if (!node || typeof node !== "object") return out;
  if (isToken(node)) {
    out.push({ path: path.join("."), node });
    return out;
  }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith("$")) walkTokens(v, [...path, k], out);
  return out;
}
function modesIn(tokens) {
  const modes = new Set(["light"]);
  for (const { node } of walkTokens(tokens)) {
    for (const m of Object.keys(node.$extensions?.[EXT]?.modes || {})) modes.add(m);
  }
  return [...modes];
}
function hexOf(value) {
  if (typeof value === "string" && parseHex(value)) return value.slice(0, 7);
  if (value && typeof value === "object" && value.hex) return value.hex;
  if (value && typeof value === "object" && Array.isArray(value.components) && (value.colorSpace || "srgb") === "srgb") {
    const [r, g, b] = value.components;
    return rgbToHex({ r, g, b });
  }
  return null;
}

// ---------- Check ----------
const REQUIRED = [
  "color.bg.canvas", "color.bg.surface", "color.bg.raised", "color.bg.sunken", "color.bg.inverse", "color.bg.overlay",
  "color.text.default", "color.text.muted", "color.text.disabled", "color.text.inverse", "color.text.link",
  "color.border.default", "color.border.strong", "color.border.focus",
  ...["bg", "bgHover", "bgActive", "fg"].flatMap((k) => ["primary", "secondary", "danger"].map((a) => `color.action.${a}.${k}`)),
  ...["bg", "fg", "border", "solid", "onSolid"].flatMap((k) => ["success", "warning", "danger", "info"].map((a) => `color.feedback.${a}.${k}`)),
  "space.1", "space.2", "space.4", "space.8",
  "radius.sm", "radius.md", "radius.lg", "radius.full", "radius.control",
  "size.control.sm", "size.control.md", "size.control.lg",
  "font.family.sans", "font.family.mono",
  "typography.h1", "typography.h2", "typography.h3", "typography.body", "typography.bodySm", "typography.label", "typography.caption", "typography.code",
  "shadow.sm", "shadow.md", "shadow.lg",
  "motion.duration.fast", "motion.duration.base", "motion.easing.standard",
];
const PAIRS = [
  ["color.text.default", "color.bg.canvas", 4.5], ["color.text.default", "color.bg.surface", 4.5],
  ["color.text.default", "color.bg.raised", 4.5], ["color.text.default", "color.bg.sunken", 4.5],
  ["color.text.muted", "color.bg.canvas", 4.5], ["color.text.muted", "color.bg.surface", 4.5],
  ["color.text.muted", "color.bg.raised", 4.5],
  ["color.text.link", "color.bg.canvas", 4.5], ["color.text.link", "color.bg.surface", 4.5],
  ["color.text.inverse", "color.bg.inverse", 4.5],
  ...["canvas", "surface", "raised", "sunken"].flatMap((bg) => [
    ["color.border.strong", `color.bg.${bg}`, 3],
    ["color.border.focus", `color.bg.${bg}`, 3],
  ]),
  ["color.text.link", "color.bg.raised", 4.5],
  ...["primary", "secondary", "danger"].flatMap((a) => ["bg", "bgHover", "bgActive"].map((k) => [`color.action.${a}.fg`, `color.action.${a}.${k}`, 4.5])),
  ...["success", "warning", "danger", "info"].flatMap((a) => [
    [`color.feedback.${a}.fg`, `color.feedback.${a}.bg`, 4.5],
    [`color.feedback.${a}.onSolid`, `color.feedback.${a}.solid`, 4.5],
  ]),
];

export function check(tokens) {
  const errors = [];
  const results = [];
  for (const path of REQUIRED) if (!isToken(lookup(tokens, path))) errors.push(`Missing required token: ${path}`);
  const modes = modesIn(tokens);
  for (const { path, node } of walkTokens(tokens)) {
    for (const mode of modes) {
      try {
        resolve(tokens, valueFor(node, mode), mode);
      } catch (e) {
        errors.push(`${path} (${mode}): ${e.message}`);
      }
    }
  }
  for (const mode of modes) {
    for (const [fgPath, bgPath, min] of PAIRS) {
      const fgNode = lookup(tokens, fgPath);
      const bgNode = lookup(tokens, bgPath);
      if (!isToken(fgNode) || !isToken(bgNode)) continue;
      let fg, bg;
      try {
        fg = hexOf(resolve(tokens, valueFor(fgNode, mode), mode));
        bg = hexOf(resolve(tokens, valueFor(bgNode, mode), mode));
      } catch {
        continue;
      }
      if (!fg || !bg) {
        results.push({ mode, fg: fgPath, bg: bgPath, min, ratio: null, pass: true, note: "not sRGB, check by eye" });
        continue;
      }
      const ratio = contrast(fg, bg);
      const pass = ratio >= min;
      results.push({ mode, fg: fgPath, bg: bgPath, fgHex: fg, bgHex: bg, min, ratio: Math.round(ratio * 100) / 100, pass });
      if (!pass) errors.push(`Contrast ${ratio.toFixed(2)}:1 is below ${min}:1 in ${mode}: ${fgPath} (${fg}) on ${bgPath} (${bg})`);
    }
  }
  return { ok: errors.length === 0, modes, errors, results };
}

// ---------- Flatten ----------
const px = (d) => (d && typeof d === "object" && "unit" in d ? `${d.value}${d.unit}` : d);
function colorString(value) {
  const hex = hexOf(value);
  if (!hex) return JSON.stringify(value);
  if (value && typeof value === "object" && typeof value.alpha === "number" && value.alpha !== 1) {
    const { r, g, b } = parseHex(hex);
    return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)} / ${value.alpha})`;
  }
  return hex;
}
function flatValue(type, value) {
  switch (type) {
    case "color": return colorString(value);
    case "dimension":
    case "duration": return px(value);
    case "fontFamily": return Array.isArray(value) ? value.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(", ") : value;
    case "cubicBezier": return `cubic-bezier(${value.join(", ")})`;
    case "shadow": {
      const one = (s) => `${px(s.offsetX)} ${px(s.offsetY)} ${px(s.blur)} ${px(s.spread)} ${colorString(s.color)}`;
      return Array.isArray(value) ? value.map(one).join(", ") : one(value);
    }
    case "typography":
      return {
        fontFamily: flatValue("fontFamily", value.fontFamily),
        fontSize: px(value.fontSize),
        fontWeight: value.fontWeight,
        letterSpacing: px(value.letterSpacing),
        lineHeight: value.lineHeight,
      };
    default: return value;
  }
}
export function flatten(tokens) {
  const out = {};
  for (const mode of modesIn(tokens)) {
    out[mode] = {};
    for (const { path, node } of walkTokens(tokens)) {
      if (mode !== "light" && !node.$extensions?.[EXT]?.modes?.[mode]) continue;
      out[mode][path] = flatValue(node.$type, resolve(tokens, valueFor(node, mode), mode));
    }
  }
  return out;
}
export function toCss(flat) {
  const kebab = (s) => s.replace(/\./g, "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const decls = (vars) =>
    Object.entries(vars)
      .flatMap(([path, value]) =>
        value && typeof value === "object"
          ? Object.entries(value).map(([k, v]) => `  --${kebab(path)}-${kebab(k)}: ${v};`)
          : [`  --${kebab(path)}: ${value};`]
      )
      .join("\n");
  const blocks = [`:root {\n${decls(flat.light)}\n}`];
  for (const [mode, vars] of Object.entries(flat)) {
    if (mode !== "light") blocks.push(`[data-theme="${mode}"] {\n${decls(vars)}\n}`);
  }
  return blocks.join("\n\n") + "\n";
}

// ---------- CLI ----------
function parseArgs(argv) {
  const opts = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) opts[argv[i].slice(2)] = argv[++i];
    else positional.push(argv[i]);
  }
  return { opts, positional };
}
function loadTokens(path) {
  if (!path) throw new Error("Give the path to a tokens JSON file.");
  return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { opts, positional } = parseArgs(rest);
  try {
    if (command === "generate") {
      const { tokens, warnings } = generate(opts);
      const json = JSON.stringify(tokens, null, 2) + "\n";
      if (opts.out) writeFileSync(opts.out, json);
      else process.stdout.write(json);
      const result = check(tokens);
      const failed = result.errors.length;
      console.error(`${opts.out ? `Wrote ${opts.out}. ` : ""}Checked ${result.results.length} contrast pairs: ${failed} failed.`);
      for (const w of warnings) console.error(`Warning: ${w}`);
      for (const e of result.errors) console.error(`Error: ${e}`);
      process.exit(failed ? 1 : 0);
    } else if (command === "check") {
      const result = check(loadTokens(positional[0]));
      console.log(`Modes: ${result.modes.join(", ")}. Contrast pairs checked: ${result.results.length}.`);
      for (const e of result.errors) console.log(`FAIL ${e}`);
      console.log(result.ok ? "PASS" : `${result.errors.length} problem(s).`);
      process.exit(result.ok ? 0 : 1);
    } else if (command === "flatten") {
      const flat = flatten(loadTokens(positional[0]));
      process.stdout.write(opts.format === "css" ? toCss(flat) : JSON.stringify(flat, null, 2) + "\n");
    } else {
      console.error("Usage: tokens.mjs generate --primary #hex [--out file] | check <file> | flatten <file> [--format json|css]");
      process.exit(2);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(2);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();
