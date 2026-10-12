---
title: Nix Flakes + Home Manager による Dotfiles の宣言的管理
emoji: 🫥
type: tech
topics:
  - nix
  - home-manager
  - dotfiles
  - macos
published: true
published_at: 2026-05-10
zenn_slug: 8d68ba59c1beb1
---

環境構築の再現性を担保する手段としてNixは非常に強力なツールです。僕自身の [dotfiles](https://github.com/halqme/dotfiles) リポジトリでは、Nix Flakes と Home Manager を基盤とした宣言的な構成管理を運用しています。

本記事では、単なるパッケージリストの共有に留まらない、「実用的な開発環境」としての Nix 構成とその運用戦略について書こうと思います。
この構成に行き着くまでは、とてもたいへんでした。

---

## 1. 構成の設計思想：Flake による依存関係の固定

言うまでもなく、この構成の最大の特徴は、Nix Flakes による決定論的な環境定義にあります。

- **`flake.nix`**: 外部依存（`nixpkgs`, `home-manager`）を定義し、ホスト（`hal@MacBook-Pro-M4` 等）ごとに環境を切り出す。
- **ディレクトリ構造**:
  - `hosts/`: 物理マシンごとの差分（ハードウェア固有設定、OS 差分）を吸収。
  - `config/`: アプリケーション固有の設定（ドットファイル）を配置。

## 2. 設定管理の「ハイブリッド戦略」

すべての設定を Nix 言語で抽象化するのではなく、記述の容易さと開発体験のトレードオフを考慮した使い分けを行っています。

### A. Nix モジュールによる抽象化 (`programs.xxx`)

シェルや Git など、環境変数やパッケージ導入と密接に紐づくものは、Home Manager のモジュール機能で記述します。

### B. ネイティブ設定の尊重 (`xdg.configFile`)

一方で、Neovim の Lua 設定や Ghostty の設定などは、Nixでラップせず、`config/` 内のファイルをそのままシンボリックリンクとして展開しています。
これもHome Managerでよしなにできるので、嬉しいですね。
ただ、Zedなど一部の**設定ファイルを書き換える**タイプのプロダクトは非常に相性が悪いです。展開されるシンボリックリンクはnix store内でロックの掛かっているファイルからのもので、当然Nixの特性上そのファイルを編集することは赦されるべきではないからです。ZedのLLM エージェントのモデルなどは変更時に設定ファイルを書き換えるので、この思想とは衝突します。

### 3. Homebrew統合

NixではGUIアプリやフォントの管理にまだ不満があるため、Homebrewを併用しています。ここで課題となるのが、`home-manager switch` ごとに走る `brew bundle` のオーバーヘッドです。

これを解決するため、`home.activation` 属性を利用し、**Brewfileのハッシュチェックによるスキップ機能**を実装しています。ポイントは、設定ファイルの展開が完了した後に実行されるよう、`lib.hm.dag.entryAfter ["linkGeneration"]` を指定することです。

```nix
home.activation.brewBundle = lib.hm.dag.entryAfter ["linkGeneration"] ''
  BREWFILE="$HOME/.config/homebrew/Brewfile"
  HASH_FILE="$HOME/.local/share/home-manager/brew-hash"

  if [ ! -f "$BREWFILE" ]; then
    echo "No Brewfile found at $BREWFILE, skipping."
    exit 0
  fi

  mkdir -p "$(dirname "$HASH_FILE")"
  OLD_HASH=$(cat "$HASH_FILE" 2>/dev/null || true)
  CURRENT_HASH=$(/usr/bin/shasum "$BREWFILE" | /usr/bin/cut -d' ' -f1)

  if [ "$CURRENT_HASH" != "$OLD_HASH" ]; then
    echo "Brewfile changed, running brew bundle..."
    if /opt/homebrew/bin/brew bundle --cleanup --global; then
      echo "$CURRENT_HASH" > "$HASH_FILE"
    else
      exit 1
    fi
  else
    echo "Brewfile unchanged, skipping brew bundle."
  fi
'';
```

この実装により、GUIアプリ・フォントの管理をHomebrewに委ねつつ、Nix のライフサイクル内で高速かつ宣言的な同期を実現しています。

## 4. CI による安定性の確保：Evaluation Failure への対策

Dotfiles の更新において最も回避すべきは、「手元のマシンで `nix flake update` をした結果、環境が壊れて作業が中断すること」です。

Nixpkgs（特に unstable チャンネル）では、稀にプラットフォーム間の依存関係が混入するバグが生じます。実際に以前、`d2` パッケージの Linux 用依存関係が macOS 側の評価時に混入し、構成の展開が不可能になるケースが発生しました。

このようなリスクを管理するため、本リポジトリではCron Job的に以下のActionを使用しています。

1.  **GitHub Actions での常時評価**: PR 作成時に全ホスト（macOS/Linux）の `homeConfiguration` がエラーなく評価可能か検証。
2.  **CI 駆動の自動更新**: `nix flake update` は CI 上で実行。評価とビルドが通ったものだけを `flake.lock` に反映する。

ローカルで壊れる前に CI で検知できる状態にすることで、Dotfilesの安定性を確保しています。

## 5. まとめ

Nixはかなり学習コストが存在しますが、長期的な開発環境の安定性を求める場合、この構成は非常に合理的な選択肢となるでしょう。
やはり、まずは手を動かすのがよいと思います。nixはプロジェクト単位でも使用できます。少しずつ、いろんなことに使えるようになっていくでしょう。
