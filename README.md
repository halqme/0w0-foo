# 0w0.foo

## Development

```sh
vp install
vp run dev
vp run check
vp run format
vp run format:check
vp run lint
vp run build
vp run preview
```

`vp run format` formats the repository and Astro files; `vp run format:check` checks both. Oxfmt handles non-Astro files, while Prettier with its Astro plugin handles `*.astro` files.

`vp run build` creates the static Astro site in `dist/`. `cf build` and `cf deploy` detect Astro and run its build. `bun run deploy` invokes `cf deploy`; local deployment checks use `cf deploy --dry-run`. The Worker and custom domain are configured in `cloudflare.config.ts`, with Wrangler asset bundling in `wrangler.config.ts`.
