-- 沙花叉クロヱ 指導者固有能力(Lua実装、2026-09-23)
--
-- 攻撃戦闘時、25%の確率で敵ユニットを即座に撃破する(攻撃時限定。暗殺者は自分から仕掛ける時だけ発動する、
-- 守備時は発動しない、という設計。戦闘力差による補正はしない、素の確率)。
--
-- 戦闘勝利時(攻撃・防御どちらでも)、倒した敵ユニットの戦闘力に応じた大音楽家(Great Musician)ポイントを
-- 獲得する。ゴルゴー(CULTURE_KILLS_TRAIT、MODIFIER_PLAYER_UNITS_ADJUST_POST_COMBAT_YIELD)と同じ「撃破トリガー」の
-- 効果だが、あちらはXML(Modifier)側の実装で攻撃/防御を問わず発動する。GreatPersonPoints版のEffectTypeは
-- 存在しないためLuaで同等の挙動(攻撃側が倒した場合・防御側が反撃で倒した場合の両方)を再現している。
-- 即死効果と違い、こちらは攻撃側限定にしない(2026-09-23、本人確認: 音楽家ポイントは防衛戦闘でも発動する)。
--
-- GetGreatPeoplePoints():ChangePointsTotal(classID, amount)のclassID=8がGreat Musicianであることは
-- FireTunerパネル(Debug/Player.ltp)の"+50 Great Musician Points"アクションで確認した
-- (0=General/1=Admiral/2=Engineer/3=Merchant/4=Prophet/5=Scientist/6=Writer/7=Artist/8=Musicianの並び)。
--
-- 実装方式は`Hololive GAMERS`Mod(戌神ころね「ぶっころね」、攻撃時50%で敵を瀕死=HP1にする)を参考にしたが、
-- 即死効果自体は`SetDamage()`ではなく`UnitManager.Kill(unit, false)`で実装している。ころねの実装は
-- ダメージ調整(SetDamage(99)、あえて殺しきらない)止まりなのでこの問題を踏まない設計だったが、クロヱは
-- 確実に撃破したいので当初`SetDamage(100)`→`SetDamage(MAX_HIT_POINTS)`と試したところ、実機で「撃破音楽家
-- ポイントは発生するのに敵ユニットが盤面に残り続け、次に攻撃すると改めて死んでポイントが二重発火する」
-- 不具合が発覚した(2026-09-23)。`Events.Combat`はこの戦闘の生死判定が確定した後に発火するイベントのようで、
-- 事後に`SetDamage`でダメージ値だけ書き換えても実際の生死判定には反映されないらしいと判断し、DLCシナリオ
-- スクリプト(`AlexanderScenario.lua`等)で実際に使われている`UnitManager.Kill(unit, false)`(ユニットを
-- その場で即座に削除する公式API)に差し替えた。詳細はdocs/design.mdの「沙花叉クロヱ」節を参照。
--
-- ファイル名注意: 他Mod(Hololive GAMERS)と同名の`GameplayScript.lua`にしていたところ、
-- Luaモジュールがファイル名ベースでキャッシュされ後読み込みのMod側に上書きされて一切発動しない事故が
-- 2026-09-23に実機で発覚したため、`SakamataChloeGameplayScript.lua`にリネームして解消した(実機確認済み)。
--
-- 実機での動作確認: `Events.Combat`ハンドラが呼ばれること・25%即死・撃破戦闘力に応じた音楽家ポイント加算は
-- 2026-09-23に確認済み。ただし`UnitManager.Kill`への差し替え後の再確認はまだ(ユニットがその場で正しく
-- 消えるか、二重発火が解消したか)。都市への攻撃時の扱い、防御側分岐(反撃キル)の動作も未検証。
--
-- ワールドフロートテキスト(2026-09-23、UX方針確定): 指導者固有能力は1つのTrait「歌好きの掃除屋」として
-- 見せたいので、「即死能力/音楽家ポイント能力」という内部の2分割を前面に出すテキストにはしない。
-- 即死が発動した時だけ追加で[COLOR_RED]クリティカル！[ENDCOLOR]を出し、音楽家ポイント獲得は
-- (即死経由・通常撃破経由を問わず常に)獲得量を数値で見せる+{1_Num}形式にした。テキストは全て
-- `Locale.Lookup("LOC_...")`経由で多言語対応(Text/ja_JP・Text/en_US)。`[COLOR_RED]`はバニラの
-- ダメージフロートテキスト(`LOC_WORLD_UNIT_DAMAGE_INCREASE_FLOATER`)で実際に使われている記法を踏襲した。
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
