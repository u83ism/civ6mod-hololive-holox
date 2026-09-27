-- 沙花叉クロヱ 指導者固有能力「歌好きの掃除屋」
--
-- (1) 攻撃戦闘時、敵ユニットを確率で即座に倒す(攻撃時限定)。確率は公式の拿捕(シードッグ等)と同じ一次式で、
--     係数だけ半分にしたもの: (攻撃側の戦闘力 - 防御側の戦闘力 + 20) x 1.25% を0〜50%に収める(互角で25%)。
--     戦闘力は補正前の基本値(攻撃側は遠隔戦闘力>砲撃戦闘力>戦闘力の順に持っているもの、防御側は戦闘力)。
--     攻撃側が戦闘で負けて倒れても判定する(道連れ)。
-- (2) 戦闘勝利時(攻撃・防御どちらでも)、倒した敵ユニットの戦闘力と同量の大音楽家ポイントを獲得する。
-- 設計の理由(確率の式・攻撃時限定・Luaに一本化した理由等)はdocs/design.mdの「沙花叉クロヱ」節を参照。
--
-- 実装上の注意:
-- - 戦闘の処理は`GameEvents.OnCombatOccurred`(ゲーム本体側のイベント)で受ける。`Events.Combat`(演出側のイベント)は
--   マルチプレイで一部のPCでしか発火しない可能性があり、そこで同期された乱数を引くと以降の乱数がずれる(CivFanatics、Gedemon)。
--   公式のシナリオスクリプトも戦闘は`GameEvents.OnCombatOccurred`で受けている。
-- - `GameEvents.OnCombatOccurred`はユニットIDしか渡さないので、ユニットをIDから引き、撃破は`IsDead()`/`IsDelayedDeath()`で
--   判定する(公式の`PiratesScenario_StartScript.lua`と同じ)。戦闘で倒れたユニットもこの時点ではまだ引ける。
-- - 即死は`UnitManager.Kill(unit, false)`で行う。ダメージ値を書き換える`SetDamage`では実際の生死判定に反映されず、
--   ユニットが盤面に残って次の攻撃で音楽家ポイントが二重に入る。
-- - 乱数は`math.random`ではなく`Game.GetRandNum(最大値, "理由")`を使う。ゲームプレイ用スクリプトは参加者全員のPCで
--   実行されるため、`math.random`だとPCごとに判定が割れてマルチプレイの同期が崩れる。公式のシナリオスクリプト
--   (黒死病・ウォーマシン等)も同期された`Game.GetRandNum`を使い、`math.random`はUIスクリプトにしか使っていない。
-- - `ChangePointsTotal(classID, amount)`のclassIDは8=Great Musician
--   (0=General/1=Admiral/2=Engineer/3=Merchant/4=Prophet/5=Scientist/6=Writer/7=Artist/8=Musician)。
-- - ファイル名は他Modと衝突しない固有名にする。Luaモジュールはファイル名ベースでキャッシュされるため、
--   `Hololive GAMERS`Modと同名の`GameplayScript.lua`だと後から読み込まれた側に上書きされて一切発動しない。
-- - 浮遊テキスト: 即死発動時のみ`[COLOR_RED]`のクリティカル表示を追加し、音楽家ポイントは経路を問わず
--   獲得量を`[COLOR_FLOAT_FOOD]`(バニラの撃破時偉人ポイントと同じ色)で出す。テキストは`Locale.Lookup`経由。

local NO_PLAYER = -1
local NO_UNIT = -1
local GREAT_MUSICIAN_CLASS_ID = 8

function SakamataChloeIsChloe(playerID)
	local player_config = PlayerConfigurations[playerID]
	return ( player_config ~= nil ) and ( player_config:GetLeaderTypeName() == "LEADER_HOLOX_SAKAMATA_CHLOE" )
end

function SakamataChloeFindUnit(playerID, unitID)
	if ( playerID == NO_PLAYER ) or ( unitID == NO_UNIT ) then return nil end
	return Players[playerID]:GetUnits():FindID(unitID)
end

function SakamataChloeIsUnitDead(unit)
	return unit:IsDead() or unit:IsDelayedDeath()
end

-- 攻撃に使う基本の戦闘力(遠隔ユニットは遠隔戦闘力、攻城ユニットは砲撃戦闘力)
function SakamataChloeAttackStrength(unit)
	local unit_info = GameInfo.Units[unit:GetType()]
	if ( unit_info.RangedCombat > 0 ) then return unit_info.RangedCombat end
	if ( unit_info.Bombard > 0 ) then return unit_info.Bombard end
	return unit_info.Combat
end

function SakamataChloeDefenseStrength(unit)
	return GameInfo.Units[unit:GetType()].Combat
end

function SakamataChloeGrantMusicianPoints(playerID, defeated_strength, x, y)
	Players[playerID]:GetGreatPeoplePoints():ChangePointsTotal( GREAT_MUSICIAN_CLASS_ID, defeated_strength )
	Game.AddWorldViewText(0, Locale.Lookup("LOC_HOLOX_SAKAMATA_CHLOE_MUSICIAN_POINTS_WORLDTEXT", defeated_strength), x, y)
end

function SakamataChloeOnCombatOccurred(attackerPlayerID, attackerUnitID, defenderPlayerID, defenderUnitID, attackerDistrictID, defenderDistrictID)
	local attacking_unit = SakamataChloeFindUnit(attackerPlayerID, attackerUnitID)
	local defending_unit = SakamataChloeFindUnit(defenderPlayerID, defenderUnitID)
	if ( attacking_unit == nil ) or ( defending_unit == nil ) then return end

	-- クロヱが攻撃側の場合: 確率で即座に倒す + 倒したら大音楽家ポイントを獲得
	if ( SakamataChloeIsChloe(attackerPlayerID) ) then
		local x = defending_unit:GetX()
		local y = defending_unit:GetY()
		local defender_strength = SakamataChloeDefenseStrength(defending_unit)
		local defender_dead = SakamataChloeIsUnitDead(defending_unit)

		if ( not defender_dead ) then
			local attacker_strength = SakamataChloeAttackStrength(attacking_unit)
			-- 確率は万分率で持つ(6.25%のような端数が出るため)。拿捕の式 (差+20)x2.5% の係数を半分にしたもの
			local crit_chance = math.max( 0, math.min( 5000, ( attacker_strength - defender_strength + 20 ) * 125 ) )
			local roll = Game.GetRandNum(10000, "HoloX Chloe: Insta-kill Roll")
			if ( roll < crit_chance ) then
				UnitManager.Kill( defending_unit, false )
				defender_dead = true
				Game.AddWorldViewText(0, Locale.Lookup("LOC_HOLOX_SAKAMATA_CHLOE_CRITICAL_WORLDTEXT"), x, y)
			end
		end

		if ( defender_dead ) then
			SakamataChloeGrantMusicianPoints(attackerPlayerID, defender_strength, x, y)
		end
	end

	-- クロヱが防御側の場合: 即死効果は発動しない(攻撃時限定の仕様)が、反撃で敵を倒したら大音楽家ポイントは獲得する
	if ( SakamataChloeIsChloe(defenderPlayerID) ) and ( SakamataChloeIsUnitDead(attacking_unit) ) then
		SakamataChloeGrantMusicianPoints(defenderPlayerID, SakamataChloeAttackStrength(attacking_unit), attacking_unit:GetX(), attacking_unit:GetY())
	end
end
GameEvents.OnCombatOccurred.Add( SakamataChloeOnCombatOccurred )
