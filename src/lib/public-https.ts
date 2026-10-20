import { BlockList, isIP } from "node:net";
import { lookup } from "node:dns/promises";
import https from "node:https";

const MAX_REDIRECTS = 5;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 5_000;

const blocked = new BlockList();
const ipv4Subnets: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];
for (const [address, prefix] of ipv4Subnets)
  blocked.addSubnet(address, prefix, "ipv4");
blocked.addSubnet("2001::", 23, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");
blocked.addSubnet("3fff::", 20, "ipv6");
const globalIPv6 = new BlockList();
globalIPv6.addSubnet("2000::", 3, "ipv6");

export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return !blocked.check(address, "ipv4");
  return (
    version === 6 &&
    globalIPv6.check(address, "ipv6") &&
    !blocked.check(address, "ipv6")
  );
}

function parseUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new Error("Only public HTTPS URLs on port 443 are allowed");
  }
  url.hash = "";
  return url;
}

export async function fetchPublicHttps(
  value: string,
  options: { method?: "GET" | "HEAD"; maxBytes?: number } = {},
): Promise<{ url: string; body: Buffer; contentType: string }> {
  const method = options.method ?? "GET";
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0)
    throw new RangeError("maxBytes must be a non-negative safe integer");
  const deadline = Date.now() + TIMEOUT_MS;
  let current = parseUrl(value);

  for (let redirects = 0; ; redirects++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("HTTPS request timed out");
    let dnsTimer: ReturnType<typeof setTimeout> | undefined;
    const addresses = await Promise.race([
      lookup(current.hostname, { all: true, verbatim: true }),
      new Promise<never>((_resolve, reject) => {
        dnsTimer = setTimeout(
          () => reject(new Error("HTTPS request timed out")),
          remaining,
        );
      }),
    ]).finally(() => clearTimeout(dnsTimer));
    if (
      !addresses.length ||
      addresses.some(({ address }) => !isPublicAddress(address))
    ) {
      throw new Error("Host does not resolve exclusively to public addresses");
    }
    const chosen = addresses.find(({ family }) => family === 4) ?? addresses[0];
    const response = await new Promise<{
      status: number;
      headers: import("node:http").IncomingHttpHeaders;
      body: Buffer;
    }>((resolve, reject) => {
      let settled = false;
      let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
      const finish = (
        error?: Error,
        result?: {
          status: number;
          headers: import("node:http").IncomingHttpHeaders;
          body: Buffer;
        },
      ) => {
        if (settled) return;
        settled = true;
        clearTimeout(deadlineTimer);
        if (error) reject(error);
        else resolve(result!);
      };
      const request = https.request(
        current,
        {
          method,
          agent: false,
          family: chosen.family,
          lookup: (_hostname, _options, callback) =>
            callback(null, chosen.address, chosen.family),
          servername: current.hostname,
        },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400 && res.headers.location) {
            finish(undefined, {
              status,
              headers: { ...res.headers, location: res.headers.location },
              body: Buffer.alloc(0),
            });
            res.destroy();
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer | string) => {
            if (method === "HEAD") return;
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += bytes.length;
            if (size > maxBytes) {
              request.destroy(new Error("HTTPS response exceeds maxBytes"));
              return;
            }
            chunks.push(bytes);
          });
          res.on("end", () =>
            finish(undefined, {
              status,
              headers: res.headers,
              body: Buffer.concat(chunks),
            }),
          );
          res.on("error", (error) => finish(error));
        },
      );
      deadlineTimer = setTimeout(
        () => request.destroy(new Error("HTTPS request timed out")),
        Math.max(1, deadline - Date.now()),
      );
      request.setTimeout(Math.max(1, remaining), () =>
        request.destroy(new Error("HTTPS request timed out")),
      );
      request.on("error", (error) => finish(error));
      request.end();
    });
    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.location
    ) {
      if (redirects >= MAX_REDIRECTS)
        throw new Error("Too many HTTPS redirects");
      current = parseUrl(new URL(response.headers.location, current).href);
      continue;
    }
    if (response.status < 200 || response.status >= 300)
      throw new Error(`HTTPS request failed with status ${response.status}`);
    return {
      url: current.href,
      body: response.body,
      contentType: response.headers["content-type"]?.toString() ?? "",
    };
  }
}
