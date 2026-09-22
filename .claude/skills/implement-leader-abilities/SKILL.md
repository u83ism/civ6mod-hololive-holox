---
name: implement-leader-abilities
description: Civ6 Modで文明能力/指導者能力(Trait)の効果を実装する時に使う。「文明能力を実装する」「指導者特性の効果を書く」「Modifierの書き方」「AIの好みを設定する」「文明カラーを設定する」「ゲームモードで能力を切り替える」と言われたとき、または`Traits`/`Modifiers`/`Requirements`系のXMLを新規に書く場面で使う。説明文(`_NAME`/`_DESCRIPTION`)の文体自体は`write-official-jp-text-style` Skillの範囲(そちらを合わせて使うこと)。bootstrap-leaderで指導者が選択画面に出るところまで終わった後に使う。
---

# 文明能力・指導者能力(Trait)の実装

一条莉々華Mod(civ6mod-hololive-regloss)の実装で確立したパターン集。各パターンの詳細(実機ログ・罠の経緯・未検証事項)は`references/`配下の個別ファイルに置いてあるので、該当する実装に着手する前に読むこと。ここでは各パターンの要点だけを書く。

## 資源クラス別の産出量ボーナス

「所有する資源の数に応じてゴールド等を加算する」系のTraitは、エチオピア方式(`MODIFIER_PLAYER_CITIES_ADJUST_RESOURCE_YIELD_BY_COUNT`)では資源クラスで絞り込めない。代わりに`MODIFIER_PLAYER_CITIES_ATTACH_MODIFIER`(自国限定。信仰"Religious Idols"の`MODIFIER_ALL_CITIES_ATTACH_MODIFIER`をそのまま流用すると敵文明にも波及するバグになるので使わない)+`MODIFIER_CITY_PLOT_YIELDS_ADJUST_PLOT_YIELD`+`REQUIREMENT_PLOT_IMPROVED_RESOURCE_CLASS_TYPE_MATCHES`(資源クラス一致+改善済み判定を1つで行う)の組み合わせで実装する(実機確認済み、2026-09-20)。都市中心の下の資源は「改善済み」扱いにならない一方、区域(産業区域で確認)の下の資源はなる、という非対称な実機挙動も確認済み。

資源クラスでなく特定のImprovementType単体で絞り込みたい場合は`REQUIREMENT_PLOT_IMPROVEMENT_TYPE_MATCHES`(引数`ImprovementType`)を使う、同じ構造の姉妹パターンがある。**独占/大企業モードの「産業」(`IMPROVEMENT_INDUSTRY`)/「大企業」(`IMPROVEMENT_CORPORATION`)は区域(District)ではなく改善(Improvement)なので注意**(2026-09-21、「産業区域」と誤認してDistrict用Modifierで実装してしまった罠あり)。

詳細は`references/resource-yield-bonus-pattern.md`を読むこと。実例は`XML/Civilizations.xml`(`TRAIT_CIVILIZATION_REGLOSS_ICHIJOU`)、`XML/Leaders_Monopolies.xml`(`TRAIT_LEADER_REGLOSS_ICHIJOU_RIRIKA_MONOPOLIES`)。

## ゲームモードの有無で能力を切り替える

`.modinfo`の`ActionCriteria`+`ConfigurationValueMatches`(`GAMEMODE_XXX`)でモードON時だけ追加XMLを読み込める(実機確認済み、2026-09-20)。Traitの切り替え方は名前が変わるか否かで選ぶ: **名前ごと変わるなら別TraitTypeへ`Delete`+付け替え**(ギルガメシュ/英雄と伝説モード方式)、**名前が同じで中身(Description等)だけ変わるなら`<Traits><Update><Where/><Set>`**(シュメール文明能力「伝説の勇者」/蛮族一族モード方式)。指導者Trait/文明Traitの違いでは決まらない点に注意。

**罠(必須)**: 上記はゲーム内(`InGameActions`)だけの話。**リーダー選択画面(フロントエンド)は`ActionCriteria`を評価しないため、上記だけでは選択画面の表示は切り替わらない**。選択画面は`GameModePlayerInfoOverrides`テーブル(`GameModeType`列)を使うが、**このテーブル単体は一切参照されない**。`Queries`/`QueryCriteria`/`PlayerInfoOverrideQueries`の3テーブルでモードごとに個別登録しないと行が拾われず、この登録はゲームモードの導入元DLCが個別に行うものなので、独占/大企業モードのように導入元(KublaiKhan_Vietnam DLC)が登録していないモードでは自分のModで3テーブルとも新規登録する必要がある(2026-09-21実機で踏んだ罠、`Base/Assets/UI/FrontEnd/PlayerSetupLogic.lua`を直接読んで判明)。

詳細(XML例・使い分けの根拠・選択画面対応)は`references/game-mode-switching-pattern.md`を読むこと。実例は`XML/Leaders.xml`+`XML/Leaders_Monopolies.xml`+`XML/Config.xml`(`TRAIT_LEADER_REGLOSS_ICHIJOU_RIRIKA`、独占/大企業モード)。

## ユニークアジェンダ(HistoricalAgenda)の好み/嫌い

バニラの専用ハードコードModifierType(例: `MODIFIER_PLAYER_DIPLOMACY_AGENDA_SHORT_LIFE_GLORY`)はModから新規追加できないため、汎用`MODIFIER_PLAYER_DIPLOMACY_SIMPLE_MODIFIER`+`SubjectRequirementSetId`で好み/嫌いを組む(1vs1決闘モードで実機動作確認済み、2026-09-20)。`SubjectRequirementSetId`は「Owner自身との関係(例: `REQUIREMENT_PLAYER_AT_WAR_AND_HAS_MET`)」か「対象単体の一般的な状態(例: `REQUIREMENT_PLAYER_IS_NOT_WARMONGER`)」のどちらを見るかで挙動が変わるので、意図に合わせて選ぶこと。**罠(必須)**: `ModifierStrings`に`Context="Sample"`・`Text="LOC_TOOLTIP_SAMPLE_DIPLOMACY_ALL"`を各ModifierIdごとに追加しないと、Opinion内訳の理由テキストが「理由不明」にフォールバックする。

詳細(Requirementの使い分け・デバッグ手順)は`references/agenda-likes-dislikes-pattern.md`を読むこと。実例は`XML/Leaders.xml`。

## 既存ユニットの数値ブースト(BuildCharges等)

「労働者の使用回数+1」のような、既存の標準ユニット(Builder等)に対する数値ブーストだけが目的なら、UUを新設せず`MODIFIER_PLAYER_UNITS_ADJUST_XXX`系のModifierType(例: `MODIFIER_PLAYER_UNITS_ADJUST_BUILDER_CHARGES`)+`SubjectRequirementSetId`で対象を絞る方式が最短(2026-09-22実機確認)。絞り込み用のRequirementSetはバニラが既に定義済みのグローバル共有ID(例: `UNIT_IS_BUILDER`、`Policies.xml`で1回だけ定義されPyramid/始皇帝/公共事業/農奴制が使い回している)をそのまま参照でき、Mod側で再定義する必要はない。実例は始皇帝`FIRST_EMPEROR_TRAIT`の`TRAIT_ADJUST_BUILDER_CHARGES`(`Amount=1`)で、表記も「労働者の使用回数制限が通常よりも1回増加。」をそのまま流用できる。実装は`XML/Civilizations.xml`(`TRAIT_CIVILIZATION_REGLOSS_ICHIJOU`の`REGLOSS_ICHIJOU_ADJUST_BUILDER_CHARGES`)を参照。

**罠(必須・当初UU化を試みて撤回した経緯)**: 同じ「労働者の使用回数+1」を狙って`UnitReplaces`でUU化するアプローチは、`Improvement_ValidBuildUnits`(ImprovementType×UnitTypeのホワイトリスト、`UnitReplaces`では自動継承されない)を置換元と同じ数だけ手動で完全再現しないと「労働者の完全上位互換」にならない。この一覧はバニラ+全DLCで50件超あり、しかもRise and Fall/Gathering Storm本体限定分(`GameCoreInUse`判定でロードされるかどうかがルールセット依存)と個別文明DLC限定分(そのDLCが無いと`Improvements`テーブルに行自体が存在しない)が混在するため、1行でも参照先が欠けると`FOREIGN KEY constraint failed`で`XML`全体の検証が落ち、**ゲームが起動不能になる**(2026-09-22実機で発生)。「UU化して完全上位互換にする」コストは、単純な数値ブースト1個の実装コストとして見合わない場合が多いので、まずTraitへの直接Modifierで足りないか検討すること。詳しくは`add-unique-content` SKILL.mdの該当セクションを参照。

## civ6wiki.info要約: Trait/Modifierの基本構造、文明カラー・AIの好み、多言語化(未検証)

まだ着手していないTrait実装パターンに手を付けるときは、先に`docs/civ6-research/trait-and-identity-patterns.md`を読むこと。文明特性・指導者特性のXML構造(`TraitModifiers`→`Modifiers`→`ModifierArguments`、地形条件の`RequirementSets`系)、文明カラー(`Colors`/`PlayerColors`)、AIの好み(`AiListTypes`/`AiLists`/`AiFavoredItems`)、多言語対応(`LocalizedText`への変換手順)、Civilopedia/都市名ランダム化などの細部調整をciv6wiki.info(2017〜2020年執筆、SDKサンプルを素材にした写経チュートリアル)から要約してある。**このリポジトリで実機確認した事実ではない**ので、上記の実機確認済みパターンと矛盾したらそちらを優先する。実機確認できたらこのSKILL.mdへ確認済みパターンとして書き足すこと。

## 説明文(`_NAME`/`_DESCRIPTION`)を書くときは

このSkillの範囲外。`write-official-jp-text-style` Skillを使うこと(公式Trait説明文422件の文体調査に基づくスタイルガイド)。

**断片情報から仮説を積み上げがちな調査が必要になったら、先に`research-mod` Skillに従って一次情報を洗うこと。**
