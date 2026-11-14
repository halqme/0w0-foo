// Theme fade colors, planned in contrast rather than color values.
//
// Each color follows a path of signed log contrast, ln R, against the color behind
// it. R is the WCAG ratio, with its 0.05 flare term. ln R moves at a constant rate,
// so samples at equal times form a geometric series of ratios. Text that changes
// from darker to lighter than its fill crosses 1:1 at the instant it flips, and
// passes the hard-to-read band near 1:1 at the same rate as the rest of the path.
// The canvas follows ln(Y + 0.05), its contrast against black.

import { palette, semanticColors } from "./palette";

type Rgb = [number, number, number];
type Lab = [number, number, number];

export type ThemeFadeColor = {
  // Variable name without the leading dashes, such as `colors-ink`.
  name: string;
  light: string;
  dark: string;
  // The color this one sits on. Defaults to the canvas.
  on?: string;
};

const flare = 0.05;

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const toEncoded = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;

const map3 = (
  [x, y, z]: Rgb,
  fn: (value: number, index: number) => number,
): Rgb => [fn(x, 0), fn(y, 1), fn(z, 2)];

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const labToLinear = ([l, a, b]: Lab): Rgb => {
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ];
};

const linearToLab = ([r, g, b]: Rgb): Lab => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

// Accepts `#rrggbb` and `oklch(L C H / alpha)`, the forms the palette uses.
export function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const hex = /^#([\da-f]{6})$/i.exec(value);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return {
      rgb: map3([(n >> 16) & 255, (n >> 8) & 255, n & 255], (c) =>
        toLinear(c / 255),
      ),
      alpha: 1,
    };
  }
  const oklch =
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)$/.exec(
      value,
    );
  if (oklch) {
    const [l, c, h] = oklch.slice(1, 4).map(Number);
    const rad = (h * Math.PI) / 180;
    return {
      rgb: labToLinear([l, c * Math.cos(rad), c * Math.sin(rad)]),
      alpha: oklch[4] === undefined ? 1 : Number(oklch[4]),
    };
  }
  throw new Error(`Unsupported color: ${value}`);
}

const inGamut = (rgb: Rgb) => rgb.every((c) => c >= -1e-6 && c <= 1 + 1e-6);

// The color with hue and chroma of `lab` whose luminance is `y`. Chroma shrinks
// when the result falls outside sRGB.
function withLuminance([, a, b]: Lab, y: number): Rgb {
  for (let chroma = 1; ; chroma *= 0.95) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (luminance(labToLinear([mid, a * chroma, b * chroma])) < y) lo = mid;
      else hi = mid;
    }
    const rgb = labToLinear([(lo + hi) / 2, a * chroma, b * chroma]);
    if (inGamut(rgb) || chroma < 1e-3) {
      return map3(rgb, (c) => Math.min(1, Math.max(0, c)));
    }
  }
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

// Browsers blend translucent colors in encoded sRGB, so a gray overlay's visible
// luminance depends on the color under it.
const composite = (top: Rgb, alpha: number, under: Rgb): Rgb =>
  map3(top, (c, i) => toLinear(lerp(toEncoded(under[i]), toEncoded(c), alpha)));

const logContrast = (y: number, under: number) =>
  Math.log((y + flare) / (under + flare));

const format = (rgb: Rgb, alpha: number) => {
  const [r, g, b] = rgb.map((c) => Math.round(toEncoded(c) * 255 * 100) / 100);
  return alpha < 1 ? `rgb(${r} ${g} ${b} / ${alpha})` : `rgb(${r} ${g} ${b})`;
};

/**
 * The colors at `t`, from 0 (light) to 1 (dark), as linear RGB. A translucent
 * color comes back with its alpha, and its contrast is that of the blend.
 */
export function themeFadeAt(
  canvas: ThemeFadeColor,
  colors: ThemeFadeColor[],
  t: number,
): Map<string, { rgb: Rgb; alpha: number }> {
  const result = new Map<string, { rgb: Rgb; alpha: number }>();
  const light = parseColor(canvas.light).rgb;
  const dark = parseColor(canvas.dark).rgb;
  const canvasY =
    Math.exp(
      lerp(
        Math.log(luminance(light) + flare),
        Math.log(luminance(dark) + flare),
        t,
      ),
    ) - flare;
  result.set(canvas.name, {
    rgb: withLuminance(
      lerp3(linearToLab(light), linearToLab(dark), t),
      canvasY,
    ),
    alpha: 1,
  });

  // A color resolves after the one it sits on.
  const pending = [...colors];
  while (pending.length > 0) {
    const index = pending.findIndex((color) =>
      result.has(color.on ?? canvas.name),
    );
    if (index === -1) throw new Error("Theme fade colors refer in a cycle");
    const [color] = pending.splice(index, 1);
    const under = result.get(color.on ?? canvas.name)!.rgb;
    const ends = (["light", "dark"] as const).map((mode) => {
      const self = parseColor(color[mode]);
      const underEnd = at(color.on, mode);
      return {
        ...self,
        contrast: logContrast(
          luminance(composite(self.rgb, self.alpha, underEnd)),
          luminance(underEnd),
        ),
      };
    });
    const alpha = lerp(ends[0].alpha, ends[1].alpha, t);
    const visible = withLuminance(
      lerp3(linearToLab(ends[0].rgb), linearToLab(ends[1].rgb), t),
      Math.exp(lerp(ends[0].contrast, ends[1].contrast, t)) *
        (luminance(under) + flare) -
        flare,
    );
    result.set(color.name, {
      rgb: alpha < 1 ? uncomposite(visible, alpha, under) : visible,
      alpha,
    });
  }
  return result;

  function at(name: string | undefined, mode: "light" | "dark"): Rgb {
    if (!name || name === canvas.name) return mode === "light" ? light : dark;
    const color = colors.find((c) => c.name === name);
    if (!color) throw new Error(`Unknown theme fade color: ${name}`);
    const parsed = parseColor(color[mode]);
    return composite(parsed.rgb, parsed.alpha, at(color.on, mode));
  }
}

const lerp3 = (from: Lab, to: Lab, t: number): Lab =>
  map3(from, (c, i) => lerp(c, to[i], t));

// The top color that blends with `under` at `alpha` into `visible`.
const uncomposite = (visible: Rgb, alpha: number, under: Rgb): Rgb =>
  map3(visible, (c, i) =>
    toLinear(
      Math.min(
        1,
        Math.max(0, (toEncoded(c) - (1 - alpha) * toEncoded(under[i])) / alpha),
      ),
    ),
  );

// How far along the path a fade is, from the share of its time played. The
// speed is constant for the first `cruise` of the time, which covers the polarity
// flips, then falls evenly to zero. A linear fade stops at full speed, which reads
// as a snap.
const cruise = 0.6;
const speed = 2 / (1 + cruise);

export function themeFadeEase(time: number): number {
  if (time <= cruise) return speed * time;
  const tail = time - cruise;
  return speed * (time - (tail * tail) / (2 * (1 - cruise)));
}

// The inverse of themeFadeEase.
export function themeFadeTimeAt(position: number): number {
  if (position <= speed * cruise) return position / speed;
  const rest = 1 - cruise;
  return (
    cruise +
    rest *
      (1 -
        Math.sqrt(
          Math.max(0, 1 - (2 * (position - speed * cruise)) / (speed * rest)),
        ))
  );
}

const child = (node: unknown, key: string): unknown =>
  typeof node === "object" && node !== null
    ? Object.entries(node).find(([name]) => name === key)?.[1]
    : undefined;

/**
 * Light and dark pairs from Panda color config: primitives under `tokens.colors`,
 * and semantic colors with `{ base, _dark }` values that reference them. A
 * semantic color that only points at another semantic color follows it already,
 * so it is left out.
 */
export function themeColorsFromTokens(
  primitives: unknown,
  semantic: unknown,
): ThemeFadeColor[] {
  const resolve = (value: string): string => {
    const ref = /^\{colors\.(.+)\}$/.exec(value);
    if (!ref) return value;
    const resolved = child(
      ref[1].split(".").reduce(child, primitives),
      "value",
    );
    if (typeof resolved !== "string") {
      throw new Error(`Unknown color: ${value}`);
    }
    return resolve(resolved);
  };

  const colors: ThemeFadeColor[] = [];
  const walk = (node: unknown, path: string[]) => {
    const value = child(node, "value");
    const light = child(value, "base");
    const dark = child(value, "_dark");
    if (typeof light === "string" && typeof dark === "string") {
      colors.push({
        name: ["colors", ...path].join("-"),
        light: resolve(light),
        dark: resolve(dark),
      });
      return;
    }
    if (typeof node !== "object" || node === null) return;
    for (const [key, next] of Object.entries(node)) {
      if (key !== "value") {
        walk(next, key === "DEFAULT" ? path : [...path, key]);
      }
    }
  };
  walk(semantic, []);
  return colors;
}

// The palette's light and dark pairs. Selected text sits on the selection fill.
export const themeFadeColors: ThemeFadeColor[] = themeColorsFromTokens(
  palette,
  semanticColors,
).map((color) =>
  color.name === "colors-selection-ink"
    ? { ...color, on: "colors-selection" }
    : color,
);
const fadeCanvas = themeFadeColors.find(
  (color) => color.name === "colors-canvas",
);
const fadeOthers = themeFadeColors.filter((color) => color !== fadeCanvas);

/**
 * Inline values for every palette variable at `position`, from 0 (light) to 1
 * (dark), keyed by CSS custom property name.
 */
export function themeFadeVariables(position: number): Map<string, string> {
  if (!fadeCanvas) throw new Error("The palette has no canvas color");
  const values = themeFadeAt(fadeCanvas, fadeOthers, position);
  return new Map(
    [...values].map(([name, value]) => [
      `--${name}`,
      format(value.rgb, value.alpha),
    ]),
  );
}
