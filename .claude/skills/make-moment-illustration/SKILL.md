---
name: make-moment-illustration
description: Civ6 Modで、歴史的瞬間(Historic Moment、時代スコアのポップアップ・タイムライン)の挿絵(`MomentIllustrations`テーブルの`Texture`)を元絵/写真から生成し、BLPにビルドしてゲームに組み込む時に使う。「偉業の画像を作る」「歴史的瞬間の挿絵を付ける」「固有ユニット/区域/建造物を作った時の画像」「Moment_Infrastructure/Moment_UniqueUnitを作る」「挿絵が写真っぽすぎる/カラフルすぎる」と言われたとき、または`tools/png2dds/gen-moment-illustration.ts`・`moment-illustration-tone.ts`を実行/調整する場面で使う。固有要素そのものの実装(`UnitReplaces`/`DistrictReplaces`等)は`add-unique-content` Skill、バッジアイコン(`ICON_*`)は`make-leader-icons` Skillの範囲。
---

# 歴史的瞬間の挿絵を作る

固有ユニット(UU)・固有区域(UD)・固有建造物(UB)・固有施設(UI)を**初めて**完成/生産すると、嵐の訪れ(と興亡の世界)では時代スコア+4の歴史的瞬間が自動で発火する(実装側でModifier等は不要)。その挿絵を専用画像に差し替える手順。

実績:
- ReGLOSS(姉妹リポジトリ `civ6mod-hololive-regloss`): UU「うに」、キャラ絵(`cutout`モード)。2026-09-22実機確認済み
- このリポジトリ: UD「シャチたちの楽園」・UB「シャチの水族館」、写真(`photo`モード)。2026-09-29実機確認済み(FireTunerの`City.ltp`で建てて歴史的瞬間の画面に表示されることを確認)

## 1. Civ6側の仕様

| 対象 | 歴史的瞬間 | `MomentIllustrationType` | `MomentDataType` |
| --- | --- | --- | --- |
| UU | `MOMENT_UNIT_CREATED_FIRST_UNIQUE` | `MOMENT_ILLUSTRATION_UNIQUE_UNIT` | `MOMENT_DATA_UNIT` |
| UD | `MOMENT_DISTRICT_CONSTRUCTED_FIRST_UNIQUE` | `MOMENT_ILLUSTRATION_UNIQUE_DISTRICT` | `MOMENT_DATA_DISTRICT` |
| UB | `MOMENT_BUILDING_CONSTRUCTED_FIRST_UNIQUE` | `MOMENT_ILLUSTRATION_UNIQUE_BUILDING` | `MOMENT_DATA_BUILDING` |
| UI | `MOMENT_IMPROVEMENT_CONSTRUCTED_FIRST_UNIQUE` | `MOMENT_ILLUSTRATION_UNIQUE_IMPROVEMENT` | `MOMENT_DATA_IMPROVEMENT` |

(出典: `DLC/Expansion2/Data/Expansion1_Moments.xml`。UIは表の値まで確認済みだが挿絵を付けた実績はない)

- **挿絵は1要素につき1行**: `<Row MomentIllustrationType="..." MomentDataType="..." GameDataType="<UnitType/DistrictType/BuildingType>" Texture="<名前>.dds"/>`。`MomentIllustrations`テーブルは拡張パック専用なので、**拡張パック限定で読み込まれるXMLに書く**(このリポジトリでは`<Criteria>Expansion2</Criteria>`付きの`XML/OrcaParadise.xml`)
- **汎用のデフォルト挿絵は無い**。公式の固有要素でも、登録の無いもの(ウォーターパーク/水族館系ではコパカバーナ以外)は挿絵なしで出る。未登録時の表示は、`HistoricMoments.lua`を読む限り「挿絵なし」だが、ReGLOSS側の記録では「汎用フォールバック画像」とあり、食い違いは未解決(どちらにせよ専用画像を登録すれば関係ない)
- **画像規格(公式SDKで実測)**: 456×332px、非圧縮RGBA、フルミップチェーン。アルファは中心ほぼ不透明・四隅完全透明の楕円ビネット。SDK Assetsの`Civ6/DLC/Expansion1/pantry/Textures/`にある`Moment_UniqueUnit_*`(8枚)・`Moment_Infrastructure_*`(7枚)はすべてこの規格
- **公式の絵柄**: 全15枚とも、焦げ茶の影→黄土色のハイライトの単色グラデーション(セピア調)にインクの線画。カラーの挿絵はそのままの色で表示されるため、写真をそのまま入れると浮く(2026-09-29、本人から「実写写真だからカラフルすぎる」と指摘された)
- XLPの`m_ClassName`は`UITexture`。パッケージは公式の`UI/PrideMoments`と別の新規パス(このリポジトリは`UI/HoloX_Moments`)でよい。`Texture`列の値=BLPのエントリ名で解決される

## 2. 元絵の用意

- `Art/Source/<キャラ名>/`に置く(`Art/Source/`はgit管理外)。Steamで配布するので、権利的に使える素材か本人に確認する
- 元絵の種類で`cutout`か`photo`かを決める:
  - `cutout`: **透過背景のキャラ絵**。余白をトリムし、高さの85%で中央に配置する。色はそのまま
  - `photo`: **不透明な写真・風景画**。キャンバスの縦横比(456:332)に合わせて**下端基準・左右中央**でトリミング(空や天井など上側が削れる)→縮小→公式調の色合わせ+線画
- 命名は公式に倣う: UUは`Moment_UniqueUnit_<名前>`、UD/UBは`Moment_Infrastructure_<名前>`(例: `Moment_Infrastructure_HoloxOrcaParadise`)

## 3. 生成

`tools/png2dds`で:

```
npm run gen-moment-illustration -- <cutout|photo> <momentIllustrationName> <Art/Source/からの相対パス>
# 例: npm run gen-moment-illustration -- photo Moment_Infrastructure_HoloxOrcaParadise sakamata-chloe/waterpark.jpg
```

- 出力: `tools/IconBuild/Textures/<名前>.png`(確認用の中間ファイル、コミットしない)・`.dds`(git管理外)・`.tex`(公式`Moment_UniqueUnit_Cree.tex`から名前だけ差し替え)と、`tools/IconBuild/XLPs/HoloX_Moments.xlp`
- **XLPは全挿絵で1つを共有し、実行のたびに既存エントリを残して追記する**(上書きしない)。挿絵を削除したいときはXLPから手で消す
- `photo`モードの色合わせ(`moment-illustration-tone.ts`): 実行時にSDK Assetsの公式`Moment_*.dds`全部を読み、明るさごとの平均色と明るさ分布を実測する。写真の明るさ分布を公式に揃え、輪郭(ぼかした明るさのSobel)を暗くして線画に見せ、明るさ→公式の色に置き換える。色は手で決めた値ではない
  - 線の出方は`INK_EDGE_START`/`INK_EDGE_FULL`/`INK_MAX_DARKENING`で調整する(目視で決めた値)。細かい建物が多い俯瞰写真は線がごちゃつきやすい
  - 色合わせだけ(線画なし)は、本人の評価では「写真加工したの丸出し」で不採用だった(2026-09-29)
- **本人に仕上がりを見せる**: 羊皮紙色(`233,222,196`)で背景を埋めたプレビューをTempに作り、**絶対パス**で伝える(グローバル規則「チャットでのパス表記」)

## 4. 組み込み(初回のみ必要な作業あり)

1. **IconBuildプロジェクトに登録(新しい挿絵ごと)**: `tools/IconBuild/HoloX_IconBuild.civ6proj`に`.dds`/`.tex`の`<Content>`を追加。XLP(`XLPs\HoloX_Moments.xlp`)の`<Content>`と、`HoloX_IconBuild.Art.xml`の`UITexture`ライブラリへの`UI/HoloX_Moments.blp`登録は初回のみ。**このリポジトリのこれらのファイルは改行がLF**なので、CRLFを混ぜない
2. **`MomentIllustrations`の行を追加(新しい挿絵ごと)**: 1節の表に従う
3. **BLPをビルド**: このPCはユーザー名が日本語のため、ModBuddyのビルドは`cooker.log`に`Who moved the pantry?`を出して失敗し、BLPが作られない(成功表示なので気づきにくい)。`make-leader-icons`の`references/japanese-username-workaround.md`の手順で、`subst X:`してAssetCookerを直接実行する(`<Package>`は`HoloX_Moments`)。Claude Codeからはサンドボックス外で実行すれば、本人にModBuddyを操作してもらわなくても済む
4. **BLPを本体へコピー**: `Platforms/{Windows,MacOS}/BLPs/UI/HoloX_Moments.blp`。`_cooked`フォルダと`subst`は片付ける
5. **初回のみ**: `.modinfo`の`<Files>`に上記BLP 2つを追加し、`npm run gen-dep -- ../IconBuild/HoloX_IconBuild.Art.xml <出力先>`で`.dep`を作り直す。`gen-dep`はIconBuildプロジェクトの名前/IDを写すので、**`.dep`の`<ID>`ブロックは本体Mod(`Hololive HoloX`)のものに戻す**(差分が`UI/HoloX_Moments.blp`の1行だけになっていればOK)。2枚目以降の挿絵は同じBLPに入るので不要
6. **実機確認**: 対象の固有要素を初めて完成させ(FireTunerで建てても可。建造物は前提の区域・建物から順に建てる必要がある。`bootstrap-leader`の`references/firetuner.md`参照)、歴史的瞬間の画面とタイムラインに挿絵が出るかを本人に見てもらう

画像だけ作り直す場合は3・4だけでよい(`.dep`・`.modinfo`は変わらない)。
