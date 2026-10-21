import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWind4,
  transformerDirectives,
} from "unocss";

import { linkCardClasses } from "./src/styles/link-card";

const tokens = {
  color: {
    light: {
      canvas: "#fcfcfc",
      surface: "#ffffff",
      "surface-muted": "#f4f4f4",
      ink: "#242424",
      muted: "#686868",
      line: "#e4e4e4",
      accent: "#242424",
      focus: "#14664f",
      pink: "#f4d7dc",
      mint: "#c6eadb",
      selection: "#bfe9d9",
      "selection-ink": "#163c31",
      elevation: "0 4px 12px rgb(48 47 45 / 0.12)",
      "image-outline": "oklch(0 0 0 / 0.1)",
      "signal-success": "#176b47",
      "signal-success-surface": "#e1f2e8",
    },
    dark: {
      canvas: "#151515",
      surface: "#1d1d1d",
      "surface-muted": "#262626",
      ink: "#ededed",
      muted: "#a3a3a3",
      line: "#363636",
      accent: "#ededed",
      focus: "#a8dfc6",
      pink: "#49393c",
      mint: "#416253",
      selection: "#365d4c",
      "selection-ink": "#f5f5e9",
      elevation: "0 4px 12px rgb(0 0 0 / 0.35)",
      "image-outline": "oklch(1 0 0 / 0.1)",
      "signal-success": "#a5dfbc",
      "signal-success-surface": "#244a35",
    },
  },
  font: {
    mono: "var(--font-ia-writer-mono)",
    sans: "var(--font-shippori-antique)",
  },
  size: {
    hero: "clamp(4.5rem, 17vw, 12rem)",
    error: "clamp(8rem, 25vw, 16rem)",
  },
  radius: {
    xs: "2px",
    sm: "4px",
    md: "8px",
    lg: "12px",
    full: "9999px",
  },
};

// Registered colors interpolate on the root without replacing live UI with snapshots.
const themeColors = Object.entries(tokens.color.light).filter(
  ([name]) => name !== "elevation",
);
const themeColorMotion = themeColors
  .map(
    ([name, value]) =>
      `@property --color-${name} { syntax: "<color>"; inherits: true; initial-value: ${value}; }`,
  )
  .join("\n");
const themeColorTransitions = themeColors
  .map(([name]) => `--color-${name} 300ms cubic-bezier(0.2, 0, 0, 1)`)
  .join(", ");

const themeVars = (palette: typeof tokens.color.light) =>
  Object.entries(palette)
    .map(([name, value]) => `--color-${name}: ${value};`)
    .join("\n    ");

export default defineConfig({
  presets: [
    presetWind4({ dark: "class" }),
    presetIcons({
      extraProperties: { display: "inline-block", "vertical-align": "middle" },
      scale: 1,
    }),
    presetAttributify({ prefix: "uno-" }),
    presetTypography({
      cssExtend: {
        p: { "line-height": "1.9" },
      },
    }),
  ],
  preflights: [
    {
      getCSS: () =>
        `${themeColorMotion}\n@media (prefers-reduced-motion: no-preference) { :root[data-theme-transition] { transition: ${themeColorTransitions}; } }`,
    },
    {
      getCSS: () =>
        `:root {\n    ${themeVars(tokens.color.light)}\n    --font-size-error: ${tokens.size.error};\n    --page-bg: var(--color-canvas);\n    --surface-bg: var(--color-surface);\n    --surface-muted: var(--color-surface-muted);\n    --ink: var(--color-ink);\n    --ink-muted: var(--color-muted);\n    --line: var(--color-line);\n    --accent: var(--color-accent);\n    --focus-ring: var(--color-focus);\n    --pink: var(--color-pink);\n    --mint: var(--color-mint);\n    color-scheme: light;\n  }\n  :root.dark {\n    ${themeVars(tokens.color.dark)}\n    color-scheme: dark;\n  }\n  html { scroll-padding-block-start: 1rem; font-feature-settings: "palt" 1; line-break: strict; word-break: auto-phrase; text-autospace: normal; }\n  :focus-visible { outline: 2px solid var(--color-focus); outline-offset: 3px; }\n  ::selection { background: var(--color-selection); color: var(--color-selection-ink); }\n  a { color: inherit; text-underline-position: from-font; text-decoration-thickness: from-font; }\n  :root .prose { --un-prose-body: var(--color-ink); --un-prose-headings: var(--color-ink); --un-prose-lead: var(--color-muted); --un-prose-links: var(--color-accent); --un-prose-bold: var(--color-ink); --un-prose-counters: var(--color-muted); --un-prose-bullets: var(--color-muted); --un-prose-hr: var(--color-line); --un-prose-quotes: var(--color-muted); --un-prose-quote-borders: var(--color-line); --un-prose-captions: var(--color-muted); --un-prose-kbd: var(--color-ink); --un-prose-code: var(--color-ink); --un-prose-pre-code: var(--color-ink); --un-prose-pre-bg: var(--color-surface-muted); --un-prose-th-borders: var(--color-line); --un-prose-td-borders: var(--color-line); }\n  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }`,
    },
  ],
  content: { filesystem: ["src/plugins/link-card.ts"] },
  safelist: Object.values(linkCardClasses).flatMap((classes) =>
    classes.split(/\s+/),
  ),
  rules: [[/^clip-\[(.+)\]$/, ([, value]) => ({ clip: value })]],
  shortcuts: {
    "text-body": "text-base leading-8 text-ink",
    "text-headline": "text-xl font-medium leading-relaxed text-ink",
    "text-label": "text-xs font-normal leading-relaxed text-muted",
    "icon-sm": "size-4 shrink-0 align-middle",
    "icon-md": "size-5 shrink-0 align-middle",
    section: "py-8 first:pt-0",
    "container-main": "mx-auto w-full max-w-4xl px-6 sm:px-8",
    "page-header": "mb-10 flex flex-col items-center gap-3 text-center",
    "index-header":
      "mb-10 flex flex-wrap items-baseline justify-center gap-x-6 gap-y-2 text-center",
    "list-title":
      "text-base font-medium leading-relaxed text-ink [overflow-wrap:anywhere]",
    "item-meta":
      "mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs leading-relaxed text-muted",
    "link-text": "no-underline",
    "text-action":
      "link-text inline-flex min-h-10 items-center text-sm text-muted hover:text-ink focused",
    "disclosure-trigger":
      "min-h-10 select-none py-2 text-sm text-muted marker:text-muted hover:text-ink",
    "code-copy-button":
      "absolute top-2 end-2 z-10 inline-flex min-h-8 items-center rounded-sm border border-line bg-surface px-2 text-xs font-sans text-ink focused",
    btn: "inline-flex items-center justify-center gap-2 min-h-10 px-4 py-2 font-medium border border-line rounded-sm focused",
    "btn-ghost": "btn bg-transparent text-ink border-transparent",
    "btn-primary": "btn bg-accent text-canvas border-accent",
    "sr-only":
      "absolute w-px h-px p-0 -m-px overflow-hidden clip-[rect(0_0_0_0)] whitespace-nowrap border-0",
    focused:
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "theme-option":
      "flex min-h-8 items-center gap-3 px-2 my-1 py-1 rounded-md text-sm has-[:hover]:bg-surface-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
    "theme-option-copy": "grid min-w-0 gap-1",
    "theme-check": "icon-sm ms-auto opacity-0",
    "theme-icon": "icon-sm [&[hidden]]:hidden",
  },
  theme: {
    colors: {
      canvas: "var(--color-canvas)",
      surface: "var(--color-surface)",
      "surface-muted": "var(--color-surface-muted)",
      ink: "var(--color-ink)",
      muted: "var(--color-muted)",
      line: "var(--color-line)",
      accent: "var(--color-accent)",
      focus: "var(--color-focus)",
      pink: "var(--color-pink)",
      mint: "var(--color-mint)",
      "signal-success": "var(--color-signal-success)",
      "signal-success-surface": "var(--color-signal-success-surface)",
      zenn: "#3EA8FF",
    },
    font: { mono: tokens.font.mono, sans: tokens.font.sans },
    text: {
      md: { fontSize: "1.0625rem", lineHeight: "1.5" },
      hero: { fontSize: tokens.size.hero, lineHeight: "0.95" },
      error: { fontSize: tokens.size.error },
    },
    radius: tokens.radius,
    shadow: { popup: "var(--color-elevation)" },
    spacing: {
      0.5: "2px",
      1: "4px",
      2: "8px",
      3: "12px",
      4: "16px",
      6: "24px",
      8: "32px",
    },
  },
  transformers: [transformerDirectives()],
});
