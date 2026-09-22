---
name: bootstrap-mod
description: Hololive系リーダーMod(このリポジトリの姉妹Mod)を、ReGLOSS以外の別グループ(例: HoloX)向けに新規リポジトリとしてゼロから立ち上げる時に使う。「HoloXのModを始める」「新しいModリポジトリを作る」「姉妹リポジトリを立ち上げる」と言われたとき、または実際に新しい空リポジトリが作成された直後に必ず使うこと。**ReGLOSSメンバーの追加(2人目以降)にはこのSkillを使わない**(ReGLOSSは全員このリポジトリ1本にまとめる方針、2026-09-22確定。`bootstrap-leader` skillに直接進む)。bootstrap-leader skillの前段にあたる(こちらはリポジトリの雛形、そちらはCivilization/Leader本体の実装)。
---

# Civ6新Modリポジトリの立ち上げ

このSkillは`civ6mod-hololive-regloss`(一条莉々華Mod)を作った際の実際の試行錯誤から得られた、動作確認済みの雛形を再利用するためのもの。特にmodinfoのスキーマ選択は、一見動きそうに見える形式(`<ActionGroups>`)が実際には**MODが有効化リストに載るのに中身が一切適用されない**という、エラーも出ない厄介な不具合を踏んだ末に判明したものなので、必ずこの雛形をベースにすること(ゼロから書き直さない)。

**適用範囲の注意(2026-09-22)**: `civ6mod-hololive-regloss`はReGLOSSメンバー全員をこの1リポジトリにまとめる方針。そのためReGLOSSメンバーを追加するときはこのSkillを使わず、このリポジトリに直接`bootstrap-leader`で文明を追加する。このSkillを使うのは、ReGLOSS以外の**別グループ(HoloX等)向けの新規Modリポジトリ**を立ち上げるとき。その場合も雛形(特にmodinfoスキーマ)は本リポジトリからコピーして使う。

## 手順

1. **リポジトリ作成**: `civ6mod-hololive-<group>`(例: `civ6mod-hololive-holox`)のような命名でGitリポジトリを作成、`git init`
2. **フォルダ構成を作る**:
   ```
   <repo>/
     <mod-name>.modinfo
     XML/
     Text/en_US/
     Text/ja_JP/
     Lua/.gitkeep
     Art/Source/.gitkeep
     Art/Icons/.gitkeep
     docs/design.md
     README.md
     .gitignore
     .claude/skills/bootstrap-mod/     (このSkillごとコピーする)
     .claude/skills/bootstrap-leader/  (次のSkillごとコピーする)
   ```
   `.claude/skills/`配下の2つのSkillは、civ6mod-hololive-regloss(このMod)から**フォルダごとコピー**すること。個人グローバルのSkillフォルダには置かない(このMod系列固有の知見であり、ユーザーの全プロジェクトに影響を与えるべきではないため)
3. **modinfo雛形を作る**: `assets/template.modinfo.template`を`<mod-name>.modinfo`としてコピーし、以下を置換する
   - `{{MOD_GUID}}`: 新しいGUIDを発行(PowerShellなら`[guid]::NewGuid().ToString()`)
   - `{{MOD_NAME}}`: Mod名。**グループ名にする(個別リーダー名にしない)** — 1グループ=1リポジトリ=1Modで複数リーダーを後から追加していく方針のため(実例: `civ6mod-hololive-regloss`は`Name="Hololive ReGLOSS"`であって`Hololive Ichijou Ririka`ではない)。例: "Hololive HoloX"。**LOCキーではなくリテラル文字列でよい** — HktkNban氏・Neox氏の実働Modは両方ともProperties.Name/Teaser/Descriptionを生文字列にしており、これによりMod名解決専用のLocalizedTextブロックが不要になり、後述の重複INSERT問題を未然に回避できる
   - ファイル参照(`XML/Civilizations.xml`等)はそのまま使ってよい
4. **空のXML/Text雛形を作る**:
   - `XML/Civilizations.xml`: `<?xml version="1.0" encoding="utf-8"?><GameData></GameData>`
   - `Text/en_US/Text.xml`・`Text/ja_JP/Text.xml`: `<GameData><LocalizedText></LocalizedText></GameData>`
5. **README.md / docs/design.md**: `assets/design.md.template`を参考に、経緯・参考資料・TODOの骨格を作る。civ6mod-hololive-reglossのdocs/design.mdを実例として直接参照してよい
6. **ローカルテスト用のセットアップ**: `Documents\My Games\Sid Meier's Civilization VI\Mods\<mod-name>`をリポジトリルートへのジャンクションにする(`New-Item -ItemType Junction -Path <Mods配下のパス> -Target <リポジトリルート>`)。実機でのリーダー選択画面表示・実プレイ動作、および編集がコピーし直さず即反映されることを確認済み(一条莉々華Mod、2026-09-19)
   - **注意: Civ6のMod読み込みは`Mods`配下を深さ制限なく再帰し、拡張子`.modinfo`のファイルを片っ端から読み込む。** リポジトリ内に(スキルのassetsなど)`.modinfo`拡張子のテンプレート/サンプルファイルを置くと、ジャンクション経由で「空の名無しのMOD」として誤検出される(`Modding.log`に`Loading Mod - .../assets/xxx.modinfo`と出て、参照先ファイルの`Unable to load`警告が続く)。テンプレート類は`Config.xml.template`と同じ命名規則(実ファイル名+`.template`サフィックス)にして、拡張子を絶対に`.modinfo`で終わらせないこと
7. **ここまでできたら`bootstrap-leader` Skillに進み、実際のCivilization/Leader/Traitを実装する**

## 参考資料

- 動作確認済みの実例: `civ6mod-hololive-regloss`リポジトリ全体(特に`civ6mod-hololive-regloss.modinfo`と`docs/design.md`)
- 他作者の実働Mod(ローカルにインストール済みなら参照可能): `Documents\My Games\Sid Meier's Civilization VI\Mods\`配下のHktkNban氏シリーズ、`steamapps\workshop\content\289070\`配下のHoloEN/HoloID(Neox氏)
