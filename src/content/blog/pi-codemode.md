---
title: Piがv1.0.0になった。ところでv0.99.0からいるCodemodeってなに？
emoji: 🦔
type: idea
topics:
  - pi
  - coding-agent
  - mcp
  - codemode
  - cli
published: true
published_at: 2026-10-02
zenn_slug: c53a951ca36b49
---

コーディングやエージェンティックなタスクで複数のツールを使うとき、従来の直接呼び出す方式（Function Calling）では、モデルがツールを1回呼ぶたびに結果を受け取り、その内容を見て次のアクションを決めます。しかし、この方法では中間データが毎度セッションに蓄積されるため、ツールの呼び出し回数や出力データが増えるほどコンテキスト長を圧迫してしまいます。

PiのCodeModeは、モデル自身にJavaScriptコードを書かせ、そのスクリプト内からツールを呼び出させる仕組みです。複数のツール呼び出しをスクリプト側で完結させ、途中の出力を加工・フィルタリングしたうえで、必要な情報だけをモデルへ返せます。

MCP対応とCodeModeはPi 0.99.0で導入され、Pi 1.0.0ではCodeMode向けシステムプロンプトの簡素化や、スクリプト内から画像生成モデルを呼び出す機能などが追加されました。リリースノートによると、既定ツールとCodeModeを有効にしたGPT-5.6の構成において、プロンプト消費が約5,300トークンから約3,300トークンまで削減されたと報告されています。

## CodeModeの仕組み

モデルは指示に応じてJavaScriptコードを組み立て、Piの `codemode` ツールに渡します。渡されたコードはWebAssembly上のQuickJSサンドボックス環境で実行され、`tools.<name>(...)` を経由してPiの組み込みツールや拡張機能、MCPサーバーのツールを呼び出します。

なお、CodeModeは（QuickJSサンドボックスと言う通り）Node.jsの実行環境ではありません。スクリプトからNode.jsの各種APIやファイルシステム、ネットワークへ直接アクセスすることはできず、ツールの実行やモデル呼び出しはすべてPiが提供する `tools` や `models` APIを介して行われます。

また、利用可能なツールが事前に分からない場合でも、スクリプト内から `searchTools()` で必要なツールを検索し、`describeTool()` で引数のスキーマなどを確認できます。そのため、あらかじめ全ツールのスキーマ定義をモデルのプロンプトへ展開しておく必要がありません。このおかげで、MCPサーバーを追加しても大量のツールでコンテキストが圧迫されにくくなります。

たとえば、Linearから未完了の課題一覧を取得し、識別子とタイトルだけを抽出して返すスクリプトは次のようになります。

```js
const { issues } = await tools.mcp__linear__list_issues({
  team: "Pi",
  state: "open",
  limit: 250,
});

return issues.slice(0, 10).map(({ identifier, title }) => ({
  identifier,
  title,
}));
```

この例ではAPIから最大250件の課題を取得していますが、モデルに返却されるのは先頭10件の識別子とタイトルのみです。不要な生データを会話コンテキストに流し込まずに済みます。また、独立した複数のツール呼び出しを `Promise.all()` で並列実行し、スクリプト内で結果を集約することも可能です。

最終的にスクリプトが `return` した値だけが、モデルへの実行結果として渡されます。ツールの生出力をそのまま会話履歴へ蓄積するのではなく、必要な項目だけに絞り込んだり、集計・加工してからモデルに返せる点がCodeModeの大きな強みです。

## なぜCodeModeを使うのか

PiがCodeModeを採用した背景には、膨大なツール定義や中間出力でモデルのコンテキストを圧迫せず、プログラムコードが得意とする「処理の組み合わせ」と「データの加工」を最大限に活かす狙いがあります。
ここにJavaScriptを用いることで、ツールの実行順序や並列処理、どのデータを最終的に残すかといった制御フローを、1つのスクリプトとして簡潔に記述できます。

Piの開発陣は以前から、MCPに頼り切るよりも、CLIと簡潔なREADMEを用意してエージェントに自律実行させるアプローチを推奨していました。シェルスクリプトやコードを活用すれば、複数のコマンドをパイプでつなぎ、出力を適宜ファイルへ退避するといった柔軟な処理が容易に行えるからです。CodeModeはまさにこの設計思想をPiのツール呼び出し機構へ持ち込んだものであり、MCPツールを含む各種機能をコードベースで柔軟に連携させられます。

MCPがサーバーのツールを検出・実行するための共通規格であるのに対し、CodeModeはPi上で利用可能な各種ツールをモデルがコードによってオーケストレーションするための仕組みです。PiはstdioまたはStreamable HTTP経由でMCPサーバーに接続できますが、デフォルトの `codemode` exposure（公開モード）では、ツールの個別スキーマをモデルのコンテキストへ直接注入せず、スクリプト内からのオンデマンドな呼び出しに留めます。

さらに、CodeModeはMCPツール専用の機能ではありません。Pi組み込みのツールをまとめたり、スクリプトから軽量な分類モデルや画像生成モデルを呼び出したりすることも可能です。外部のMCPサーバーを導入していない環境であっても、単一のスクリプト内で複数のツールやモデルを柔軟に連携できます。

## CodeModeを有効にする

MCPサーバーを登録した場合、デフォルトでは `codemode` exposureとして接続され、Piは自動的にCodeModeを有効化します。なお、Piの起動中にMCP設定を編集した場合は、`/reload` コマンドを実行して設定を再読み込みしてください。

MCPサーバーを使わずに、CodeMode単体を手動で有効化することも可能です。ユーザー共通設定（`~/.pi/agent/settings.json`）またはプロジェクト単位の設定（`.pi/settings.json`）に、次のように記述します。

```json
{
  "defaultTools": ["+codemode"]
}
```

設定項目名は複数形の `defaultTools` です。値に `+codemode` と先頭に `+` を付けることで、標準ツール（`read`、`bash`、`edit`、`write`）を維持したままCodeModeを追加できます。`+` を付けずに `["codemode"]` と指定した場合は、標準ツールの設定が上書きされ、CodeModeのみが有効になる点に注意してください。

一時的に動作を試したい場合は、CLIの起動オプションで指定できます。

```sh
pi --tools read,bash,edit,write,codemode
```

`--tools` フラグも有効ツールのリスト全体を上書きするため、標準の4ツールも併用したい場合はすべて列挙します。なお、プロジェクト設定（`.pi/settings.json`）は、そのワークスペースを信頼（trust）した後にのみ反映されます。

## 使うときの注意

CodeModeが実行するスクリプト自体はQuickJSのサンドボックス内で分離されていますが、スクリプト内部から呼び出されるツールの実行権限まで無制限に隔離されるわけではありません。スクリプト経由のツール呼び出しもPi本体の実行パイプラインを通るため、拡張機能などで設定した確認・承認フローは通常どおり適用されます。当然ながら、CodeModeそのものが安全性の担保や承認管理を代替するものではないため、Pi本体のツール制御設定や接続先MCPサーバーの実行権限はあらかじめ確認しておくことが重要です。

## 参考資料

- [Codemode（Pi公式ドキュメント）](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/codemode.md)
- [Enable codemode（Pi公式CLIドキュメント）](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#enable-codemode)
- [MCP Servers（Pi公式ドキュメント）](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/mcp.md)
- [CHANGELOG（Pi公式）](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/CHANGELOG.md)
- [You Said No MCP!（Earendil）](https://earendil.com/posts/you-said-no-mcp/) — PiがMCPを取り込んだ背景
- [What if you don't need MCP at all?（Mario Zechner）](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/) — CLIとコードでツールを組み合わせる発想
