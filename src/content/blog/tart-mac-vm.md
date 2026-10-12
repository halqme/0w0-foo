---
title: Apple Silicon Macの仮想化はTartがよかった
emoji: 🥮
type: tech
topics:
  - macos
  - virtualization
  - containerization
  - linux
  - cli
published: true
published_at: 2024-08-15
zenn_slug: e85f5d9ae97b24
---

## 最初に

Apple Silicon Mac で仮想マシンを使うときといえば、GUI なら UTM や VMWare Fusion、VirtualBuddy, Parallels Desktop が有名です｡CUI なら Multipass や OrbStack などがあげられるでしょう｡どれも良いものですが、個人的には GUI のアプリケーションはターミナルから起動するのがやや面倒で、CUI のものは GUI のセットアップが面倒でした｡

そこで、今回紹介するのが、Tart です｡

[cirruslabs/tart](https://github.com/cirruslabs/tart "cirruslabs/tart") は Apple Silicon 上で macOS および Linux 仮想マシンを構築、実行、管理するための仮想化ツールセットです｡Apple Virtualization Framework によって高速な仮想マシンを利用することができます｡

https://tart.run/

Tartはcli から仮想マシンの管理を行いますが、仮想マシンを起動すると、GUI が立ち上がります｡

調べてみましたが何も分かりませんでした！としてしまいそうなほどに情報がありませんでした｡

Tart の存在を教えてくださった豆蔵デベロッパーサイト様に、ここで謝意を述べさせていただきます｡ [Tart で macOS / Linux の仮想マシンを使う | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/blogs/2024/02/12/tart-vm/#%E7%8B%AC%E8%87%AA%E3%82%A4%E3%83%A1%E3%83%BC%E3%82%B8%E3%81%AE%E4%BD%9C%E6%88%90 "Tart で macOS / Linux の仮想マシンを使う | 豆蔵デベロッパーサイト")

\*Cirrus Runners では仮想化技術として Tart を用いて CI ランナーを提供していますが、今回は扱いません｡

## インストール

Homebrew からインストールできます｡

```bash
brew install cirruslabs/cli/tart
```

インストールするときは、homebrew/core/tart ではなく、cirruslabs/cli/tart をインストールするようにしましょう｡

homebrew-core のほうは 2024/08/14 現在、0.38.0 からアップデートされていません｡最新バージョンは 2.17.0≤ となります｡

## 仮想マシンを実行する

ほとんど[Quick Start - Tart Virtualization](https://tart.run/quick-start/) に記載されている通りです｡

### 公式イメージから

#### macOS

要件は macOS 13.0 以上となります｡

Tart がインストール済みのマシンで、GitHub コンテナレジストリからプレーンな macOS Sequoia 15.1 beta2 の公式イメージを取得します。

```bash
tart clone ghcr.io/cirruslabs/macos-sequoia-vanilla:15.1-beta-2 sequoia
```

Vanilla だとサイズはおよそ 25GB 以内です｡

イメージのダウンロードが終了すると、マシンの起動が可能になります｡

list で確認できます｡

```bash
$ tart list
Source Name    Disk Size SizeOnDisk State
local  sequoia 50   22   22         stopped
```

`run`でVMが実行できます｡

```bash
tart run sequoia
```

実行すると新しいウィンドウが開き、仮想マシンの macOS が起動します｡かなり起動が早いです｡

取得可能な公式イメージは[full list of image](https://github.com/orgs/cirruslabs/packages?tab=packages&q=macos- "full list of image")に掲載されています｡

ざっくりとした特徴としては、以下の通りです｡

- `macos-{sequoia, sonoma, …}-vanilla`
  - プレーンな macOS イメージ
- `macos-{sequoia, sonoma, …}-base`
  - homebrew がインストール済みの macOS イメージ
- `macos-{sequoia, sonoma, …}-xcode`
  - 指定されたバージョンの Xcode と Fullter がインストールされた macOS イメージ
- `macos-runner`
  - Xcode が最新バージョンまで 3 つとバージョン管理用の Xcodes ツールがインストールされた macOS イメージ

#### Linux Distro

```bash
tart clone ghcr.io/cirruslabs/ubuntu:latest ubuntu
```

デスクトップ環境がないので、早いです｡ 0.9GB だけ

```bash
tart run ubuntu
```

起動するとこんな感じ｡
![Ubuntuを起動した直後のスクリーンショット。アプリケーションウィンドウ内でUbuntu Serverが立ち上がっている。](./assets/620909F7-1773-407D-97D5-21E841CCBBB4.png)  
こちらも取得可能な公式イメージは[full list of images](https://github.com/orgs/cirruslabs/packages?repo_name=linux-image-templates)に掲載されています｡  
Ubuntu, Debian, Fedora があります｡

### ログインなど

公式イメージはすべて、

```plaintext
user   : admin
passwd : admin
```

でログイン可能です｡

### SSH 接続

```bash
tart ip <name>
```

で、VM の IP アドレスを取得できます｡  
公式イメージは SSH 接続ができる状態ですので、

```bash
ssh admin@$(tart ip <name>)
```

で、接続可能です｡

### VM のカスタマイズ

あらかた導入ができたら、仮想マシンのカスタマイズを確認しておきましょう｡  
ストレージサイズは公式イメージはLinuxだと20GBなので、変更の必要性が高そうです｡

```bash
tart get <name>
```

で現在の構成を確認することができ、

```bash
tart set <name> [ --option ]
```

で仮想マシンをカスタマイズすることができます｡

設定項目は以下の通りです｡

| Option        | Description                                     |
| ------------- | ----------------------------------------------- |
| cpu           | CPU のコア数                                    |
| memory        | メモリサイズ (メガバイト単位)                   |
| display       | 表示解像度｡1200x800 で示す                      |
| random-mac    | 新しいランダム MAC アドレスを作成               |
| random-serial | 【macOS のみ】 新しいシリアル番号を生成する     |
| disk          | path のディスクを VM に接続する                 |
| disk-size     | VM ディスクのサイズを指定したサイズ (GB) に変更 |

> **tart-cliの注釈**  
> ディスクのサイズ変更は、ほとんどのクラウド対応 Linux ディストリビューションで使用でき、それ以外のディストロでも`growpart`や`resize2fs`を実行することで機能しますが、macOS の場合は回復パーティションを削除する必要があります。  
> 詳細については、[Tart のPackerプラグインのソースコード](https://github.com/cirruslabs/packer-plugin-tart/blob/main/builder/tart/step%5C_disk%5C_resize.go)を参照してください。

```bash
tart set ubuntu --disk-size 50 --memory 16384
```

これで作成済みのUbuntuマシンのディスクサイズを50GBに、メモリを16384MBにすることができます｡

## ローカルで仮想マシンを構成する

Docker のような感覚で、用意されているOCI互換イメージを利用することもできるのですが、やはり、自分で一から作成したいときもあります｡

### ローカルのイメージから作成

#### 【macOS】 IPSW ファイル

```bash
$ tart create --from-ipsw <location> <name>
```

これだけです｡IPSWから直接OSが作成できるのはうれしいですね｡VMWare FusionなんかはISOイメージを作成しないといけなかったので｡
パスは、ローカルのファイルパスだけでなく、URL も対応していますので、[公式サイト](https://developer.apple.com)のダウンロードページから直接リンクを渡すことが可能です｡

ちなみに、

```bash
tart create --from-ipsw=latest <name>
```

とした場合、対応する IPSW ファイルを自動的に取得してイメージを作成します｡
この使い勝手はVirtualBuddyと似ているといえそうです｡

#### インストール後のセットアップ

VM の初回起動後、macOS のインストールプロセスを手動で実行する必要があります。[Managing Virtual Machine - Tart Virtualization](https://tart.run/integrations/vm-management/) によると、いくつかするべきことがあるらしいです｡

1. 自動ログインを有効にする。 `Users & Groups -> Login Options -> Automatic login`
2. SSH を許可する `Sharing -> Remote Login`
3. ロック画面を無効にする。 `Preferences -> Lock Screen -> disable "Require Password" after 5`
4. スクリーンセーバを無効にする
5. ターミナルで `sudo visudo` を実行し、 `%admin ALL=(ALL) ALL` を `admin ALL=(ALL) NOPASSWD: ALL` に変更し、パスワードなしで sudo を許可する。

#### 【Linux】 ISO イメージ

Linux の場合は少し手順が変わります｡

```bash
tart create --linux <name>
```

で、Linux VM を作成し

```bash
tart run --disk <path/to/os.iso> <name>
```

でインストールディスクをマウントした状態で起動すると、インストール画面が現れます｡

そのあとは、必要に応じて[VMのカスタマイズ](#vm-%E3%81%AE%E3%82%AB%E3%82%B9%E3%82%BF%E3%83%9E%E3%82%A4%E3%82%BA)をしてください｡

SSHの接続はできるようにしておきましょう｡

## まとめ

Tart は Apple Silicon Mac 上で高速な仮想マシン環境を提供します。公式サイトによると、GeekBench 5.5.0ではVirtualMacではホストの95%程度のスコアをたたき出しているそうです｡

CUI での管理と GUI での操作を両立させた使いやすいツールとなっていますので、手軽にデスクトップ環境を使いたい場合は活用してみてください｡
