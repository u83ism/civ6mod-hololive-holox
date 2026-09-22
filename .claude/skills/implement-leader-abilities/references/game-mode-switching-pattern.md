# ゲームモードの有無で能力を切り替える(実機確認済みパターン)

`.modinfo`の`ActionCriteria`に`ConfigurationValueMatches`(`Group=Game`/`ConfigurationId=GAMEMODE_XXX`/`Value=1`)を使うと、特定のゲームモードがON時だけ追加XMLを読み込める(2026-09-20実機ファイルで確認、`DLC/KublaiKhan_Vietnam/KublaiKhan_Vietnam.modinfo`の`Monopolies_Mode`クライテリア)。この基準でTraitのName/Description/効果をモードごとに切り替える方法は、公式データで少なくとも2パターン確認できる。**どちらを使うかは「指導者Traitか文明Traitか」ではなく、名前自体が変わるかどうかで選ぶ**:

## パターンA: 名前ごと別のTraitTypeに切り替える(ギルガメシュ/シュメール指導者能力方式)

英雄と伝説モード(`GAMEMODE_HEROES`)ON時、ギルガメシュの指導者固有能力は名前ごと完全に別物になる(`DLC/Babylon/Data/Babylon_Heroes_MODE.xml`、2026-09-20実機ファイルで確認):

```xml
<Types>
	<Row Type="TRAIT_LEADER_GILGAMESH_HEROES" Kind="KIND_TRAIT"/>
</Types>
<Traits>
	<Delete TraitType="TRAIT_LEADER_ADVENTURES_ENKIDU"/>
	<Row TraitType="TRAIT_LEADER_GILGAMESH_HEROES" Name="..." Description="..."/>
</Traits>
<LeaderTraits>
	<Row LeaderType="LEADER_GILGAMESH" TraitType="TRAIT_LEADER_GILGAMESH_HEROES"/>
</LeaderTraits>
```

既定TraitTypeを`Delete`し、別TraitTypeを新規定義して`LeaderTraits`で付け替える。既定行の`Delete`により、紐づく`LeaderTraits`/`TraitModifiers`等は外部キーのカスケードで自動的に削除される想定(実例でも明示的な`LeaderTraits`側の`Delete`は書かれていない)。効果(Modifier)がモードごとに丸ごと変わる/相互排他な場合はこちらが自然(`TraitModifiers`はTraitType単位で紐づくため)。civ6mod-hololive-regloss本体の実例は`XML/Leaders.xml`+`XML/Leaders_Monopolies.xml`(`TRAIT_LEADER_REGLOSS_ICHIJOU_RIRIKA`、独占/大企業モード)を参照。

## パターンB: 同じTraitTypeのまま中身だけ差し替える(シュメール文明能力方式)

蛮族一族モード(`GAMEMODE_BARBARIAN_CLANS`)ON時、シュメールの文明能力「伝説の勇者」(`TRAIT_CIVILIZATION_FIRST_CIVILIZATION`)は名前はそのままDescriptionだけ差し替わる(`DLC/BarbarianClansMode/Data/BarbarianClansMode_GameplayData.xml`、2026-09-20実機ファイルで確認、本人指摘で発見):

```xml
<Traits>
	<Update>
		<Where TraitType="TRAIT_CIVILIZATION_FIRST_CIVILIZATION"/>
		<Set>
			<Description>LOC_TRAIT_CIVILIZATION_FIRST_CIVILIZATION_CLANS_MODE_DESCRIPTION</Description>
		</Set>
	</Update>
</Traits>
```

`<Update><Where/><Set>`はSQLのUPDATE文に相当し、TraitType(≒主キー)は変えずに任意の列(Description、理屈上はNameも)だけ別のLOCキーに差し替えられる。Types/LeaderTraitsの追加やDeleteが不要な分、パターンAより軽量。**名前自体は変えず、説明文や細部の効果だけモードで調整したい場合に向く。**

**使い分けの基準**: 名前が変わるならパターンA、名前が同じで中身だけ変わるならパターンB。civ6mod-hololive-regloss本体の指導者固有能力(モードOFF「推し事お疲れ様でした～」/ON「大天才」)は名前ごと変わるためパターンAを採用(2026-09-20、パターンB案も検討した上でギルガメシュ方式の現状維持を本人が選択)。

## 罠(必須): リーダー選択画面(フロントエンド)はパターンA/Bのどちらも反映されない

パターンA/Bはどちらも`.modinfo`の`ActionCriteria`(`Monopolies_Mode`等)でゲーム内(`InGameActions`)のDBだけを切り替える仕組みで、**ゲーム開始前のリーダー選択画面(ロビー、`FrontEndActions`)はActionCriteriaを評価しない**。選択画面でモードのON/OFFチェックボックスを切り替えても、そこで表示される能力名/説明文は自動では変わらない(2026-09-21、本人が実機で「ギルガメシュは選択画面でモード切替に追従するのに莉々華は追従していない」と気づいて発覚)。

選択画面はActionCriteriaの代わりに`GameModePlayerInfoOverrides`テーブル(`GameModeType`列を持つ)を使うが、**このテーブル単体は一切参照されない**(`Base/Assets/Configuration/Data/Schema/AdditionalTables.sql`のコメント通り"not referenced directly but rather by a 'Query'")。実際のロビー画面ロジック本体(`Base/Assets/UI/FrontEnd/PlayerSetupLogic.lua`の`SyncPlayerOverrides`関数、2026-09-21実機ファイルで確認)を読むと、`Queries`/`QueryCriteria`/`PlayerInfoOverrideQueries`の3テーブルで「このゲームモードがON時にこのSQLを実行する」という登録をしない限り、`GameModePlayerInfoOverrides`の行は一切拾われない。**この3テーブルの登録が無いゲームモードでは、行を正しく書いてもリーダー選択画面には絶対に反映されない(実機で踏んだ罠、2026-09-21)。**

```xml
<GameModePlayerInfoOverrides>
	<Row GameModeType="GAMEMODE_HEROES" Domain="Players:StandardPlayers" CivilizationType="CIVILIZATION_SUMERIA"
	     LeaderType="LEADER_GILGAMESH" LeaderAbilityName="LOC_TRAIT_LEADER_GILGAMESH_HEROES_NAME"
	     LeaderAbilityDescription="LOC_TRAIT_LEADER_GILGAMESH_HEROES_DESCRIPTION"/>
</GameModePlayerInfoOverrides>
<!-- ここから3テーブルが無いと上の行は一切効かない -->
<PlayerInfoOverrideQueries>
	<Row QueryId="HeroesModePlayerInfoOverrides"/>
</PlayerInfoOverrideQueries>
<Queries>
	<Row QueryId="HeroesModePlayerInfoOverrides" SQL="SELECT * FROM GameModePlayerInfoOverrides WHERE GameModeType = 'GAMEMODE_HEROES'"/>
</Queries>
<QueryCriteria>
	<Row QueryId="HeroesModePlayerInfoOverrides" ConfigurationGroup="Game" ConfigurationId="GAMEMODE_HEROES" Operator="Equals" ConfigurationValue="1"/>
</QueryCriteria>
```

`Domain`は`Players:StandardPlayers`/`Players:Expansion1_Players`/`Players:Expansion2_Players`の3ルールセット分が必要(`XML/Config.xml`の既定`<Players>`テーブルと同じ考え方)。文明Trait側(名前は変えずDescriptionだけ、パターンBに相当)は`LeaderAbilityName`/`LeaderAbilityDescription`の代わりに`CivilizationAbilityDescription`を使う(`DLC/BarbarianClansMode/Data/BarbarianClansMode_ConfigData.xml`のシュメール文明能力の実例)。

**Firaxis公式DLCでも3テーブルの登録は各ゲームモードの導入元が個別に行っており、ゲームモード共通の汎用登録は存在しない**(Babylon=`GAMEMODE_HEROES`、BarbarianClansMode=`GAMEMODE_BARBARIAN_CLANS`、Byzantium_Gaul=`GAMEMODE_DRAMATICAGES`、それぞれ自分のConfigDataファイルで自分のモード分だけ登録)。**独占/大企業モード(`GAMEMODE_MONOPOLIES`)は導入元のKublaiKhan_Vietnam DLC自身がこの3テーブルを登録しておらず(2026-09-21確認、Firaxis自身のクビライ・カン/レディ・チュウにも選択画面でのモード切替プレビューが無い)、モードを使う側のMod(このリポジトリ)が自分で3テーブルとも新規登録する必要がある**。QueryIdは他Modと衝突しないよう独自の名前空間で命名すること(このリポジトリでは`ReglossIchijouRirika...`のように文明固有プレフィックスを付けた)。実例は`XML/Config.xml`(`TRAIT_LEADER_REGLOSS_ICHIJOU_RIRIKA_MONOPOLIES`、2026-09-21追加、実機未確認)。
