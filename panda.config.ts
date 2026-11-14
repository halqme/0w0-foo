import { defineConfig } from "@pandacss/dev";
import { link } from "./src/styles/recipes/link";

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
        // Raw palette. Steps are relative lightness, not usage; components use the
        // semantic colors below. OGP images read these directly for fixed colors.
        colors: {
          zenn: { value: "#3EA8FF" },
          graphite: {
            0: { value: "#ffffff" },
            25: { value: "#fcfcfc" },
            50: { value: "#f4f4f4" },
            75: { value: "#ededed" },
            100: { value: "#e4e4e4" },
            400: { value: "#a3a3a3" },
            450: { value: "#999999" },
            600: { value: "#686868" },
            650: { value: "#666666" },
            800: { value: "#363636" },
            850: { value: "#262626" },
            875: { value: "#242424" },
            900: { value: "#1d1d1d" },
            925: { value: "#1a1a1a" },
            950: { value: "#151515" },
          },
          jade: {
            50: { value: "#e1f2e8" },
            100: { value: "#c6eadb" },
            150: { value: "#bfe9d9" },
            200: { value: "#a8dfc6" },
            250: { value: "#a5dfbc" },
            600: { value: "#416253" },
            650: { value: "#365d4c" },
            700: { value: "#176b47" },
            750: { value: "#14664f" },
            800: { value: "#244a35" },
            900: { value: "#163c31" },
          },
          blush: {
            100: { value: "#f4d7dc" },
            800: { value: "#49393c" },
          },
          ivory: { 50: { value: "#f5f5e9" } },
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
      },
      // Light values are the base, `_dark` follows the `dark` class on the root.
      // base.css registers the colors with @property so theme switches can fade.
      semanticTokens: {
        colors: {
          canvas: {
            value: {
              base: "{colors.graphite.25}",
              _dark: "{colors.graphite.950}",
            },
          },
          surface: {
            DEFAULT: {
              value: {
                base: "{colors.graphite.0}",
                _dark: "{colors.graphite.900}",
              },
            },
            muted: {
              value: {
                base: "{colors.graphite.50}",
                _dark: "{colors.graphite.850}",
              },
            },
          },
          ink: {
            value: {
              base: "{colors.graphite.875}",
              _dark: "{colors.graphite.75}",
            },
          },
          muted: {
            value: {
              base: "{colors.graphite.600}",
              _dark: "{colors.graphite.400}",
            },
          },
          line: {
            DEFAULT: {
              value: {
                base: "{colors.graphite.100}",
                _dark: "{colors.graphite.800}",
              },
            },
            // Translucent edge that stays visible on any image.
            overlay: {
              value: {
                base: "oklch(0 0 0 / 0.1)",
                _dark: "oklch(1 0 0 / 0.1)",
              },
            },
          },
          accent: { value: "{colors.ink}" },
          focus: {
            value: { base: "{colors.jade.750}", _dark: "{colors.jade.200}" },
          },
          pink: {
            value: { base: "{colors.blush.100}", _dark: "{colors.blush.800}" },
          },
          mint: {
            value: { base: "{colors.jade.100}", _dark: "{colors.jade.600}" },
          },
          selection: {
            DEFAULT: {
              value: { base: "{colors.jade.150}", _dark: "{colors.jade.650}" },
            },
            ink: {
              value: { base: "{colors.jade.900}", _dark: "{colors.ivory.50}" },
            },
          },
          signal: {
            success: {
              DEFAULT: {
                value: {
                  base: "{colors.jade.700}",
                  _dark: "{colors.jade.250}",
                },
              },
              surface: {
                value: { base: "{colors.jade.50}", _dark: "{colors.jade.800}" },
              },
            },
          },
        },
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
