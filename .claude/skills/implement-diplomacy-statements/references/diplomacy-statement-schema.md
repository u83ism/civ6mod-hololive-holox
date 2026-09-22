# DiplomacyStatementsスキーマ調査(実機確認済み、2026-09-21)

出典: インストール済みCiv6本体の`Base/Assets/Gameplay/Data/DiplomacyStatements_*.xml`(ゲームプレイロジック本体、StatementText/Initiator/SubTypeの定義)と`Base/Assets/Text/en_US/DiplomacyStatements_*_Text.xml`(バニラリーダーの実テキスト)を直接読んで確認した。一条莉々華(`LEADER_REGLOSS_ICHIJOU_RIRIKA`)実装時の調査記録。

## 初対面・挨拶

| タグ(`LEADER_<Type>_ANY`は省略) | 意味 |
| --- | --- |
| `GREETING` | 初対面済みの相手と外交画面を開くたびに毎回表示される第一声(`DiplomacyActionView.lua`で`useStatementType = "GREETING"`としてメニュー選択肢の元ネタに使われる。初対面の挨拶とは別物) |
| `FIRST_MEET` | 初めて出会った時の第一声 |
| `FIRST_MEET_VISIT_RECIPIENT` | **自分の**拠点が接触地点に近い場合、自分の拠点へ誘うセリフ(`FIRST_MEET_NEAR_RECIPIENT`統計タイプのPOSITIVE選択後に発火) |
| `FIRST_MEET_NEAR_INITIATOR_POSITIVE` | **相手の**拠点が近い場合、相手の拠点に招かれて快諾するセリフ(`FIRST_MEET_NEAR_INITIATOR`統計タイプのPOSITIVE選択後に発火。VISIT_RECIPIENTと主客が逆) |
| `FIRST_MEET_NO_MANS_INFO_EXCHANGE` | お互い遠方の場合、地図交換を提案するセリフ |

根拠: `Base/Assets/Gameplay/Data/DiplomacyStatements_FirstMeet.xml`。SAMPLELEADERの実例(`GSLeaderTemplate`)で`VISIT_RECIPIENT`="We have a city nearby. Would you like to visit?..."、`NEAR_INITIATOR_POSITIVE`="By all means. It will be a pleasure to see **your** growing city up close."と、主客が逆であることが確認できる。

## 宣戦布告・敗北

| タグ | 意味 |
| --- | --- |
| `DECLARE_WAR_FROM_AI` | **このリーダー自身が**プレイヤーに宣戦布告する時の台詞 |
| `DECLARE_WAR_FROM_HUMAN` | **プレイヤーから**宣戦布告された直後、このリーダーが返す台詞 |
| `DEFEAT_FROM_AI` / `DEFEAT_FROM_HUMAN` | 敗北時の台詞(バニラでは通常同一文言) |

`FROM_AI`/`FROM_HUMAN`の軸は「相手がAIかHumanか」ではなく「**宣戦布告を仕掛けた側がどちらか**」。AI対AIの戦争ではこのテキストは表示されない(常にプレイヤーとの一対一専用)。

実機トラヤヌス例: `FROM_AI`="祖国ローマの栄光のために、艦隊は貴国の海岸を埋め尽くすであろう"(自分から)、`FROM_HUMAN`="その傲慢さが身を滅ぼす。ローマを倒せる力などない"(布告された返答)。

## 友好宣言・同盟・使節団・大使館・国境開放(共通の5パターン構造)

いずれも同じ5タグ構造。`<提案>_FROM_AI`(莉々華から提案)/`ACCEPT_<提案>_FROM_AI`・`REJECT_<提案>_FROM_AI`(莉々華の提案への回答を受けた莉々華の返事)/`ACCEPT_<提案>_FROM_HUMAN`・`REJECT_<提案>_FROM_HUMAN`(相手発信の提案に対する莉々華の返事)。

- `DECLARE_FRIEND`(友好宣言)
- `MAKE_ALLIANCE`(同盟)
- `DELEGATION`(使節団)
- `EMBASSY`(大使館)
- `OPEN_BORDERS`(国境開放)

## 取引(MakeDeal)

| タグ | 意味 |
| --- | --- |
| `MAKE_DEAL_AI_ACCEPT_DEAL` | 取引案(提案者が莉々華/相手のどちらでも可)を莉々華がそのまま受諾 |
| `MAKE_DEAL_AI_ADJUST_DEAL` | 莉々華が対案を出す |
| `MAKE_DEAL_AI_REFUSE_DEAL` | 莉々華が取引案を拒否 |
| `ACCEPT_MAKE_DEAL_FROM_AI` | 莉々華が出した提案を相手が受諾した後の莉々華の反応 |
| `REJECT_MAKE_DEAL_FROM_AI` | 莉々華が出した提案を相手が拒否した後の莉々華の反応 |

根拠: `Base/Assets/Gameplay/Data/DiplomacyStatements_MakeDeal.xml`。`SubType`が`AI_ACCEPT_DEAL`/`POSITIVE`(=ADJUST)/`AI_REFUSE_DEAL`/`HUMAN_ACCEPT_DEAL`/`HUMAN_REFUSE_DEAL`の5種類あり、`Initiator`(AI/HUMANどちらが提案したか)に関わらず同じStatementTextに集約される(=「誰が提案したか」ではなく「莉々華がどう反応するか」だけで文言が決まる)。

**罠(実機で確認、2026-09-21)**: `Initiator=AI`(莉々華が自分から取引画面を持ちかけた)かつ`SubType=HUMAN_REFUSE_DEAL`(プレイヤーが拒否した)の組み合わせだけは、`StatementText`が`$(LEADER)`を含まない**ハードコードされた汎用タグ**(`LOC_DIPLO_DEAL_LEADER_TRADE_REFUSED_NEUTRAL_1`/`_FRIENDLY_1`/`_AGGRESSIVE_2`、Mood別)になっており、全リーダー共通で上書き不可能。`REJECT_MAKE_DEAL_FROM_AI_$(LEADER)_$(MOOD)`(このリポジトリで実装済み)が使われるのは`Initiator=HUMAN`側の同じSubTypeのみ。「実機で見たら知らないセリフが出た」ケースの多くはこの手の汎用固定文字列(DiplomacyStatements系の各XMLに散在)であることを疑うこと。

## 講和(MakePeace)

| タグ | 意味 |
| --- | --- |
| `MAKE_PEACE_FROM_AI` | 講和の話を切り出す入口(戦争中に外交画面を開いた時の第一声。Initiator問わず共通) |
| `MAKE_PEACE_AI_ACCEPT_DEAL` | 相手の講和案を莉々華が受諾 |
| `MAKE_PEACE_AI_REFUSE_DEAL` | 相手の講和案を莉々華が拒否(バニラでは`ENRAGED`アニメーション) |
| `ACCEPT_MAKE_PEACE_FROM_AI` | 莉々華の講和案を相手が受諾した後の反応 |
| `REJECT_MAKE_PEACE_FROM_AI` | 莉々華の講和案を相手が拒否した後の反応(`ENRAGED`) |

根拠: `Base/Assets/Gameplay/Data/DiplomacyStatements_MakePeace.xml`。

## 要求(MakeDemand)

| タグ | 意味 |
| --- | --- |
| `AI_ACCEPT_DEMAND` | プレイヤーの要求を莉々華が受諾 |
| `AI_REFUSE_DEMAND` | プレイヤーの要求を莉々華が拒否 |
| `HUMAN_ACCEPT_DEMAND_FROM_AI` | 莉々華の要求に相手が応じた後の反応 |
| `HUMAN_REFUSE_DEMAND_FROM_AI` | 莉々華の要求を相手が拒んだ後の反応 |

根拠: `Base/Assets/Gameplay/Data/DiplomacyStatements_MakeDemand.xml`。莉々華自身が要求を切り出す本体セリフに対応するStatementTextはバニラでも空(具体的な要求内容はUIのメニュー選択のみで表現され、専用の発話は無い)。

## アジェンダの褒め言葉・警告(2つの別系統に注意)

| タグ | 系統 | 意味 |
| --- | --- | --- |
| `KUDO_EXIT` | `DIPLOMATIC_KUDO`(`StatementText`のみ、リーダー固有) | **理由を明言しない**総合的な褒め言葉(退室セリフ)。バニラの汎用フォールバック`ANY_ANY`は空文字 |
| `WARNING_EXIT` | `DIPLOMATIC_WARNING`(同上) | 同上、警告版 |
| `LOC_DIPLO_KUDO_LEADER_ANY_REASON_AGENDA_<AgendaModifierId>` | `DIPLOMATIC_HIDDEN_AGENDA_KUDO`(`StatementText`は汎用`ANY_ANY`で空、`ReasonText`が実体) | アジェンダに基づく**具体的な理由**を述べる文。`LEADER_ANY`固定(全リーダー共通、リーダー名は入らない) |
| `LOC_DIPLO_WARNING_LEADER_ANY_REASON_AGENDA_<AgendaModifierId>` | 同上 | 同上、警告版 |

`ReasonText`のLOCキーはXML側の`<Name>StatementKey</Name>`で紐付けられるが、実際の値は使われず(コメント「Value not actually used, just has to have something so we know this is a kudo/warning」)、実際のLOCキーはAgendaのModifierIdから`LOC_DIPLO_KUDO_LEADER_ANY_REASON_AGENDA_<ModifierId>`という命名規則で自動導出される。HistoricalAgenda(公開ユニークアジェンダ、例: アレクサンドロスの`AGENDA_SHORT_LIFE_GLORY`)でも同じ汎用パターンに乗る(リーダー専用のReasonタグは存在しない)。

根拠: `Base/Assets/Gameplay/Data/DiplomacyStatements_KudosAndWarnings.xml`、`Base/Assets/Gameplay/Data/Agendas.xml`(`HiddenAgenda`フラグ)、`DLC/Macedonia_Persia/Data/Macedonia_Persia_GameplayData.xml`(`AGENDA_SHORT_LIFE_GLORY`の`StatementKey`コメント)。

**罠**: `KUDO_EXIT`/`WARNING_EXIT`に「戦争がどうこう」のような具体的理由を書くのは役割違反。当初混同して同じ内容を書きかけたが、理由なしの漠然とした褒め言葉(例:「あなたの国、なんかいつも穏やかそうでいいよね」)に書き直した。

## 個別警告4種

`WARNING_DONT_SETTLE_NEAR_ME`のみ本体の警告文がバニラにも用意されている(`_AI_ANY_ANY`)が、残り4テーマ(`STOP_CONVERTING_MY_CITIES`/`STOP_DIGGING_UP_ARTIFACTS`/`STOP_SPYING_ON_ME`/`TOO_MANY_TROOPS_NEAR_ME`)は本体の警告文がバニラでも空欄(応答セリフだけ用意されている)。本体セリフは公式の参考例が無いのでオリジナルで書く必要がある。

タグの接尾辞パターン(莉々華視点):

| 接尾辞 | 意味 |
| --- | --- |
| (無し、`_AI_`または直接`_LEADER_`) | 莉々華から警告する本体 |
| `_HUMAN_RESPONSE_POSITIVE` | 莉々華の警告に相手が応じた後の反応 |
| `_HUMAN_RESPONSE_NEGATIVE` | 莉々華の警告を相手が無視した後の反応 |
| `_AI_RESPONSE_POSITIVE` | 逆に相手から警告され、莉々華が謝って応じる反応 |
| `_AI_RESPONSE_NEGATIVE` | 逆に相手から警告され、莉々華が拒否する反応 |

**接尾辞の`AI_`/`HUMAN_`は「誰が警告を発したか」の軸**(DECLARE_WARと同じ考え方)。本体の警告文自体のタグ末尾に`_AI_`が付くかどうかはテーマによってバニラのXML定義が微妙に違う(`DONT_SETTLE_NEAR_ME`は`_AI_$(LEADER)_$(MOOD)`、他4テーマは`_$(LEADER)_$(MOOD)`で`_AI_`無し)ので、新テーマを追加する際は`Base/Assets/Gameplay/Data/DiplomacyStatements_Warning.xml`のStatementTextテンプレートを都度確認すること。

`TOO_MANY_TROOPS_NEAR_ME`のみ`HUMAN_RESPONSE_NEGATIVE`が仕様上存在しない(4タグ構成)。他4テーマは5タグ構成(本体+4応答)。

根拠: `Base/Assets/Gameplay/Data/DiplomacyStatements_Warning.xml`(全1093行、各テーマにコメント付きで`Initiator`/`SubType`の組み合わせが列挙されている)。
