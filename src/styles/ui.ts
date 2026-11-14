import { css } from "styled-system/css";

export const section = css({
  py: "8",
  _first: { pt: "0" },
});

export const containerMain = css({
  mx: "auto",
  w: "full",
  maxW: "4xl",
  px: { base: "6", sm: "8" },
});

export const articleColumn = css({
  mx: "auto",
  w: "full",
  minW: "0",
  maxW: "40rem",
});

export const pageHeader = css({
  mb: "10",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "3",
  textAlign: "center",
});

export const indexHeader = css({
  mb: "10",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  justifyContent: "center",
  columnGap: "6",
  rowGap: "2",
  textAlign: "center",
});

export const textHeadline = css({
  fontSize: "xl",
  lineHeight: "1.4",
  fontWeight: "normal",
  color: "ink",
  textWrap: "balance",
});

export const textLabel = css({
  fontSize: "sm",
  lineHeight: "relaxed",
  fontWeight: "normal",
  color: "muted",
});

export const textBody = css({
  fontSize: "md",
  lineHeight: "2rem",
  color: "ink",
});

export const listTitle = css({
  fontSize: "md",
  lineHeight: "relaxed",
  fontWeight: "normal",
  color: "ink",
  overflowWrap: "anywhere",
});

export const itemMeta = css({
  mt: "2",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  columnGap: "3",
  rowGap: "1",
  fontSize: "sm",
  lineHeight: "relaxed",
  color: "muted",
});

export const focused = css({
  focusVisibleRing: "outside",
});

export const disclosureTrigger = css({
  display: "flex",
  minH: "10",
  alignItems: "center",
  gap: "1",
  py: "2",
  fontSize: "sm",
  lineHeight: "1.25rem",
  color: "muted",
  listStyle: "none",
  userSelect: "none",
  _hover: { color: "ink" },
  "&::-webkit-details-marker": { display: "none" },
});

export const srOnly = css({
  srOnly: true,
});

export const iconSm = css({
  display: "inline-block",
  w: "4",
  h: "4",
  flexShrink: "0",
  verticalAlign: "middle",
});

export const iconMd = css({
  display: "inline-block",
  w: "5",
  h: "5",
  flexShrink: "0",
  verticalAlign: "middle",
});

export const themeIcon = css({
  display: "inline-block",
  w: "4",
  h: "4",
  flexShrink: "0",
  verticalAlign: "middle",
  "&[hidden]": { display: "none" },
});

export const themeCheck = css({
  display: "inline-block",
  w: "4",
  h: "4",
  flexShrink: "0",
  verticalAlign: "middle",
  marginInlineStart: "auto",
  opacity: "0",
  _peerChecked: { opacity: "1" },
});

export const themeOption = css({
  display: "flex",
  minH: "8",
  alignItems: "center",
  gap: "3",
  px: "2",
  my: "1",
  py: "1",
  borderRadius: "md",
  fontSize: "sm",
  lineHeight: "1.25rem",
  "&:has(:hover)": { bg: "surface.muted" },
  "&:has(:focus-visible)": {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "focus",
  },
});

export const themeOptionCopy = css({
  display: "grid",
  minW: "0",
  gap: "1",
});

// The copy button class is assigned from a script, so the hook name stays on the string.
export const codeCopyButton = `code-copy-button ${css({
  position: "absolute",
  top: "2",
  insetInlineEnd: "2",
  zIndex: "10",
  display: "inline-flex",
  minH: "8",
  alignItems: "center",
  borderRadius: "sm",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "line",
  bg: "surface",
  px: "2",
  fontSize: "xs",
  lineHeight: "1rem",
  fontFamily: "sans",
  color: "ink",
  focusVisibleRing: "outside",
})}`;

export const codeBlockWrapper = `code-block-wrapper ${css({
  position: "relative",
  display: "block",
  w: "full",
})}`;
