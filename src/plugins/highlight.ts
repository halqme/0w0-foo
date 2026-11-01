import {
  codeToHtml,
  isSupportedLanguage,
  type Lang,
  type Theme,
} from "@pierre/highlights";
import { githubDark } from "@pierre/highlights/themes";
import { defineHastPlugin, htmlToHast, type HastNode } from "satteri";

const textDecoder = new TextDecoder();

// #6a737d is 3.05:1 on this theme's #24292e background. Keep #8b949e (4.77:1).
const readableComment = { color: "#8b949e" };
const codeTheme: Theme = {
  ...githubDark,
  style: {
    ...githubDark.style,
    syntax: {
      ...githubDark.style.syntax,
      comment: readableComment,
      "comment.doc": readableComment,
      "comment.documentation": readableComment,
      predictive: readableComment,
    },
  },
};

// Astro's default highlighter skips this language and leaves the fence as-is.
const excludedLanguages = ["math"];

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function highlightCodeBlock(code: string, language: string): string {
  const supported = isSupportedLanguage(language);
  const lang: Lang = supported ? language : "plain";
  const dataLanguage = supported ? language : "plaintext";
  const html = textDecoder.decode(codeToHtml(code, { lang, theme: codeTheme }));
  return html.replace(
    /^<pre class="highlights" style="([^"]*)"><code>/,
    (_match, style: string) =>
      `<pre class="astro-code github-dark" style="${style}" data-language="${escapeAttribute(dataLanguage)}"><code tabindex="0">`,
  );
}

function readString(
  value: object | undefined,
  key: string,
): string | undefined {
  if (!value || !Object.hasOwn(value, key)) return undefined;
  const property = Reflect.get(value, key);
  return typeof property === "string" && property.length > 0
    ? property
    : undefined;
}

function languageFromCode(node: HastNode): string | undefined {
  if (node.type !== "element" || node.tagName !== "code") return undefined;
  const className = node.properties?.className;
  const languageClass = Array.isArray(className)
    ? className.find(
        (value) => typeof value === "string" && value.startsWith("language-"),
      )
    : undefined;
  const dataLang = readString(node.data, "lang");
  if (dataLang) return dataLang;
  if (typeof languageClass === "string") {
    return languageClass.slice("language-".length);
  }
  return "plaintext";
}

export function createHighlightPlugin() {
  return defineHastPlugin({
    name: "pierre-highlights-github-dark",
    element: {
      filter: ["pre"],
      visit(node, ctx) {
        const codeChild = node.children?.find(
          (child) => child.type === "element" && child.tagName === "code",
        );
        if (!codeChild) return;
        const language = languageFromCode(codeChild);
        if (!language || excludedLanguages.includes(language)) return;
        const code = ctx.textContent(codeChild).replace(/\n$/, "");
        const tree = htmlToHast(highlightCodeBlock(code, language), {
          fragment: true,
        });
        if (!("children" in tree)) return;
        const highlighted = tree.children[0];
        if (!highlighted || highlighted.type !== "element") return;
        ctx.replaceNode(node, highlighted);
      },
    },
  });
}
