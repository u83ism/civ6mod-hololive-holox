---
name: add-unique-content
description: Civ6 Modで固有ユニット/区域/施設/建造物(UU/UD/UI/UB)を追加する時に使う。「ユニークユニットを追加する」「固有区域を作る」「固有施設・改善を実装する」「固有建造物を実装する」と言われたとき、または`UnitReplaces`/`DistrictReplaces`等の置換要素を新規に書く場面で使う。bootstrap-leaderで指導者が選択画面に出るところまで終わった後に使う。
---

# 固有ユニット・区域・施設・建造物(UU/UD/UI/UB)の実装

一条莉々華Mod(civ6mod-hololive-regloss)で試作・撤回した経緯あり(UU「社員」、労働者UNIT_BUILDER置換を実装→実機確認まで進めたが、下記「UU化する前に」の理由でTraitへの直接Modifierに置き換えて撤回、2026-09-22)。その後、非民生(戦闘/偵察系)ユニットのUU「うに」(斥候UNIT_SCOUT置換、移動力+1のみ、見た目もScoutをそのまま流用、初回生産時のHistoric Moment演出画像も追加)を実装し、実機確認済み(2026-09-22)。UD/UI/UBは依然未検証(civ6wiki.infoの未検証要約しか材料が無いため)なので、それらに着手するときは`docs/civ6-research/unique-content-patterns.md`(civ6wiki.info要約、2017〜2022年執筆、SDKサンプル`LEADER_JASPER_KITTY`/`CIVILIZATION_FELINE`を素材にした写経チュートリアル)を先に読むこと。実装しながら食い違いが見つかったら実機での挙動を優先し、**確認できたパターンをこのSKILL.mdに直接書き足していく**(このSkillは着手後、`make-fallback-portrait`のような実機確認済みの「作る手順」Skillへ育てていく前提)。`bootstrap-leader`/`make-leader-icons`双方とも整合を取ること。

## UU化する前に: 本当にUUが要るか確認する

「既存ユニットに数値ブースト(使用回数+1、コスト削減等)を付けたいだけ」なら、UU化せず`implement-leader-abilities` SKILL.mdの「既存ユニットの数値ブースト」パターン(Traitに直接Modifierを付ける)で済むかを先に検討すること。UU化(`UnitReplaces`)は「新しい効果を持つ別ユニットとして差別化したい」場合にのみ選ぶ。理由は下記「落とし穴」5番目を参照(完全上位互換を狙うと`Improvement_ValidBuildUnits`の再現コストが跳ね上がり、DLC非所持環境で起動不能になるリスクまである)。

## 要点だけ先に(UD/UI/UBは未検証)

UU(ユニット)/UD(区域)/UI(地形改善)/UB(建造物)は全て同じ8手順(性能定義→Trait紐付け→Config登録→テキスト→Property登録→アイコン→Artdef→ビルド)。既存のバニラ要素をコピーして値を差し替えるのが基本で、ゼロから書き起こさない。詳細は`docs/civ6-research/unique-content-patterns.md`。

## UU実装で実機確認済みの落とし穴(2026-09-22、UU「社員」実装時)

いずれも「一見動きそうに見えて、実機でしか気づけない」種類の不具合だったので、次にUUを作るときは着手前に目を通すこと(「こう作りたい場合はどうするか」というユースケース別の実装パターンは次の節にまとめてあるので、そちらと混同しないこと)。

1. **UU専用のTraitTypeを新設すること。文明本体のTraitTypeを使い回すと文明能力の表示が消える。** UnitsテーブルのRowに`TraitType`属性でUUを文明に紐づけるが、ここに文明本体のTrait(Modifier群を持つ既存のCivilizationTrait)をそのまま指定すると、ローディング画面・外交交渉画面のプレイヤー情報パネルから**Civilization Ability(文明能力)の項目自体が丸ごと消える**不具合を実機で確認した。バニラは全UU(`UNIT_GREEK_HOPLITE`等、80件近く実機ファイルで確認)で例外なく`TRAIT_CIVILIZATION_UNIT_<UU名>`という専用の別Traitを新設し、`Types`(`Kind="KIND_TRAIT"`)→`Traits`(`Name`のみ、`Description`は無し)→`CivilizationTraits`(同じCivilizationTypeに文明本体Traitと並べてもう1行追加)の3テーブルに登録している。これに倣うこと。
2. **Config.xmlのPlayerItems登録を忘れない。Units.xml側の実装だけでは選択画面の固有要素一覧に出てこない。** `UnitReplaces`等でゲームプレイ側を実装しても、文明選択画面/ローディング画面の「この文明の固有要素」アイコン一覧には自動的に反映されない。別途`Config.xml`(`.modinfo`の`FrontEndActions`側)に`PlayerItems`テーブルを登録する必要がある。`Domain`列でルールセットごと(`Players:StandardPlayers`/`Players:Expansion1_Players`/`Players:Expansion2_Players`)に行が要る(`Players`テーブルの既存パターンと同じ)。列は`CivilizationType`/`LeaderType`/`Type`(UnitType等)/`Icon`/`Name`/`Description`/`SortIndex`。スキーマ・実例はDLC `GreatBuilders/Data/GreatBuilders_ConfigData_Byzantium.xml`の`PlayerItems`で確認済み。
3. **拡張パック限定のスキーマ拡張列を、Modの依存関係だけを根拠に安易に使わない。** `.modinfo`の`<Dependencies>`がGathering Storm等を要求していても、それは「実際にプレイ中の全ゲームでその拡張のルールが有効」を意味しない(Standard/Rise and Fallルールでもこのモッドはロードされる)。拡張限定のスキーマ拡張列(例: `CanFormMilitaryFormation`、`Expansion2_Schema.sql`由来。`01_GameplaySchema.sql`のBase列かどうかは`Schema/*.sql`のCREATE TABLE文で確認できる)をUnits本体行に含めると、非対応ルールセットで`table Units has no column named ...`のエラーとともにUnitsのINSERT自体が失敗し、`UnitAiInfos`等の外部キー参照が連鎖的に壊れて**ゲームが起動不能になる**。バニラと完全一致させたい誘惑があっても、Base Schemaの列だけで組む方が安全。
4. **`BuildCharges`/`CostProgressionModel`はUnitsテーブルの単純な列で、Modifier/GameEffectは不要。** `CostProgressionModel`を省略するとスキーマ上のデフォルト`NO_COST_PROGRESSION`になり、同じユニットを何体作ってもコストが上がらない(バニラBuilderは`COST_PROGRESSION_PREVIOUS_COPIES`で複数体生産ごとにコストが上昇する挙動を持つ)。
5. **民生ユニット置換UUを「置換元の完全上位互換」にしたいなら、`Improvement_ValidBuildUnits`(ImprovementType×UnitTypeのホワイトリスト)の再現が必須だが、これは`UnitReplaces`では自動継承されず、コストが跳ね上がる。** Builderが作れる改善は`Farm`のような一般改善も含め全て`Improvement_ValidBuildUnits`に明示登録されている(登録が無いUnitTypeは何の改善も作れない)。バニラ+全DLCで50件超あり、内訳は(a)Base game本体(常に安全)、(b)Rise and Fall/Gathering Storm本体限定(`GameCoreInUse`判定でロードされるルールセット依存、Standardだと存在しない)、(c)個別文明DLC限定(そのDLCが無いと`Improvements`テーブルに行自体が存在しない)の3層構造。**1行でも参照先ImprovementTypeが存在しないと`FOREIGN KEY constraint failed`でXML全体の検証が落ち、ゲームが起動不能になる**(2026-09-22実機で発生、Portugal DLC限定の`IMPROVEMENT_ANCIENT_TOWER_DEFENSE`等3件が原因だった)。完全な互換性を保つには(b)を`.modinfo`の`ActionCriteria`(`GameCoreInUse`)で条件分岐し、(c)は依存DLCの所持判定が別途必要になるため実装コストが非常に重い。この重さが原因で、実際に一条コーポレーションの「社員」UU化はTrait直接Modifier方式へ撤回した(「UU化する前に」の項を参照)。
6. **ローディング画面のユニーク要素紹介パネルは、UUの独自説明文(`LOC_UNIT_..._DESCRIPTION`)を一切表示しない。ユニットの`Domain`(LAND/SEA)から機械生成した汎用文("A unique land unit"等、`LOC_LOADING_DOMAIN_LAND`等)で固定表示される。翻訳漏れ・登録ミスではなくFiraxis側のエンジン仕様。** 原因は`Base/Assets/UI/FrontEnd/LoadScreen.lua`の`local m_isTraitsFullDescriptions :boolean = false;`(38行目)というハードコード。この値が、`Base/Assets/UI/Civ6Common.lua`の`GetLeaderUniqueTraits`/`GetCivilizationUniqueTraits`関数内`if m_isTraitsFullDescriptions or useFullDescriptions then description = Locale.Lookup(GameInfo.Units[row.UnitType].Description); end`という分岐(372〜374行目付近)に渡り、`false`固定なので常にelse側の`Locale.Lookup("LOC_LOADING_"..row.Domain)`(汎用文)が使われる。`LoadScreen.lua`側の呼び出し(`GetLeaderUniqueTraits( leaderType )`)も`useFullDescriptions`引数を渡していないため、UU「うに」(移動力+1)実装時に本人が指摘するまで気づかなかった(2026-09-22)。一方、**指導者選択画面(`Base/Assets/UI/FrontEnd/PlayerSetupLogic.lua`)は別ロジックで`PlayerItems`テーブルの`Description`列(=落とし穴2番でConfig.xmlに登録したLOCキー)を直接クエリして表示するため、独自の説明文が正しく反映される**。実際に他Mod文明のローディング画面でも同じ汎用文になることを本人が確認済みで、バニラ含む全文明共通の仕様と確定した。**対応不要**(直すには`LoadScreen.lua`自体をMod側でUI Override=丸ごとファイル差し替えする必要があり、通常のXML/LOCテキストの範囲では不可能)。

⚠️ **UB(ユニーク建造物)は2つの既知の罠がある(いずれも未検証、wiki記載のまま)**:
1. Wiki記載のBuildings/Landmarks artdefサンプルは2017年当時のものであり、その後のアップデートで仕様変更が入ったため現在は動作しない、と著者自身が明記している。Artdefが必要になったら、Wikiのサンプルを写経せずSteam Workshopの実働Modを解析すること(`research-mod` Skillの優先順位2〜3節と同じ結論)
2. SDKサンプル同梱の`BUILDING_LITTER_BOX`(ユニーク建造物)は、これがある都市が陥落する(占領/被占領いずれも)と**Civ6が強制終了する**既知の不具合があり、著者は自作の改変建造物でも同じ事象を確認したと報告している。回避策はモニュメント等の**文明非依存の共通建造物の置換**として実装すること(文明固有のユニーク建造物にしない)

## ユースケース別の実装パターン(2026-09-22、UU「社員」「うに」実装時)

「壊れないためにどう書くか」の落とし穴とは別に、「こう作りたい場合にどう組むか」を作りたいものの性質別にまとめる。近いケースが無いか着手前に確認すること。

### 置換元ユニットの種類で実装コストが大きく変わる

**民生ユニット(Builder/Settler/Trader/Missionary)を置換するUUの公式前例はバニラ・全DLCに一件も存在しない**(2026-09-22、実機ファイル全数検索で確認)。実装自体はスキーマ上可能だが、前例が無い分、置換元に紐づく`TypeTags`(例: `CLASS_LANDCIVILIAN`/`CLASS_BUILDER`)・`UnitAiInfos`(例: `UNITAI_BUILD`)等の補助テーブル行を漏れなく一式コピーする必要がある。さらに「完全上位互換」にしたい場合は上記落とし穴5番の重さが乗る。

**戦闘/偵察系(非民生)ユニットの置換は逆に前例が豊富で、この重さは無い。** 例えば斥候(`UNIT_SCOUT`)を置換するバニラUUは`UNIT_CREE_OKIHTCITAW`(Expansion1、クリーのOkihtcitaw)1件確認済み(2026-09-22)。`Types`(`KIND_UNIT`)→`TypeTags`(置換元と同じ`CLASS_RECON`等)→`Units`本体行(置換元のコピー+差別化したい列だけ変更、`TraitType`に専用Trait)→`UnitAiInfos`(置換元と同じ`AiType`)→`UnitUpgrades`(置換元と同じ`UpgradeUnit`)→`UnitReplaces`(`CivUniqueUnitType`/`ReplacesUnitType`)の流れだけで完結し、`Improvement_ValidBuildUnits`のような外部依存が無い。

### 見た目を置換元とまったく同じにしたい場合

**見た目(3Dモデル・アイコン)を置換元とまったく同じにしたいUU(モデル差し替えをしない)は、専用Artdefを新規に用意しなくても実機で問題なく表示される**(社員UU実装時、UU「うに」で2026-09-22実機確認済み)。Artdefの罠(UB向けの記述、および`docs/civ6-research/unique-content-patterns.md`)は「新しいモデルに差し替えたい」場合の話で、モデルを変えないなら踏まなくてよい(3Dモデルとゲームプレイ上のUnitTypeとの紐付け機構自体は未解明のままだが、結果として置換元のモデルがそのまま出る)。アイコンは`Art/Icons/Icons.xml`の`IconDefinitions`に、置換元アイコンと同じ`Atlas`/`Index`を指す新規行(`Name`だけ新UnitType用に変える)を追加するだけでよい。**`IconTextureAtlases`側の新規登録は不要**(バニラの既存アトラス名、例: ユニット本体`ICON_ATLAS_UNITS`、マップ上の旗`ICON_ATLAS_UNIT_FLAG_SYMBOLS_WHITE`/`_BLACK`、選択パネルの顔`ICON_ATLAS_UNIT_PORTRAITS`をそのまま指せる)。置換元の`Atlas`/`Index`は`Base/Assets/UI/Icons/Icons_Units.xml`・`Icons_UnitFlags.xml`・`Icons_UnitPortraits.xml`をUnitType名でgrepすれば分かる。UU「うに」(斥候置換)でこの方式を実装し、選択画面・アイコン表示とも実機で問題なく動作することを確認した(2026-09-22)。

### UU生産時のHistoric Moment演出画像を追加したい場合

UUを初めて生産すると、バニラでは`MOMENT_UNIT_CREATED_FIRST_UNIQUE`という時代スコア(Historic Moment)ポップアップが自動発火する(UU実装側で追加のModifier等は不要、エンジン側が拾う)。専用イラストを未登録のまま放置すると汎用フォールバック画像になるが、以下で差し替えられる(UU「うに」で2026-09-22実機確認済み)。

- **スキーマ**: `MomentIllustrations`テーブル(`MomentIllustrationType`/`MomentDataType`/`GameDataType`/`Texture`の4列、`GameDataType`は`Types(Type)`への外部キー、`Expansion1_Schema.sql`で確認)に1行追加するだけ。`<Row MomentIllustrationType="MOMENT_ILLUSTRATION_UNIQUE_UNIT" MomentDataType="MOMENT_DATA_UNIT" GameDataType="<UnitType>" Texture="<ファイル名>.dds"/>`。
- **画像規格**: 456×332px、R8G8B8A8_UNORM(非圧縮)、フルミップチェーン。Civ6 SDK Assetsの`pantry/Textures/Expansion1/Moment_UniqueUnit_*.dds`+`.tex`(7件確認、全て同一サイズ・フォーマット)が正規のソース素材そのものなので、新規作成時は`.tex`をテンプレートとしてコピーし名前だけ差し替えればよい(`tools/png2dds/gen-moment-illustration.ts -- <momentIllustrationName> <unitType> <sourceFileName>`、UnitType名はハードコードされていないので他のUUでもそのまま使える)。CivFanaticsフォーラムの経験則(幅350px程度という体感値)よりこちらの実測値を優先すること。
- **アルファは中心ほぼ不透明・四隅完全透明の楕円ビネット**。公式`Moment_UniqueUnit_Cree.dds`の生アルファ値を実測(中心242、四隅0、辺の中点0付近)して確認した。自前実装は`tools/png2dds/moment-illustration-compositing.ts`の`applyEllipticalVignette`(内側半径フラクション0.55前後)。
- **配線・ビルド手順はバッジアイコンと全く同じパイプライン**(新規BLPパッケージのXLP作成→`tools/IconBuild`(共有ModBuddyプロジェクト)にテクスチャ/XLPを追加登録→ModBuddyで実ビルド→生成された`.blp`を本体`Platforms/{Windows,MacOS}/BLPs/UI/`へコピー→本体`.modinfo`の`<Files>`に追加→`tools/png2dds/gen-dep.ts`で`.dep`再生成)。ModBuddyでの実ビルドは自動化できない点を含め、詳細な手順・罠は`make-leader-icons` Skillを参照(ここでは重複させない)。XLPの`m_ClassName`は`UITexture`、`m_PackageName`は自由な新規パス(例: `UI/RegLoss_Moments`)でよく、公式の`UI/PrideMoments`と衝突させる必要はない(`Texture`列の値=BLPエントリ名がグローバルに解決される)。

アイコンの新規作成が必要な場合は`make-leader-icons` Skillを使う。既存アイコンの使い回しで済ませる場合の手順は`docs/civ6-research/unique-content-patterns.md`に書いてある。

**断片情報から仮説を積み上げがちな調査が必要になったら、先に`research-mod` Skillに従って一次情報を洗うこと。**
