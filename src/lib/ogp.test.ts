import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  render: vi.fn(),
  Resvg: vi.fn(),
}));
vi.mock("node:fs", () => ({ existsSync: mocks.existsSync }));
vi.mock("node:fs/promises", () => ({
  mkdir: mocks.mkdir,
  readFile: mocks.readFile,
  writeFile: mocks.writeFile,
}));
vi.mock("@resvg/resvg-js", () => ({ Resvg: mocks.Resvg }));

import { loadBoldFont, loadFavicon, loadFonts } from "./ogp";

const bytes = new Uint8Array([1, 2, 3]);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.existsSync.mockReturnValue(false);
  mocks.mkdir.mockResolvedValue(undefined);
  mocks.writeFile.mockResolvedValue(undefined);
  mocks.readFile.mockResolvedValue(Buffer.from(bytes));
  mocks.render.mockReturnValue({ asPng: () => Buffer.from([8, 9]) });
  mocks.Resvg.mockImplementation(function () {
    return { render: mocks.render };
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ arrayBuffer: async () => bytes.buffer }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("font loading", () => {
  it("uses cached files without fetching or writing", async () => {
    mocks.existsSync.mockReturnValue(true);
    await expect(loadBoldFont()).resolves.toEqual(bytes.buffer);
    expect(mocks.readFile).toHaveBeenCalledWith(
      expect.stringMatching(/ogp-fonts\/noto-sans-jp-700\.woff$/),
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });

  it("downloads both fonts and caches the returned bytes at their paths", async () => {
    const fetchMock = vi.mocked(fetch);
    await loadFonts();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mocks.mkdir).toHaveBeenCalledWith(
      expect.stringMatching(/\.cache\/ogp-fonts$/),
      { recursive: true },
    );
    expect(mocks.writeFile).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/noto-sans-jp-400\.woff$/),
      bytes,
    );
    expect(mocks.writeFile).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/noto-sans-jp-700\.woff$/),
      bytes,
    );
  });
});

describe("favicon loading", () => {
  it("returns a cached icon without rendering", async () => {
    mocks.existsSync.mockImplementation((path) =>
      String(path).endsWith("favicon-32.png"),
    );
    await expect(loadFavicon("cache", 32)).resolves.toEqual(bytes);
    expect(mocks.Resvg).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });

  it("renders and caches the project SVG", async () => {
    mocks.existsSync.mockImplementation((path) =>
      String(path).endsWith("favicon.svg"),
    );
    mocks.readFile.mockResolvedValue("<svg></svg>");
    await expect(loadFavicon("cache", 64)).resolves.toEqual(
      new Uint8Array([8, 9]),
    );
    expect(mocks.Resvg).toHaveBeenCalledWith("<svg></svg>", {
      fitTo: { mode: "width", value: 64 },
    });
    expect(mocks.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/favicon-64\.png$/),
      new Uint8Array([8, 9]),
    );
  });

  it("renders the built-in fallback when the favicon is absent", async () => {
    await loadFavicon("cache", 48);
    expect(mocks.Resvg).toHaveBeenCalledWith(
      expect.stringContaining(">H</text>"),
      {
        fitTo: { mode: "width", value: 48 },
      },
    );
  });
});
