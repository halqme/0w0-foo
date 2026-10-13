# 0w0.foo

[https://0w0.foo](https://0w0.foo) は、個人サイト・ブログです。Astroで構築し、Cloudflare Workersへ静的サイトとしてデプロイします。

## 必要なツール

- [Bun](https://bun.sh/) — package manager（`package.json`の`packageManager`を参照）
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
vp run build
vp run preview
```

`vp run check`はVite PlusのチェックとAstroファイルのフォーマット確認を行います。Astroの型・コンテンツチェックは別途`vp run check:astro`で実行します。非Astroファイルの整形にはOxfmt、`*.astro`にはPrettierとAstroプラグインを使います。

`bun run deploy`はローカルから`cf deploy`を実行します。デプロイ前の確認には`bunx cf deploy --dry-run`を使えます。

## デプロイ（Cloudflare）

ビルド成果物は`dist/`に出力されます。Workerとドメインは[`cloudflare.config.ts`](cloudflare.config.ts)、静的アセットのディレクトリは[`wrangler.config.ts`](wrangler.config.ts)で設定しています。

| Cloudflare build/deploy setting | 値                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Root directory                  | `/`                                                                                                              |
| Build command                   | `bun run build && bunx wrangler build --experimental-new-config --experimental-cf-build-output --env production` |
| Deploy command                  | `bunx cf deploy --prebuilt --mode production`                                                                    |
| Build variables                 | なし                                                                                                             |

## ディレクトリ概観

- `src/pages/` — ページとルート
- `src/components/`、`src/layouts/` — UIコンポーネントと共通レイアウト
- `src/content/blog/`、`src/content.config.ts` — ブログ記事とコンテンツ定義
- `src/styles/`、`uno.config.ts` — スタイルとUnoCSS設定
- `public/` — 公開静的ファイル

画面の構成・スタイル仕様は[DESIGN.md](DESIGN.md)を参照してください。記事の公開状態やメタデータは[`src/content.config.ts`](src/content.config.ts)のschemaで定義しています。
