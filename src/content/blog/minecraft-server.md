---
title: OrbStackとTailscaleで作る無料のお手軽Minecraftサーバー
emoji: 🆓
type: tech
topics:
  - tailscale
  - docker
  - minecraft-server
  - containerization
  - virtualization
published: true
published_at: 2025-10-02
zenn_slug: 99f230fa16c02a
---

マイクラサーバー作りたいけどJavaのインストールとかめんどくさいナリ……1ファイルでVanilaサーバーからPaperMCとかのPluginサーバーなどを立てる方法ないっすか？と思って調べてたらかなり良い方法を見つけました。
`docker-compose`が使用できる環境であれば1分程度で構築でき、Tailscaleを使用することにより、ユーザーを限定したセキュアなマルチプレイが可能になります。
なのですが、意外とこの方法についての日本語情報が少なかったので、備忘録もかねて投稿します。

## 準備するもの

- **Docker**
  `docker compose`が使用できればよいです。私は[OrbStack](https://orbstack.dev/)を使用しています。

- **Tailscale**
  離れた家族や友達と一緒に遊びたい場合、サーバーを世界に公開する必要がありますが、当然リスクを伴います。しかし、[Tailscale](https://tailscale.com/)を使えば自分が確認したユーザのみが参加する独自ドメインネットワーク内でP2P通信が出来るようになります。
  **Free PlanではTailnetに参加できるのは3名までですが**ちょっくら家族とやるくらいならそれで十分ですし（そこまで親しくない人といちいちTailnetを共有することはないでしょう）、特定の端末のみ他のTailscalユーザに共有することも可能です。

## さくっと手順

仕組み的には、macOS, Windows, LinuxなどいずれのOSでも実行可能だと思います。
イメージとして`itzg/minecraft-server`を使用します。

ドキュメントはこちら。

https://docker-minecraft-server.readthedocs.io/

### サーバー:Tailscaleを起動する

Tailscaleをインストールして起動します。[TailscaleのAdmin Console](https://login.tailscale.com)でマイクラサーバーを作成した端末が確認できれば大丈夫です。
IPアドレスをコピーしておきましょう。

### サーバー:compose.ymlの作成

1. 任意のディレクトリに移動してサーバー用のディレクトリを作成します。
2. 作成したディレクトリ内に `compose.yml` を作成します。

```text
./Minecraft_Servers
 └─ Myserver1/
    └─ compose.yml
```

3. 任意のテキストエディタで `compose.yml`を開く。
   以下のように編集します。

```yaml
# compose.yml
services:
  server:
    container_name: mc_server
    image: itzg/minecraft-server
    restart: unless-stopped
    tty: true
    stdin_open: true
    ports:
      - "25565:25565" # SERVER_PORTと同一
    environment:
      EULA: "TRUE"
      # Server
      TZ: "Asia/Tokyo"
      ENABLE_WHITELIST: "FALSE"
      SERVER_NAME: "MyServer"
      SERVER_PORT: "25565"
      ENABLE_JMX: "false"
      ENABLE_RCON: "true"
      BROADCAST_CONSOLE_TO_OPS: "true"
      BROADCAST_RCON_TO_OPS: "true"
      MOTD: "Minecraft Server by Docker"
      # Minecraft Version
      VERSION: 1.21.9
      # Game Config
      SEED: ""
      ALLOW_FLIGHT: "false"
      ALLOW_NETHER: "true"
      ANNOUNCE_PLAYER_ACHIEVEMENTS: "true"
      DEBUG: "false"
      DIFFICULTY: "normal"
      ENABLE_COMMAND_BLOCK: "false"
      ENABLE_STATUS: "true"
      ENFORCE_SECURE_PROFILE: "false"
      ENFORCE_WHITELIST: "false"
      FORCE_GAMEMODE: "true"
      FUNCTION_PERMISSION_LEVEL: 2
      GENERATE_STRUCTURES: "true"
      HARDCORE: "false"
      LEVEL_NAME: "world"
      LEVEL_TYPE: "DEFAULT"
      MAX_PLAYERS: 2
      MODE: "survival"
      ONLINE_MODE: "true"
      OP_PERMISSION_LEVEL: 4
      PREVIEWS_CHAT: "true"
      PVP: "false"
      SIMULATION_DISTANCE: 10
      VIEW_DISTANCE: 12
      SNOOPER_ENABLED: "false"
      SPAWN_ANIMALS: "true"
      SPAWN_MONSTERS: "true"
      SPAWN_NPCS: "true"
      SPAWN_PROTECTION: 0
      USE_NATIVE_TRANSPORT: "true"
      # Plugin
      TYPE: "VANILLA" # "PAPER" "FABRIC" ...
    volumes:
      - ./data:/data
```

保存したら`compose.yml`が存在するディレクトリをシェルで開いて

```bash
docker-compose up -d
```

を実行します。

```
[+] Running 2/2
 ✔ Network minecraft-server_default  Created       0.0s
 ✔ Container mc_server               Started       0.1s
```

このような表示になれば大丈夫です。
このとき、`compose.yml`と同じディレクトリには`data/`というディレクトリが新たに作成されます。
これはサーバーのワールドデータなどが全部入っているものです。バックアップなどはこのフォルダをよしなにすることで可能になると思います。バックアップ用のイメージなども配布されていますね。

```text
./Minecraft_Servers
 └─ Myserver1/
    ├─ data/
    └─ compose.yml
```

### クライアント:Tailscaleを起動する

サーバーと同じTailnetに参加しましょう。

### クライアント:Minecraftで接続してみる

マイクラを起動してマルチプレイ→ダイレクト追加でサーバーのIPアドレスを入力すれば、それだけで参加可能です。

## Pluginサーバー、Modサーバーの設定

`compose.yml`の `TYPE`で変更できます。Fabric、Forge、Hybrids、Paper、Quiltなんかが指定できるようです。

それぞれの設定は[こちら](https://docker-minecraft-server.readthedocs.io/en/latest/types-and-platforms/)を見るとだいたい書いてあります。

### Pluginの導入

Pluginは`.jar`ファイルを直接設置する方法なのですが、場所がわかりにくいです。
`compose.yml` の `VOLUME` のところで

```diff
# compose.yaml
    volumes:
      - ./data:/data
+     - ./plugins:/plugins
```

と追加してあげると

```text
./Minecraft_Servers
 └─ Myserver1/
    ├─ data/
    ├─ plugins/
    └─ compose.yml
```

とトップの部分にマウントされるため、追加しやすくなります。
