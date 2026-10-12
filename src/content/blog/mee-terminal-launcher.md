---
title: Goで書かれた拡張可能なターミナルランチャー「mee」を作りました
emoji: 🚀
type: tech
topics:
  - go
  - cli
  - raycast
published: true
published_at: 2026-02-28
---

GoとAI Driven Developmentの練習をかねて、ターミナルランチャー「mee」を作りました。Raycastのような体験をCLIで提供することを目指しています。

## meeとは

[HALQME/mee](https://github.com/HALQME/mee)（読み方：メエェ）はGoで書かれた高速で拡張性の高いターミナルランチャーです。

- **Raycastっぽい操作感** - RaycastのようなUIをターミナル上で実現
- **Pluginシステム** - Pluginで機能を拡張できる
- **並列検索** - 全てのPluginが並列して実行、結果が返ってくる
- **Triggerベースフィルタリング** - PluginにTriggerPrefixを設定すれば、対応するPrefixが入力された時だけ実行される
- **Fuzzy Matching** - 組み込みのスコアリングで結果をランキング

要するに、RaycastのようなものをCLIで実現しようとしています。

## インストール

```bash
go build -o mee ./mee.go
```

これだけでビルドされます。**Go 1.21以上が必要**です。

## セットアップ

最初はPluginが何もない状態なので、セットアップコマンドを実行します。

```bash
# デフォルトPlugin込みでセットアップ
./mee setup --with-plugins

# セットアップ状態確認
./mee check
```

## 使い方

### インタラクティブモード

単に

```bash
./mee
```

で起動すると、UIが立ち上がります。インプットボックスにクエリを入れると、Pluginが並列して検索して結果を表示します。

- `↑` `↓` - 結果の移動
- `Tab` - Triggerの補完
- `Enter` - 選択決定
- `Esc` / `Ctrl+C` - 終了

### コマンドライン

直接クエリを投げることもできます。

```bash
# 直接クエリ
./mee "Safari" # Safariが開く

# パイプライン入力
echo "100 50 +" | ./mee # 150を返す
```

## スコアリング

結果はPluginが返すスコアと、クエリとのマッチ度でランキングされます。スコアは0-100の整数で、100が最高です。

より短い単語でマッチし、クエリの単語順が近いほど高スコアになります。さらに、ユーザーの検索履歴もスコアに影響します。

## バンドル Plugin

meeにはデフォルトでいくつかのPluginがバンドルされています。

| Plugin   | 説明                   | Trigger                                    |
| -------- | ---------------------- | ------------------------------------------ |
| apps     | アプリケーション起動   | -                                          |
| calc     | 電卓                   | -                                          |
| rpn      | 逆ポーランド記法計算機 | -                                          |
| web      | Web検索                | `wiki:`, `g:`, `gh:`, `ddg:`, `yt:`, `so:` |
| emoji    | Emoji検索              | `emoji:`                                   |
| unixtime | Unix時間変換           | `unix:`                                    |

TriggerPrefixを使うと、特定のPluginだけを有効にできます。

```bash
./mee "emoji:cat"
./mee "wiki:Golang"
```

## Plugin管理

Pluginのインストール・削除・有効/無効設定ができます。

```bash
# GitHubからPluginをインストール
./mee plugin add https://github.com/user/repo/dir

# インストール済みPlugin一覧
./mee plugin ls

# Pluginを削除
./mee plugin remove <plugin-name>

# Pluginを有効/無効化
./mee plugin enable <plugin-name>
./mee plugin disable <plugin-name>

# Plugin更新
./mee plugin update
```

Pluginのインストール先は設定ファイルで指定できます。

## 設定

設定ファイルは `~/.config/mee/config.yaml` です。

```yaml
app:
  mode: interactive # "daemon" or "interactive"
  startup: false # システム起動時に自動起動
  log_level: info # "debug", "info", "warn", "error"

display:
  theme: auto # "auto", "light", "dark"
  max_results: 50
  list_height: 15

plugins:
  dirs:
    - ~/.config/mee/plugins
    - /usr/local/share/mee/plugins
  runtime_default: yaegi # "yaegi", "wasm", "native"

search:
  fuzzy_threshold: 0.7 # 0.0-1.0
  history_boost: true # 履歴を結果に重み付け

storage:
  db_path: ~/.local/share/mee/mee.db

registry:
  cache_dir: ~/.cache/mee/plugins

# カスタムカラー
colors:
  title: "#00ff00"
  input: "#ffffff"
  mark: "#ff00ff"
  item: "#cccccc"
  sub: "#888888"
  help: "#666666"
```

## Pluginの作成

meeのPluginはYaegi（Goで書かれたGoインタープリタ）で実装されています。Go知識があれば書ける構造です。

### Plugin構成

```
plugins/myplugin/
├── manifest.json
└── myplugin.go
```

### manifest.json

```json
{
  "name": "myplugin",
  "version": "1.0.0",
  "trigger": ">", // オプション：Pluginを活性化するプレフィックス
  "script": "myplugin.go",
  "description": "My custom plugin"
}
```

### myplugin.go

Pluginは`Search`という関数を実装する必要があります。この関数はクエリを受け取り、JSON形式の結果セットを返します。

```go
package main

import (
	"encoding/json"
	"strings"
)

type ResultItem struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Action   string `json:"action"`
	Payload  string `json:"payload"`
	Score    int    `json:"score"`
}

type ResultSet struct {
	Items        []ResultItem `json:"items"`
	ProviderName string       `json:"provider_name"`
}

// 必須：検索関数
func Search(query string) string {
	// このPluginがクエリを処理しない場合は空文字列を返す
	if !shouldHandle(query) {
		return ""
	}

	rs := ResultSet{
		Items: []ResultItem{{
			ID:       "myplugin:result",
			Title:    "結果タイトル",
			Subtitle: "サブタイトル",
			Action:   "open",   // "open", "launch", "copy", "print", "trigger"
			Payload:  "value",
			Score:    100,
		}},
		ProviderName: "myplugin",
	}

	data, _ := json.Marshal(rs)
	return string(data)
}

func shouldHandle(query string) bool {
	// ロジックをここに記述
	return strings.HasPrefix(query, ">")
}
```

### Action種類

| Action            | 説明                                  |
| ----------------- | ------------------------------------- |
| `open` / `launch` | URLを開くまたはアプリケーションを起動 |
| `copy`            | ペイロードをクリップボードにコピー    |
| `print`           | 標準出力に出力                        |
| `trigger`         | 別のPluginのTriggerを活性化           |

### 高速Pluginのポイント

- **早期リターン** - クエリが関連しない場合はすぐ返す
- **シンプルに** - 重い操作は避ける
- **Triggerを使う** - TriggerPrefixを設定すると、不必要な呼び出しを回避できる

## パフォーマンス

- **並列実行**: 全てのPluginがgoroutineで並列して検索
- **Triggerフィルタリング**: Trigger付きPluginは対応するPrefixの時だけ実行
- **シンボル共有**: インタープリタの標準ライブラリシンボルはPlugin間で共有
- **Lazy Loading**: Pluginは最初に検索された時に初期化
- **Sandbox**: Pluginごとにタイムアウトとメモリ制限を設定可能
- **履歴Boost**: 頻度の高い結果はより高くランク付け

## 今後の展望

- PluginシステムのWASM対応
- さらなるパフォーマンス改善
- テーマシステムの拡張
