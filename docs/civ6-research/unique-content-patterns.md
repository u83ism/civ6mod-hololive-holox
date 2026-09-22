# 固有ユニット/区域/施設/建造物チュートリアル要約(civ6wiki.info、未検証)

> このファイルは`.claude/skills/add-unique-content/references/`から移動した。**Skillの行動指示ではなく、civ6wiki.info(2019〜2022年執筆)の未検証な要約**であるため、実機確認済みの行動指示を書く`.claude/skills/`ではなく`docs/civ6-research/`に置く。着手して実機確認できたら、確認済みの事実として`add-unique-content` Skillの本文に書き足すこと。

出典: `https://civ6wiki.info/?MOD/作成方法/新文明・指導者/{UU,UD,UI,UB}`(著者yosxpeee、2019〜2022年執筆、SDKサンプル`LEADER_JASPER_KITTY`/`CIVILIZATION_FELINE`を素材にした写経チュートリアル)。

## 共通パターン: ユニーク要素の追加手順

UU(ユニット)/UD(区域)/UI(地形改善)/UB(建造物)は全て同じ8手順。既存のバニラ要素をコピーして値を差し替えるのが基本で、ゼロから書き起こさない。

1. **性能定義**: 新規xmlに`Types`→`[XxxReplaces]`(何を置換するか)→本体テーブル(`Units`/`Districts`/`Improvements`/`Buildings`)→追加ボーナス系(`Building_YieldChanges`/`Improvement_BonusYieldChanges`等)。近い性能の既存要素をコピーして値だけ変える
2. **文明/指導者への紐付け**: `Types`にTRAIT追加→`[Civilization/Leader]Traits`→`Traits`(Name)。ユニークにするなら必須
3. **文明選択画面/Loading画面表示**: `NewLeader_Config.xml`の`PlayerItems`に1行追加(`Type`/`Name`/`Description`/`Icon`/`SortIndex`)
4. **テキスト**: `NewLeader_ConfigText.xml`に4種(ゲーム内名称/説明/Trait名/Civilopedia本文の`LOC_PEDIA_..._CHAPTER_HISTORY_PARA_1`)
5. Propertyへのファイル登録(`In-Game Actions > UpdateDatabase`)を忘れない
6. **アイコン**: 既存の近い要素のIconDefinitionsをコピーして`Name`だけ書き換える使い回しが手軽。専用アイコンを新規に作る場合は`make-leader-icons` Skillの参考資料のBLPパイプラインが別途必要
7. **見た目(Artdef)**: 3Dモデルを新規に作れない場合、バニラの近い要素のArtdefから該当ブロックを抜き出し`m_Name`だけ書き換えて使い回す。`Mod.Art.xml`の`artConsumers`にArtdefパスを登録(種別で登録箇所が違う: Units→`Units`のみ、Districts→`Landmarks`+`WorldView_Translate`+`StrategicView_Translate`、Improvements→`Improvements`+上記2つ、Buildings→さらに専用`Buildings.artdef`を追加registration)
8. ビルド→動作確認

## 種類別の要点

- **UU(ユニット)**: `TraitType`で紐付け。Flag/Portraitアイコンは256/80/50/38/32/22等サイズ違いに加え、民族差分(Asian/Mediterranean/South American/African)込みで命名規則が細かい(`ICON_[ユニット名]`/`_FOW`/`_WHITE`/`_BLACK`、Portraitは`_PORTRAIT`+`ICON_ETHNICITY_*_..._PORTRAIT`)。既存ユニットの丸ごと置換は`UnitReplaces`(`CivUniqueUnitType`/`ReplacesUnitType`)。置換先の技術レベルとバランスが取れているか確認すること
- **UD(区域)**: `DistrictReplaces`で置換元指定。`RequiresPlacement`/`RequiresPopulation`/`OnePerCity`/`Aqueduct`/`NoAdjacentCity`/`ZOC`/`CaptureRemovesBuildings`等のフラグはバニラ区域の性質を参考にする。**傑作枠のある建造物が建つ区域(劇場広場等)を置換する場合、`FontIcons.xml`のIndex登録を追加しないと、スパイの「傑作を盗む」選択肢が長い文字列のまま壊れる**
- **UI(地形改善)**: `Improvement_YieldChanges`に登録していない産出物には`Improvement_BonusYieldChanges`で追加ボーナスを付けられない。先に該当産出物を`+0`で基礎ボーナスとして明示登録しておく必要がある
- **UB(建造物)**: ⚠️**Wiki記載のBuildings/Landmarks artdefサンプルは2017年(無印発売当初)のものであり、その後のアップデート・DLC追加で仕様変更が入ったため現在は動作しない、と著者自身が明記している。** Artdefを新規に書く必要が出た場合は、Wikiのサンプルをそのまま写経せず、Steam Workshopで公開されている実働の文明/建造物追加Modを解析する方が確実(`research-mod` Skillの優先順位2〜3節と同じ結論)。また、SDKサンプル同梱の`BUILDING_LITTER_BOX`を改変して作る場合、**建物のある都市が陥落するとCiv6が強制終了する不具合**が引き継がれる可能性がある(`add-unique-content` SKILL.md参照)。回避策は文明非依存の共通建造物の置換として実装すること

## 参照元URL一覧(再取得用)

- ユニークユニット/区域/地形改善/建造物: `.../新文明・指導者/UU`,`UD`,`UI`,`UB`
