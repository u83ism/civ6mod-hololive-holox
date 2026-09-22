# 英語(en_US)ゲーム内テキストのスタイルガイド(公式テキスト調査)

2026-09-22、Civ6公式(バニラ+DLC全種+拡張2本)の文明/指導者Trait説明文をen_US/zh_Hans_CN/zh_Hant_HKの3言語対訳で抽出し調査した結果。日本語調査(`write-official-jp-text-style/references/official-jp-text-style.md`)の英語版にあたる。**このMod自体の翻訳ワークフローはJP→EN→ZHの順で書くが、英語はCiv6本体の開発言語(マスター言語)なので、他言語のような「翻訳の癖」ではなくFiraxis公式の作文規則そのものとして扱うこと。**

## 調査方法(再現手順)

Steamの`Sid Meier's Civilization VI`インストールフォルダから直接抽出した(パス例: `C:\Program Files (x86)\Steam\steamapps\common\Sid Meier's Civilization VI`)。

- 英語(`en_US`): `Base/Assets/Text/en_US/*.xml`と各DLCの`DLC/<DLCName>/Text/en_US/*.xml`にある`<Row Tag="LOC_TRAIT_...">`要素
- 簡体字/繁体字: `Base/Assets/Text/Vanilla_zh_Hans_CN.xml`/`Vanilla_zh_Hant_HK.xml`と各DLCの`<DLCName>_Translations_ConfigText.xml`(**`_Translations_Text.xml`ではなくこちら**。Trait系のLOCキーはConfigText側にまとまっている)にある`<Replace Tag="LOC_TRAIT_..." Language="zh_Hans_CN|zh_Hant_HK">`要素。中国本土向けの`*_China.xml`は別バリアント(`Language="zh_Hans"`のように地域無し)なので対象外
- `LOC_TRAIT_[A-Z0-9_]+_DESCRIPTION`のうち、en_US/zh_Hans_CN/zh_Hant_HKの3言語すべてに対訳が存在するもの198件を対象にした(`_NAME`は211件別途参照用に抽出)
- 抽出・集計にはNode.js(組み込みモジュールのみ)のスクリプトを使用。スクリプトと中間JSONはセッションのスクラッチパッドに置いてあり、リポジトリには含めていない(再現したい場合は同じ手順を再実行する)

## 発見1: 数字とアイコンの語順が日本語と逆

`+N [ICON_XXX] YieldName`の語順(数字が先頭)が432箇所の`[ICON_XXX]`出現のうち214箇所で確認できた一方、`[ICON_XXX] YieldName+N`(アイコン+効果名の後に数字を付ける、日本語と同じ語順)は**0件**。実例:

- `+50% [ICON_PRODUCTION] Production to Districts and Buildings constructed across a river from a City Center.`
- `+4 [ICON_Gold] Gold`
- `Receive +4 [ICON_STRENGTH] Combat Strength on Hills.`(こちらは動詞`Receive`の後に数字)

日本語の`[ICON_XXX] 効果名+数値`をそのまま語順だけ入れ替えて英訳すると不自然になる。英訳するときは「数字が先」を基本形として組み立てる。

## 発見2: 固有名詞は引用符ではなく大文字化(Title Case)で表現する

198件の説明文中、直用引用符(`"`)の出現は**0件**。日本語の鉤括弧「」・中国語の`“ ”`(簡体字)/`「」`(繁体字)に相当する「トリガー系固有名詞を記号で囲む」慣習は英語には存在しない。かわりに、技術名・社会制度名・固有ユニット名・遺産名などの固有名詞は**Title Case**(主要な単語の頭文字を大文字にする)で表現し、一般名詞(小文字)と区別する。NAME側のサンプル(2026-09-22抽出):

| タグ | EN(Title Case) |
|---|---|
| `LOC_TRAIT_CIVILIZATION_UNIT_AZTEC_EAGLE_WARRIOR_NAME` | Aztec unique unit: Eagle Warrior |
| `LOC_TRAIT_CIVILIZATION_DYNASTIC_CYCLE_NAME` | Dynastic Cycle |
| `LOC_TRAIT_CIVILIZATION_PLATOS_REPUBLIC_NAME` | Plato's Republic |
| `LOC_TRAIT_INEXPENSIVE_BUILDERS_NAME` | Inexpensive Builders |

説明文本文中でも同様に、ゲーム内の資源・区域・ユニット種別等の固有語は先頭大文字(例: `Wildcard policy slot`、`Holy Site districts`、`Trade Routes`)。一般的な英単語(builder charges, government, district)は小文字のまま。

## 発見3: アイコンタグ直後は半角スペース1つ(公式にも単発の抜け漏れあり)

432箇所の`[ICON_XXX]`出現のうち403箇所(約93%)が直後に半角スペース1つ。残り約7%はスペース抜けや二重スペースで、実例:

- `This [ICON_CULTURE]Culture is displayed in the City Yields.`(スペース抜け)
- `All  [ICON_CULTURE] Culture adjacencies...`(二重スペース)

日本語調査でも同様の単発typoが見つかっており(`[ICON_SCiENCE]`の大文字小文字ミス等)、公式データにも一定確率で存在するノイズと判断してよい。新規テキストを書くときは「アイコン直後は半角スペース1つ」を基本ルールとして守れば十分。

## 発見4: コロンは箇条書き見出しにほぼ限定

コロン`:`が本文に登場するのは198件中9件のみで、その全てが「信仰の教義一覧」のような`[NEWLINE][ICON_Bullet]Heading: description`という箇条書き構文(信仰/宗教のTrait特有)。それ以外の通常の効果説明ではコロンをほとんど使わない。実例:

> Starts with the Taoism Religion founded. This religion has the following beliefs:[NEWLINE][ICON_Bullet]River Goddess: +1 [ICON_Amenities] Amenity to cities if they have a Holy Site district adjacent to a River.[NEWLINE]...

## 発見5: 文の長さ・終端

- 1描写あたりの平均文数は**2.27文**(ピリオド区切りで算出)。日本語調査でのバニラ〜NFP期の平均(2.0〜2.7文)とほぼ同水準
- 文末はほぼ例外なくピリオドで終える(198件中197件)

## 実務ルール(このMod系列で英語のTrait説明文を書くときに従うこと)

1. **似た効果の公式Traitを先に探す**。日本語版と同じ考え方(`write-official-jp-text-style`参照)。ゼロから言い回しを考えない
2. **数字はアイコン+効果名の前に置く**: `+N [ICON_XXX] YieldName`(日本語の`[ICON_XXX] 効果名+数値`と逆順であることを意識する)
3. **固有名詞は引用符で囲まず、Title Caseで表現する**
4. **アイコンタグの直後は半角スペース1つ**
5. コロンは箇条書き見出し以外では使わない
6. 効果を複数持たせる場合、1描写あたり平均2〜3文程度に収める(日本語版と同じ傾向)

## 未検証の範囲

調査対象はTrait説明文(198件)のみで、Civilopedia・ユニット/建造物説明文等の他のテキスト種別で同じ規則を直接検証したわけではない。UU(ユニット)のDescription特有の構文パターン(`"[Civ] unique [era] era [class] unit that replaces the [置換元]. [効果]."`)は`write-official-jp-text-style/SKILL.md`側に実機確認済みの記載がある(英語側の語順も含む)ので、そちらを参照すること。
