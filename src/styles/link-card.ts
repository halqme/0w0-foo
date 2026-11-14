import { css } from "styled-system/css";
import { focused } from "./ui";

export const linkCardClasses = {
  card: `${css({
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    color: "ink",
    textDecoration: "none",
  })} ${focused}`,
  imageContainer: css({
    display: "block",
    position: "relative",
    aspectRatio: "1200 / 630",
    overflow: "hidden",
    bg: "surface.muted",
  }),
  image: css({
    position: "absolute",
    inset: "0",
    display: "block",
    h: "full",
    w: "full",
    objectFit: "cover",
    outlineStyle: "solid",
    outlineWidth: "1px",
    outlineOffset: "-1px",
    outlineColor: "line.overlay",
  }),
} as const;
