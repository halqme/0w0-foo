import { describe, expect, it } from "vite-plus/test";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";

import { createHighlightPlugin } from "./highlight";

async function render(source: string) {
  const processor = await createSatteriMarkdownProcessor({
    syntaxHighlight: false,
    hastPlugins: [createHighlightPlugin()],
  });
  return processor.render(source);
}

function visibleCode(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

describe("markdown code highlighting", () => {
  it("keeps the github-dark code block the copy button can find", async () => {
    const { code } = await render(
      ["```ts", 'const answer = "<b>";', "console.log(answer);", "```"].join(
        "\n",
      ),
    );

    expect(code).toContain(
      '<pre class="astro-code github-dark" style="background-color:#24292e;color:#e1e4e8; overflow-x: auto;" tabindex="0" data-language="ts">',
    );
    expect(code).toContain('<span style="color:#f97583">const </span>');
    expect(code).toContain("&lt;b&gt;");
    expect(code).not.toContain("<b>");
    expect(visibleCode(code)).toContain(
      'const answer = "<b>";\nconsole.log(answer);',
    );
  });

  it("highlights each fenced block when several share one highlighter", async () => {
    const { code } = await render(
      [
        "```nix",
        "let x = 1; in x",
        "```",
        "",
        "```diff",
        "+ added",
        "- removed",
        "```",
      ].join("\n"),
    );

    expect(code).toContain('data-language="nix"');
    expect(code).toContain('<span style="color:#f97583">let </span>');
    expect(code).toContain('data-language="diff"');
    expect(code).toContain('<span style="color:#85e89d"> added\n</span>');
    expect(code).toContain("removed");
  });

  it("renders an unknown language as plaintext instead of failing", async () => {
    const { code } = await render(
      ["```not-a-real-lang", "hello <b>", "```"].join("\n"),
    );

    expect(code).toContain('data-language="plaintext"');
    expect(code).toContain("hello &lt;b&gt;");
    expect(code).toContain('class="astro-code github-dark"');
  });

  it("leaves math fences and inline code unhighlighted", async () => {
    const { code } = await render(
      ["inline `const x = 1`", "", "```math", "E = mc^2", "```"].join("\n"),
    );

    expect(code).toContain("<p>inline <code>const x = 1</code></p>");
    expect(code).toContain('<code class="language-math">E = mc^2\n</code>');
    expect(code).not.toContain("astro-code");
  });

  it("renders an empty fence as an empty code block", async () => {
    const { code } = await render("```ts\n```");

    expect(code).toContain('data-language="ts"');
    expect(code).toContain("<code></code>");
  });
});
