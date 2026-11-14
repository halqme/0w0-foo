import { describe, expect, it } from "vite-plus/test";
import {
  parseColor,
  themeFadeAt,
  themeFadeColors as colors,
  themeFadeEase,
  themeFadeTimeAt,
  themeFadeVariables,
  type ThemeFadeColor,
} from "./theme-fade";

const canvas = colors.find((color) => color.name === "colors-canvas")!;
const others = colors.filter((color) => color !== canvas);
const opaque = others.filter((color) => parseColor(color.light).alpha === 1);

const luminance = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const samples = Array.from({ length: 21 }, (_, i) => i / 20);
const frames = samples.map((t) => themeFadeAt(canvas, others, t));
const logContrast = (
  frame: ReturnType<typeof themeFadeAt>,
  color: ThemeFadeColor,
) =>
  Math.log(
    (luminance(frame.get(color.name)!.rgb) + 0.05) /
      (luminance(frame.get(color.on ?? canvas.name)!.rgb) + 0.05),
  );

describe("themeFadeAt", () => {
  it("reads every semantic color pair from the palette", () => {
    expect(colors.map((color) => color.name)).toContain("colors-ink");
    expect(colors.map((color) => color.name)).toContain("colors-line-overlay");
    expect(canvas).toMatchObject({ light: "#fcfcfc", dark: "#151515" });
  });

  it("gives equal-time samples a geometric series of contrast ratios", () => {
    for (const color of opaque) {
      const steps = frames
        .slice(1)
        .map(
          (frame, i) =>
            logContrast(frame, color) - logContrast(frames[i], color),
        );
      for (const step of steps) expect(step).toBeCloseTo(steps[0], 3);
    }
  });

  it("darkens the canvas at an even rate in log luminance", () => {
    const levels = frames.map((frame) =>
      Math.log(luminance(frame.get(canvas.name)!.rgb) + 0.05),
    );
    const steps = levels.slice(1).map((level, i) => level - levels[i]);
    for (const step of steps) expect(step).toBeCloseTo(steps[0], 3);
  });

  it("flips text polarity only by passing through 1:1", () => {
    const ink = colors.find((color) => color.name === "colors-ink")!;
    const contrasts = frames.map((frame) => logContrast(frame, ink));
    const flip = contrasts.findIndex((value) => value > 0);
    expect(contrasts[0]).toBeLessThan(0);
    expect(contrasts.at(-1)).toBeGreaterThan(0);
    expect(contrasts.slice(flip).every((value) => value > 0)).toBe(true);
    // One sample step either side of the flip stays within one step of 1:1.
    const step = contrasts[1] - contrasts[0];
    expect(Math.abs(contrasts[flip])).toBeLessThanOrEqual(step);
    expect(Math.abs(contrasts[flip - 1])).toBeLessThanOrEqual(step);
  });

  it("ends on the palette values", () => {
    for (const [t, mode] of [
      [0, "light"],
      [1, "dark"],
    ] as const) {
      const frame = themeFadeAt(canvas, others, t);
      for (const color of opaque) {
        const expected = parseColor(color[mode]).rgb;
        frame
          .get(color.name)!
          .rgb.forEach((c, i) => expect(c).toBeCloseTo(expected[i], 3));
      }
    }
  });
});

describe("themeFadeEase", () => {
  const times = Array.from({ length: 101 }, (_, i) => i / 100);

  it("starts on light, ends on dark, and never turns back", () => {
    expect(themeFadeEase(0)).toBe(0);
    expect(themeFadeEase(1)).toBeCloseTo(1, 10);
    const positions = times.map(themeFadeEase);
    positions
      .slice(1)
      .forEach((position, i) => expect(position).toBeGreaterThan(positions[i]));
  });

  it("keeps an even pace through the polarity flips", () => {
    const flip = themeFadeTimeAt(0.55);
    const speed = themeFadeEase(0.01) / 0.01;
    expect(
      (themeFadeEase(flip) - themeFadeEase(flip - 0.01)) / 0.01,
    ).toBeCloseTo(speed, 6);
  });

  it("comes to rest instead of stopping at full speed", () => {
    const last = (1 - themeFadeEase(0.99)) / 0.01;
    expect(last).toBeLessThan(0.05);
  });

  it("is undone by themeFadeTimeAt", () => {
    for (const time of times) {
      expect(themeFadeTimeAt(themeFadeEase(time))).toBeCloseTo(time, 6);
    }
  });
});

describe("themeFadeVariables", () => {
  it("sets every palette variable", () => {
    expect([...themeFadeVariables(0.5).keys()].toSorted()).toEqual(
      colors.map((color) => `--${color.name}`).toSorted(),
    );
  });

  it("starts and ends on the palette, so clearing it changes nothing", () => {
    for (const [position, mode] of [
      [0, "light"],
      [1, "dark"],
    ] as const) {
      const variables = themeFadeVariables(position);
      expect(variables.get("--colors-canvas")).toBe(
        mode === "light" ? "rgb(252 252 252)" : "rgb(21 21 21)",
      );
      expect(variables.get("--colors-ink")).toBe(
        mode === "light" ? "rgb(36 36 36)" : "rgb(237 237 237)",
      );
    }
  });
});
