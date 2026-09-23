---
name: make-leader-icons
description: Civ6 Modで文明/指導者のバッジアイコン(`ICON_CIVILIZATION_*`/`ICON_LEADER_*`)を、キャラクター元絵から実際に生成する時に使う。「アイコンを作る」「バッジアイコンを差し替える」「選択画面が？のまま」「BLPをビルドする」「XLP/.texを書く」と言われたとき、または`tools/png2dds/gen-icon-sources.ts`・`build-icons.ts`・`gen-tex.ts`・`gen-xlp.ts`を新規に書く/実機デバッグする場面で使う。`FALLBACK_NEUTRAL_*`/`LEADER_*_NEUTRAL`/`LEADER_*_BACKGROUND`(外交交渉画面・ローディング画面)は`make-fallback-portrait` Skillの範囲。`bootstrap-leader`で指導者が選択画面に出るところまで終わった後、または並行して使う独立作業。
---

# バッジアイコンの制作手順

一条莉々華Mod(civ6mod-hololive-regloss)で確立した、キャラクター元絵からバッジアイコン(文明/指導者の丸いバッジ、選択画面・外交パネル・技術/社会制度ツリー等で使われる)を作る一連の手順。**ここに書く内容はすべて実機で確認済みの事実**。

Civ/Leaderの選択画面自体は`bootstrap-leader` Skillの範囲で(アイコンが未着手の「？」フォールバックのままでも)動作するようになる。アイコンの実装はそこから独立して進められる別作業だが、**GUIツール(ModBuddy)を介した手作業が多く工数が重いので、着手前に`references/icon-blp-pipeline.md`を一通り読んでから始めること**。

**断片情報から仮説を積み上げがちな調査が必要になったら、先に`research-mod` Skillに従って一次情報を洗うこと。**

## 手順の要点

`references/icon-blp-pipeline.md`に実機検証済みの完全な手順(dds用意→tex流用→xlp記述→Mod.Art.xml登録→`.dep`ファイル→ModBuddyビルド)を書いてある。要点だけ書くと:

- **PNG直置きでは動かない(実機確認済み)。ModBuddy必須。** `IconTextureAtlases`の`Filename`は実ファイルパスではなく、ModBuddyのAssetEditorで作る**XLP(UITextureクラス)のEntryID**を指しており、実体ピクセルはModBuddyビルドで生成される`.blp`の中にしか無い
- 文明アイコン: 22, 30, 32, 36, 44, 45, 48, 50, 64, 80, 128, 256 px。指導者アイコン: 32, 45, 48, 50, 55, 64, 80, 256 px
- `.dep`ファイル(`AssetObjects..GameDependencyData`)が実在し`.modinfo`の`<Files>`に列挙されていないと、`UpdateArt`アクションごと無視される。ModBuddyが自動生成しないケースがあったため、`tools/png2dds/gen-dep.ts`(`npm run gen-dep --`)で`Mod.Art.xml`から機械的に生成する運用にしている

本体Modの`.modinfo`(動作実績のある一段階古いスキーマ)をModBuddyに触らせないため、アイコン画像のビルドパイプライン(`tools/IconBuild/`)は本体Modとは別のModBuddyプロジェクトとして分離してある。再生成手順(`tools/png2dds/`の各スクリプト→ModBuddyでビルド→`.blp`を本体にコピー)も`references/icon-blp-pipeline.md`に書いてある。

## 生成スクリプト(`tools/png2dds/`)

`civilizationId`/`leaderId`は`ICON_CIVILIZATION_`/`ICON_LEADER_`を除いた部分(例: `REGLOSS_ICHIJOU`/`REGLOSS_ICHIJOU_RIRIKA`)。キャラ名はハードコードされておらずCLI引数で渡す作りなので、2人目以降のリーダーでもファイルの書き換えは不要。

- `npm run gen-icon-sources -- <civilizationId> <civSilhouetteMasterFileName> [<leaderId> <leaderFaceMasterFileName>]`: `Art/Source/`のマスター素材から各サイズのPNGを`Art/Icons/`に生成(`icon-manifest.ts`にサイズ一覧、`gen-icon-sources.ts`にトリミング/マスク処理)。文明アイコンはバニラの45pxのようなフルカラー版を作らず、全サイズを白シルエットにする(理由は`docs/civ6-icon-color-bug-investigation.md`末尾)
- `npm run build-icons`: `Art/Icons/*.png`を`tools/IconBuild/Textures/*.dds`に変換(ファイル名から自動判定するため引数なし)
- `npm run gen-tex -- <civilizationId> <leaderId>`: 公式`.tex`テンプレートをコピーして`tools/IconBuild/Textures/*.tex`を生成
- `npm run gen-xlp -- <civilizationId> <leaderId>`: `tools/IconBuild/XLPs/RegLoss_Icons.xlp`を生成
- `npm run gen-dep -- <Mod.Art.xml> <out.dep>`: `.dep`を機械生成

## 未解決の色バグ

リーダー選択画面の能力アイコン色/パウズメニューの黒表示に関する未解決の調査(白シルエット化を試して撤回した経緯を含む)は本Mod固有のデバッグログのため、`docs/civ6-icon-color-bug-investigation.md`に分離してある。次にこの領域を触るセッションは、まずそちらを読んでから着手すること。
