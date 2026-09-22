---
name: implement-diplomacy-statements
description: Civ6 Modで外交交渉画面の台詞(`LOC_DIPLO_*`、DiplomacyStatements系)を実装する時に使う。「外交台詞を書く」「宣戦布告のセリフ」「GREETINGってどんな場面?」「FROM_AIとFROM_HUMANの違い」「KUDO_EXITって何」のように言われたとき、または`DiplomacyStatements_*`系のLOCキーを新規に書く/調べる場面で使う。テキストの文体は`write-official-jp-text-style`の対象外(そちらはTrait `_NAME`/`_DESCRIPTION`等の公式文体、こちらはキャラクター性格ベースの台詞)。bootstrap-leaderで指導者が選択画面に出るところまで終わった後、`implement-leader-abilities`と並行して使う独立作業。
---

# 外交交渉画面の台詞(DiplomacyStatements)の実装

一条莉々華Mod(civ6mod-hololive-regloss)の実装で確立したパターン集。タグの命名規則・場面ごとの意味論(誰が何をした時に表示されるか)は`references/diplomacy-statement-schema.md`に一覧化してあるので、新しい場面のタグを書く前に該当箇所を読むこと。ここでは全体方針と罠だけを書く。

## 台詞は「公式文体」ではなくキャラクター性格ベースで書く

`write-official-jp-text-style` Skill(Trait説明文等の統一書式ルール)とは違い、外交台詞にはFirsaxisの統一文体ルールが存在しない。実機のバニラテキスト(`Base/Assets/Text/en_US/DiplomacyStatements_*_Text.xml`)で検証済み: トラヤヌスの`GREETING`は「息災にしておられるか。」(古風・威厳)、クレオパトラは「私に何か用かしら？」(高慢)、ガンジーは「平和を、あなたに。」(穏やか)と、リーダーごとに口調が完全に異なる。日本語版でも語尾・言い回しでキャラ差が維持されている。**このMODでもリーダーの性格をそのまま台詞に反映させてよい(それが公式の作法)。**

## タグの命名規則

`LOC_DIPLO_<場面>_$(LEADER)_$(MOOD)`という`StatementText`テンプレート(`Base/Assets/Gameplay/Data/DiplomacyStatements_*.xml`で定義)の`$(LEADER)`にLeaderTypeの完全な文字列が代入される。完成形のパターンで覚えれば十分:

- **リーダー固有**: `..._LEADER_<LeaderType>_ANY`(例: `LOC_DIPLO_GREETING_LEADER_REGLOSS_ICHIJOU_RIRIKA_ANY`)
- **全リーダー共通フォールバック**: `..._ANY_ANY`(`LEADER_`プレフィックス無し。例: `LOC_DIPLO_KUDO_EXIT_ANY_ANY`)。バニラの主要リーダーですら、この後のスキーマ一覧にある個別警告4種などマイナーな場面はこのフォールバックのみで済ませていることが多い

`$(MOOD)`は基本`ANY`のみ書けば足りる(HAPPY/UNHAPPY別に分岐しているデータもあるが、Mood別に文言を変えている実例は無かった)。

## 意味論を推測で決め打ちしない

`FROM_AI`/`FROM_HUMAN`、`_RESPONSE_POSITIVE`/`_RESPONSE_NEGATIVE`、`VISIT_RECIPIENT`/`NEAR_INITIATOR_POSITIVE`のような接尾辞は、名前から字面で意味を決め打ちすると実際に取り違える(下記「実際に踏んだ罠」参照)。**必ず`Base/Assets/Gameplay/Data/DiplomacyStatements_*.xml`(ゲームプレイロジック本体)を読んで、`Initiator`/`SubType`列とコメント(`<!-- This is the "positive" response statement sent by the AI when... -->`)から意味を確定させること。** バニラの`Base/Assets/Text/en_US/DiplomacyStatements_*_Text.xml`にある実リーダーの英語テキストと突き合わせると裏取りが早い。

## 実際に踏んだ罠

- **`FIRST_MEET_VISIT_RECIPIENT`と`FIRST_MEET_NEAR_INITIATOR_POSITIVE`は訪問する/されるの主客が逆**。前者は「自分の拠点が近いので自分の拠点へ誘う」、後者は「相手の拠点が近く、招かれて快諾する」。当初後者を「自分の拠点に誘い返す」内容で書いてしまい、`DiplomacyStatements_FirstMeet.xml`の構造とSAMPLELEADERの実例("By all means. It will be a pleasure to see **your** growing city up close.")を見て気づいて修正した
- **`KUDO_EXIT`/`WARNING_EXIT`(理由なしの総合的な褒め言葉)と、`LOC_DIPLO_KUDO_LEADER_ANY_REASON_AGENDA_*`(アジェンダに基づく理由付きの発言)は完全に別系統**。前者は`DIPLOMATIC_KUDO`/`DIPLOMATIC_WARNING`(`StatementText`のみ、リーダー固有)、後者は`DIPLOMATIC_HIDDEN_AGENDA_KUDO`/`WARNING`(`StatementText`は空の汎用`ANY_ANY`+`ReasonText`でリーダー非依存の理由文を追加表示)という別のStatementType。**前者に具体的な理由(「戦争が~」等)を書くのは仕様上の役割違反**であり、当初この2つを混同して同じ内容を書きかけた
- **個別警告4種(`DONT_SETTLE_NEAR_ME`以外)は、バニラの主要リーダーでも本体の警告セリフだけフォールバックが空**(`ANY_ANY`のStatementTextが空文字)で、各種応答(`HUMAN_RESPONSE_POSITIVE`等)だけ用意されている。本体セリフは公式の参考例が無いのでオリジナルで書く必要がある

## 全実装済みタグの一覧・場面別の意味

`references/diplomacy-statement-schema.md`を参照。カテゴリ別(初対面/宣戦布告/友好・同盟等の5パターン構造/取引/講和/要求/個別警告4種)にタグと意味、実機での検証根拠をまとめてある。

## 英訳を書いたら逆翻訳で検証する

日本語を書いた本人(このMod制作者)は英語のニュアンスを直接判定できないため、**英語だけを渡した別セッション/エージェントに和訳させ、それを元の日本語と突き合わせる**と、意図しない硬さ・語のニュアンス変化(例: "officially friends"が「友好宣言」の硬さを意図せず呼び戻す)を客観的に検出できる。自己申告のレビューだけより有効。

**断片情報から仮説を積み上げがちな調査が必要になったら、先に`research-mod` Skillに従って一次情報を洗うこと。**
