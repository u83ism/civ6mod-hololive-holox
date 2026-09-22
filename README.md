# civ6mod-hololive-holox

Civilization VI の新規文明追加Mod。hololive holoXをモチーフにした文明を実装する。設計判断の理由・実機で踏んだ罠は[docs/design.md](docs/design.md)を参照(役割分担の詳細は`.claude/rules/documentation.md`)。

## 現状

`bootstrap-mod` Skillでリポジトリ雛形を作成した段階。文明・指導者の実装はこれから。

## 構成

- `civ6mod-hololive-holox.modinfo` — Modのエントリポイント。ActionGroupsで参照するファイルはすべて`Files`にも列挙する必要がある
- `XML/` — Civilization / Leader / Trait / Colors / Config などのDB定義(XML)
- `Text/ja_JP/`, `Text/en_US/` — ローカライズテキスト(`ja_JP`が正本)
- `Art/` — アイコン・リーダーシーン等のアセット(`Art/Source/`が元画像、`Art/Icons/`が各サイズ展開済みPNG)
- `tools/png2dds/` — 元画像からアイコン各サイズのPNG/DDSを自動生成するビルドスクリプト(TypeScript、`tsx`で実行。`civ6mod-hololive-regloss`から移植したもので、キャラ名はハードコードされておらずCLI引数で指定する)

## 開発方針

- `civ6mod-hololive-regloss`(一条莉々華Mod)の姉妹リポジトリ。`.claude/rules/`・`.claude/skills/`・`tools/png2dds/`はそちらから移植した(二重管理を許容する運用)
- `main`=リリース済み安定版、`develop`=作業ブランチ。通常のコミットは`develop`に積み、リリース時に`develop`を`main`にマージする(`.claude/rules/branching.md`参照)
- `tools/`配下のTypeScript/Node.jsコードは`.claude/rules/`のコーディング規約に従う。Civ6 Modding固有の知識・手順は`.claude/skills/`を参照(`bootstrap-mod`→`bootstrap-leader`→`make-leader-icons`/`make-fallback-portrait`/`implement-leader-abilities`/`add-unique-content`の順が基本線)

## TODO

- [ ] 実装するリーダー・文明を決める(`docs/design.md`の基礎情報を埋める)
- [ ] `bootstrap-leader` Skillでリーダー実装に着手
