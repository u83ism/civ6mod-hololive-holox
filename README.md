# civ6mod-hololive-holox

Civilization VI の新規文明追加Mod。hololive holoXをモチーフにした文明を実装する。設計判断の理由・実機で踏んだ罠は[docs/design.md](docs/design.md)を参照(役割分担の詳細は`.claude/rules/documentation.md`)。

## 現状

`bootstrap-mod` Skillでリポジトリ雛形を作成済み。沙花叉クロヱ(文明: シャチの群れ)の指導者/文明の骨格(`XML/Civilizations.xml`・`Leaders.xml`・`Colors.xml`・`Config.xml`)を実装済み。指導者固有能力「歌好きの掃除屋」(Lua実装、`Lua/SakamataChloeGameplayScript.lua`: 攻撃時25%の確率で敵ユニットを即座に撃破+撃破戦闘力に応じた大音楽家ポイント獲得)は実機で動作確認済み。文明固有能力「群れの絆」(湖を除く沿岸タイルと海タイルに食料+1/生産力+1、XMLのみ)は実機で動作確認済み。固有区域「シャチたちの楽園」(ウォーターパーク置換)は設計中(`docs/design.md`参照)。

## 構成

- `civ6mod-hololive-holox.modinfo` — Modのエントリポイント。ActionGroupsで参照するファイルはすべて`Files`にも列挙する必要がある
- `XML/` — Civilization / Leader / Trait / Colors / Config などのDB定義(XML)
- `Text/ja_JP/`, `Text/en_US/` — ローカライズテキスト(`ja_JP`が正本)
- `Art/` — アイコン・リーダーシーン等のアセット(`Art/Source/`が元画像、`Art/Icons/`が各サイズ展開済みPNG)
- `tools/setup-dev-env.ps1` — 新しいPCでの開発環境セットアップ(`pwsh tools/setup-dev-env.ps1`、何度実行しても安全)。Modsフォルダへのジャンクション作成・`AppOptions.txt`のログ有効化(`-EnableTuner`でFireTunerも)・`npm ci`を行い、Development Tools/SDK Assets/`Art/Source/`の有無をチェックする
- `tools/png2dds/` — 元画像からアイコン各サイズのPNG/DDSを自動生成するビルドスクリプト(TypeScript、`tsx`で実行。`civ6mod-hololive-regloss`から移植したもので、キャラ名はハードコードされておらずCLI引数で指定する)

## 開発方針

- `civ6mod-hololive-regloss`(一条莉々華Mod)の姉妹リポジトリ。`.claude/rules/`・`.claude/skills/`・`tools/png2dds/`はそちらから移植した(二重管理を許容する運用)
- `main`=リリース済み安定版、`develop`=作業ブランチ。通常のコミットは`develop`に積み、リリース時に`develop`を`main`にマージする(`.claude/rules/branching.md`参照)
- `tools/`配下のTypeScript/Node.jsコードは`.claude/rules/`のコーディング規約に従う。Civ6 Modding固有の知識・手順は`.claude/skills/`を参照(`bootstrap-mod`→`bootstrap-leader`→`make-leader-icons`/`make-fallback-portrait`/`implement-leader-abilities`/`add-unique-content`の順が基本線)

## TODO

- [ ] 固有区域「シャチたちの楽園」(ウォーターパーク置換)の未決の論点を決めて実装(`docs/design.md`参照)
- [ ] 都市名リストの整備(現状は首都1件のみ)
- [ ] バッジアイコン・ポートレートの作り込み(`make-leader-icons`/`make-fallback-portrait` Skill)
- [ ] 外交交渉画面の台詞の英語版(en_US)を追加・実機確認(日本語版76タグは`Text/ja_JP/Text.xml`に実装・実機確認済み、原案は`docs/diplomacy-statements-sakamata-chloe.md`)
- [ ] ユニークアジェンダを設計・実装(アジェンダの理由文`LOC_DIPLO_KUDO/WARNING_LEADER_ANY_REASON_AGENDA_*`もこの時に書く)
- [ ] 指導者/文明能力のテキストを`write-official-jp-text-style`/`write-official-en-text-style` Skillで文体調整(現状は暫定文言)
