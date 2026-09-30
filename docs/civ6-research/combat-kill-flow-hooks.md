# 戦闘の撃破フローとLuaフック調査(2026-09-30、一部未検証)

沙花叉クロヱの「確率で即死」を、ゲーム本体の通常の撃破フロー(吸血鬼の退却・英雄の蘇生など)に乗せられないか調べた記録。**結論: 確実な方法は見つからなかった。当面は現状(`UnitManager.Kill`)のまま**(2026-09-30、本人判断)。実装の理由・既知の制限そのものは`docs/design.md`の「沙花叉クロヱ」節が正で、このファイルは「どこまで調べて何が分かったか、何が未検証か」を残す。

「未確認」「推測」と書いた箇所は実機で試していない。

## 前提: なぜ問題になるか

- 即死は`UnitManager.Kill(unit, false)`でユニットを消している。エンジンは「戦闘での撃破」として扱わない。
- そのため撃破時に発動する効果が乗らない。実際に確認された例: 英雄「フンアフプーとイシュバランケー」の蘇生(倒した通常の陸上ユニットが自軍に加わる)。ユニットのプロパティ`HeroResurrectKill`(Modifier`MODIFIER_UNIT_ADJUST_PROPERTY`で付与)をエンジンが見て処理する。
- 吸血鬼(Secret Societies、DLC`Ethiopia`)は、倒されると「HP1で首都か最寄りの吸血鬼の城へ退却する」(説明文`LOC_UNIT_VAMPIRE_DESCRIPTION`)。定義は`UnitRetreats_XP1`テーブル(`UNIT_RETREAT_VAMPIRE_TO_CAPITAL`/`_TO_CASTLE`)。即死だと退却せず完全に消える見込み(未確認)。
- ベーオウルフの「ベーオウルフの挑戦」(`UNITCOMMAND_KILL_WEAKER_UNIT`)も、戦闘を経ずにエンジンが直接ユニットを消すユニットコマンド。撃破時の効果が乗るかは未確認。

## Lua側の入口(確認済みの範囲)

出典は主にModding Companion 2.0(`Events`/`Objects`/`Effects`/`Requirements`タブ)とゲーム本体のスクリプト。

| 入口 | 分かったこと |
|---|---|
| `GameEvents.OnCombatOccurred(攻撃側プレイヤー, 攻撃側ユニット, 防御側プレイヤー, 防御側ユニット, 攻撃側区域, 防御側区域)` | ダメージ・生死が確定した後に発火。倒れたユニットも`FindID`で引け、`IsDead()`/`IsDelayedDeath()`で判定できる。**戦闘前に割り込める`GameEvents`は見つかっていない** |
| `GameEvents.OnUnitRetreated(unitOwner, unitID)` | 退却が起きた通知。公式のアレクサンダーシナリオ(`AlexanderScenario.lua`)は受けて`UnitManager.Kill`している |
| `Events.Combat` | 生死判定の後。マルチプレイで一部のPCでしか発火しない恐れ(`design.md`参照) |
| `Events.UnitKilledInCombat`/`UnitDamageChanged`/`UnitRemovedFromMap`/`UnitCaptured`/`UnitOperationStarted`/`UnitCommandStarted` | 状態変化の通知(`Events`側、UI寄り)。書き換え用ではない。`UnitOperationStarted`等は攻撃の開始前に呼ばれる可能性があるが、発火順・同期の安全性は未検証 |
| `UnitManager.Kill(unit, 第2引数)` | 第2引数の意味はCompanionにも載っていない。通常の撃破フローを通らないことは実機確認済み |
| `Unit:SetDamage`/`ChangeDamage` | `SetDamage`で致死量にしても生死判定に反映されない(2026-09-23実機確認、`design.md`)。公式スクリプトは致死量なら自前で`Kill`し、そうでないときだけ`ChangeDamage`を呼ぶ書き方(`AustraliaScenario.lua:807-810`、`CivRoyaleScenario_StartScript.lua:1180-1182`)なので、`ChangeDamage`の致死量も撃破にならない可能性が高い(未確認) |
| 退却・拿捕を起こすLua API | 見つからなかった。`UnitManager`は`Kill`のみ。退却は`OnUnitRetreated`の通知だけ、拿捕は`UnitCaptured`の通知だけ |

想定される戦闘の流れ(順序は推測): 攻撃命令 → エンジンが戦闘力を計算・ダメージ適用 → 致死なら撃破処理(退却・蘇生の判定) → `OnCombatOccurred` → 倒れたユニットの除去。

## 戌神ころねの実装(参考)

`Hololive GAMERS`Mod(`Mods/2381084198 Hololive GAMERS (ホロライブゲーマーズ)/Scripts/GameplayScript.lua`、約40行、コメントはShift-JIS)。

1. `Events.Combat`に関数を登録(`CombatResult`テーブルを受け取る)
2. 攻撃側の指導者が`LEADER_INUGAMI_KORONE`か判定
3. `math.random() > 0.5`なら終了(50%)
4. 防御側がユニットでなければ終了。`FINAL_DAMAGE_TO >= 100`(通常戦闘ですでに倒れた)でも終了
5. 防御側に`SetDamage(99)`(最大HP100なのでHP1の瀕死)。撃破ではない
6. `Game.AddWorldViewText`で「Bukkorone」を表示

殺さずHP1にするだけなので、次の攻撃でとどめを刺せば通常の撃破フローに乗る。乱数が`math.random`・`Events.Combat`利用・指導者名の直書き・確率固定、と同期面は粗い(沙花叉の実装はこれを土台に直したもの)。

## 検討した案と評価

| 案 | 評価 |
|---|---|
| 現状維持(`Kill`) | **採用**。撃破時の効果が乗らないのは既知の制限 |
| 撃破時の効果をLuaで個別に再現 | 吸血鬼の退却だけなら30行程度で可能そうだが、瞬間移動のAPI(`UnitManager.PlaceUnit`等)の存在が未確認、退却先の占有・スタック制限・最寄りの城探索が要る。蘇生・撃破時の偉人ポイント・金・スコア・政策ボーナスなど、撃破時の効果は種類が多く数え上げられない。`design.md`で一度書いて却下済み(泥沼化) |
| 即死をやめて「HP1にする」へ(ころね方式) | 撃破ではないので副作用が出ない。ただし能力の性格が変わる。その戦闘では音楽家ポイントが入らないので、ポイントの入れ方は別途要検討。AIに治される可能性もある |
| 確率で戦闘力をX倍(XMLのModifier) | 実際の戦闘で致死ダメージが出るので撃破フローに乗るはず。吸血鬼自身が`MODIFIER_UNIT_ADJUST_COMBAT_STRENGTH`に`Key=COMBAT_STRENGTH_FOR_VAMPIRISM`(ユニットのプロパティ名)を渡して戦闘力を上げており、Luaで立てたプロパティを戦闘力に変換する形は組める(`Ethiopia_SecretSocieties_MODE.xml:896-901`、1484-1490)。**問題点**: (1)戦闘前に判定できないので次の攻撃分を事前に振る必要があり、相手に応じた確率の式が使えない、(2)戦闘予測にボーナスが表示され当たりが見えてしまいゲーム性が変わる、(3)確実に倒せる保証がない。`REQUIREMENT_RANDOM_VALUE_LESS_THAN_OR_EQUAL_TO`(`design.md`に記載)で戦闘時に判定できるかは要件の評価タイミングが未調査 |

## 未解決・試すなら

- 発火順の実機ログ実験: `OnCombatOccurred`/`OnUnitRetreated`/`UnitKilledInCombat`/`UnitDamageChanged`/`UnitRemovedFromMap`/`UnitAddedToMap`にログを仕込み、吸血鬼とフンアフプーを普通に撃破する場面で、発火順と`IsDead`/`IsDelayedDeath`/位置/ダメージを見る。`OnCombatOccurred`の時点で吸血鬼が退却済みかどうかが分かれば、事後に差し込めるかを判断できる
- `Events.UnitOperationStarted`/`UnitCommandStarted`が攻撃解決の前に呼ばれ、そこでプロパティを立てて戦闘に反映できるか
- `REQUIREMENT_RANDOM_VALUE_LESS_THAN_OR_EQUAL_TO`の評価タイミング(戦闘のたびに評価されるか、戦闘予測と実戦闘で結果が食い違わないか)
- `MODIFIER_UNIT_ADJUST_COMBAT_STRENGTH`のユニット固有プロパティを受け取る書式(`Key`以外の引数)

## 参考

- Modding Companion 2.0: `https://docs.google.com/spreadsheets/d/1EiCTOlPx3IkeAmU0xujGEp9k0v9VuCxe95OcrsyWOVs`(`research-mod` Skill 6節)
- 吸血鬼: `DLC/Ethiopia/Data/Ethiopia_SecretSocieties_MODE.xml`(`UNIT_VAMPIRE`は`Combat="20"`・近接、`CanTrain="false"`、`CanEarnExperience="false"`)
- 英雄: `DLC/Babylon/Data/Babylon_Heroes_MODE.xml`(`MODIFIER_HUNAHPU_RESURRECT_KILL`、`UNITCOMMAND_KILL_WEAKER_UNIT`)
- 公式スクリプトの戦闘フック実例: `DLC/PiratesScenario/Scripts/PiratesScenario_StartScript.lua`(`OnCombatOccurred`)
