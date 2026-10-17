# 0w0.foo

[https://0w0.foo](https://0w0.foo) は、個人サイト・ブログです。Astroで構築し、Cloudflare Workersへ静的サイトとしてデプロイします。

## 必要なツール

- [Bun](https://bun.sh/) — package manager（`package.json`の`packageManager`を参照）
- [Node.js](https://nodejs.org/) 24.21.0 以上 — [Void](https://void.cloud/) CLI（`void`）の実行に必要
- [Vite Plus](https://viteplus.dev/) — `vp`コマンドによる開発・チェック・フォーマット

## 開発

```sh
vp install
vp run dev
vp run check
vp run check:astro
vp run format
vp run format:check
vp run lint
vp run test
vp run test:watch
vp run build
vp run preview
```

`vp run check`はVite PlusのチェックとAstroファイルのフォーマット確認を行います。Astroの型・コンテンツチェックは別途`vp run check:astro`で実行します。非Astroファイルの整形にはOxfmt、`*.astro`にはPrettierとAstroプラグインを使います。`vp run test`でVitestのテストを実行し、`vp run test:watch`で変更を監視できます。現在はタグslug生成、ブログ記事の絞り込み・並び替え、リンクカードとOGPアセット生成、マスコットの睡眠状態遷移・タイミング・行動・移動をテストしています。

`bun run deploy`はローカルから`void deploy --platform cloudflare`を実行します（初回はブラウザで Cloudflare へのサインインが必要です）。デプロイ前のビルド確認は`vp run build`で行います。

## デプロイ（Cloudflare）

ビルド成果物は`dist/`に出力されます。デプロイ設定は[`void.config.ts`](void.config.ts)にあります（静的サイトとして`dist/`を配信、Worker 名・カスタムドメイン・互換日付・404 挙動など）。

| Cloudflare build/deploy setting | 値                                                    |
| ------------------------------- | ----------------------------------------------------- |
| Root directory                  | `/`                                                   |
| Build command                   | `bun run build`                                       |
| Deploy command                  | `bunx void deploy --platform cloudflare --skip-build` |
| Build variables                 | なし                                                  |

CI では `CLOUDFLARE_API_TOKEN`（Workers Scripts の編集、および Void が参照するリソースの読み取りができる API トークン）をシークレットに設定してください。デプロイ先アカウント ID は [`void.config.ts`](void.config.ts) の `cloudflare.account_id` と [`void.lock.json`](void.lock.json) に固定しており、ビルド時に `.void-wrangler.jsonc` へ展開されるため、通常は `CLOUDFLARE_ACCOUNT_ID` は不要です（[Void のドキュメント](https://void.cloud/)でも、トークンが複数アカウントに届くときの補助とされています）。

`workers_dev` / `preview_urls` はオフで、`0w0.foo` のカスタムドメインだけを公開します。Void の readiness はそのドメイン向けです。

`void.config.ts`を変えたら`void.lock.json`の`source`/`resolved`も揃えてコミットしてください。初回デプロイ後に Void が lock を更新した場合は、その内容を取り込みます。

## ディレクトリ概観

- `src/pages/` — ページとルート
- `src/components/`、`src/layouts/` — UIコンポーネントと共通レイアウト
- `src/content/blog/`、`src/content.config.ts` — ブログ記事とコンテンツ定義
- `src/styles/`、`uno.config.ts` — スタイルとUnoCSS設定
- `public/` — 公開静的ファイル

画面の構成・スタイル仕様は[DESIGN.md](DESIGN.md)を参照してください。記事の公開状態やメタデータは[`src/content.config.ts`](src/content.config.ts)のschemaで定義しています。

## Cursor mascot

The decorative `0w0` mascot lives in `src/components/ui/Mascot.astro`.
Its logic is split into three independent units:

- `src/lib/mascot/sleep.ts`: DOM-independent sleep story, event transitions,
  timing, and the drop/rise offset. Only `dispatchSleep` changes the story.
  `advanceSleep` updates the offset and reports rise completion. `Mascot.astro`
  owns browser timers and sends those events. Intent and expression are separate.
- `src/lib/mascot/behavior.ts`: a small Utility AI choosing between wandering,
  investigating a nearby interactive element, and retreating when surprised.
  Energy, curiosity, wariness, cooldowns, and commitment time shape its choices.
- `src/lib/mascot/steering.ts`: velocity-based arrival, obstacle separation,
  short multi-corner paths around visible DOM content, and targets placed on
  the far side of an investigated element relative to the cursor.

The follower is decorative and does not intercept pointer events. Its motion
can be paused or resumed with the on-screen control and is disabled by
`prefers-reduced-motion`; Astro page transitions and tab visibility preserve
the existing pause/cleanup handling. Obstacles are sampled
periodically rather than queried on every animation frame; small visible
headings, links, controls, images, code blocks, and explicit
`data-mascot-obstacle` regions are considered.

Run the deterministic behavior, movement, and cleanup harness with:

```sh
bun scripts/mascot-harness.mjs
```
