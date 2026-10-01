# civ6mod-hololive-holox

Civilization VI の新規文明追加Mod。hololive holoXをモチーフにした文明を実装する。ゲームデザインの判断理由は[docs/design.md](docs/design.md)、実装の仕組み・実機で踏んだ罠は[docs/implementation-notes.md](docs/implementation-notes.md)を参照(役割分担の詳細は`.claude/rules/documentation.md`)。

## 現状

`bootstrap-mod` Skillでリポジトリ雛形を作成済み。沙花叉クロヱ(文明: シャチの群れ)の指導者/文明の骨格(`XML/Civilizations.xml`・`Leaders.xml`・`Colors.xml`・`Config.xml`)を実装済み。指導者固有能力「歌好きの掃除屋」(Lua実装、`Lua/SakamataChloeGameplayScript.lua`: 攻撃時に戦闘力の差に応じた確率(互角で25%)で敵ユニットを即座に撃破+撃破戦闘力に応じた大音楽家ポイント獲得)は実機で動作確認済み。文明固有能力「群れの絆」(傑作(音楽)の文化力+2・観光力+50%、宮殿に音楽スロット+6)は実機で動作確認済み(宮殿のスロットが計7つ、傑作(音楽)1つあたり文化力6・観光力6)。固有区域「シャチたちの楽園」(ウォーターパーク置換、`XML/OrcaParadise.xml`)、固有建造物「シャチの水族館」(水族館置換)を実装済み・実機で動作確認済み(固有区域・固有建造物は嵐の訪れのルールセットでだけ有効。見た目・アイコンは置換元のまま)。

## 構成

- `civ6mod-hololive-holox.modinfo` — Modのエントリポイント。ActionGroupsで参照するファイルはすべて`Files`にも列挙する必要がある
- `XML/` — Civilization / Leader / Trait / Colors / Config などのDB定義(XML)
- `Text/ja_JP/`, `Text/en_US/`, `Text/zh_Hans_CN/`, `Text/zh_Hant_HK/` — ローカライズテキスト(`ja_JP`が確認用の正本。各言語の表記は`docs/glossary.md`)
- `Art/` — アイコン・リーダーシーン等のアセット(`Art/Source/`が元画像でキャラごとにサブディレクトリを切る(例: `Art/Source/sakamata-chloe/`)、`Art/Icons/`が各サイズ展開済みPNG)
- `tools/setup-dev-env.ps1` — 新しいPCでの開発環境セットアップ(`pwsh tools/setup-dev-env.ps1`、何度実行しても安全)。Modsフォルダへのジャンクション作成・`AppOptions.txt`のログ有効化(`-EnableTuner`でFireTunerも)・`npm ci`を行い、Development Tools/SDK Assets/`Art/Source/`の有無をチェックする
- `tools/loc-lookup/` — Civ6本体(Base+DLC)とこのModの`Text/`から、LOCタグまたは本文で公式の各言語訳を引くスクリプト(`npm run lookup -- <タグ正規表現>`、`--text <文字列>`で逆引き)。公式用語の確認に使う(`.claude/rules/game-terms.md`)。`npm run check`で全言語の`Text/`の整合性(タグ・プレースホルダー・数値・記号・公式用語)も検査できる(`write-game-text` Skill)
- `tools/png2dds/` — 元画像からアイコン各サイズのPNG/DDSを自動生成するビルドスクリプト(TypeScript、`tsx`で実行。`civ6mod-hololive-regloss`から移植したもので、キャラ名はハードコードされておらずCLI引数で指定する)

## 開発方針

- `civ6mod-hololive-regloss`(一条莉々華Mod)の姉妹リポジトリ。`.claude/rules/`・`.claude/skills/`・`tools/png2dds/`はそちらから移植した(二重管理を許容する運用)
- `main`=リリース済み安定版、`develop`=作業ブランチ。通常のコミットは`develop`に積み、リリース時に`develop`を`main`にマージする(`.claude/rules/branching.md`参照)
- `tools/`配下のTypeScript/Node.jsコードは`.claude/rules/`のコーディング規約に従う。Civ6 Modding固有の知識・手順は`.claude/skills/`を参照(`bootstrap-mod`→`bootstrap-leader`→`make-leader-icons`/`make-fallback-portrait`/`implement-leader-abilities`/`add-unique-content`の順が基本線)

## TODO

- [ ] シャチの水族館の観光力を+150%に下げた後の値を実機確認(群れの絆込みで傑作(音楽)1つあたり観光力12になるはず)
- [ ] シャチたちの楽園の未決の論点(観覧車の解禁、水族館の前提、建設コスト・設置条件)を決める(`docs/design.md`参照。現状の実装はいずれもバニラのまま)
- [ ] 指導者固有能力の未確認ケースを実機確認(防御側の反撃キルでの大音楽家ポイント、都市への攻撃時の扱い、ダメージ0/100の境界)、および音楽家ポイントの浮遊テキストの色
- [ ] 風真いろはの文明能力「風真の一族」・指導者能力「武者修行」の残りの確認(両能力が動作することは2026-10-01に実機確認済み。民間人・宗教ユニットにも効くか、海軍・航空に効かないかは未確認。英語・中国語の能力名は本人未確認の仮案)
- [ ] 固有区域「山の秘境」(保護区置換、`XML/HiddenMountains.xml`)を実機確認(建設コストが27(置換元54の半額)か、ベトナムDLCあり/なしの両方で起動できるか、保護区が山の秘境に置き換わるか、3D表示・アイコン・歴史的瞬間の挿絵、山の隣接ボーナス(生産力+1、火山を含む)、林・聖域の周辺タイルのアピール+2が効くか(区域の`Appeal`列)、隣接する未改善タイルの食料+1が効くか(Standard/Rise and Fallのルールセットでも使えるか、水・山・区域のタイルが除外されているか)、林・聖域のタイル産出が山の秘境でも出るか、文化爆弾、選択画面の固有要素表示。英語・中国語の名前は本人未確認の仮案)
- [ ] バッジアイコン・ポートレートの作り込み(`make-leader-icons`/`make-fallback-portrait` Skill)
- [ ] 中国語(簡体字/繁体字)の全テキストを実機確認(表示・文字化けの有無、`.modinfo`に登録済み)
- [ ] 外交交渉画面の台詞の英語版(en_US、76タグ追加済み)を実機確認(日本語版76タグは`Text/ja_JP/Text.xml`に実装・実機確認済み、原案は`docs/diplomacy-statements-sakamata-chloe.md`)
- [ ] ユニークアジェンダを設計・実装(アジェンダの理由文`LOC_DIPLO_KUDO/WARNING_LEADER_ANY_REASON_AGENDA_*`もこの時に書く)
- [ ] 指導者/文明能力のテキストを`write-game-text` Skillで文体調整(現状は暫定文言)
