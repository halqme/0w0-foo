import { defineConfig } from "@pandacss/dev";
import { link } from "./src/styles/recipes/link";
import { palette, semanticColors } from "./src/styles/palette";

export default defineConfig({
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda"],
  preflight: true,
  include: ["./src/**/*.{js,jsx,ts,tsx,astro}"],
  exclude: [],
  outdir: "styled-system",
  globalCss: {
    // Color for the preset's `focusRing` and `focusVisibleRing` utilities.
    ":root": { "--global-color-focus-ring": "token(colors.focus)" },
  },
  theme: {
    extend: {
      keyframes: {
        fadeOut: {
          to: { opacity: "0" },
        },
      },
      tokens: {
        easings: {
          // Shared ease-out for underlines, theme motion, and card fades.
          settle: { value: "cubic-bezier(0.2, 0, 0, 1)" },
        },
        colors: palette,
        fonts: {
          sans: { value: "var(--font-shippori-antique)" },
          mono: { value: "var(--font-ia-writer-mono)" },
          emphasis: { value: "var(--font-shippori-antique-b1)" },
        },
        fontSizes: {
          hero: { value: "clamp(4.5rem, 17vw, 12rem)" },
          error: { value: "clamp(8rem, 25vw, 16rem)" },
        },
        radii: {
          xs: { value: "2px" },
          sm: { value: "4px" },
          md: { value: "8px" },
          lg: { value: "12px" },
        },
      },
      semanticTokens: {
        colors: semanticColors,
        shadows: {
          popup: {
            value: {
              base: "0 4px 12px rgb(48 47 45 / 0.12)",
              _dark: "0 4px 12px rgb(0 0 0 / 0.35)",
            },
          },
        },
      },
      recipes: { link },
    },
  },
});
