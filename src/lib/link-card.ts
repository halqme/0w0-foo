export interface LinkCardData {
  image: string;
}

export { linkCardClasses } from "../styles/link-card";

declare const LINK_CARD_DATA: Record<string, LinkCardData>;

export function getLinkCardData(url: string): LinkCardData {
  return typeof LINK_CARD_DATA === "undefined"
    ? { image: "" }
    : (LINK_CARD_DATA[url] ?? { image: "" });
}
