import { css, viewTransition } from "styled-system/css";

/* Astro emits per-name fade animations in `@layer astro`. The `!` important
   marker is what lets these utilities replace that fade. */

const still = {
  animation: "none!",
  mixBlendMode: "normal",
} as const;

const fade = {
  animationName: "fadeOut!",
  animationDuration: "180ms!",
  animationTimingFunction: "cubic-bezier(0.2, 0, 0, 1)!",
  animationFillMode: "both!",
} as const;

export const rootTransition = viewTransition({
  group: { animation: "none" },
  old: { animation: "none" },
  new: { animation: "none" },
});

/* The group must not stretch text between differently sized pages.
   Old and new still cross-fade, except during a Things category change. */
export const pageTransition = viewTransition({
  group: { animation: "none" },
});

export const thingsFilterStill = css({
  "&[data-things-filter]::view-transition-old(page-content)": {
    ...still,
    opacity: "0",
  },
  "&[data-things-filter]::view-transition-new(page-content)": still,
});

export const thingCardTransition = viewTransition({
  old: {
    ...still,
    opacity: "0",
    "&:only-child": {
      ...fade,
      opacity: "1",
    },
  },
  new: {
    ...still,
    "&:only-child": {
      ...fade,
      animationDirection: "reverse!",
    },
  },
});

const imageFrame = {
  w: "full",
  h: "full",
  objectFit: "contain",
  objectPosition: "center",
  overflow: "clip",
} as const;

export const thingImageTransition = viewTransition({
  group: { overflow: "clip" },
  old: {
    ...still,
    ...imageFrame,
    opacity: "0",
    "&:only-child": {
      ...fade,
      animationTimingFunction: "ease!",
      opacity: "1",
    },
  },
  new: {
    ...still,
    ...imageFrame,
    "&:only-child": {
      ...fade,
      animationTimingFunction: "ease!",
      animationDirection: "reverse!",
    },
  },
});
