import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda"],
  preflight: true,
  include: ["./src/**/*.{js,jsx,ts,tsx,astro}"],
  exclude: [],
  outdir: "styled-system",
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
        colors: {
          zenn: { value: "#3EA8FF" },
        },
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
        shadows: {
          popup: { value: "var(--color-elevation)" },
        },
      },
      semanticTokens: {
        colors: {
          canvas: { value: "var(--color-canvas)" },
          surface: {
            DEFAULT: { value: "var(--color-surface)" },
            muted: { value: "var(--color-surface-muted)" },
          },
          ink: { value: "var(--color-ink)" },
          muted: { value: "var(--color-muted)" },
          line: { value: "var(--color-line)" },
          accent: { value: "var(--color-accent)" },
          focus: { value: "var(--color-focus)" },
          pink: { value: "var(--color-pink)" },
          mint: { value: "var(--color-mint)" },
          signal: {
            success: {
              DEFAULT: { value: "var(--color-signal-success)" },
              surface: { value: "var(--color-signal-success-surface)" },
            },
          },
        },
      },
    },
  },
});
