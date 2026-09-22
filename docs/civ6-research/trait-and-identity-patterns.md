# Trait実装・文明アイデンティティ要約(civ6wiki.info、未検証)

> このファイルは`.claude/skills/implement-leader-abilities/references/`から移動した。**Skillの行動指示ではなく、civ6wiki.info(2017〜2020年執筆)の未検証な要約**であるため、実機確認済みの行動指示を書く`.claude/skills/`ではなく`docs/civ6-research/`に置く。着手して実機確認できたら、確認済みの事実として`implement-leader-abilities` Skillの本文に書き足すこと。

出典: `https://civ6wiki.info/?MOD/作成方法/新文明・指導者/*`および`.../その他/*`(著者yosxpeee、2017〜2020年執筆、SDKサンプル`LEADER_JASPER_KITTY`/`CIVILIZATION_FELINE`を素材にした写経チュートリアル)。`research-mod` Skillの優先順位に従い、都度WebFetchし直す代わりにここへ要約を置く。**このリポジトリで実機確認した事実ではない**ので、`implement-leader-abilities` SKILL.md本文の実機確認済みパターンと矛盾したらそちらを優先すること。

## 文明特性・指導者特性のXML構造

- 効果は`TraitModifiers`(Trait→ModifierId紐付け)→`Modifiers`(`ModifierType`+`SubjectRequirementSetId`)→`ModifierArguments`(パラメータ)の3段構成。地形条件が絡む場合はさらに`RequirementSets`→`Requirements`→`RequirementArguments`→`RequirementSetRequirements`が必要
- バニラの近い特性(例: ロシアのツンドラボーナス)をコピーして地形/産出物だけ差し替えるのが安全で間違いが少ない
- 文明の地形スタートバイアスは`StartBiasTerrains`(`CivilizationType`/`TerrainType`/`Tier`)
- 指導者特性で偉人ポイントを毎ターン加算する場合は`MODIFIER_PLAYER_ADJUST_GREAT_PERSON_POINTS` + `ModifierArguments`で`GreatPersonClassType`(例: `GREAT_PERSON_CLASS_MUSICIAN`)と`Amount`を指定するだけ。他の偉人種別に変えるのも`GreatPersonClassType`の差し替えだけで済む
- 地形/産出物のタイプ名の一覧は`Sid Meier's Civilization VI\Base\Assets\Gameplay\Data`配下の`Terrains.xml`/`Yields.xml`を参照

## 文明カラー・AIの好み

- `Colors`(`Type`+RGBA)→`PlayerColors`(`PrimaryColor`=背景色/ローディング画面カーテン色、`SecondaryColor`=ユニットアイコン前景色、`TextColor`)。専用xmlを作りPropertyの`UpdateColors`への登録が必要
- AI優先度は`AiListTypes`(リスト種別定義)→`AiLists`(`ListType`と`LeaderType`/`System`の紐付け、`System`は`Buildings`/`Civics`/`Technologies`/`Districts`)→`AiFavoredItems`(具体的な優先アイテム)の3段。**区域だけ`Favored="true"`が別途必要**。宗教の優先度は`FavoredReligions`(`LeaderType`+`ReligionType`)で独立している
- 各アイテムの定義名はバニラの対応xml(`Buildings.xml`/`Civics.xml`/`Technologies.xml`/`Districts.xml`/`Religions.xml`)を参照

## 多言語対応(日本語化)

1. 元のText xmlの`<Row>`に`language="en_US"`を明示しておく(バニラのテキストは元から入っている場合がある)
2. ファイルごとコピーして別名(例: 末尾に`JP`)で保存
3. コピーした方だけ`BaseGameText`→`LocalizedText`、`Row`→`Replace`、`en_US`→`ja_JP`に置換
4. `<Text>`の中身を日本語化し、Propertyの`Text`項目にファイルを追加登録

## 中国語対応(2026-09-22、実機ファイルで確認済み・このリポジトリ未実装)

Language属性の正確な値は`Base/Assets/Text/Vanilla_zh_Hans_CN.xml`(簡体字)・`Vanilla_zh_Hant_HK.xml`(繁体字、**`zh_Hant_TW`ではなく`zh_Hant_HK`**)で確認済み。書式はja_JP同様`<Replace Tag="..." Language="zh_Hans_CN">`(バニラ側の上書き)。自Modの新規LOCキーなら`<Row Tag="..." Language="zh_Hans_CN">`でよい(en_US/ja_JPと同じ`UpdateText`アクションに追加登録するだけ)。

`<UpdateText>`は`.xml`だけでなく`.sql`ファイルも同列に`<File>`登録できる(HktkNban氏シリーズで確認、`INSERT OR REPLACE INTO LocalizedText (Tag, Language, Text) ...`形式)。

姉妹Mod2系統で対応方針が全く異なる(いずれも実機ファイルで確認済み):

- **HktkNban氏(Hololive JP 1〜5期生)**: 実翻訳はせず、`Text/Update_Text_zh_CN.sql`で「言語設定が中国語の場合、日本語を表示」という趣旨のコメント付きで`INSERT OR REPLACE INTO LocalizedText (Tag, Language, Text) SELECT Tag, 'zh_Hans_CN', Text FROM LocalizedText WHERE Tag LIKE '%キャラ名%'`(`zh_Hant_HK`にも同様)を実行し、既存の(恐らくja_JP)テキストをそのまま中国語スロットにコピーするフォールバック手法。翻訳コスト0で「文字化け/空欄表示を防ぐ」目的と思われる
- **Neox氏(HoloEN)**: `Core/Civilization_Localisation.sql`・`Leader/Leader_Localisation.sql`に`zh_Hant_HK`(繁体字)の実訳608行を保有(ファイル冒頭のコメントに翻訳協力者`ChimpanG, SeelingCat`のクレジットあり)。**ただし`zh_Hans_CN`(簡体字)は0件**、繁体字のみの対応

このMod(civ6mod-hololive-regloss)では中国語対応は未着手。着手する場合、HktkNban方式(ja_JPテキストをzh_Hans_CN/zh_Hant_HKにコピーするだけの.sql、翻訳コスト0)が最も低コストな第一歩になる。

## 文明のその他表示調整

- Civilopediaの文明ページに謎の項目(学名等)が出る場合は`CivilizationInfo`(`Header`/`Caption`)の該当`Row`を削除
- 首都以降の都市名をランダム化するには`Civilizations`の`Row`に`RandomCityNameDepth`(ランダム化する候補数)を追加し、`LOC_..._CITY_1`〜`_n`を必要数だけ用意する

## 参照元URL一覧(再取得用)

- 文明特性: `.../新文明・指導者/文明特性`
- 指導者特性: `.../新文明・指導者/指導者特性`
- 文明カラー・AIの好み: `.../新文明・指導者/文明カラー・AIの好み`
- その他細かい部分(Civilopedia/都市名): `.../新文明・指導者/その他細かい部分`
- 多言語対応(日本語化): `.../その他/多言語対応(日本語化)`
