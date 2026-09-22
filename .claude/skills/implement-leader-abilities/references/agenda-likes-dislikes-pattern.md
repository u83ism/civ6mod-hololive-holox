# ユニークアジェンダ(HistoricalAgenda)の好み/嫌い(実機確認済みパターン)

カスタムAgendaで好み/嫌いを実装する場合、バニラの専用ハードコードModifierType(例: `MODIFIER_PLAYER_DIPLOMACY_AGENDA_SHORT_LIFE_GLORY`)はModから新規追加できない。代わりに汎用の`MODIFIER_PLAYER_DIPLOMACY_SIMPLE_MODIFIER`を使う。共通構造(1vs1決闘モードで実機動作確認済み、2026-09-20、`AGENDA_REGLOSS_ICHIJOU_RIRIKA`):

```
Agendas → AgendaTraits → HistoricalAgendas でLeaderTypeにAgendaTypeを紐付け
TraitModifiers で TraitType(Agenda側)→ModifierId
Modifiers: ModifierType=MODIFIER_PLAYER_DIPLOMACY_SIMPLE_MODIFIER
           + OwnerRequirementSetId=ON_TURN_STARTED(毎ターン再評価。バニラのAgenda系Modifier共通の定型)
           + SubjectRequirementSetId で対象を絞り込む(下記2パターン参照)
ModifierArguments: InitialValue(好み=正の値、嫌い=負の値)/StatementKey(外交台詞のLOCキー)/
                    SimpleModifierDescription(Opinion内訳の理由テキストのLOCキー)
```

`SubjectRequirementSetId`は「何を好み/嫌うか」で2系統ある。**両方とも「対象の一般的な状態」ではなく「Owner(このAgendaを持つ文明)との関係」または「対象単体の状態」のどちらを見るかが変わるので、意図に合わせて選ぶこと**:

- **莉々華自身との戦争状態だけを見る**(`REQUIREMENT_PLAYER_AT_WAR_AND_HAS_MET`、Owner-Subjectのペア単位): 好み側はバニラの既存RequirementSet「`PLAYER_IS_KNOWN_MAJOR_CIV_AT_WAR`」をそのまま再利用可能(中身はInverse=trueの`REQUIREMENT_PLAYER_AT_WAR_AND_HAS_MET`を含み、実質「既知の大国・`REQUIRES_MET_10_TURNS_AGO`(10ターン以上前に接触済み)・自分と戦争状態にない」の意)。ただしこの組み合わせ自体はバニラでは`AGENDA_MODIFIER_NEVER_AT_WAR`としてコメントアウトされたまま未出荷(死んだデータ)。**都市国家への攻撃や他文明同士の戦争はここではノーカン**(Owner自身と交戦しているかどうかしか見ない)
- **一般的な好戦性(都市国家攻撃含む)を見る**(`REQUIREMENT_PLAYER_IS_NOT_WARMONGER`、対象単体のWarmongerペナルティ状態): アレクサンドロス3世の本物の`AGENDA_SHORT_LIFE_GLORY`(「マケドニア以外の大国と戦争状態にある文明を好む」)もこちらの精神に近い(ただし実体は専用ハードコード)。好み側はバニラの既存RequirementSet「`PLAYER_NOT_WARMONGER_SUBJECT`」を再利用可能(`TRAIT_AGENDA_PEACEKEEPER`というRandom Agendaで実際に使われている生きたデータ)。嫌い側の対になる`PLAYER_IS_WARMONGER_SUBJECT`はバニラの`AGENDA_MODIFIER_WARMONGER`が参照しているのにRequirementSetRequirementsの定義が丸ごと存在しない(2026-09-20確認、Expansion1/2にも無い、バニラ側の未完成データの疑い)ため、中身を信用せず自前でInverse版を定義する必要がある

どちらのパターンでも、嫌い側(Inverseを外した対になるRequirementSet)は自前で定義することになる場合が多い。実例は`XML/Leaders.xml`を参照(現行実装はWarmonger方式)。

**罠(必須)**: 上記の`ModifierArguments`だけでは、Opinion内訳の理由テキストが「理由不明」にフォールバックする。`ModifierStrings`に`Context="Sample"`・`Text="LOC_TOOLTIP_SAMPLE_DIPLOMACY_ALL"`(実体は`{diplomaticReason}`というプレースホルダー)の行を**各ModifierIdごとに追加**しないと、`SimpleModifierDescription`の値自体はDB上に存在してもUIが表示できない。バニラの全Agenda系Modifierはこの行を必ずセットで持っているので、DIPLOMACY_MODIFIER系のModifierを書くときは`TraitModifiers`/`Modifiers`/`ModifierArguments`に加えて`ModifierStrings`も忘れずに書くこと(2026-09-20実機で確認・修正済み)。

自分自身(Owner)は`REQUIRES_MAJOR_CIV_OPPONENT`を満たせないため、Subject候補には数えられるがカウントには入らない(1vs1なら「対象1件」が自動的に相手プレイヤーになる)。**このAgendaはAIが操作している時だけ機能する**(人間が操作する文明自身のAgendaは、他者からの評価に一切使われない。外交画面の「相手が自分をどう思っているか」は常に相手側=AIのDiplomaticAIが自分のAgendaを使って計算するもので、人間側のAgendaが誰かの意見として表示される画面は存在しない)。

デバッグにはFireTuner(`bootstrap-leader/references/firetuner.md`参照)の`Diplomacy.ltp`パネルが有効。`GameEffects.GetModifiers()`でModifierインスタンスのOwner/Subject数(`# Subjects/Tracked`)/Activeを直接見られるので、Opinion画面に反映される前に「そもそも発火しているか」を切り分けられる。
