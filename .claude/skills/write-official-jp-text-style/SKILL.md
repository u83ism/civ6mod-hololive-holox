---
name: write-official-jp-text-style
description: Civ6 Mod向けに**日本語の**ゲーム内テキスト(文明/指導者Traitの`_NAME`・`_DESCRIPTION`、ユニット/建造物/Civilopedia等の説明文)を公式の文体に合わせて書く時に使う。「能力の説明文を書く」「Trait名を考える」「説明文を日本語で書く」「公式っぽい言い回しにして」と言われたとき、またはLOCテキストを新規に書く/レビューする場面で使う。Trait名限定のSkillではない。Modifier/RequirementのXML実装自体は`implement-leader-abilities`等の各実装Skillの範囲(そちらは効果の実装、こちらはテキストの文体)。**外交交渉画面の台詞(`LOC_DIPLO_*`)はこのSkillの対象外**(公式に統一書式ルールが存在せず、リーダーごとの性格・口調で書くのが作法。`implement-diplomacy-statements` Skillを使うこと)。**他言語のテキストにはこのSkillを使わない**(言語ごとに文体の癖・鉤括弧相当の記法・語彙差が異なるため、`write-official-<lang>-text-style`のような言語別Skillを別途用意する方針。2026-09-22時点で日本語版・英語版(`write-official-en-text-style`)・中国語版(`write-official-zh-text-style`)が存在する)。
---

# Civ6公式スタイルの日本語ゲーム内テキストを書く

一条莉々華Mod(civ6mod-hololive-regloss)の実装で確立した、**日本語の**ゲーム内テキストを公式の文体に揃えるためのガイド。効果(Modifier/Requirement)自体の実装は範囲外(`implement-leader-abilities`等の各実装Skillを使う)。他言語向けのテキストを書く場合は、このSkillのルールをそのまま流用せず、対応する`write-official-<lang>-text-style`Skill(例: 英語は`write-official-en-text-style`、中国語は`write-official-zh-text-style`)を使うこと。

ゲーム固有の用語(Yield名・建造物名・資源クラス名等)を書く前に、`idea`リポジトリの`用語対訳/<ゲーム名>-用語対訳.csv`(`map-terms`Skill管轄、このリポジトリの外)に既存の正式訳が無いか確認する。無ければ実機(`Vanilla_ja_JP.xml`等、`add-language`Skillの用語確認手順と同じ)で確認し、CSVに追記して次回以降再利用できるようにする。

新しいテキストを日本語で書く前に、`references/official-jp-text-style.md`を読むこと。公式Trait説明文422件(バニラ〜Leader Pass、全DLC)をen_US/ja_JP対訳でリリース時期別に調査した結果、**半角/全角のルール、`[ICON_XXX] 効果+数値`の詰め方、鉤括弧「」を付ける固有名詞の範囲**などは時期を問わずほぼ完全に一貫している(逸脱は単発のtypoのみ)。要点だけ書くと:

- 数字・`%`・`+`/`-`・丸括弧`()`・コロン`:`は半角。全角括弧・全角コロンは使わない
- `[ICON_XXX] 効果名+数値`は詰めて書く(数値の前にスペースを入れない)
- 鉤括弧「」は技術・社会制度・政策・宗教/信仰・固有ユニット・遺産・固有プロジェクト名など「トリガーとして言及される固有名詞」にだけ使う。区域・建造物・資源・地形などの一般名詞には付けない
- 常体・体言止めで統一する(敬体は基本使わない)
- **似た効果の公式テキストを先に探し、テンプレとして数値だけ差し替えるのが最短ルート。** これは公式自身も`_EXPANSION1`/`_EXPANSION2`サフィックス違いのTraitで多用している手法

`references/official-jp-text-style.md`には上記に加えて、効果カテゴリ別のフレーズ早見表・DLCリリース時期マッピング・調査手順(再現用)も載っている。

**調査対象はTrait説明文(422件)であり、Civilopedia・ユニット/建造物説明文等の他のテキスト種別で同じ規則を直接検証したわけではない。** ただし上記のルール(半角/全角、アイコン+数値の詰め方、鉤括弧の使い分け、常体)はCiv6ローカライズ全体に共通する一般的な慣習である可能性が高く、他のテキスト種別を書く際もまず適用し、明らかに違和感があれば該当箇所の公式テキストで個別に確認すること。

## UU(ユニット)のDescription特有の構文パターン(2026-09-22、実機`Vanilla_ja_JP.xml`で確認済み)

`UnitReplaces`で他ユニットを置換するUUのDescriptionは、Trait説明文とは別の定型構文を持つ。英語・日本語とも例外なく「このユニットは何を置換した固有ユニットか」を最初に明示してから効果を続ける:

- 英語: `"[Civ] unique [era] era [class] unit that replaces the [置換元]. [効果]."` (時代・種別は省略される例もある: `"Holy Roman Empire unique unit that replaces the Swordsman. ..."`)
- 日本語: `"[置換元]に取ってかわる、[文明]固有の[時代]の[種別]ユニット。[効果]。"` — **「代替」ではなく「取ってかわる」**、かつ**語順が英語と逆で置換元への言及が先頭に来る**(英語の関係代名詞構文を連体修飾に変換しているため)。実例(`Vanilla_ja_JP.xml`より):
  - `LOC_UNIT_GREEK_HOPLITE_DESCRIPTION`: 「槍兵に取ってかわる、ギリシャ固有の太古の対騎兵ユニット。重装歩兵が1ユニットでも隣接していると [ICON_Strength] 戦闘力+10。」
  - `LOC_UNIT_ROMAN_LEGION_DESCRIPTION`: 「剣士に取ってかわるローマ固有の古典時代の近接戦闘ユニット。カストラを作ることができる。」
- 「[文明]固有の...ユニット」という自己言及は省略しない(確認した全件で必ず入っている)。省略できるのは時代・種別だけ。

**日本語の実機テキストは`Text/ja_JP/`のような言語別ディレクトリを探しても見つからない。** バニラは`Base/Assets/Text/Vanilla_ja_JP.xml`、DLCは`<DLC名>_Translations_Text.xml`等の**統合ファイル**に`<Replace Tag="..." Language="ja_JP">`として格納されている(このSKILL.md冒頭でも触れているが、実装中に見落としてWeb検索に迂回してしまったことがあるので再掲)。日本語版の文言を確認したくなったら、まずこの統合ファイルを`grep`すること。

**断片情報から仮説を積み上げがちな調査が必要になったら、先に`research-mod` Skillに従って一次情報を洗うこと。**
