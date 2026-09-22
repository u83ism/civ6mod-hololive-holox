---
name: bootstrap-leader
description: Civ6 Modリポジトリ内でCivilization/Leader本体をゼロからブートストラップし、選択画面に出て最低限プレイ可能になるまでを実装・デバッグする時に使う。「指導者を実装する」「新しい文明を追加する」「Config.xmlを書く」「MODが有効化されるのにリーダー選択画面に出てこない」「NOT NULL constraint」「Civ6 modが読み込まれない・反映されない」「modinfoのスキーマ」と言われたとき、または`.modinfo`・`Leaders.xml`・`Civilizations.xml`・`Config.xml`を新規に書く/実機テストする場面で必ず使うこと。bootstrap-mod skillの後段、`make-leader-icons`/`make-fallback-portrait`/`implement-leader-abilities`/`add-unique-content` skillの前段にあたる(アイコン・Trait効果・固有ユニット等はそれぞれ別Skillの範囲)。
---

# 指導者・文明のブートストラップとデバッグ

一条莉々華Mod(civ6mod-hololive-regloss)の実装で、動くまでに大量の試行錯誤が必要だった。ここに書く内容はすべて**実機で確認済みの事実**。同じ回り道を繰り返さないために、まずここを読んでから書き始めること。

**スコープ**: 指導者/文明が選択画面に出て最低限プレイ可能になるまで(命名規則・modinfoスキーマ・Config.xmlの必須項目・実機デバッグ)。バッジアイコンの作り込みは`make-leader-icons`、外交交渉/ローディング画面のポートレートは`make-fallback-portrait`、文明能力/指導者能力の効果実装は`implement-leader-abilities`、固有ユニット/区域/施設/建造物は`add-unique-content` Skillを使うこと(いずれもこのSkillの後、または並行して着手する独立作業)。

**Art/Icon/ModBuddy周りなど、断片情報から仮説を積み上げがちな調査が必要になったら、先に`research-mod` Skillに従って一次情報を洗うこと。**

## 1. 命名規則

Neox氏系(HoloEN/HoloID)の実働Modに合わせ、パック名でスコープしたID + テーマ名の文明IDを使う(HktkNban氏系はキャラ名をそのまま文明IDにしているが、文明名をキャラと別ブランドにしたい場合はNeox系の方が合う):

```
CIVILIZATION_REGLOSS_<テーマ名>       (表示名は別途LOCで自由に付けられる)
LEADER_REGLOSS_<キャラ名ローマ字>
TRAIT_LEADER_REGLOSS_<キャラ名ローマ字>
```

ローマ字は本人の公式表記(hololive公式サイト・本人X)を優先するが、他作者Modのように読みやすさ優先で意訳しても構わない(例: 赤井はあとを`AKAI_HEART`にしている前例がある)。

## 2. modinfoのスキーマは絶対にこの形式を使う

`bootstrap-mod` Skillの`template.modinfo`をそのまま使う。**`<ActionGroups><ActionGroup scope="game/shell" criteria="...">`形式は使わないこと。** これはFiraxis公式DLCが使っている一見「新しい・正しそう」な形式だが、実機で試したところ**MODが有効化リストに載り、Mod名解決も正常に動くのに、`<UpdateDatabase>`等の中身が一切トリガーされず、エラーも警告も一切出ない**という壊れ方をした。原因は特定できなかった(GUID差し替え・依存関係追加・ジャンクション排除など複数の仮説を潰したが再現条件は不明)。

動作確認が取れているのは、HktkNban氏・Neox氏の実働Modが両方使っている一段階古い形式: `<ActionCriteria />`(空)+ `<FrontEndActions>`/`<InGameActions>`の直下にアクションを並べる形式。理由が分からなくても、**動作実績のある構造を丸ごと踏襲する**のが最短ルート。

## 3. Config.xmlの`Players`テーブルはほぼ全列NOT NULL

これも試行錯誤で1個ずつ発覚した。Art(Icon/Portrait)が未着手でも、以下の項目**全部**に仮の文字列(実体が無くても良い、表示が空になるだけ)を入れないと、`Database.log`に`NOT NULL constraint failed`が出て**その項目だけ**Playersテーブルへの登録が丸ごと失敗する:

- `CivilizationIcon` / `LeaderIcon`
- `CivilizationAbilityIcon` / `LeaderAbilityIcon`
- `CivilizationAbilityName` / `CivilizationAbilityDescription`(文明固有Traitが未設計でもプレースホルダーLOCキーを用意する)
- `Portrait` / `PortraitBackground`

`assets/Config.xml.template`に全項目埋め済みのテンプレートを置いてあるので、これをコピーして`{{...}}`を置換するだけでこの罠を全部回避できる。`Domain`は`Players:StandardPlayers` / `Players:Expansion1_Players` / `Players:Expansion2_Players`の3つとも登録する(プレイ中のルールセットによって参照先が変わるため)。

## 4. アイコン/ポートレートは別Skillの範囲

Config.xmlの`CivilizationIcon`/`LeaderIcon`/`Portrait`等は3節の通りプレースホルダー値で登録さえしておけば、指導者は「？」アイコンのまま選択画面に出て**動くには動く**。実際のバッジアイコン・ポートレート画像の作り込み(ModBuddy/BLPパイプライン)は工数が重く独立した作業なので`make-leader-icons`/`make-fallback-portrait` Skillを使うこと。

## 5. 実機デバッグの手順

1. **ログを有効化する**(デフォルト無効): `%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VI\AppOptions.txt`に`LoggingEnabled 1`と書く
2. **ログの出力先は`%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VI\Logs\`**。`Documents\My Games\Sid Meier's Civilization VI\Logs`ではない(READMEや一般的な解説記事はこちらを指していることが多いので注意)
3. **`Modding.log`と`Database.log`の両方を見る。片方にしか出ないエラーがある**:
   - `Modding.log`: どのファイルがいつ読み込まれたか(`UpdateDatabase - Loading ...`、`ModdingUpdateConfigurationDatabase - Loading ...`等)。ここに自分のファイルへの言及が一切無ければ、そもそも適用処理がトリガーされていない(→ 2節のmodinfoスキーマ問題を疑う)
   - `Database.log`: 実際のINSERT/制約エラー(`ERROR: NOT NULL constraint failed: ...`、`ERROR: UNIQUE constraint failed: ...`)。**MODは有効化リストに載るが中身が一切適用されないのに、Modding.logにもDatabase.logにもエラーが出ないケースがある**ことも確認しており、その場合は本当にmodinfoスキーマ(2節)を疑うしかない
4. **症状別の当たりを付ける**:
   - Mod一覧で名前が生LOCキー表示・「(互換性なし)」表示 → `Properties.CompatibleVersions`未設定、または名前をLOCキーにしているのにModinfoトップレベルの`<LocalizedText>`が無い(いっそ`Properties.Name`をリテラル文字列にする方が単純)
   - MODは有効化されるのに指導者選択画面に出ない・`Modding.log`に自分のファイルへの言及が皆無 → 2節のmodinfoスキーマ問題
   - `Database.log`に`NOT NULL constraint failed: Players.X` → `Config.xml`にXフィールドの仮値を追加(3節)。1つ直すとまた次のフィールドで同じエラーが出ることが多いので、`assets/Config.xml.template`を最初から使う方が早い
   - `Database.log`に`UNIQUE constraint failed: LocalizedText...`または`Colors.Type` → 同じText.xml/Colors.xmlを複数箇所(modinfoトップレベルの`<LocalizedText>`と`FrontEndActions`/`InGameActions`の`<UpdateText>`/`<UpdateColors>`)から重複参照していないか確認。XMLのINSERT操作はINSERT OR REPLACEではなく素朴なINSERTなので、同じ(Language,Tag)や同じColor Typeを2回読み込むと2回目が失敗する
5. **変更を加えたら必ずゲームを完全終了→再起動する。** ローカルテストは`bootstrap-mod`Skillの通りジャンクション運用でよい(ジャンクション自体は動作確認済みで無罪。ただしリポジトリ内に`.modinfo`拡張子のファイルを迷子で残すとジャンクション経由で誤って別Modとして読み込まれるので、詳細は`bootstrap-mod`Skill手順6を参照)。Mod一覧画面への再入場だけでは変更が反映されないことがあるので、**modinfoやファイル追加を変更したら必ずゲームを完全終了→再起動**する
6. **ログだけでなく稼働中のゲームを直接いじりたいときはFireTunerを使う。** SDK同梱の公式デバッグツールで、ゴールド付与・テクノロジー強制解禁・外交状態の確認/操作などをLiveで行える(いわゆる「God Mode」的な用途)。デフォルト無効(`AppOptions.txt`の`EnableTuner 0`)なので`1`に書き換えて再起動する。詳細な起動手順・パネル一覧は`references/firetuner.md`を参照

## 7. ブートストラップ期のトラブルシューティング(civ6wiki.info要約、未検証)

指導者定義を後から変更してクラッシュする場合の対処(`LeaderCriteria`)、拡張パック(RaF/GS)対応の3ドメイン登録手順は`docs/civ6-research/bootstrap-leader-troubleshooting.md`にciv6wiki.info要約として置いてある。**このリポジトリで実機確認した事実ではない**(1〜6節とは信頼度が異なる。実機確認できたらこのSKILL.mdへ確認済み事実として書き足すこと)。

## 8. この先の作業は別Skillへ

指導者/文明が選択画面に出て最低限プレイ可能になったら、以下は別Skillの範囲になる:

- バッジアイコンの作り込み → `make-leader-icons`、外交交渉/ローディング画面のポートレート → `make-fallback-portrait`
- 文明能力/指導者能力(Trait/Modifier)の効果実装、文明カラー・AIの好み、説明文スタイル、多言語対応 → `implement-leader-abilities`
- 固有ユニット/区域/施設/建造物(UU/UD/UI/UB) → `add-unique-content`
