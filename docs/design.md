# civ6mod-hololive-holox 設計メモ

> civ6mod-hololive-reglossの姉妹リポジトリ。Modding基礎知識・デバッグ手順は`.claude/skills/bootstrap-mod`・`.claude/skills/bootstrap-leader`を参照(このMod固有の設計判断のみここに書く)。ドキュメントの役割分担は`.claude/rules/documentation.md`を参照(現状ステータス・TODOは`README.md`に一本化する)。

## 経緯

(未記入)

## 基礎情報

```
CIVILIZATION_{{PREFIX}}_{{CIV_NAME}}
LEADER_{{PREFIX}}_{{LEADER_NAME}}
TRAIT_LEADER_{{PREFIX}}_{{LEADER_NAME}}
```

カラー: Primary `{{#RRGGBB}}` / Secondary `{{#RRGGBB}}`。
