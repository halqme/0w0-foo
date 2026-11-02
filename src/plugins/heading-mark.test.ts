import { describe, expect, it } from "vite-plus/test";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { createHeadingMarkPlugin } from "./heading-mark";

async function render(source: string) {
  const processor = await createSatteriMarkdownProcessor({
    syntaxHighlight: false,
    hastPlugins: [createHeadingMarkPlugin()],
  });
  return processor.render(source);
}

function hiddenMark(level: string): string {
  return `<span aria-hidden="true" class="heading-mark" data-mark="${level} "></span>`;
}

describe("Markdown heading marks", () => {
  it("shows the source marks before heading text and hides them from the accessible name", async () => {
    const result = await render(
      "# 題\n\n## 節\n\n### 項\n\n#### 細目\n\n本文\n",
    );

    expect(result.code).toContain(`<h1 id="題">${hiddenMark("#")}題</h1>`);
    expect(result.code).toContain(`<h2 id="節">${hiddenMark("##")}節</h2>`);
    expect(result.code).toContain(`<h3 id="項">${hiddenMark("###")}項</h3>`);
    expect(result.code).toContain(
      `<h4 id="細目">${hiddenMark("####")}細目</h4>`,
    );
    expect(result.code).toContain("<p>本文</p>");
    expect(result.code).not.toContain("<p>#");
  });

  it("keeps inline emphasis inside the heading and adds the mark once", async () => {
    const result = await render("## これは**太字**\n");

    expect(result.code).toContain(
      `<h2 id="これは太字">${hiddenMark("##")}これは<strong>太字</strong></h2>`,
    );
    expect(result.code.match(/heading-mark/g)).toHaveLength(1);
  });
});
