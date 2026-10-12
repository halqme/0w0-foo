export async function GET(context: { site?: URL | undefined }) {
  const site = (context.site?.toString() ?? "https://0w0.foo").replace(
    /\/$/,
    "",
  );
  return ((strings: TemplateStringsArray, ...values: any[]) => {
    const body = strings.reduce(
      (acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ""),
      "",
    );
    return new globalThis.Response(body, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  })`User-agent: *
Allow: /

Sitemap: ${site}/sitemap-index.xml
`;
}
