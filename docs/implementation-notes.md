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
- 林・聖域のタイル産出は`Adjacent_AppealYieldChanges`を、山の秘境の区域種別で書き直した。アピール1以下の帯の最小値は`-100`、アピール2以上の帯の最大値は`100`(住宅の`AppealHousingChanges`が同じ値を使っている)。実機で効くかは未確認(README.mdのTODO参照)
- 山の隣接ボーナスは、山の地形5種(`TERRAIN_*_MOUNTAIN`)ごとに1行、生産力+1。火山は山の地形に乗る地物なので含まれる

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
