# civ6mod-hololive-holox 設計メモ

> civ6mod-hololive-reglossの姉妹リポジトリ。Modding基礎知識・デバッグ手順は`.claude/skills/bootstrap-mod`・`.claude/skills/bootstrap-leader`を参照(このMod固有の設計判断のみここに書く)。ドキュメントの役割分担は`.claude/rules/documentation.md`を参照(現状ステータス・TODOは`README.md`に一本化する)。

## 経緯

(未記入)

## 指導者設計方針

- Hololive系Modの慣習・姉妹リポジトリ(civ6mod-hololive-regloss)に従い、holoXメンバーは1人1指導者(1人1文明)としてバラバラに実装する
- 1人目は沙花叉クロヱから着手

### 沙花叉クロヱ

#### コンセプト

掃除屋≒暗殺者、海モチーフ＆水族館好き、歌≒音楽好きとCivに絡めそうな特徴がいくつかあるが、要素が全部バラバラ(戦闘、海洋関連、文化)で、どうシナジーを発揮させるかが当初の課題だった。バニラの音楽/音楽家関連コンテンツ(円形劇場・コンサートホール・ロックバンド・観光力の経済政策カード)は総じて解禁が遅く、効果も他の偉人系(作家/彫刻家/画家)より弱いという一般的な課題もあり、音楽をフォーカスに据えるならここへの対策も要るのではないか、という論点もあった。

#### 設計方針(2026-09-23確定)

- コンセプトの中で一番ビジョンが固まっている戦闘まわりをアンカーにして、他の要素(水族館バフ・勝ち筋)をこれに合わせて組み立てる
- **勝ち筋は文化勝利、フォーカスは「音楽」に絞る**(文化勝利全般や偉人全般ではなく、あくまで音楽家/音楽関連の偉業を通した文化勝利)。「暗殺者が敵を屠ると音楽家ポイントが手に入る」という、戦闘→音楽→文化勝利の一直線の流れを狙う
- 水族館は文化/音楽の勝ち筋に寄せた超強力バフでよい。素の海洋/港バフ(水族館とは別、地味な底支え系)は無理に文化/音楽の軸に合わせず、独立した経済バフとして扱う
- プレイスタイルは音楽家ポイント源を戦闘に依存させる=「序盤に戦って稼ぐ」好戦的な文化文明でよい、と本人確認済み
- 音楽の解禁の遅さへの追加テコ入れ(円形劇場系施設の解禁前倒し、音楽家の傑作=コンサート効果の底上げ等)が要るかは未確定・検討中。下記の指導者固有能力(撃破戦闘力に応じた音楽家ポイント)は、円形劇場等の建造を待たずに序盤の戦闘から音楽家ポイントを稼げる仕組みなので、この課題の一部(登場の早さ)への対策としてはすでに機能する

#### 指導者固有能力「歌好きの掃除屋」

戦闘関連の2効果をまとめて指導者Trait側に置く(海洋/水族館関連は文明Trait側、役割分担は2026-09-23確定)。

- **攻撃戦闘時、25%の固定確率で敵ユニットを即座に撃破する**(攻撃時限定、防御時は発動しない — 暗殺者は自分から仕掛ける時だけ発動する、という設計で2026-09-23本人確認)。ころねの50%ではなく25%にしたのは、掃除屋という設定と、本人の「ぽんこつ」というキャラ付けを踏まえたバランス。戦闘力差による補正は入れず素の確率のまま(「見た目の説明が確率なら中身も確率にする」という本人の判断)。拿捕(自軍に変換)はしない — 「仲間にする」がクロヱのイメージに合わないため不採用
- **戦闘勝利時、倒した敵ユニットの戦闘力に応じた音楽家(Great Musician)ポイントを獲得する**(ゴルゴー/タマルの「撃破戦闘力→文化力/信仰力」と同じロジックの音楽家版)。**こちらは攻撃/防御を問わず発動する**(2026-09-23本人確認: 即死効果と違い、音楽家ポイントは防衛戦闘での反撃キルでも発動してよい)。音楽家ポイント自体がバニラで弱めという課題はあるが、それを差し引いても強力な目玉能力にする狙い

**実装方式(2026-09-23、`Hololive GAMERS`Mod=戌神ころねの実装を実機ファイルで確認)**:

- ころねの指導者Trait「ぶっころね」(攻撃時50%で敵を瀕死=HP1にする)は完全にLua実装で、XML(Modifier/Requirement)側には一切登場しない。実装は`Lua/GameplayScript.lua`で`Events.Combat.Add(...)`にフック関数を登録し、関数内で(1)攻撃者のリーダーが自分か判定 (2)`math.random()`で確率判定 (3)`CombatResult`テーブルから防御側ユニットを取得 (4)`defender_unit:SetDamage(99)`でHPを強制的に1まで削る、という流れ。ころねのこの効果自体が攻撃側限定(`CombatResultParameters.ATTACKER`側のリーダーしか見ていない)であることを実機ファイルで確認済み
- クロヱの場合はころねと違い瀕死ではなく確実に撃破したいので、`SetDamage(99)`を`SetDamage(100)`に変えるだけでよいはず(ころねの実装自身が`defender_final_damage >= 100`を「もう死んでいる」判定に使っており、100が事実上の即死ラインと読める)。別途キル専用APIを探す必要はなさそう。ただし実機での動作確認は別途要る(ダメージ0/100の境界挙動、都市への攻撃時の扱い等)
- **音楽家ポイント側は即死効果と非対称**: 即死効果は攻撃時限定でよいが、音楽家ポイントは攻撃/防御どちらでも発動させたい(2026-09-23本人確認)。ゴルゴーの元ネタ(`CULTURE_KILLS_TRAIT`、`MODIFIER_PLAYER_UNITS_ADJUST_POST_COMBAT_YIELD`)はXML(Player単位のCOLLECTION_OWNER Modifier)実装のため攻撃/防御を問わず発動するが、GreatPersonPoints版の同等EffectTypeは存在しないためLuaで挙動を再現する必要がある。`Lua/GameplayScript.lua`では`Events.Combat`フック内で(a)クロヱが攻撃側かつ防御側ユニットが死亡した場合(通常撃破/即死効果いずれでも) (b)クロヱが防御側かつ攻撃側ユニットが反撃で死亡した場合、の2パターンを別々に判定し、どちらでも倒した相手の戦闘力に応じて`ChangePointsTotal(8, amount)`を加算する
- 参考: 公式の拿捕(イングランドのシードッグ`UNIT_ENGLISH_SEADOG`)は`CanCapture=true`のみを持つ二値Modifierで確率要素なし。今回は不採用だが、「戦闘勝利時に通常と異なる結果を強制する」という枠組み自体はシードッグ・ころね双方に共通する既存パターンなので、実装時の型として参照可能
- `implement-leader-abilities` Skillの範囲外(Modifierだけでは組めない)。実装フェーズでLua GameplayScript追加の手順を別途調べる必要がある

#### 文明固有能力(名前・中身未定)

海洋/水族館関連のバフを担当。水族館は文化/音楽の勝ち筋に寄せた超強力バフ、素の海洋/港バフは独立した経済バフとする方針(上記コンセプト参照)。中身は未検討。

### ラプラス・ダークネス

(未記入)

### 鷹嶺ルイ

(未記入)

### 博衣こより

(未記入)

### 風真いろは

(未記入)

## 基礎情報

```
CIVILIZATION_HOLOX_ORCA_POD        (表示名: シャチの群れ)
LEADER_HOLOX_SAKAMATA_CHLOE        (沙花叉クロヱ, 公式表記 "Sakamata Chloe" を採用)
TRAIT_LEADER_HOLOX_SAKAMATA_CHLOE
TRAIT_CIVILIZATION_HOLOX_ORCA_POD
```

姉妹リポジトリ(civ6mod-hololive-regloss)と同じくNeox系命名規則(パック名でスコープしたID、文明IDはキャラ名でなくテーマ名)を踏襲する。PACK-NAMEは`HOLOX`。文明のテーマ名は「シャチの群れ」(2026-09-23確定、本人による選定): クロヱは組織を率いるイメージが薄いキャラのため、「〜帝国」「〜コーポレーション」のような組織名ではなく、あえて群れ(Pod)を採用。英語Type名は「シャチの群れ」の直訳である`ORCA_POD`(EN系Mod、`Nephilim`/`Chipmunk`のような英単語テーマ名の命名慣習にも合う)。

カラー: Primary `#1A1A1A`(26,26,26) / Secondary `#FFFFFF`(255,255,255)、シャチ配色(黒/白、2026-09-23本人確認)。純黒(#000000)ではなくやや明るい黒にしたのはUI描画上の一般的な配慮(regloss/一条莉々華の白セカンダリと同じ値を踏襲)。

## 実装状況(2026-09-23)

`bootstrap-leader` Skillに従い、指導者/文明が選択画面に出て最低限プレイ可能になるところまでの骨格を実装した(**実機確認はまだ行っていない**)。

- `XML/Civilizations.xml` — Civilization本体、CivilizationLeaders、CityNames(暫定で首都1件のみ)、`TRAIT_CIVILIZATION_HOLOX_ORCA_POD`(文明固有能力、中身は未定のためプレースホルダーテキストのみ)
- `XML/Leaders.xml` — Leader/Trait本体。`TRAIT_LEADER_HOLOX_SAKAMATA_CHLOE`のTraits行はNOT NULL制約を満たす名前/説明テキストの登録のみで、効果自体はXML(Modifier)ではなくLua側にある(このTrait効果はModifierだけでは組めない、`implement-leader-abilities` Skillの範囲外)
- `XML/Colors.xml` — Colors/PlayerColors(シャチ配色、Alt1〜3もregloss同様に明示登録)
- `XML/Config.xml` — リーダー選択画面用の登録。Icon/Portraitは実体が無いプレースホルダー文字列(3ドメインとも登録)
- `Art/Icons/Icons.xml` — 空スタブ。`.modinfo`のUpdateIconsが参照するファイルが実在しないとロードが壊れるため、実際のアイコン作り込み(`make-leader-icons` Skill)より前にファイルの存在だけ確保した
- `Lua/SakamataChloeGameplayScript.lua`(2026-09-23、`GameplayScript.lua`から改名。理由は下記デバッグ記録参照) — 指導者固有能力の効果本体。`Events.Combat`に`SakamataChloeCombatHandler`をフック登録し、即死効果(攻撃時限定)と音楽家ポイント効果(攻撃/防御両対応)を別々に判定する: (1)クロヱが攻撃側かつ防御側ユニットがまだ生きていれば25%の確率で`SetDamage(100)`により即座に撃破、防御側が死亡していれば(通常撃破/即死効果いずれでも)その戦闘力に応じた大音楽家ポイントを獲得 (2)クロヱが防御側の場合は即死効果を発動させず、攻撃側ユニットが反撃で死亡していればその戦闘力に応じた大音楽家ポイントのみ獲得。いずれも`Players[playerID]:GetGreatPeoplePoints():ChangePointsTotal(8, amount)`で加算する。`Hololive GAMERS`Mod(戌神ころね「ぶっころね」)の実装を土台にした
- `.modinfo` — `InGameActions`に`AddGameplayScripts`アクション(`id="SakamataChloeGameplayScript"`)を追加し`Lua/SakamataChloeGameplayScript.lua`を登録、`Files`にも追加
- `Text/ja_JP/Text.xml`・`Text/en_US/Text.xml` — 文明名/説明/形容詞、指導者名、指導者/文明Trait名・説明、首都名。指導者Trait名は「歌好きの掃除屋」/"Singing Cleaner"(2026-09-23確定)。文明Traitの名前・説明文は**いずれも暫定文言**(「群れの絆」等)で、`write-official-jp-text-style`/`write-official-en-text-style` Skillでの文体調整は未実施

**`GetGreatPeoplePoints():ChangePointsTotal(classID, amount)`のclassID対応表(2026-09-23、FireTunerパネル`Debug/Player.ltp`の各アクションボタンのLua実装で確認)**: `0`=Great General、`1`=Great Admiral、`2`=Great Engineer、`3`=Great Merchant、`4`=Great Prophet、`5`=Great Scientist、`6`=Great Writer、`7`=Great Artist、`8`=Great Musician。クロヱの音楽家ポイント加算はこの一次情報を根拠に`8`を採用した。

## 実機デバッグ記録

**2026-09-23、Lua実装(即死+音楽家ポイント)が実機で一切発動しない不具合を発見・調査中**。蛮族を撃破しても効果が発動しなかったため、`Events.Combat`ハンドラ内の各分岐に`print()`診断ログと`pcall`によるエラー捕捉を仕込んで再テストしたが、`Lua.log`はもちろん全ログファイル(`GameCore.log`含む)のどこにも出力が一切現れなかった。ログでの切り分けを諦め、リーダー判定より前段で無条件にゴールド+100を付与する診断コードに切り替えて再テストしたが、それでもゴールドは増えなかった — つまり`SakamataChloeCombatHandler`関数自体が一度も呼ばれていないと判明した。

原因として、**Modding.logを見直したところ、`Hololive GAMERS`Mod(戌神ころね)も全く同じファイル名`Scripts/GameplayScript.lua`を`AddGameplayScripts`で登録していた**ことに気づいた(パスは違うがベースファイル名が完全一致)。Civ6のLuaモジュール読み込みがファイル名ベースでキャッシュされ、後から読み込まれた同名ファイル(ログ順ではGAMERS側が後)にサイレントに上書きされてこちらのコードが一切実行されない、という事故を疑い、`Lua/GameplayScript.lua`を`Lua/SakamataChloeGameplayScript.lua`にリネーム(`.modinfo`の`AddGameplayScripts`の`id`も含めて変更)。

**リネーム後に再テストし、原因確定・修正を実機確認した(2026-09-23)**。診断用に仕込んだ`print()`ログが`Lua.log`に`SakamataChloeGameplayScript: [HoloX Chloe] ...`として出力されるようになり(リネーム前は皆無だった)、`Events.Combat`ハンドラが正しく呼ばれていることを確認。さらに実際のログ内容(`attacker.player=0 is_chloe_attacking=true defender_final_damage=85 defender_combat_strength=20 defender_dead(before roll)=false`)から、このテストでは攻撃がとどめに至らず(85ダメージ、まだ生存)、即死ロール(25%)も外れたため何も起きなかっただけで、ロジック自体は設計通り正しく動いていることも確認できた。診断用の`print()`/`pcall`/ゴールド付与コードは役目を終えたため削除し、本番用のコードに戻した。

**2026-09-23、即死効果発動後もユニットが盤面に残り続け、次に攻撃すると改めて死んで音楽家ポイントが二重に入る不具合を発見・原因確定**。プレイ継続中のログ(`print()`診断版がまだ稼働していた)を遡って確認したところ、同一ユニット(戦闘力25で一致)への3回の攻撃が記録されていた: 1発目33ダメージ(生存)→2発目71ダメージで即死ロール成功・`SetDamage`で撃破処理・音楽家ポイント25獲得→(間に無関係な戦闘)→3発目で`defender_final_damage=146`(100を超える、本来あり得ない値)を記録した上で`defender_dead(before roll)=true`と判定され、**再度**音楽家ポイント25を獲得していた。146という数値そのものが「`SetDamage`で撃破扱いにしたはずが実際にはユニットが盤面に残っており、そこへさらに通常ダメージが上乗せされた」ことの直接的な証拠になった。`Events.Combat`はこの戦闘の生死判定が確定した後に発火するイベントで、事後に`SetDamage`でダメージ値だけ書き換えても実際の生死判定(ユニット除去)には反映されないと判断し、DLCシナリオスクリプト(`AlexanderScenario.lua`等)で実際に使われている`UnitManager.Kill(unit, false)`(ユニットをその場で即座に削除する公式API)に差し替えた。あわせて、即死経由と通常撃破経由で同じワールドビューテキスト(`Chloe's Requiem`)を出していたためどちらが発動したか本人が区別できなかった反省を踏まえ、即死発動時は`Chloe's Requiem`とは別のテキスト(`Chloe's Assassination`)を出すよう分離した。**`UnitManager.Kill`への差し替え後の再確認はまだ**(二重発火が解消したか、ユニットがその場で正しく消えるか)。

**`UnitManager.Kill`への差し替え後、実機で再確認し正常動作を確認した(2026-09-23)**。即死発動時にユニットがその場で正しく消え、二重発火は再発していない。撃破戦闘力に応じた大音楽家ポイント(斥候=戦闘力10を撃破→10ポイント獲得、`XML/Units.xml`のバニラ値と一致)も正しく加算されることを確認済み。

あわせてUX調整(2026-09-23、本人要望): 即死経由と通常撃破経由で同じテキストだと、指導者固有能力「歌好きの掃除屋」の内部実装(即死/音楽家ポイントの2効果)が透けて見えてしまうという指摘を受け、ワールドビューテキストを再設計した。即死発動時のみ追加で`[COLOR_RED]クリティカル！[ENDCOLOR]`(バニラの`LOC_WORLD_UNIT_DAMAGE_INCREASE_FLOATER`と同じ`[COLOR_RED]`記法を踏襲)を表示し、音楽家ポイント獲得は経路を問わず常に`[ICON_GreatMusician] 大音楽家ポイント +{1_Num}`という獲得量表示に統一。テキストはハードコードではなく`Locale.Lookup("LOC_...")`経由にして多言語対応した(Text/ja_JP・Text/en_US)。

**未検証・今後の課題**:
- ダメージ0/100の境界挙動、都市への攻撃時の扱い、防御側分岐(反撃キル)の実機確認
- 文明固有能力(海洋/水族館バフ)の中身
- 都市名リストの拡充、バッジアイコン/ポートレートの作り込み、Trait説明文の文体調整
