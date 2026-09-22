---
name: make-fallback-portrait
description: Civ6 Modで、キャラクター立ち絵から静止画ベースのCiv6アセット(外交交渉画面フォールバック`FALLBACK_NEUTRAL_*`、ローディング画面ポートレート`LEADER_*_NEUTRAL`、ローディング画面背景`LEADER_*_BACKGROUND`)を実際に生成する時に使う。「フォールバックポートレートを作る」「FALLBACK_NEUTRAL/LEADER_*_NEUTRALを作る/差し替える」「外交画面・ロード画面用の立ち絵を用意する」「ロード画面の背景を作る」「膝下トリミング」「上部余白・下部フェードを付ける/調整する」と言われたとき、または`tools/png2dds/gen-leader-fallback.ts`・`gen-loading-portrait.ts`・`gen-loading-background.ts`を新規に書く/パラメータ調整する場面で使う。**`LEADER_*_NEUTRAL`/`LEADER_*_BACKGROUND`はローディング画面専用ではなく、外交交渉画面の背景(`DiplomacyInfo.BackgroundImage`)・ゲーム設定画面の全身ポートレート「Leader Placard」(`Config.xmlのPlayers.Portrait`/`PortraitBackground`)にもそのまま流用される**(civ6wiki.info記載の`hogehoge_DiplomacyInfo_Background`/`PORTRAIT_*`という専用アセット名は実在しない。公式DLCが例外なくこの使い回しパターンを採用している。詳細は`references/fallback-and-loading-schema.md`)。バッジアイコン(`ICON_*`)はスコープ外(そちらは`make-leader-icons` Skill)。Civ6側の`FallbackLeaders.artdef`/`LoadingInfo`/`DiplomacyInfo`/`Players.Portrait`テーブルのスキーマ・実機裏取りの詳細は`references/fallback-and-loading-schema.md`を参照(本SKILL.mdは「作る手順」、そちらは「Civ6側の仕様・裏取り根拠」の置き場)。
---

# キャラクター立ち絵ベースの静止画アセットの制作手順

一条莉々華Mod(civ6mod-hololive-regloss)で確立した、キャラクター元絵(+ロード画面背景用の環境イラスト)から静止画ベースのCiv6アセットを作る一連の手順。**ここに書く内容はすべて実機で確認済みの事実**(2026-09-21、莉々華で実装・実機確認済み)。

本Skillは「元絵とキャラ名さえあれば、その先の画像加工〜ファイル生成をどう自動化するか」という制作ワークフローに専心する。Civ6側の仕様・裏取り根拠は`references/fallback-and-loading-schema.md`を参照。

対象は3種類、うち2種類(`FALLBACK_NEUTRAL_*`/`LEADER_*_NEUTRAL`)は**同じ画像加工ロジックを共有**(`leader-fallback-compositing.ts`)。表にまとめる:

| 生成物 | 画面 | 元絵 | サイズ | 加工 | 生成スクリプト |
| --- | --- | --- | --- | --- | --- |
| `FALLBACK_NEUTRAL_<LEADER_NAME>` | 外交交渉画面 | キャラ立ち絵 | 高さ1080固定・幅可変 | 膝下クロップ+上部余白+下部フェード | `gen-leader-fallback.ts` |
| `LEADER_<LEADER_NAME>_NEUTRAL` | ローディング画面(ポートレート)+ゲーム設定画面の全身ポートレート「Leader Placard」(`Config.xml`の`Players.Portrait`) | キャラ立ち絵(同じ元絵を流用可) | 高さ1024固定・幅可変 | 膝下クロップ+上部余白+下部フェード(上と同じ関数、高さだけ違う) | `gen-loading-portrait.ts` |
| `LEADER_<LEADER_NAME>_BACKGROUND` | ローディング画面(背景)+外交交渉画面の背景(`DiplomacyInfo.BackgroundImage`)+Leader Placardの背景(`Players.PortraitBackground`) | 環境イラスト(**キャラ不要**、`LoadScreen.xml`上ポートレートとは別レイヤーのため) | 1920x960固定 | 中央クロップ+リサイズのみ(膝下クロップ等は無関係) | `gen-loading-background.ts` |

## 1. 前提: 元絵の要件

- `FALLBACK_NEUTRAL_*`/`LEADER_*_NEUTRAL`用: `Art/Source/`配下に、**全身立ち絵・透過背景(アルファチャンネルあり)**の画像を置く(頭から膝下より先まで描かれていること。膝から下は後述の膝下クロップでどのみち切り落とすので、足先まで描かれていて構わない)
- `LEADER_*_BACKGROUND`用: `Art/Source/`配下に、**キャラクターの写り込みが無い環境イラスト**(アルファ不要)を置く。アスペクト比が1920:960(2:1)と合わなくて構わない(中央クロップで自動調整)
- フォーマットは問わない(webp/png等。`sharp`パッケージでデコードするので大抵の形式が読める)
- **元絵ファイル自体は生成パイプラインが一切書き換えない**(読み込み専用)。加工結果は別ファイルに出力する

## 2. パイプラインの中身

### 2a. `FALLBACK_NEUTRAL_*`/`LEADER_*_NEUTRAL`共通(`gen-leader-fallback.ts`/`gen-loading-portrait.ts`)

`tools/png2dds`ディレクトリで`npm run gen-leader-fallback -- <leaderId> <standingArtFileName>`または`npm run gen-loading-portrait -- <leaderId> <standingArtFileName>`を実行すると、以下を一括生成する(両スクリプトは`KNEE_CROP_FRACTION`/`TOP_MARGIN_FRACTION`/`BOTTOM_FADE_START_FRACTION`の値と対象の高さ(1080 or 1024)以外ほぼ同じ処理)。`leaderId`は`LEADER_`を除いた部分(例: `REGLOSS_ICHIJOU_RIRIKA`)、`standingArtFileName`は`Art/Source/`配下の全身立ち絵ファイル名(例: `ichijou-ririka-stand.webp`):

1. **透明余白のトリム**(`sharp().trim()`)
2. **膝下クロップ**(`KNEE_CROP_FRACTION`、既定0.25): トリム後の全身高さの下25%をカットし、膝のちょい下までにする。公式リーダーおよび他言語版Hololive Mod(EN/ID)は全身ではなくこの高さまでしか描いていないため、それに合わせている
3. **高さを対象サイズにリサイズ**(`FALLBACK_NEUTRAL_*`は1080、`LEADER_*_NEUTRAL`は1024)。公式データは両方とも「全リーダー高さ固定・幅はキャラのシルエットに応じて可変」という実測結果に合わせている(詳細根拠は`references/fallback-and-loading-schema.md`)
4. **上部に透明マージンを追加**(`TOP_MARGIN_FRACTION`、既定0.10): 公式データの実測(5〜15%、平均10%)に基づく。キャラを画像下端に詰め、上に余白を作る(`leader-fallback-compositing.ts`の`padTopMargin`)
5. **下端に向けてRGBを黒へ線形フェード**(`BOTTOM_FADE_START_FRACTION`、既定0.75=高さの下から25%地点からフェード開始): アルファは不変(公式データもほぼ不透明のまま)、色だけを黒へブレンドする(`applyBottomFade`)。**透過フェードではない**点に注意
6. DDS化(フルミップチェーン、`convertPngToDds`)→`.tex`(対応する公式`.tex`をコピーして幅/高さ/ミップ数を差し替え)→`.xlp`→(`FALLBACK_NEUTRAL_*`のみ)`FallbackLeaders.artdef`

### 2b. `LEADER_*_BACKGROUND`(`gen-loading-background.ts`)

`npm run gen-loading-background -- <leaderId> <wallpaperFileName>`で、環境イラストを`sharp().resize(1920, 960, { fit: "cover", position: "center" })`で中央クロップ+リサイズするだけ(膝下クロップ・余白・フェードは無関係)。DDS化→`.tex`→`.xlp`まで一括生成。

生成物の出力先:

| 種別 | パス |
| --- | --- |
| 中間PNG(確認用) | `Art/Icons/<生成物名>.png` |
| DDS/tex | `tools/IconBuild/Textures/` |
| XLP | `tools/IconBuild/XLPs/LeaderFallbackImages.xlp`(`FALLBACK_NEUTRAL_*`)/`RegLoss_LoadingPortrait.xlp`(`LEADER_*_NEUTRAL`)/`RegLoss_Loading.xlp`(`LEADER_*_BACKGROUND`) |
| ArtDef(`FALLBACK_NEUTRAL_*`のみ、他2つは不要) | `tools/IconBuild/ArtDefs/FallbackLeaders.artdef`と`ArtDefs/FallbackLeaders.artdef`(本体Modルート) |

**`LEADER_*_NEUTRAL`/`LEADER_*_BACKGROUND`は`ArtDef`不要**(バッジアイコンと同じ`UITexture`クラスのXLPで直接登録するため)。`FALLBACK_NEUTRAL_*`だけ`FallbackLeaders.artdef`(`LeaderFallback`クラス)経由という点に注意。

## 3. パラメータの調整とプレビュー(ModBuddy再ビルド前に確認する)

`KNEE_CROP_FRACTION`/`TOP_MARGIN_FRACTION`/`BOTTOM_FADE_START_FRACTION`(`FALLBACK_NEUTRAL_*`/`LEADER_*_NEUTRAL`のみ、`LEADER_*_BACKGROUND`には無い)はキャラの体型・ポーズによって微調整が要る(実測値は目安であって、他キャラでもそのまま通用する保証はない)。**ModBuddyビルド→コピー→実機確認は工数が重いので、その前に画像だけで見た目を確認すること**:

1. 該当する`npm run gen-* -- <leaderId> <ファイル名>`(2節参照)でPNGを再生成
2. `npm run preview-fallback-dark-bg -- <生成物名>.png`で、外交交渉画面/ローディング画面に近いダーク背景に合成したプレビューPNG(`Art/Icons/<生成物名>_preview-dark-bg.png`)を生成する。**PNGをそのまま見ると透過部分が白背景に合成されてしまい、下部フェード(色だけ黒に落ちる・透過はしない)が正しく見えない**ため、このプレビューが必須(`LEADER_*_BACKGROUND`は透過が無いので不要)
3. `Read`ツール等でプレビューPNGを見て、余白・膝下位置・フェードの見え方を確認。ズレていたら定数を書き換えて1に戻る
4. 良ければプレビューPNG(`*_preview-dark-bg.png`)を削除してから次へ進む(確認用の使い捨てファイルなので、コミットに含めない)

## 4. ModBuddyビルド〜実機反映(初回配線後は毎回この手順でよい)

画像の中身(元絵・パラメータ)を差し替えるだけなら、以下の手順の繰り返しで済む(`.dep`/`.modinfo`/`Art.xml`等の配線は初回のみ、5節参照):

1. 該当する`npm run gen-* -- <leaderId> <ファイル名>`(3節で調整済みの状態で最終生成)
2. `tools/IconBuild/RegLoss_IconBuild.civ6sln`をModBuddyで開いてビルド
3. 生成物に対応するblpを本体Modの同パスにコピー:
   - `FALLBACK_NEUTRAL_*` → `Platforms/{Windows,MacOS}/BLPs/LeaderFallbackImages.blp`
   - `LEADER_*_NEUTRAL` → `Platforms/{Windows,MacOS}/BLPs/UI/RegLoss_LoadingPortrait.blp`
   - `LEADER_*_BACKGROUND` → `Platforms/{Windows,MacOS}/BLPs/UI/RegLoss_Loading.blp`
4. 実機で確認(`FALLBACK_NEUTRAL_*`は外交交渉画面、`LEADER_*_NEUTRAL`/`LEADER_*_BACKGROUND`は新規ゲーム開始時のローディング画面)

## 5. 初回のみ: Mod側の配線(新規リーダーで初めて導入する場合)

画像生成スクリプト自体は自動でファイルを作るが、以下はスクリプトの範囲外で1回だけ手動配線が要る(詳細根拠・実際の変更箇所は`references/fallback-and-loading-schema.md`を参照):

- `tools/IconBuild/RegLoss_IconBuild.civ6proj`にDDS/tex/XLP(/`FALLBACK_NEUTRAL_*`のみArtDef)を`Content`として登録
- `tools/IconBuild/RegLoss_IconBuild.Art.xml`を配線: `FALLBACK_NEUTRAL_*`は`LeaderFallback`コンシューマ(`relativeArtDefPaths`)とライブラリ(`relativePackagePaths`)、`LEADER_*_NEUTRAL`/`LEADER_*_BACKGROUND`は`UITexture`ライブラリの`relativePackagePaths`に自分のXLPパッケージ名(`.blp`)を追加するだけ
- `LEADER_*_NEUTRAL`/`LEADER_*_BACKGROUND`を使う場合は`XML/Leaders.xml`等に`LoadingInfo`の`Row`(`ForegroundImage`/`BackgroundImage`属性)も追加する
- 本体Modの`civ6mod-hololive-regloss.dep`/`.modinfo`を同様に配線(`tools/png2dds/gen-dep.ts`で`.dep`の`ArtDefDependencies`/`PackageDependencies`は再生成して差分確認できる)

## 6. 別のリーダー(同一リポジトリ内の2人目以降、または姉妹リポジトリ)で使う場合

3つの生成スクリプト(`gen-leader-fallback.ts`/`gen-loading-portrait.ts`/`gen-loading-background.ts`)はキャラ名・元絵ファイル名をCLI引数(`leaderId`/`standingArtFileName`/`wallpaperFileName`、2節参照)で受け取る作りになっており、定数の書き換えは不要。同一リポジトリに2人目以降のリーダーを追加する場合はそのまま新しい引数で実行すればよい。姉妹リポジトリで使う場合も、本Skill言及の各ファイル(上記3つ+`leader-fallback-compositing.ts`+`preview-fallback-dark-bg.ts`、いずれもキャラ名のハードコードなし)をそのままコピーして使える。
