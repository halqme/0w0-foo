import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ default: { request: mocks.request } }));

import { fetchPublicHttps, isPublicAddress } from "./public-https";

function reply(status: number, headers: Record<string, string>, body = "") {
  const response = Object.assign(new EventEmitter(), {
    statusCode: status,
    headers,
    destroy: vi.fn(),
  });
  mocks.request.mockImplementationOnce((_url, options, callback) => {
    const request = Object.assign(new EventEmitter(), {
      end: () => {
        expect(options.agent).toBe(false);
        expect(options.family).toBe(4);
        expect(options.lookup).toBeTypeOf("function");
        options.lookup(
          "example.com",
          {},
          (_error: Error | null, address: string, family: number) => {
            expect(address).toBe("93.184.216.34");
            expect(family).toBe(4);
          },
        );
        callback(response);
        if (body) response.emit("data", Buffer.from(body));
        response.emit("end");
      },
      setTimeout: () => {},
      destroy: (error?: Error) => {
        if (error) request.emit("error", error);
      },
    });
    return request;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});

describe("public HTTPS fetch", () => {
  it("allows globally routable addresses and rejects private, mapped, and reserved addresses", () => {
    for (const address of ["8.8.8.8", "2606:4700:4700::1111"])
      expect(isPublicAddress(address)).toBe(true);
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "169.254.1.1",
      "192.0.2.1",
      "::ffff:8.8.8.8",
      "fc00::1",
      "fe80::1",
      "2001::1",
      "2001:db8::1",
      "3fff::1",
      "2002:7f00:1::1",
      "3fff::1",
      "2001:db8::1",
    ]) {
      expect(isPublicAddress(address)).toBe(false);
    }
  });

  it("rejects credentials, non-HTTPS and non-443 URLs before resolving", async () => {
    for (const url of [
      "http://example.com",
      "https://user@example.com",
      "https://example.com:444",
    ]) {
      await expect(fetchPublicHttps(url)).rejects.toThrow();
    }
    expect(mocks.lookup).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("does not make a request when any DNS answer is non-public", async () => {
    mocks.lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);
    await expect(fetchPublicHttps("https://example.com")).rejects.toThrow(
      /public/,
    );
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("pins the socket lookup and returns the final URL and bounded response", async () => {
    reply(200, { "content-type": "image/png" }, "image");
    await expect(
      fetchPublicHttps("https://example.com/a", { maxBytes: 5 }),
    ).resolves.toEqual({
      url: "https://example.com/a",
      body: Buffer.from("image"),
      contentType: "image/png",
    });
  });

  it("prefers a pinned IPv4 socket when both address families are public", async () => {
    mocks.lookup.mockResolvedValue([
      { address: "2606:4700:4700::1111", family: 6 },
      { address: "93.184.216.34", family: 4 },
    ]);
    reply(200, { "content-type": "text/html" }, "ok");
    await expect(
      fetchPublicHttps("https://example.com"),
    ).resolves.toMatchObject({
      body: Buffer.from("ok"),
    });
  });

  it("rejects an oversized body", async () => {
    reply(200, {}, "1234");
    await expect(
      fetchPublicHttps("https://example.com", { maxBytes: 3 }),
    ).rejects.toThrow(/maxBytes/);
  });

  it("rechecks DNS after a public redirect before connecting", async () => {
    reply(302, { location: "https://internal.example/" });
    mocks.lookup
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]);
    await expect(fetchPublicHttps("https://example.com")).rejects.toThrow(
      /public/,
    );
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });

  it("follows redirects for HEAD and returns the final URL without a body", async () => {
    reply(302, { location: "/image" }, "ignored redirect body");
    reply(200, { "content-type": "image/jpeg" }, "ignored body");
    await expect(
      fetchPublicHttps("https://example.com/start", { method: "HEAD" }),
    ).resolves.toEqual({
      url: "https://example.com/image",
      body: Buffer.alloc(0),
      contentType: "image/jpeg",
    });
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });

  it("enforces the redirect limit", async () => {
    for (let i = 0; i < 6; i++) reply(302, { location: `/redirect-${i}` });
    await expect(fetchPublicHttps("https://example.com")).rejects.toThrow(
      /redirects/,
    );
    expect(mocks.request).toHaveBeenCalledTimes(6);
  });

  it("enforces an absolute deadline while the response is streaming", async () => {
    vi.useFakeTimers();
    try {
      mocks.request.mockImplementationOnce((_url, _options, callback) => {
        const response = Object.assign(new EventEmitter(), {
          statusCode: 200,
          headers: {},
        });
        const request = Object.assign(new EventEmitter(), {
          end: () => {
            callback(response);
            response.emit("data", Buffer.from("chunk"));
          },
          setTimeout: () => {},
          destroy: (error?: Error) => {
            if (error) request.emit("error", error);
          },
        });
        return request;
      });
      const pending = fetchPublicHttps("https://example.com");
      const rejection = expect(pending).rejects.toThrow(/timed out/);
      await vi.advanceTimersByTimeAsync(5_001);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
});
