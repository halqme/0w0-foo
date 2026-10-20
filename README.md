# 0w0.foo

[https://0w0.foo](https://0w0.foo) は、個人サイト・ブログです。Astroで構築し、Cloudflare Workersへ静的サイトとしてデプロイします。

## 必要なツール

- [Bun](https://bun.sh/) — package manager（`package.json`の`packageManager`を参照）
- [Node.js](https://nodejs.org/) 24.21.0 以上 — Cloudflare CLIの実行に使用
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

`vp run check`はVite PlusのチェックとAstroファイルのフォーマット確認を行います。Astroの型・コンテンツチェックは別途`vp run check:astro`で実行します。非Astroファイルの整形にはOxfmt、`*.astro`にはPrettierとAstroプラグインを使います。`vp run test`でVitestのテストを実行し、`vp run test:watch`で変更を監視できます。現在はタグslug生成、ブログ記事の絞り込み・並び替え、リンクカードとOGPアセット生成をテストしています。

`bun run deploy`でビルド後に[Cloudflare CLI（`cf`）](https://github.com/cloudflare/cf)からデプロイします。ローカルで初めて実行する場合は、先に`bunx cf auth login`でサインインしてください。`cf`はベータ版のため、依存バージョンを固定しています。

## デプロイ（Cloudflare）

[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)で、Astroのビルド成果物`dist/`を配信します。SSR用アダプターやWorkerスクリプトは不要です。

- [`cloudflare.config.ts`](cloudflare.config.ts)：アカウント、ドメイン、404などの配信設定
- [`wrangler.config.ts`](wrangler.config.ts)：配信する静的アセットのディレクトリ

`bun run build:cloudflare`はAstroをビルドし、Wranglerパッケージの`cf-wrangler build`で`cf`用のBuild Outputを`.cloudflare/output/`へ生成します。`cf deploy --prebuilt`はその出力をデプロイします。`cf deploy`単体ではAstroのビルド後にBuild Outputが生成されないため、このプロジェクトでは`--prebuilt`を使います。

Cloudflare Workers Buildsでは以下を設定します。ビルドとデプロイを分け、二重ビルドを避けます。

| Cloudflare build/deploy setting | 値                          |
| ------------------------------- | --------------------------- |
| Root directory                  | `/`                         |
| Build command                   | `bun run build:cloudflare`  |
| Deploy command                  | `bunx cf deploy --prebuilt` |
| Build variables                 | なし                        |

公開せずにデプロイ設定を検証する場合は、`bun run build:cloudflare`の後に`bunx cf deploy --prebuilt --dry-run --no-provision`を実行します。

## ディレクトリ概観

- `src/pages/` — ページとルート
- `src/components/`、`src/layouts/` — UIコンポーネントと共通レイアウト
- `src/content/blog/`、`src/content.config.ts` — ブログ記事とコンテンツ定義
- `src/styles/`、`uno.config.ts` — スタイルとUnoCSS設定
- `public/` — 公開静的ファイル

画面の構成・スタイル仕様は[DESIGN.md](DESIGN.md)を参照してください。記事の公開状態やメタデータは[`src/content.config.ts`](src/content.config.ts)のschemaで定義しています。
