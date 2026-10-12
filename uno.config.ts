import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWind4,
  transformerDirectives,
} from "unocss";

const tokens = {
  color: {
    light: {
      canvas: "#fbfaf4",
      surface: "#fffef9",
      "surface-muted": "#f3f0e9",
      ink: "#302f2d",
      muted: "#69645f",
      line: "#ded9d0",
      accent: "#35624f",
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
      canvas: "#242321",
      surface: "#302f2d",
      "surface-muted": "#3a3835",
      ink: "#f7f4ed",
      muted: "#d0c9bf",
      line: "#57514a",
      accent: "#b3ceb9",
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
        p: { "line-height": "1.5" },
      },
    }),
  ],
  preflights: [
    {
      getCSS: () =>
        `:root {\n    ${themeVars(tokens.color.light)}\n    --font-size-error: ${tokens.size.error};\n    --page-bg: var(--color-canvas);\n    --surface-bg: var(--color-surface);\n    --surface-muted: var(--color-surface-muted);\n    --ink: var(--color-ink);\n    --ink-muted: var(--color-muted);\n    --line: var(--color-line);\n    --accent: var(--color-accent);\n    --focus-ring: var(--color-focus);\n    --pink: var(--color-pink);\n    --mint: var(--color-mint);\n    color-scheme: light;\n  }\n  :root.dark {\n    ${themeVars(tokens.color.dark)}\n    color-scheme: dark;\n  }\n  html { scroll-padding-block-start: 1rem; font-feature-settings: "palt" 1; line-break: strict; word-break: auto-phrase; text-autospace: normal; }\n  :focus-visible { outline: 2px solid var(--color-focus); outline-offset: 3px; }\n  ::selection { background: var(--color-selection); color: var(--color-selection-ink); }\n  a { color: inherit; text-underline-position: from-font; text-decoration-thickness: from-font; }\n  .prose { --un-prose-body: var(--color-ink); --un-prose-headings: var(--color-ink); --un-prose-links: var(--color-accent); --un-prose-borders: var(--color-line); --un-prose-quotes: var(--color-muted); }\n  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }`,
    },
  ],
  content: { filesystem: ["src/plugins/link-card.ts"] },
  rules: [[/^clip-\[(.+)\]$/, ([, value]) => ({ clip: value })]],
  safelist: [
    "bg-signal-success-surface",
    "text-signal-success",
    "before:i-lucide:check",
    "before:i-lucide:copy",
    "before:text-signal-success",
    "opacity-0",
    "group-hover:opacity-100",
    "transition-opacity",
    "duration-200",
  ],
  shortcuts: {
    "text-body": "text-base leading-relaxed text-ink",
    "text-headline":
      "text-xl md:text-2xl font-medium tracking-tight text-ink font-mono",
    "text-label": "text-xs uppercase tracking-wider font-semibold text-muted",
    "icon-sm": "size-4 shrink-0 align-middle",
    "icon-md": "size-5 shrink-0 align-middle",
    section: "py-6 border-t border-line first:border-t-0",
    "container-main": "mx-auto px-6 md:px-12",
    "container-narrow": "container-main max-w-3xl",
    btn: "inline-flex items-center justify-center gap-2 min-h-10 px-4 py-2 font-medium border border-line rounded-sm focused",
    "btn-ghost": "btn bg-transparent text-ink border-transparent",
    "btn-primary": "btn bg-accent text-canvas border-accent",
    "sr-only":
      "absolute w-px h-px p-0 -m-px overflow-hidden clip-[rect(0_0_0_0)] whitespace-nowrap border-0",
    focused:
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "theme-option":
      "flex min-h-12 items-center gap-3 px-3 py-2 rounded-md text-sm has-[:checked]:bg-surface-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
    "theme-option-copy": "grid min-w-0 gap-1",
    "theme-check": "icon-sm ms-auto opacity-0",
    "theme-icon": "icon-sm [&[hidden]]:hidden",
    "share-btn":
      "transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none",
    tooltip:
      "absolute -bottom-8 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-xs text-canvas opacity-0 transition-opacity duration-150 group-hover:opacity-100",
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
