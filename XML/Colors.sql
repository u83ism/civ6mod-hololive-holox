-- 2026-09-23実験: XML/Colors.xmlのPlayerColors登録が実行時に解決できない
-- (docs/civ6-icon-color-bug-investigation.md参照、UI.GetPlayerColorValuesが常にnil、
-- UI.GetPlayerColorsはUsage="Major"の汎用プールにフォールバックすると実機ログで確定)問題の
-- 切り分けとして、実機で正しく着色されているHololive公式Mod(Hololive 2nd Generation、
-- Data/Colors.sql)と全く同じファイル形式(生SQL、XMLではない)で登録し直す。
-- シャチ配色(黒/白、2026-09-23本人確認)。
-- 2026-09-23: 文明アイコンをシルエット化(目・腹のハイライトを穴として背景円のプライマリ色を
-- 透かす手法)するにあたり、プライマリ/セカンダリを入れ替えた(プライマリ=白、セカンダリ=黒)。
-- 穴から覗く色=プライマリ、シルエット本体=セカンダリなので、実際のシャチ配色(黒body+白ぶち)に
-- 合わせるにはこの組み合わせにする必要がある。
INSERT OR REPLACE INTO Colors
		(Type, Color)
	VALUES
		('COLOR_PLAYER_HOLOX_SAKAMATA_CHLOE_PRIMARY', '255,255,255,255'),
		('COLOR_PLAYER_HOLOX_SAKAMATA_CHLOE_SECONDARY', '26,26,26,255');

INSERT OR REPLACE INTO PlayerColors
		(Type, Usage, PrimaryColor, SecondaryColor)
	VALUES
		('LEADER_HOLOX_SAKAMATA_CHLOE', 'Unique', 'COLOR_PLAYER_HOLOX_SAKAMATA_CHLOE_PRIMARY', 'COLOR_PLAYER_HOLOX_SAKAMATA_CHLOE_SECONDARY');
