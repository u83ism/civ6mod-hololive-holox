# 実装メモ(仕組み・実機の罠)

> `docs/design.md`はゲームデザイン(何をなぜそう作るか)に絞り、**どう実装したか・実機で踏んだ罠**はここに書く。ゲーム本体の公式仕様・慣習は`docs/civ6-research/vanilla-conventions.md`。
> 設計判断の背景(なぜその能力にしたか)は design.md の該当節を見ること。

## 沙花叉クロヱ: 指導者固有能力「歌好きの掃除屋」のLua実装

- **Luaで実装する**(`Lua/SakamataChloeGameplayScript.lua`、`GameEvents.OnCombatOccurred`フック)。戌神ころねの「ぶっころね」(`Hololive GAMERS`Mod、攻撃時50%で敵を瀕死=HP1にする、完全Lua実装)を土台にした。(a)クロヱが攻撃側かつ防御側ユニットが死亡した場合(通常撃破/即死効果いずれでも) (b)クロヱが防御側かつ攻撃側ユニットが反撃で死亡した場合、の2パターンを別々に判定する
- **戦闘は`GameEvents.OnCombatOccurred`(ゲーム本体側のイベント)で受ける**(2026-09-28、`Events.Combat`から移行)。`Events.Combat`は演出側のイベントで、マルチプレイでは一部のPCでしか発火しない可能性があり、そこで同期された乱数を引くと以降の乱数がずれる(CivFanaticsでGedemonが指摘)。公式のシナリオスクリプトも戦闘は`GameEvents.OnCombatOccurred`で受けている。(移行のきっかけの一つだった「`Events.Combat`の中で引いた乱数だけ偏る」疑いは、その後のデータでは裏付けられなかった。下記「実機デバッグ記録」参照)。`GameEvents.OnCombatOccurred`はユニットIDしか渡さないので、ユニットをIDから引き、撃破は`IsDead()`/`IsDelayedDeath()`、戦闘力はユニットの定義(`GameInfo.Units`)から取る(公式の`PiratesScenario_StartScript.lua`と同じ形。戦闘で倒れたユニットもこの時点ではまだ引けるので、道連れも扱える)
- **確率判定は`Game.GetRandNum(10000, "HoloX Chloe: Insta-kill Roll")`と万分率の確率を比べて行う(6.25%のような端数が出るため)**(マルチプレイで同期される乱数)。当初は戌神ころねと同じ`math.random`だったが、ゲームプレイ用スクリプトは参加者全員のPCで実行されるため、PCごとに判定が割れて同期が崩れる(公式のシナリオスクリプトは`Game.GetRandNum`を使い、`math.random`はUIにしか使っていない)。マルチプレイで遊ぶ人がいるかもしれないので切り替えた(2026-09-28)
- **大音楽家ポイントもLuaで加算する**(`GetGreatPeoplePoints():ChangePointsTotal(8, amount)`)。元ネタのヴォリンはXML(`EFFECT_ADJUST_GREAT_PEOPLE_POINTS_PER_KILL_BY_DEFEATED_STRENGTH`)で、固定量版の`EFFECT_ADJUST_GREAT_PEOPLE_POINTS_PER_KILL`(ヘタイロイ・近衛兵)もあるが、即死効果は`UnitManager.Kill`で消すため撃破扱いにならずポイントが出ない見込みで、即死分だけLuaが残る二重実装になるため、Luaに一本化した
- **`ChangePointsTotal(classID, amount)`のclassID**: `0`=Great General、`1`=Great Admiral、`2`=Great Engineer、`3`=Great Merchant、`4`=Great Prophet、`5`=Great Scientist、`6`=Great Writer、`7`=Great Artist、`8`=Great Musician(FireTunerパネル`Debug/Player.ltp`の各アクションボタンのLua実装で確認)
- **浮遊テキスト**: 指導者固有能力は1つのTrait「歌好きの掃除屋」として見せたいので、内部の2効果(即死/音楽家ポイント)の分割は前面に出さない。即死が発動した時だけ追加で`[COLOR_RED]クリティカル！[ENDCOLOR]`(バニラのダメージ表示`LOC_WORLD_UNIT_DAMAGE_INCREASE_FLOATER`と同じ`[COLOR_RED]`)を出し、音楽家ポイントは経路を問わず常に獲得量を`+{1_Num}`で見せる。音楽家ポイントの色は、バニラの撃破時偉人ポイント(`LOC_KILL_GREATPERSON_BONUS`)と同じ`[COLOR_FLOAT_FOOD]`。Luaの`AddWorldViewText`は色タグが無いと白になる。テキストは`Locale.Lookup("LOC_...")`経由で多言語対応

即死は`UnitManager.Kill(unit, false)`で行う。ころねと同じ`SetDamage`では実際の生死判定に反映されない(下記「実機デバッグ記録」参照)。

## 固有区域「シャチたちの楽園」の見た目・アイコン

- 見た目・アイコンはウォーターパーク・水族館をそのまま流用する(設計判断は design.md)
  - アイコンは置換元と同じ画像(`XP1_Districts*.dds`・`XP1_DistrictBuildings*.dds`)を指す自前のアトラスを`Art/Icons/Icons.xml`に定義する。公式のコパカバーナのように`IconAliases`で置換元のアイコン名を指す方式は不可: 水族館のアイコン定義(`Expansion1_Icons_District_Buildings.xml`)はどの拡張のフロントエンドでも読み込まれないため、選択画面の固有要素一覧でアイコンが解決できない。選択画面(`PlayerSetupLogic.lua`)は固有要素のアイコン枠を使い回して`SetIcon`するだけなので、解決できないと直前に選んでいた指導者の画像が残る(実機で発生)。画像自体は文明の興亡の`UI/Icons.blp`に入っていて選択画面でも読める
  - 3D表示はartdefが要る。新しいDistrictType/BuildingTypeには置換元の見た目が自動では割り当たらず、公式の固有建造物(電子工場等)もランドマークに個別の定義を持っている。嵐の訪れの`DLC/Expansion2/ArtDefs/*_Shared.artdef`から、ウォーターパークの区域定義(`Districts_Shared`)・ランドマーク(`Landmarks_Shared`)と水族館の建造物定義(`Buildings_Shared`)を丸ごと複製し、名前と水族館への参照だけ差し替えた(`ArtDefs/Districts.artdef`・`Landmarks.artdef`・`Buildings.artdef`)。ランドマークは区域側から参照するので、公式のウォーターパークのランドマークには手を付けていない
  - 施設の段階(観覧車→水族館→水泳施設)と見た目を対応付ける`BuildingChains`の`WaterEntertainment`には、同名要素で区域とシャチの水族館を追記する(同名要素はマージされる。セイレーンの岩礁が灯台を`MaritimeBuildings`に追記しているのと同じ形)
  - artdefは`tools/IconBuild/HoloX_IconBuild.Art.xml`の`Landmarks`・`StrategicView_Sprite`・`WorldView_Translate`・`StrategicView_Translate`に登録し、`gen-dep`で`.dep`を再生成する(登録先はセイレーンの岩礁の`.dep`に倣った)。`gen-dep`は`Art.xml`のプロジェクト名/IDをそのまま写すので、`.dep`の`ID`は本体Modの名前/IDに戻す

## 風真いろは: 実装の記録

- ファイルは`XML/HiddenMountains.xml`(区域本体・隣接ボーナス・林/聖域のタイル産出・文化爆弾)、`XML/HiddenMountainsMoments.xml`(歴史的瞬間の挿絵)、`XML/ConfigHiddenMountains.xml`(選択画面の固有要素)
- **ベトナムDLCのときだけ読み込む**: `.modinfo`のActionCriteriaに、ベトナムDLC自身の読み込み条件(`KublaiKhanVietnam`、DLCの指導者が選べるルールセットのとき真)と同じ判定を写した。フロントエンド(選択画面)は、DLC自身が使う`ModIsEnabled`方式で判定する。歴史的瞬間の挿絵は、`MomentIllustrations`テーブルが拡張パック限定なので、拡張パックのルールセットのときだけ別ファイルで読む
- **見た目・アイコンは保護区のまま**: 3D表示はベトナムDLCの`Districts.artdef`・`Landmarks.artdef`の保護区の定義を複製して名前だけ差し替えた(`ArtDefs/`。シャチたちの楽園と同じ手順)。林・聖域はバニラの建造物のままなので建造物の定義は複製していない。アイコンはシャチたちの楽園と同様に、DLCの保護区と同じ画像を指す自前のアトラスを`Art/Icons/Icons.xml`に定義した
- **建設コストは27**(置換元54の半額。固有区域の慣習、`docs/civ6-research/vanilla-conventions.md`参照)。説明文は「保護区に取ってかわり、より安価に建設できる」
- **保護区の他の定義も写した**: アピールに応じた住宅(`AppealHousingChanges`)、文化爆弾(ゲーム全体のModifierのうち保護区用のもの。UD用に同じ構成を追加)、`StartingBuildings`
- 林・聖域のタイル産出は`Adjacent_AppealYieldChanges`を、未開の秘境の区域種別で、バニラ(保護区)と同じ値で書き直した(条件は変えない)。強化は区域の`Appeal`列を2にして行う。実機で効くかは未確認(README.mdのTODO参照)
- 山の隣接ボーナスは、山の地形5種(`TERRAIN_*_MOUNTAIN`)ごとに生産力の行と食料の行を1本ずつ(計10行、1行に付く産出は1種類)、各+1。火山は山の地形に乗る地物なので含まれる

## 実機デバッグ記録

**2026-09-23、Lua(指導者固有能力)が一切発動しない → 他Modとのファイル名衝突**。`Events.Combat`ハンドラ内の`print()`もリーダー判定前の無条件ゴールド付与も効かず、関数自体が一度も呼ばれていなかった。Modding.logを見ると、`Hololive GAMERS`Mod(戌神ころね)も同じベースファイル名`GameplayScript.lua`を`AddGameplayScripts`で登録していた(パスは違う)。Luaモジュールがファイル名ベースでキャッシュされ、後から読み込まれた同名ファイルにサイレントに上書きされていたと判断し、`Lua/SakamataChloeGameplayScript.lua`にリネーム(`.modinfo`の`AddGameplayScripts`の`id`も変更)して解消を実機確認した。**Luaファイル名は他Modと衝突しない固有名にすること**。

**2026-09-23、即死させたユニットが盤面に残り、次の攻撃で音楽家ポイントが二重に入る → `SetDamage`では撃破にならない**。ログで同じユニット(戦闘力25)への3回目の攻撃が`defender_final_damage=146`(100超、本来あり得ない値)を記録しており、`SetDamage`で撃破扱いにしたはずのユニットが残っていたことの直接の証拠になった。`Events.Combat`は生死判定が確定した後に発火するので、事後にダメージ値だけ書き換えても実際のユニット除去には反映されない。DLCシナリオスクリプト(`AlexanderScenario.lua`等)で使われている`UnitManager.Kill(unit, false)`に差し替え、ユニットがその場で消えること・二重発火しないこと・撃破戦闘力どおりのポイント(斥候=戦闘力10→10ポイント)が入ることを実機確認した。

**2026-09-27〜28、即死(クリティカル)の発生率の調査 → `math.random`をやめ、`GameEvents.OnCombatOccurred`+`Game.GetRandNum`に移行**。一律25%のはずが体感5割出るという報告から、判定ごとに乱数の値をログに出して調べた。

- `Events.Combat`内の`math.random()`は9回で平均0.22・全て0.55以下、0.2969と0.2971のようにほぼ同じ値が組で出た(一様なら平均0.5、9回とも0.55以下になる確率は約0.5%)。他Mod・公式のゲームプレイ用スクリプトに`math.randomseed`は無く、原因は分からないまま
- 比較のため、`math.random()`と`Game.GetRandNum(10000)`を(1)1回の処理で各1000回 (2)ユニットの移動(`GameEvents.OnUnitMoved`)ごとに各1回ずつ500回×3、引いて要約した。どちらも平均0.49〜0.53・0.25未満の割合20〜26%・10区間ほぼ均等で、偏りは無かった
- `Events.Combat`の中でだけ偏る可能性を見るため、全戦闘で各乱数を10回続けて引いた。クロヱ以外の戦闘の1回目の`Game.GetRandNum`は21戦中10回が5000未満で偏りは無く、「戦闘ごとに種が設定し直され1回目が偏る」仮説は裏付けられなかった。一方クロヱの判定の値は(`Events.Combat`時代と`OnCombatOccurred`移行後を合わせて)16回中5000未満が3回・平均約6350とやや高めだが、偶然の範囲も否定できない(z≈1.9)。
- マルチプレイの観点(CivFanaticsのLeeS・Gedemonの指摘): `math.random`はPCの時計で種を決めるのでPCごとに値が割れる。ゲームプレイ用スクリプトは`Game.GetRandNum`(公式シナリオが使う同期された乱数)を使い、UI側のイベント(`Events.*`)から同期された乱数を引かない。これに従い判定を`GameEvents.OnCombatOccurred`+`Game.GetRandNum`に移した
  - 出典: [TerrainBuilder.GetRandomNumber vs Game.GetRandNum and other MP Desync Questions](https://forums.civfanatics.com/threads/terrainbuilder-getrandomnumber-vs-game-getrandnum-and-other-mp-desync-questions.672623/)、[gameplay related lua scripts in multiplayer](https://forums.civfanatics.com/threads/gameplay-related-lua-scripts-in-multiplayer.626600/)

**2026-09-28、宮殿の音楽スロット+6が効いていないように見えた件**。左上の傑作一覧のボタンが出ないことから効いていないと判断したが、このボタンはスロットの有無ではなく「傑作を1つでも持っているか」で表示が決まる(`Base/Assets/UI/LaunchBar.lua`の`RefreshGreatWorks`/`OnGreatWorkCreated`)ので、判断材料にならない。宮殿のスロット数・種類を`GetNumGreatWorkSlots`/`GetGreatWorkSlotType`でログに出す診断を入れた。その後FireTunerで大音楽家を出して傑作(音楽)を置き、宮殿のスロットが元の1つ+音楽6つの計7つあること、傑作(音楽)1つあたり文化力6・観光力6(群れの絆の文化力+2・観光力+50%込み)になることを実機で確認した(2026-09-28)。書き方自体は公式に前例がある(スロットの種類を持たない建物に別の種類を足す: 総督の昇進で円形劇場に宮殿型、大商人メディチで銀行に宮殿型、スンジャタ・ケイタで市場に書物)

---

以下は、設計判断(design.md)と混ざっていた実装の詳細を2026-10-01に移したもの。

## 群れの絆のModifier

- 文化力+2: `MODIFIER_PLAYER_CITIES_ADJUST_GREATWORK_YIELD`(`GreatWorkObjectType=GREATWORKOBJECT_MUSIC`/`YieldType=YIELD_CULTURE`/`YieldChange=2`)。公式前例はコンゴの文明能力ンキシ(`TRAIT_CIVILIZATION_NKISI`の`TRAIT_GREAT_WORK_FAITH_SCULPTURE`等、傑作の種類ごとに産出を加算)
- 観光力: 傑作1つに観光力を固定値で足すEffectは無い(Modding Companionの`Effects`・ゲーム本体XMLで確認。傑作の種類を指定できる観光力のEffectは倍率の`EFFECT_ADJUST_CITY_TOURISM`のみ)。そのため衛星放送と同じ`MODIFIER_PLAYER_CITIES_ADJUST_TOURISM`(`GreatWorkObjectType=GREATWORKOBJECT_MUSIC`/`ScalingFactor=150`)で+50%にする。音楽の傑作は全38件が観光力4なので4×1.5=6で+2と同値、端数も出ない。説明文は「観光力+50%」と書く
- `MODIFIER_PLAYER_CITIES_ADJUST_EXTRA_GREAT_WORK_SLOTS`(`BuildingType=BUILDING_PALACE`/`GreatWorkSlotType=GREATWORKSLOT_MUSIC`/`Amount=6`)。公式前例はコンゴのンキシ(`TRAIT_EXTRA_PALACE_SLOTS`、宮殿に`GREATWORKSLOT_PALACE`を+4)

## シャチたちの楽園(UD)のModifier

- 湖を除外するのは「シャチは湖にいない」から(本人判断)。Civ6の湖は地形上`TERRAIN_COAST`扱いなので、除外は`REQUIREMENT_PLOT_IS_LAKE`のInverseで行う
- 条件は「(沿岸かつ湖でない)or 深海」で、1つのRequirementSetで書くと入れ子(`REQUIREMENT_REQUIREMENTSET_IS_MET`)が要る。入れ子を避けるため、条件を「沿岸かつ湖でない」(`REQUIREMENTSET_TEST_ALL`)と「深海」の2つのRequirementSetに分け、食料/生産力×2条件の計4本のModifierにする。沿岸と深海は排他の地形なので二重に効くことはない。旧群れの絆(ロシア`TRAIT_INCREASED_TUNDRA_*`・インカ`TRAIT_PRODUCTION_MOUNTAIN`と同じ`MODIFIER_PLAYER_ADJUST_PLOT_YIELD`型)ではこの形で2026-09-24に実機確認した(湖が対象外、深海に効く、タイルの産出表示に反映)
- 区域から都市単位で付ける型は、湊あくあの「あくあ港」(`Hololive 2nd Generation`Mod、港の置換UD)が同じ効果を`MODIFIER_CITY_PLOT_YIELDS_ADJUST_PLOT_YIELD`を`DistrictModifiers`に登録して実装している(沿岸/外洋×食料/生産力の4本)。RequirementSetは旧群れの絆のものを流用する

## シャチの水族館(UB)の実装と、UB化しない案の検討

- **音楽スロット+2**(`Building_GreatWorks`に`GREATWORKSLOT_MUSIC`/`NumSlots=2`を1行。ネリッサ・レイヴンクロフトのセイレーンの岩礁(`HoloEN Advent`Mod、灯台置換に音楽スロット1)と同じ書き方)
- **この都市の傑作(音楽)の観光力+150%**(群れの絆の+50%と足して、水族館のある都市で衛星放送と同じ+200%になる。`BuildingModifiers`に`MODIFIER_SINGLE_CITY_ADJUST_TOURISM`、引数`GreatWorkObjectType=GREATWORKOBJECT_MUSIC`/`ScalingFactor=250`。1都市版の公式前例は`CURATOR_DOUBLE_MUSIC_TOURISM`(`ScalingFactor=200`)、`RELIQUARIES_RELIC_TOURISM_MODIFIER`(遺物、`ScalingFactor=300`))。群れの絆込みで傑作(音楽)1つの観光力は4x(1+0.5+1.5)=12、スロット2つ分で24。当初は衛星放送と同じ+200%だったが、群れの絆と足すと+250%で衛星放送を超えるため+150%に下げた(2026-09-28本人判断。水族館+200%・群れの絆と合わせて+250%のときの実測は1つあたり14)。同じ都市の放送センター・遺産の音楽スロットにも効く
- **バニラ効果の維持**: 置き換え施設は新しく定義し直した別の建造物で、元の効果(`BuildingModifiers`・産出・傑作スロット・偉人ポイント)は自動では引き継がれないので、自分で書き直す。バニラ水族館のModifierは`AQUARIUM_SEARESOURCE_SCIENCE`/`AQUARIUM_REEF_SCIENCE`の2本だけで、公式のModifierIdを`BuildingModifiers`にそのまま登録すればよい(セイレーンの岩礁が灯台の`LIGHTHOUSE_TRADE_ROUTE_CAPACITY`を使い回しているのと同じ)。残りは`Buildings`の列値(快適性`Entertainment=1`・`RegionalRange=9`・維持費2・コスト360(嵐の訪れの`Update`後)・解禁`CIVIC_NATURAL_HISTORY`・`PrereqDistrict`)で、XMLなので値を書き写す。`BuildingPrereqs`(観覧車が前提、水泳施設の前提)は`BuildingReplaces`で元の水族館と同じ扱いになる
- **不採用: UB化せずUDだけで済ませる案**。バニラの水族館をそのまま活かしたいという本人の意向から、UDの`DistrictModifiers`から上記2つを足す案も検討した(スロットは`MODIFIER_SINGLE_CITY_ADJUST_EXTRA_GREAT_WORK_SLOTS`で`BuildingType=BUILDING_AQUARIUM`、観光力は`MODIFIER_SINGLE_CITY_ADJUST_TOURISM`。区域から`MODIFIER_SINGLE_CITY_*`を付ける前例は尾丸ポルカの「海のおまる座」)。スロットの前例は大商人ジョヴァンニ・デ・メディチ(区域に付けて本来スロットの無い銀行に傑作スロット2を足す。隠し施設やUBではなく、`MODIFIER_SINGLE_CITY_GRANT_BUILDING_IN_CITY_IGNORE`でバニラの銀行をその場で建てた上で別のModifierでスロットを足す2本立て)だが、スロットを足す時点で銀行が建っているので、後から建つ水族館に効くかは分からない。加えて(1)スロットが水族館のツールチップに出ずUDの説明文でしか伝わらない (2)「水族館のある都市」の条件(`REQUIREMENT_CITY_HAS_BUILDING`)が区域に付けたModifierで正しく判定されるか未確認、のためUB化を選んだ

## 風真いろは: 風真の一族のModifier

- **公式の前例: グランコロンビアの文明能力「愛国軍」(`TRAIT_CIVILIZATION_EJERCITO_PATRIOTA`)**(すべてのユニットの移動力+1)。文明Traitが、タグ`CLASS_ALL_UNITS`(「全ユニット」のタグ)に付くユニット能力`ABILITY_EJERCITO_PATRIOTA_EXTRA_MOVEMENT`を付与し、その能力のModifier`MODIFIER_PLAYER_UNIT_ADJUST_MOVEMENT`(`Amount=1`)が移動力を足す。民間人も対象。DLC専用の型名(`..._GRANCOLOMBIA_MAYA`)で書かれているが、付与の型`MODIFIER_PLAYER_UNITS_GRANT_ABILITY`は本体の`Modifiers.xml`にもあるので、DLCに依存せず同じ形で書けるはず(未確認)。文明Traitに置く形も同じ
- **陸上ユニットに絞る方法**: ゲーム本体定義済みのRequirementSet`UNIT_IS_DOMAIN_LAND`(中身は`REQUIREMENT_UNIT_DOMAIN_MATCHES`=ユニットの領域が陸)を、移動力のModifier`MODIFIER_PLAYER_UNITS_ADJUST_MOVEMENT`に付けた。前例はNubiaScenario DLCの政策`MILITARY_COMMUNICATION_LAND_MOVEMENT`。ユニット能力を付与する愛国軍の形ではなく、Traitから直接付けた。2026-10-01に動作を実機確認した(民間人・宗教ユニットへの効果、海軍・航空に効かないことは未確認)

## 風真いろは: 武者修行のModifier

- **実装**: 型は`MODIFIER_PLAYER_UNITS_ADJUST_UNIT_EXPERIENCE_MODIFIER`(政策「調査」と同じ)。指導者Traitから直接付け、ゲーム本体定義済みのRequirementSet`UNIT_IS_DOMAIN_LAND`で陸上に絞る(ヌビアはユニット能力を付与してから別の型で上げる形だが、そちらにはしなかった)。2026-10-01に動作を実機確認した

## 風真いろは: 固有ユニット「侍」(日本の侍を共有)

- 実装は2行だけ。`XML/KazamaTai.xml`の`CivilizationTraits`に`TRAIT_CIVILIZATION_UNIT_JAPANESE_SAMURAI`を足し(日本と同じTraitを共有する)、`XML/Config.xml`の`PlayerItems`に侍の行を足した(選択画面・ローディング画面の固有要素一覧。Base・Expansion1・Expansion2のPlayers.xmlの日本の行と同じ値を、ルールセットごとに3行)
- 侍のUnits行(`Base/Assets/Gameplay/Data/Units.xml`)は`TraitType="TRAIT_CIVILIZATION_UNIT_JAPANESE_SAMURAI"`を持つので、その文明がTraitを持てば建造できる。Trait・ユニット・置換(メンアットアーム)・アイコン・ユニット能力はすべてゲーム本体(Base)の定義で、このModでは何も定義していない。日本のTraitの行(`Traits`)は名前だけを持ち、効果のModifierは付いていない
- 嵐の訪れでは、侍に`ResourceCost=10`(鉄)が付く(`Expansion2_Units.xml`)。これもゲーム本体の定義なのでそのまま引き継ぐ
- 歴史的瞬間の挿絵は、ゲーム本体が侍用に登録済み(`Expansion1_Moments.xml`)
- **未確認**: 日本以外の文明が、日本のTraitを共有した侍を実際に建造できるか(実機で確認)、選択画面の固有要素に侍が出るか

## 風真いろは: 文明能力の山の効果(嵐の訪れ限定)

- ファイルは`XML/KazamaTaiMountains.xml`。インカの文明能力「ミタ制」の定義(`DLC/Expansion2/Data/Expansion2_Civilizations_Major.xml`)から、棚畑の効果を除いて写した: 山の地形5種ごとの`MODIFIER_PLAYER_ADJUST_TERRAIN_WORKABLE`(引数`Ignore=true`/`TerrainType`)、山岳タイルの生産力+2(`MODIFIER_PLAYER_ADJUST_PLOT_YIELD`、RequirementSet`REQUIREMENTS_PLOT_IS_MOUNTAIN`)、産業時代以降の+1(`REQUIREMENTS_PLOT_IS_MOUNTAIN_LATE`)
- **嵐の訪れのときだけ読み込む**(`.modinfo`の`ActionCriteria``Expansion2`、`LoadOrder`100)。理由: 「山で働けるようにする」のEffect(`EFFECT_ADJUST_PLAYER_TERRAIN_WORK_IMPASSABLE_MODIFIER`)と、それを使うModifierType(`MODIFIER_PLAYER_ADJUST_TERRAIN_WORKABLE`)は、嵐の訪れのデータとゲームコアにしか無い(2026-10-01、Base・Rise and FallのDLLに文字列が無いことを確認)
- RequirementSet(`REQUIREMENTS_PLOT_IS_MOUNTAIN`、`..._LATE`)と、その中のRequirement(`PLOT_IS_MOUNTAIN`、`REQUIRES_ERA_ATLEASTEXPANSION_INDUSTRIAL`)は、嵐の訪れのデータでインカ用に定義済みのものを、そのまま参照する
- **説明文**: 山の効果は嵐の訪れ限定なので、文明能力の説明文を2種類にした。通常は`..._DESCRIPTION`(移動力+1だけ)、嵐の訪れでは`..._EXPANSION2_DESCRIPTION`(移動力+1と山の効果)。ゲーム内は`XML/KazamaTaiMountains.xml`の`Traits`の`<Update>`で差し替え、選択画面は`XML/Config.xml`の`Players:Expansion2_Players`の行だけ`_EXPANSION2_DESCRIPTION`を指す(選択画面は`ActionCriteria`を評価しないため)。山の効果の文はインカの`LOC_TRAIT_CIVILIZATION_GREAT_MOUNTAINS_DESCRIPTION`から棚畑の文を除いてそのまま写した
- 注意: 能力名は「風真の一族」のまま。ミタ制の名前は使わない

## 風真いろは: 固有区域「未開の秘境」の実装の見込みと調べた内容

- **林・聖域のタイル産出**(`Adjacent_AppealYieldChanges`)は`DistrictType`と`BuildingType`(`BUILDING_GROVE`/`BUILDING_SANCTUARY`)をキーにした行の集まり。未開の秘境の区域種別で、バニラ(保護区)と同じ値の行を全部書く(置き換え区域にバニラ保護区の行が自動で適用されるかは未確認なので、書かないと林・聖域の産出が無くなるおそれがある)。施設はバニラのままなので固有建造物にしない
- **山の隣接ボーナス: 生産力+1と食料+1の両方**(本人判断。2026-10-01。火山を含む各種の山に隣接していると、それぞれ+1。一度食料+1に変えて、すぐ生産力に戻し、そのあと両方にした)。ゲーム本体XMLで、火山(`FEATURE_VOLCANO`)は山の地形(草原・平原・砂漠・ツンドラ・雪の5種の`TERRAIN_*_MOUNTAIN`)に乗る地物と確認した。山の地形を条件にすれば火山のタイルも含まれる。キャンパスの山の隣接ボーナス(`Mountains_Science1`〜`5`、`AdjacentTerrain`ごとに1行、`YieldChange=1`/`TilesRequired=1`)が同じ書き方の前例
- **区域に隣接する未改善タイルの食料+1(取り下げ済み)**: 一度、`MODIFIER_CITY_PLOT_YIELDS_ADJUST_PLOT_YIELD`を`DistrictModifiers`に登録して実装し、説明文が長いため外した(コミット`b63d12c`〜`f726d28`で追加・調整)。知見だけ残す: `REQUIREMENT_PLOT_IS_MOUNTAIN`はBase(Standard)のゲームコアのDLLに無く(Rise and Fall・嵐の訪れのDLLにだけある。2026-10-01、DLLの文字列で確認)、山の除外には`REQUIREMENT_PLOT_TERRAIN_TYPE_MATCHES`のInverseを山の地形5種に1つずつ使う。`REQUIREMENT_PLOT_HAS_ANY_IMPROVEMENT`・`REQUIREMENT_PLOT_HAS_ANY_DISTRICT`・`REQUIREMENT_PLOT_TERRAIN_TYPE_MATCHES`・`REQUIREMENT_PLOT_ADJACENT_DISTRICT_TYPE_MATCHES`は3つのルールセットのDLCすべてにある
- **区域のアピール補正(`Districts.Appeal`)は+2**(保護区は+1)。強化はアピール条件の書き換えではなく、この値で行う。アピール条件を書き換えると施設の説明文と食い違い、直すには林・聖域を置換する固有建造物にする必要がある(説明文は建造物の種類ごとに1つで、文明ごとに出し分けられない)
- **アイコン・見た目はすべて保護区そのまま**(本人判断。2026-10-01)。区域・施設ともバニラのアイコンと見た目を流用する。注意: 置換UDの選択画面のアイコンは、シャチたちの楽園で「アイコンの別名(`IconAliases`)では解決できず、置換元と同じ画像を指す自前のアトラスを`Art/Icons/Icons.xml`に定義する」必要があった。保護区のアイコン定義がフロントエンドで読まれるかは実装時に確認する

### 「未改善」の判定(調べた内容)


- **タイル産出のModifierなら判定できる**(公式の前例あり)。`REQUIRES_PLOT_HAS_NO_IMPROVEMENT`は`REQUIREMENT_PLOT_HAS_ANY_IMPROVEMENT`に`Inverse=true`を付けたもので、嵐の訪れの`Expansion2_Civilizations.xml`・`Expansion2_Buildings.xml`・`Expansion1_Governors.xml`で使われている。保護区との隣接は`REQUIREMENT_PLOT_ADJACENT_DISTRICT_TYPE_MATCHES`(引数`DistrictType`/`MinRange`/`MaxRange`、ゲーム本体で11回使用)。これらを`MODIFIER_CITY_PLOT_YIELDS_ADJUST_PLOT_YIELD`(シャチたちの楽園の海タイル産出と同じ型)に載せる
- **区域の隣接ボーナス(`Adjacency_YieldChanges`)では判定できない**。条件に使えるのは地形・地物・自然遺産・特定の改善の種類だけで、「改善が無い」を表す列が無い(地物で数えると、森林を伐採所にしても残ってしまう)
- **保護区専用の`Adjacent_AppealYieldChanges`には`Unimproved`列とアピールの最小値/最大値の列がある**(公式の使用例は保護区のみ)。最小値に負の値を入れてアピール条件を実質外せるかは**未確認**(実機で試すしかない)。外せなくてもModifier方式で同じことができる
- **未確認**: 山などの改善できないタイルが「未改善」として数えられるか、略奪された改善・区域・道路が「改善」に当たるか(仕様からの推測は「山は常に未改善、道路は改善でない」)


- 未決(実装済みの条件付き読み込みとは別に、公式前例は未調査): ベトナムDLC依存の扱い(保護区置換UDは`OrcaParadise.xml`と同様に条件付き読み込みが必要)。保護区を置換元とするUDの公式前例は未調査
