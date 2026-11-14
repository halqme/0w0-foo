import { defineRecipe } from "@pandacss/dev";

const fineHover = "@media (hover: hover) and (pointer: fine)";
const shown = {
  backgroundSize: "100% var(--underline-width), 100% var(--underline-width)",
};
const nativeUnderline = {
  textDecorationLine: "underline",
  textUnderlineOffset: "var(--underline-offset)",
};

// The line is a background, so it follows each wrapped line. `block` would pin it
// to the box instead.
export const link = defineRecipe({
  className: "link",
  description:
    "Text link with an underline that grows on hover, focus, and press",
  base: {
    "--underline-width": "1px",
    "--underline-offset": "4px",
    "--underline-rest": "transparent",
    textDecoration: "none",
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
    backgroundImage:
      "linear-gradient(currentColor, currentColor), linear-gradient(var(--underline-rest), var(--underline-rest))",
    backgroundPosition: "0 100%",
    backgroundRepeat: "no-repeat",
    backgroundSize: "0% var(--underline-width), 100% var(--underline-width)",
    _motionSafe: {
      transitionProperty: "background-size",
      transitionDuration: "fast",
      transitionTimingFunction: "settle",
    },
    _motionReduce: { transition: "none!" },
    _highContrast: { backgroundImage: "none" },
  },
  variants: {
    // `group` follows an ancestor with the `group` class, such as a nav link
    // wrapping its label.
    trigger: {
      self: {
        _focusVisible: shown,
        _active: shown,
        [fineHover]: { _hover: shown },
        _highContrast: nativeUnderline,
      },
      group: {
        _groupFocusVisible: shown,
        _groupActive: shown,
        ".group:is([aria-current=page], [aria-current=location]) &": shown,
        [fineHover]: { _groupHover: shown },
        _highContrast: {
          ".group:is(:hover, :focus-visible, [aria-current]) &":
            nativeUnderline,
        },
      },
    },
    rest: {
      line: { "--underline-rest": "token(colors.line)" },
      none: {},
    },
    kind: {
      inline: {},
      // A standalone 14px action with a 40px hit area.
      action: {
        // Sit the line beside the text, not at the bottom of the hit area.
        backgroundPosition: "0 calc(50% + 0.7em)",
        display: "inline-flex",
        minH: "10",
        alignItems: "center",
        fontSize: "sm",
        lineHeight: "1.25rem",
        color: "muted",
        _hover: { color: "ink" },
        focusVisibleRing: "outside",
      },
    },
  },
  defaultVariants: { trigger: "self", rest: "line", kind: "inline" },
});
