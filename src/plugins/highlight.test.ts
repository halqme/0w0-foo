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

const channel = (hex: string, offset: number) => {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) =>
  0.2126 * channel(hex, 1) +
  0.7152 * channel(hex, 3) +
  0.0722 * channel(hex, 5);

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
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

  it("keeps comment text at least 4.5:1 against the code background", async () => {
    const { code } = await render(
      ["```ts", "// note", "/** doc */", "const answer = 1;", "```"].join("\n"),
    );
    const background = code.match(/background-color:(#[0-9a-f]{6})/i)?.[1];
    const comments = [
      ...code.matchAll(
        /<span style="color:(#[0-9a-f]{6})">([\s\S]*?)<\/span>/gi,
      ),
    ].filter(
      (match) =>
        match[2].includes("// note") || match[2].includes("/** doc */"),
    );

    expect(background).toBeTruthy();
    expect(comments.some((match) => match[2].includes("// note"))).toBe(true);
    expect(comments.some((match) => match[2].includes("/** doc */"))).toBe(
      true,
    );
    for (const match of comments) {
      expect(contrast(match[1] ?? "", background ?? "")).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("renders an empty fence as an empty code block", async () => {
    const { code } = await render("```ts\n```");

    expect(code).toContain('data-language="ts"');
    expect(code).toContain("<code></code>");
  });
});
