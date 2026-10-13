import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import type { Element } from "hast";
import type { HastVisitorContext } from "satteri";

const mocks = vi.hoisted(() => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  ogs: vi.fn(),
  plugin: undefined as unknown,
}));
vi.mock("node:fs", () => ({
  readdirSync: mocks.readdirSync,
  readFileSync: mocks.readFileSync,
}));
vi.mock("open-graph-scraper", () => ({ default: mocks.ogs }));
vi.mock("satteri", () => ({
  defineHastPlugin: (plugin: unknown) => (mocks.plugin = plugin),
}));

const baseUrl = "https://example.test/article";
const ogpResult = {
  ogTitle: "OG title",
  ogDescription: "OG description",
  ogImage: [{ url: "https://example.test/badge.svg" }, { url: "/hero.png" }],
  favicon: "/favicon.ico",
};

async function importPlugin() {
  vi.resetModules();
  const { linkCardPlugin } = await import("./link-card");
  return linkCardPlugin;
}

type Context = HastVisitorContext;
function paragraph(href: string, text = href): Element {
  return {
    type: "element",
    tagName: "p",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "a",
        properties: { href },
        children: [{ type: "text", value: text }],
      },
    ],
  };
}
function context(): Context & {
  replaceNodeMock: ReturnType<
    typeof vi.fn<(node: Element, replacement: Element) => void>
  >;
} {
  const replaceNodeMock =
    vi.fn<(node: Element, replacement: Element) => void>();
  const replaceNode: Context["replaceNode"] = (node, replacement) => {
    if (
      node.type === "element" &&
      !Array.isArray(replacement) &&
      replacement.type === "element"
    ) {
      replaceNodeMock(node, replacement);
    }
  };
  return {
    source: "",
    fileURL: undefined,
    data: {},
    sourceFormat: "markdown" as const,
    removeNode: vi.fn(),
    insertBefore: vi.fn(),
    insertAfter: vi.fn(),
    wrapNode: vi.fn(),
    prependChild: vi.fn(),
    appendChild: vi.fn(),
    insertChildAt: vi.fn(),
    removeChildAt: vi.fn(),
    setProperty: vi.fn(),
    parent: vi.fn(),
    indexOf: vi.fn(),
    report: vi.fn(),
    getDiagnostics: vi.fn(() => []),
    textContent: (node: Element) =>
      node.children
        .map((child) =>
          child.type === "text"
            ? child.value
            : child.type === "element"
              ? child.children
                  .map((nested) => (nested.type === "text" ? nested.value : ""))
                  .join("")
              : "",
        )
        .join(""),
    replaceNode,
    replaceNodeMock,
  };
}

beforeEach(() => {
  vi.resetModules();
  mocks.readdirSync.mockReset().mockReturnValue([]);
  mocks.readFileSync.mockReset();
  mocks.ogs.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("linkCardPlugin", () => {
  it("transforms a bare paragraph URL with OGP data, skips badge images, and resolves relative assets", async () => {
    mocks.readdirSync.mockReturnValue(["one.md"]);
    mocks.readFileSync.mockReturnValue(`---\ntitle: test\n---\n${baseUrl}`);
    mocks.ogs.mockResolvedValue({ result: ogpResult });
    const plugin = await importPlugin();
    const node = paragraph(baseUrl);
    const ctx = context();

    plugin.element.visit(node, ctx);

    expect(mocks.ogs).toHaveBeenCalledWith(
      expect.objectContaining({ url: baseUrl }),
    );
    const replacement = ctx.replaceNodeMock.mock.calls[0][1];
    expect(replacement.tagName).toBe("a");
    expect(replacement.properties.href).toBe(baseUrl);
    const serialized = JSON.stringify(replacement);
    expect(serialized).toContain("OG title");
    expect(serialized).toContain("OG description");
    expect(serialized).toContain("https://example.test/hero.png");
    expect(serialized).toContain("https://example.test/favicon.ico");
    expect(serialized).not.toContain("badge.svg");
  });

  it("uses Twitter metadata and favicon fallback when Open Graph fields are absent", async () => {
    mocks.readdirSync.mockReturnValue(["one.md"]);
    mocks.readFileSync.mockReturnValue(`---\ntitle: test\n---\n${baseUrl}`);
    mocks.ogs.mockResolvedValue({
      result: {
        twitterTitle: "Twitter title",
        twitterDescription: "Twitter description",
        twitterImage: [{ url: "https://cdn.test/card.png" }],
      },
    });
    const plugin = await importPlugin();
    const ctx = context();
    plugin.element.visit(paragraph(baseUrl), ctx);
    const replacement = ctx.replaceNodeMock.mock.calls[0][1];
    const serialized = JSON.stringify(replacement);
    expect(serialized).toContain("Twitter title");
    expect(serialized).toContain("Twitter description");
    expect(serialized).toContain(
      "https://www.google.com/s2/favicons?domain=example.test&sz=32",
    );
  });

  it("uses hostname fallback when OGP retrieval fails", async () => {
    mocks.readdirSync.mockReturnValue(["one.md"]);
    mocks.readFileSync.mockReturnValue(`---\ntitle: test\n---\n${baseUrl}`);
    mocks.ogs.mockRejectedValue(new Error("offline"));
    const plugin = await importPlugin();
    const ctx = context();
    plugin.element.visit(paragraph(baseUrl), ctx);
    expect(JSON.stringify(ctx.replaceNodeMock.mock.calls[0][1])).toContain(
      "example.test",
    );
  });

  it.each(["/local", "#section", "mailto:a@example.test", "tel:123"])(
    "skips excluded href %s",
    async (href) => {
      const plugin = await importPlugin();
      const ctx = context();
      plugin.element.visit(paragraph(href), ctx);
      expect(ctx.replaceNodeMock).not.toHaveBeenCalled();
    },
  );

  it("skips named links and paragraphs with mixed content", async () => {
    const plugin = await importPlugin();
    const namedContext = context();
    plugin.element.visit(paragraph(baseUrl, "Read this"), namedContext);
    expect(namedContext.replaceNodeMock).not.toHaveBeenCalled();
    const mixedContext = context();
    const mixed = paragraph(baseUrl);
    mixed.children.push({ type: "text", value: " extra" });
    plugin.element.visit(mixed, mixedContext);
    expect(mixedContext.replaceNodeMock).not.toHaveBeenCalled();
  });
});
