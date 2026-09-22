---
name: add-language
description: Civ6 Modに新しい言語のローカライズを追加する時に使う。「言語を追加する」「多言語対応を増やす」と言われたとき、または`Text/<lang>/`ディレクトリを新規に作る場面で使う。Language属性値の確認・ファイル構成/modinfo登録・完了確認など**言語非依存**の手順のみを扱う。個別言語の文体・語彙・句読点等の癖は`write-official-<lang>-text-style`Skill(例: `write-official-jp-text-style`/`write-official-zh-text-style`)側の担当(該当Skillが無い言語は本Skillの一般原則に従いつつ実機で確認し、知見が溜まったら該当Skillを新設する)。2026-09-22、中国語(zh_Hans_CN/zh_Hant_HK)対応で確立した手順がベース。
---

# Civ6 Modに新しい言語を追加する

## 1. Language属性の正確な値を確認する

推測せず、必ずCiv6本体の実機ファイルで確認する。`Base/Assets/Text/`直下に`Vanilla_<lang>.xml`が言語ごとに並んでいる(`en_US`だけ`Text/en_US/`という別ディレクトリ構成):

```
Vanilla_de_DE.xml  Vanilla_es_ES.xml  Vanilla_fr_FR.xml  Vanilla_it_IT.xml
Vanilla_ja_JP.xml  Vanilla_ko_KR.xml  Vanilla_pl_PL.xml  Vanilla_pt_BR.xml
Vanilla_ru_RU.xml  Vanilla_zh_Hans_CN.xml  Vanilla_zh_Hant_HK.xml
```

**中国語の繁体字は`zh_Hant_HK`(香港)のみ存在する。`zh_Hant_TW`(台湾)は無い**(2026-09-22確認)。つまり台湾のプレイヤーも`zh_Hant_HK`で表示される。

これらのファイルは`<Replace Tag="..." Language="...">`形式(バニラ側の上書き)。自Modの新規LOCキーは`<Row Tag="..." Language="...">`でよい(`en_US`/`ja_JP`と同じ形式)。

## 2. ファイル構成とmodinfo登録

`Text/<lang>/Text.xml`を作り、既存の`en_US`/`ja_JP`と同じ全キーを1:1で用意する。`.modinfo`は3箇所に追記が要る(既存の`en_US`/`ja_JP`の行の隣に足すだけ):

- `FrontEndActions`→`UpdateText`の`<File>`
- `InGameActions`→`UpdateText`の`<File>`
- トップレベルの`<Files>`

## 3. ゲーム用語は一次資料で正式訳を確認してから訳す

Civ6の用語(Yield名・建造物名・資源クラス名・ゲームモード固有語など)は先に公式訳を確認し、フレーバーテキスト(外交台詞等)だけ自分で訳す。確認先:

- バニラ語彙: `Base/Assets/Text/Vanilla_<lang>.xml`(例: `LOC_YIELD_GOLD_NAME`、`LOC_BUILDING_MARKET_NAME`)
- DLC固有の語彙(モード名・改善名等): 各DLCの`Text/<DLCName>_Translations_Text*.xml`(統合ファイル、`<Replace Tag="..." Language="...">`で全言語まとまっている)。例: 独占/大企業モードなら`DLC/KublaiKhan_Vietnam/Text/KublaiKhan_Vietnam_Translations_Text_MODE.xml`

grepでタグ名指定して該当行だけ読む(ファイル全体は読まない)。確認した用語は`idea`リポジトリの`用語対訳/<ゲーム名>-用語対訳.csv`(`map-terms` Skill管轄)に追記して再利用する。**本人から許可を得た場合のみ、そのCSVのカラム自体(例: 簡体字名/繁體字名列の追加)を拡張してよい。**

その言語固有の語彙差・句読点・引用符・機械変換ツールの癖等は、`write-official-<lang>-text-style`Skillがあれば必ず参照する(例: 中国語は`write-official-zh-text-style`)。無ければ本節の原則(一次資料で確認)に従い、知見が溜まったら該当Skillの新設を検討する。

## 4. テキストの翻訳元(ソース・オブ・トゥルース)を決める

2026-09-22の設計検討で確定した方針。複数言語のテキストを揃える際、前段で書いた言語の文をそのまま逐語訳しない(JP→EN→ZHのように順に書く場合でも、後発言語は前段の文の翻訳ではなく、以下のソースから改めて組み立て直す)。テキストの種類によって翻訳元が異なる:

- **効果テキスト**(Trait/UU/UB/UDの`_DESCRIPTION`、Civilopediaの効果説明など、ゲームメカニクスを説明するテキスト): 翻訳元は実装している`Modifier`/`Requirement`のXML(効果・数値・条件)そのもの。各言語は対象言語の`write-official-<lang>-text-style`Skillのテンプレ・語彙を使ってXMLから直接組み立てる。既存言語の文とは「効果の過不足(パリティ)が無いか」だけを突き合わせ、言い回しはコピーしない
- **フレーバー/キャラクター性のテキスト**(外交台詞`LOC_DIPLO_*`等、性格・口調ベースの文章): 翻訳元はXMLではなくキャラクターの性格・トーン(`implement-diplomacy-statements`Skill、ideaリポジトリのpersona/topics)。逐語訳ではなく、キャラ性・意図を保ったまま対象言語で書き直す

どちらに該当するか迷う場合、対象のLOCキーが`Modifier`/`Requirement`のXMLと直接対応しているかどうかで判断する。

## 5. 完了確認

追加した言語ファイルが既存言語と1:1対応しているか、タグ集合の完全一致で確認する:

```bash
for f in en_US ja_JP <新言語>; do
  grep -oE 'Tag="[A-Z0-9_]+"' Text/$f/Text.xml | sort > /tmp/tags_$f.txt
done
diff /tmp/tags_en_US.txt /tmp/tags_<新言語>.txt   # 差分が無ければOK
```

XMLの整形式チェックは`xmllint`が無い環境ではPowerShellの`[xml]`キャストで代用できる:

```powershell
[xml](Get-Content -Raw -Encoding UTF8 <path>) | Out-Null
```
