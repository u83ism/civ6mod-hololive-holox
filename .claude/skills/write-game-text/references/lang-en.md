# 英語(en_US)の規則

`write-game-text` Skillの手順3(他言語に展開する)で英語を書くときに使う、英語固有の規則。言語に関係ない手順・規則はSKILL.md本体にあり、ここでは繰り返さない。公式用語の確認は`.claude/rules/game-terms.md`。

Civ6本体はFiraxisが英語で開発しているため、英語のテキストは他言語のような「翻訳の癖」ではなく**Firaxis公式の作文規則**に合わせる。既存のゲーム用語(Yield名・建造物名等)は英語が原本なので、公式訳を探す必要は無く英語版の公式テキストをそのまま使えばよい。**ただし英語がこのModの「原文」という意味ではない**: このMod自体の新規テキストは日本語を確認用の原本にし、英語は事実(XMLの効果定義)と英語の公式テンプレートから組み立て直す(SKILL.md「手順」参照)。

詳細な調査結果は`official-en-text-style.md`(2026-09-22、Civ6実機からTrait説明文198件をen_US/zh_Hans_CN/zh_Hant_HK対訳で抽出し解析。抽出方法・追加の実例・NAME側の大文字化パターンも載っている)。要点:

- **数字はアイコン+効果名の前に置く**: `+N [ICON_XXX] YieldName`の語順(例: `+4 [ICON_Gold] Gold`)。198件432箇所のアイコン出現を確認したが、`[ICON_XXX] YieldName+N`(数字が後ろ)の語順は**1件も存在しない**。日本語(`[ICON_XXX] 効果名+数値`、数値が後ろ)とは逆順なので、日本語文をそのまま語順だけ入れ替えて英訳しない
- `[ICON_XXX]`の直後は半角スペース1つを置く(432箇所中403箇所がこの形。残りは`[ICON_CULTURE]Culture`のようなスペース抜けや二重スペースで、公式側の単発typoと判断できる粒度)
- **固有名詞に引用符を使わない**: 198件中、直用引用符(`"`)の出現は**0件**。日本語の鉤括弧「」・中国語の`“ ”`/`「」`に相当する「トリガー系固有名詞を記号で囲む」慣習は英語には無い。固有名詞は**Title Case(各単語の頭文字を大文字)**で表現し、それだけで一般名詞と区別する(例: `Eagle Warrior`、`Dynastic Cycle`、`Plato's Republic`)
- コロン`:`は「信仰の教義一覧」のような箇条書き見出し(`Heading: description`)にほぼ限定して使われる(198件中9件のみ)。それ以外の地の文でコロンを多用しない
- 1描写あたりの平均文数は2.27文(日本語調査時のバニラ〜NFP期の平均と同水準)
- 文末はほぼ例外なくピリオドで終える(198件中197件)

**調査対象はTrait説明文(198件)であり、Civilopedia・ユニット/建造物説明文等の他のテキスト種別で同じ規則を直接検証したわけではない。** 明らかに違和感があれば該当箇所の公式テキストで個別に確認すること。

## UU(ユニット)のDescription

`"[Civ] unique [era] era [class] unit that replaces the [置換元]. [効果]."`(時代・種別は省略される例もある: `"Holy Roman Empire unique unit that replaces the Swordsman. ..."`)。日本語とは語順が逆(`lang-jp.md`)。

## UD(固有区域)・UB(固有建造物)のDescription(2026-09-27、実機で確認済み)

規則(置き換え元との差分だけ書く等)はSKILL.md本体。英語の言い回し:

- **UD**: `A district unique to [Civ]. Replaces the [X] district[ and cheaper to build].`で始める(`A district unique to Germany for industrial activity. Replaces the Industrial Zone district and cheaper to build.`のように用途句が入る変種もある)。設置の制限は`Cannot be built in a city with a Street Carnival. Cannot be built on Reef.`等
  - `LOC_DISTRICT_WATER_STREET_CARNIVAL_EXPANSION2_DESCRIPTION`: `A district unique to Brazil. Replaces the Water Park district, and provides +2 [ICON_Amenities] Amenities. …Cannot be built in a city with a Street Carnival. Cannot be built on Reef.`
- **UB**: `A building unique to [Civ].`で始める(`Replaces the [X].`は原則書かない)
  - `LOC_BUILDING_MADRASA_DESCRIPTION`: `A building unique to Arabia. Bonus [ICON_Faith] Faith equal to the adjacency bonus of the Campus district.`
