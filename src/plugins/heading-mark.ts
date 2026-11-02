import { defineHastPlugin } from "satteri";
import type { Element, ElementContent } from "hast";

const marks: Record<string, string> = {
  h1: "# ",
  h2: "## ",
  h3: "### ",
  h4: "#### ",
  h5: "##### ",
  h6: "###### ",
};

function isHeadingMark(child: ElementContent): child is Element {
  if (child.type !== "element" || child.tagName !== "span") return false;
  const className = child.properties?.className;
  return Array.isArray(className) && className.includes("heading-mark");
}

export function createHeadingMarkPlugin() {
  return defineHastPlugin({
    name: "heading-markdown-mark",
    element: {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      visit(node, ctx) {
        const mark = marks[node.tagName];
        if (!mark || node.children.some(isHeadingMark)) return;
        ctx.prependChild(node, {
          children: [],
          properties: {
            ariaHidden: "true",
            className: ["heading-mark"],
            dataMark: mark,
          },
          tagName: "span",
          type: "element",
        });
      },
    },
  });
}
