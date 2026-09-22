---
name: write-official-en-text-style
description: Civ6 Mod向けに**英語(en_US)の**ゲーム内テキスト(文明/指導者Traitの`_NAME`・`_DESCRIPTION`、ユニット/建造物/Civilopedia等の説明文)を公式の文体に合わせて書く時に使う。「英語で説明文を書く」「英語版のTrait名を考える」「公式っぽい英語にして」と言われたとき、またはLOCテキストをen_US向けに新規に書く/レビューする場面で使う。Modifier/RequirementのXML実装自体は`implement-leader-abilities`等の各実装Skillの範囲(そちらは効果の実装、こちらはテキストの文体)。**外交交渉画面の台詞(`LOC_DIPLO_*`)はこのSkillの対象外**(`implement-diplomacy-statements` Skillを使うこと)。**他言語のテキストにはこのSkillを使わない**(`write-official-jp-text-style`/`write-official-zh-text-style`など言語別Skillを使うこと)。2026-09-22、Civ6実機のen_US/zh_Hans_CN/zh_Hant_HK対訳コーパス(Trait説明文198件)を解析して確立した。
---

# Civ6公式スタイルの英語ゲーム内テキストを書く

一条莉々華Mod(civ6mod-hololive-regloss)の実装で確立した、**英語の**ゲーム内テキストを公式の文体に揃えるためのガイド。効果(Modifier/Requirement)自体の実装は範囲外(`implement-leader-abilities`等の各実装Skillを使う)。このModのワークフローはJP→EN→ZHの順で書くが、Civ6本体自体はFiraxisが英語で開発しているため、英語のテキストは他言語のような「翻訳の癖」ではなく**Firaxis公式の作文規則**に合わせる必要がある(このModにおける英語の位置付けについては次段落を参照)。

既存のCiv6本体・DLCのゲーム用語(Yield名・建造物名等)はFiraxisが英語で書いたものが原本なので、それらを書く際は`idea`リポジトリの`用語対訳/<ゲーム名>-用語対訳.csv`(`map-terms`Skill管轄、EN以外の言語で正式訳を探すためのもの)を引く必要が無く、Vanilla本体・DLCのen_USファイルから直接拾えばよい。**ただし、これは英語がこのModの万能な「原文」という意味ではない。** このMod自体の新規コンテンツ(Trait効果文など)はJP→EN→ZHの順で書くが、`add-language`Skillの「テキストの翻訳元を決める」節にある通り、各言語は効果テキストならXML効果定義、フレーバーテキストならキャラクター性から独立に組み立てるものであり、特定の1言語が常に原文になるわけではない。

新しいテキストを英語で書く前に、`references/official-en-text-style.md`を読むこと。2026-09-22、Civ6実機(Steamインストールフォルダ)からTrait説明文198件をen_US/zh_Hans_CN/zh_Hant_HK対訳で抽出し解析した結果、要点は:

- **数字はアイコン+効果名の前に置く**: `+N [ICON_XXX] YieldName`の語順(例: `+4 [ICON_Gold] Gold`)。198件432箇所のアイコン出現を確認したが、`[ICON_XXX] YieldName+N`(数字が後ろ)の語順は**1件も存在しない**。日本語(`[ICON_XXX] 効果名+数値`、数値が後ろ)とは逆順なので、日本語文をそのまま語順だけ入れ替えて英訳しない
- `[ICON_XXX]`の直後は半角スペース1つを置く(432箇所中403箇所がこの形。残りは`[ICON_CULTURE]Culture`のようなスペース抜けや二重スペースで、公式側の単発typoと判断できる粒度)
- **固有名詞に引用符を使わない**: 198件中、直用引用符(`"`)の出現は**0件**。日本語の鉤括弧「」・中国語の`“ ”`/`「」`に相当する「トリガー系固有名詞を記号で囲む」慣習は英語には無い。固有名詞は**Title Case(各単語の頭文字を大文字)**で表現し、それだけで一般名詞と区別する(例: `Eagle Warrior`、`Dynastic Cycle`、`Plato's Republic`)
- コロン`:`は「信仰の教義一覧」のような箇条書き見出し(`Heading: description`)にほぼ限定して使われる(198件中9件のみ)。それ以外の地の文でコロンを多用しない
- 1描写あたりの平均文数は2.27文(日本語調査時のバニラ〜NFP期の平均と同水準)
- 文末はほぼ例外なくピリオドで終える(198件中197件)

**似た効果の公式Traitを先に探し、テンプレとして数値だけ差し替えるのが最短ルート**なのは日本語版と同じ(`write-official-jp-text-style`と同じ考え方)。

`references/official-en-text-style.md`には上記の抽出方法(再現手順)・追加の実例・NAME側の大文字化パターンも載っている。

**調査対象はTrait説明文(198件)であり、Civilopedia・ユニット/建造物説明文等の他のテキスト種別で同じ規則を直接検証したわけではない。** 明らかに違和感があれば該当箇所の公式テキストで個別に確認すること。断片情報から仮説を積み上げがちな調査が必要になったら、先に`research-mod` Skillに従って一次情報を洗うこと。
