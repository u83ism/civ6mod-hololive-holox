---
name: make-leader-icons
description: Civ6 Modで文明/指導者のバッジアイコン(`ICON_CIVILIZATION_*`/`ICON_LEADER_*`)を、キャラクター元絵から実際に生成する時に使う。「アイコンを作る」「バッジアイコンを差し替える」「選択画面が？のまま」「BLPをビルドする」「XLP/.texを書く」「ビルドは成功したのにBLPが出ない/見た目が変わらない」と言われたとき、または`tools/png2dds/gen-icon-sources.ts`・`build-icons.ts`・`gen-tex.ts`・`gen-xlp.ts`を新規に書く/実機デバッグする場面で使う。`FALLBACK_NEUTRAL_*`/`LEADER_*_NEUTRAL`/`LEADER_*_BACKGROUND`(外交交渉画面・ローディング画面)は`make-fallback-portrait` Skillの範囲。`bootstrap-leader`で指導者が選択画面に出るところまで終わった後、または並行して使う独立作業。
---

# バッジアイコンの制作手順

一条莉々華Mod(civ6mod-hololive-regloss)で確立した、キャラクター元絵からバッジアイコン(文明/指導者の丸いバッジ、選択画面・外交パネル・技術/社会制度ツリー等で使われる)を作る一連の手順。**ここに書く内容はすべて実機で確認済みの事実**。

Civ/Leaderの選択画面自体は`bootstrap-leader` Skillの範囲で(アイコンが未着手の「？」フォールバックのままでも)動作するようになる。アイコンの実装はそこから独立して進められる別作業だが、**GUIツール(ModBuddy)を介した手作業が多く工数が重いので、着手前に`references/icon-blp-pipeline.md`を一通り読んでから始めること**。

**断片情報から仮説を積み上げがちな調査が必要になったら、先に`research-mod` Skillに従って一次情報を洗うこと。**

## 手順の要点

`references/icon-blp-pipeline.md`に実機検証済みの完全な手順(dds用意→tex流用→xlp記述→Mod.Art.xml登録→`.dep`ファイル→ModBuddyビルド)を書いてある。要点だけ書くと:

- **PNG直置きでは動かない(実機確認済み)。ModBuddy必須。** `IconTextureAtlases`の`Filename`は実ファイルパスではなく、ModBuddyのAssetEditorで作る**XLP(UITextureクラス)のEntryID**を指しており、実体ピクセルはModBuddyビルドで生成される`.blp`の中にしか無い
- 文明アイコン: 22, 30, 32, 36, 44, 45, 48, 50, 64, 80, 128, 256 px。指導者アイコン: 32, 45, 48, 50, 55, 64, 80, 256 px
- **Windowsかつユーザー名が日本語(ASCII外)の環境では、ModBuddyのビルドが「成功」と出てもBLPが生成されない。** AssetCookerが日本語パスでクラッシュするため。ビルドの前に`C:\Users\<ユーザー名>`が英数字だけか確認し、英数字でなければ`references/japanese-username-workaround.md`の手順(AssetCookerを英数字パスで直接実行)でBLPを作る
- `.dep`ファイル(`AssetObjects..GameDependencyData`)が実在し`.modinfo`の`<Files>`に列挙されていないと、`UpdateArt`アクションごと無視される。ModBuddyが自動生成しないケースがあったため、`tools/png2dds/gen-dep.ts`(`npm run gen-dep --`)で`Mod.Art.xml`から機械的に生成する運用にしている

本体Modの`.modinfo`(動作実績のある一段階古いスキーマ)をModBuddyに触らせないため、アイコン画像のビルドパイプライン(`tools/IconBuild/`)は本体Modとは別のModBuddyプロジェクトとして分離してある。再生成手順(`tools/png2dds/`の各スクリプト→ModBuddyでビルド→`.blp`を本体にコピー)も`references/icon-blp-pipeline.md`に書いてある。

## 生成スクリプト(`tools/png2dds/`)

`civilizationId`/`leaderId`は`ICON_CIVILIZATION_`/`ICON_LEADER_`を除いた部分(例: `REGLOSS_ICHIJOU`/`REGLOSS_ICHIJOU_RIRIKA`)。キャラ名はハードコードされておらずCLI引数で渡す作りなので、2人目以降のリーダーでもファイルの書き換えは不要。

- `npm run gen-icon-sources -- <civilizationId> <civSilhouetteMasterFileName> [<leaderId> <leaderFaceMasterFileName>]`: `Art/Source/`のマスター素材から各サイズのPNGを`Art/Icons/`に生成(`icon-manifest.ts`にサイズ一覧、`gen-icon-sources.ts`にトリミング/マスク処理)。文明アイコンはバニラの45pxのようなフルカラー版を作らず、全サイズを白シルエットにする(理由は`docs/civ6-icon-color-bug-investigation.md`末尾)
- `npm run build-icons`: `Art/Icons/*.png`を`tools/IconBuild/Textures/*.dds`に変換(ファイル名から自動判定するため引数なし)
- `npm run gen-tex -- <civilizationId> <leaderId>`: 公式`.tex`テンプレートをコピーして`tools/IconBuild/Textures/*.tex`を生成
- `npm run gen-xlp -- <civilizationId> <leaderId>`: `tools/IconBuild/XLPs/HoloX_Icons.xlp`を生成
- `npm run gen-dep -- <Mod.Art.xml> <out.dep>`: `.dep`を機械生成

## 色バグは解決済み(旧: 未解決の色バグ)

リーダー選択画面の能力アイコン色/パウズメニューの黒表示に関する調査(白シルエット化を試して撤回→再挑戦→解決に至った経緯)は本Mod固有のデバッグログのため、`docs/civ6-icon-color-bug-investigation.md`に分離してある。原因は`UpdateColors`アクションにXML形式のファイルを渡していたことで、SQL形式(`.sql`)に切り替えれば解決する(恒久的な手順は`.claude/skills/bootstrap-leader/SKILL.md`4節に昇格済み)。アイコンのピクセル形式(白シルエットかフルカラーか)自体はこのバグの原因ではなかった。

## 白い模様部分を透過(切り抜き)にする時は、2回レンダリングして合成(dest-out)しない

キャラクター元絵(SVG等)に「白い塗り」で描かれた模様(目のハイライト、腹の白い斑点等)があり、それをバッジのシルエット上で「背景円の色が透けて見える穴」として表現したい場合(2色構成のまま模様を出す手法、`docs/civ6-icon-color-bug-investigation.md`参照ではなく本Mod沙花叉クロヱの文明アイコンで実施)、**白い模様部分だけを別途レンダリングしてマスクを作り、`dest-out`ブレンドモードで本体から差し引く、という2回レンダリング方式は避けること**。実機で以下の不具合を踏んだ(2026-09-24):

- 2つの独立したラスタライズ結果(本体全体のレンダリングと、模様部分だけのレンダリング)は、境界のアンチエイリアシングが微妙に食い違う。これを`dest-out`で合成すると、**細い線状の模様が実際より大きく・丸く歪んで切り抜かれる**(本人から「パスを捏造している」と指摘された不具合)。単体のレンダリング結果を目視しても分かりにくく、合成後の結果を元絵と拡大比較して初めて気づいた

**正しい方法**: 元のフルカラー画像を**1回だけ**レンダリングし、その画像自身のピクセルデータを直接読んで、明るい(白い)ピクセルは`alpha=0`に、暗い(黒い)ピクセルは不透明黒にする、という単純な閾値判定に置き換える。同じピクセルデータから導出するため、位置ズレやアンチエイリアシングの不一致が原理的に起こらない。

```js
// full-color PNGを1回だけレンダリングし、そのピクセルを直接閾値判定する
const { data, info } = await sharp(fullColorPngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] === 0) continue; // 元々透明な部分はそのまま
  const brightness = data[i] + data[i + 1] + data[i + 2];
  if (brightness > 600) { data[i + 3] = 0; } // 白い模様 → 透過(切り抜き)
  else { data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; } // それ以外 → 不透明黒
}
```

**関連する落とし穴**: 切り抜いた模様(特に細い線)が小サイズ(32px等)のバッジに縮小すると消えてしまう場合、SVGの`stroke-width`を大きくして太らせる対処は有効だが、`stroke-linecap="round" stroke-linejoin="round"`を安易に使うと、元の模様が持つ**尖った先端等の特徴的な形状が丸く鈍って別物に見える**(三日月形の細い線が単なる丸い塊に化けた実例あり)。太らせる場合も、元の輪郭の特徴(尖り・テーパー)を壊していないか、拡大比較で必ず確認すること。
