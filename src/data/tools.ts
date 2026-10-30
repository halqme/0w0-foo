export const tools: {
  name: string;
  type: string;
  url: string;
  comments: string[];
}[] = [
  {
    name: "かわせみ4",
    type: "IME",
    url: "https://www.monokakido.jp/ja/mac/kawasemi4/",
    comments: ["日本語入力ソフト。キーコンフィグがかなり自由度が高い"],
  },
  {
    name: "Zed",
    type: "Editor",
    url: "https://zed.dev/",
    comments: ["Rust製の最強エディタ。よく手になじむ"],
  },
  {
    name: "fx",
    type: "Coding Agent",
    url: "https://fx.sh/",
    comments: ["Zig製コーディングエージェント。起動が速い気がする"],
  },
  {
    name: "Cloudflare Workers",
    type: "Platform",
    url: "https://developers.cloudflare.com/workers/",
    comments: ["エッジの概念を覆しそうなエッジランタイム"],
  },
  {
    name: "Vivaldi",
    type: "Browser",
    url: "https://vivaldi.com",
    comments: ["パワフルでプライベートなブラウザ"],
  },
  {
    name: "Tinycast",
    type: "Launcher",
    url: "https://tinycast.dev",
    comments: ["Raycastオルタナティブなランチャー"],
  },
  {
    name: "Ghostty",
    type: "Terminal",
    url: "https://ghostty.org",
    comments: ["ターミナルエミュレータのなかではとくに完成度が高いと思う"],
  },
  {
    name: "Grok Premium",
    type: "LLM",
    url: "https://grok.com",
    comments: ["主にfx用のサブスク", "わざわざXアカウントとは関連していない"],
  },
  {
    name: "Claude Pro",
    type: "LLM",
    url: "https://claude.com/",
    comments: ["研究用のサブスク。Claude Codeを好まないため専らチャット利用"],
  },
  {
    name: "Muse",
    type: "LLM",
    url: "https://muse.ai",
    comments: [
      "知能は地元のLLMなら赦される程度だが常駐型エージェントとしてのUX・コスパは異常",
    ],
  },
];
