-- 沙花叉クロヱ 指導者固有能力「歌好きの掃除屋」
--
-- (1) 攻撃戦闘時、25%の確率で敵ユニットを即座に撃破する(攻撃時限定、戦闘力差による補正なし)。
-- (2) 戦闘勝利時(攻撃・防御どちらでも)、倒した敵ユニットの戦闘力と同量の大音楽家ポイントを獲得する。
-- 設計の理由(確率・攻撃時限定・Luaに一本化した理由等)はdocs/design.mdの「沙花叉クロヱ」節を参照。
--
-- 実装上の注意:
-- - 即死は`UnitManager.Kill(unit, false)`で行う。`Events.Combat`は生死判定の確定後に発火するため、
--   `SetDamage`でダメージ値を書き換えてもユニットが盤面に残り、次の攻撃で音楽家ポイントが二重に入る。
-- - `ChangePointsTotal(classID, amount)`のclassIDは8=Great Musician
--   (0=General/1=Admiral/2=Engineer/3=Merchant/4=Prophet/5=Scientist/6=Writer/7=Artist/8=Musician)。
-- - ファイル名は他Modと衝突しない固有名にする。Luaモジュールはファイル名ベースでキャッシュされるため、
--   `Hololive GAMERS`Modと同名の`GameplayScript.lua`だと後から読み込まれた側に上書きされて一切発動しない。
-- - 浮遊テキスト: 即死発動時のみ`[COLOR_RED]`のクリティカル表示を追加し、音楽家ポイントは経路を問わず
--   獲得量を`[COLOR_FLOAT_FOOD]`(バニラの撃破時偉人ポイントと同じ色)で出す。テキストは`Locale.Lookup`経由。
function SakamataChloeCombatHandler(CombatResult)
	local attacker = CombatResult[CombatResultParameters.ATTACKER]
	local defender = CombatResult[CombatResultParameters.DEFENDER]
	local attacker_id = attacker[CombatResultParameters.ID]
	local defender_id = defender[CombatResultParameters.ID]
	local location = CombatResult[CombatResultParameters.LOCATION]

	local attacker_config = PlayerConfigurations[attacker_id.player]
	local is_chloe_attacking = ( attacker_config ~= nil )
		and ( attacker_config:GetLeaderTypeName() == "LEADER_HOLOX_SAKAMATA_CHLOE" )

	-- クロヱが攻撃側の場合: 25%の確率で即座に撃破 + 撃破時に大音楽家ポイントを獲得
	if ( is_chloe_attacking ) and ( defender_id.type == ComponentType.UNIT ) then
		local defender_final_damage = defender[CombatResultParameters.FINAL_DAMAGE_TO]
		local defender_combat_strength = defender[CombatResultParameters.COMBAT_STRENGTH]
		local defender_max_hp = defender[CombatResultParameters.MAX_HIT_POINTS]
		local defender_dead = ( defender_final_damage >= defender_max_hp )

		local insta_kill_proc = false
		if ( not defender_dead ) then
			local probability = 0.25
			if ( math.random() <= probability ) then
				local defender_unit = UnitManager.GetUnit(defender_id.player, defender_id.id)
				UnitManager.Kill( defender_unit, false )
				defender_dead = true
				insta_kill_proc = true
			end
		end

		if ( defender_dead ) then
			local musician_points = math.floor(defender_combat_strength)
			Players[attacker_id.player]:GetGreatPeoplePoints():ChangePointsTotal( 8, musician_points )
			if ( insta_kill_proc ) then
				Game.AddWorldViewText(0, Locale.Lookup("LOC_HOLOX_SAKAMATA_CHLOE_CRITICAL_WORLDTEXT"), location.x, location.y)
			end
			Game.AddWorldViewText(0, Locale.Lookup("LOC_HOLOX_SAKAMATA_CHLOE_MUSICIAN_POINTS_WORLDTEXT", musician_points), location.x, location.y)
		end
	end

	-- クロヱが防御側の場合: 即死効果は発動しない(攻撃時限定の仕様)が、反撃で敵を倒したら大音楽家ポイントは獲得する
	if ( defender_id.type == ComponentType.UNIT ) then
		local defender_config = PlayerConfigurations[defender_id.player]
		local is_chloe_defending = ( defender_config ~= nil )
			and ( defender_config:GetLeaderTypeName() == "LEADER_HOLOX_SAKAMATA_CHLOE" )

		if ( is_chloe_defending ) and ( attacker_id.type == ComponentType.UNIT ) then
			local attacker_final_damage = attacker[CombatResultParameters.FINAL_DAMAGE_TO]
			local attacker_max_hp = attacker[CombatResultParameters.MAX_HIT_POINTS]
			if ( attacker_final_damage >= attacker_max_hp ) then
				local attacker_combat_strength = attacker[CombatResultParameters.COMBAT_STRENGTH]
				local musician_points = math.floor(attacker_combat_strength)
				Players[defender_id.player]:GetGreatPeoplePoints():ChangePointsTotal( 8, musician_points )
				Game.AddWorldViewText(0, Locale.Lookup("LOC_HOLOX_SAKAMATA_CHLOE_MUSICIAN_POINTS_WORLDTEXT", musician_points), location.x, location.y)
			end
		end
	end
end
Events.Combat.Add( SakamataChloeCombatHandler )
