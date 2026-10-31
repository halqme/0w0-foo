---
title: oxdg
description: An ultra-fast dependency graph generator built with Oxc, inspired by madge.
repo: https://github.com/halqme/oxdg
tags: [TypeScript, oxc, madge]
---

Oxcを使ってJavaScriptやTypeScriptの依存関係を解析するCLIです。madgeに着想を得て、依存グラフの生成や循環依存の検出に対応しています。

テキストやJSONのほか、Mermaid、D2、SVGで出力できます。SVGの生成にGraphvizのインストールは必要ありません。

```sh
npx oxdg src
npx oxdg src --circular
npx oxdg src --image graph.svg
```
