# 資源クラス別の産出量ボーナス(実機確認済みパターン)

「所有する資源の数に応じてゴールド等を加算する」系のTraitを作る場合、`MODIFIER_PLAYER_CITIES_ADJUST_RESOURCE_YIELD_BY_COUNT`(エチオピア文明が使用)は資源クラス(ボーナス/戦略/高級)で絞り込めない(SubjectがCity単位でありPlot単位ではないため)。代わりにFiraxis公式の信仰"Religious Idols"と似た構造を使うが、**外側ModifierTypeはReligious Idolsそのまま(`MODIFIER_ALL_CITIES_ATTACH_MODIFIER`)を流用してはいけない**:

```
外側: MODIFIER_PLAYER_CITIES_ATTACH_MODIFIER (Subject=City) が内側のModifierを自国の全都市にのみ付与
内側: MODIFIER_CITY_PLOT_YIELDS_ADJUST_PLOT_YIELD (Subject=Plot)
      + SubjectRequirementSetId で REQUIREMENT_PLOT_IMPROVED_RESOURCE_CLASS_TYPE_MATCHES を使い、
        ResourceClassType引数(RESOURCECLASS_BONUS/STRATEGIC/LUXURY)で絞り込む
        (資源クラス一致+正しい改善が建っていることを1つで判定する。単なるREQUIREMENT_PLOT_RESOURCE_CLASS_TYPE_MATCHESだと
        未改善・未発見のタイルにも一見空き地なのに効果が出てしまうので使わないこと)
```

**罠1(2026-09-20実機バグ報告で発覚・修正済み)**: Religious Idols本体(`Base/Assets/Gameplay/Data/Beliefs.xml`)は外側ModifierTypeに`MODIFIER_ALL_CITIES_ATTACH_MODIFIER`(`CollectionType=COLLECTION_ALL_CITIES`、Base/Assets/Gameplay/Data/Modifiers.xml)を使っている。これは名前に反して**ゲーム内の全プレイヤーの全都市が対象**で、Owner絞り込みは一切暗黙で行われない。信仰ベリーフはそもそも「そのベリーフの宗教が多数派の都市ならどの文明でも効く」のが仕様なので絞り込み無しで正しいが、**文明固有Trait(自国限定であるべき)にそのまま流用すると敵文明の都市にも波及するバグになる**。自国の都市だけに絞るには、代わりに`MODIFIER_PLAYER_CITIES_ATTACH_MODIFIER`(`CollectionType=COLLECTION_PLAYER_CITIES`)を使う。この使い分けは公式データでも確認できる(Toqui/Mapuche文明トレイト、`DLC/Expansion1/Data/Expansion1_Civilizations_Major.xml`がこちらを使用)。

**罠2(同日発覚、2段階で修正)**: `REQUIREMENT_PLOT_RESOURCE_CLASS_TYPE_MATCHES`は資源クラスの一致しか見ておらず、「改善(施設)を建てて開発しないと効果が出ない」ようにしたくても、未改善・未発見のタイル(一見空き地)にも効果が出てしまう。当初は戦略資源限定で`REQUIREMENT_PLOT_RESOURCE_VISIBLE`(公式の`PLOT_HAS_STRATEGIC_MINE_REQUIREMENTS`に準拠、可視性のみ判定)を追加したが、その後「未開発タイルには一切効果を出したくない(施設そのものにボーナスをつけたくもない)」という要望を受けて`REQUIREMENT_PLOT_IMPROVED_RESOURCE_CLASS_TYPE_MATCHES`(資源クラス一致+改善済みを1つで判定、Catherine de Medici指導者固有能力`RESOURCECLASS_LUXURY`・Gathering Storm信仰"Work Ethic"`RESOURCECLASS_STRATEGIC`で実例確認)へ置き換えた。改善済みなら発見済みでもあるため可視性チェックは不要になり削除した(Gathering Stormの`PLOT_HAS_STRATEGIC_IMPROVED_REQUIREMENTS`もこのRequirement単体で構成)。**資源クラスとの一致が前提条件として残るため、無関係な地形に改善を建てただけ(例: 資源なし丘陵+鉱山)では発火しない。**

**要実機確認(2026-09-20時点未検証)**: `REQUIREMENT_PLOT_IMPROVED_RESOURCE_CLASS_TYPE_MATCHES`のデータ上の使用例は2件ともDLC/拡張パック関連ファイルにしかなく、`RESOURCECLASS_BONUS`での使用例も見つかっていない(`RESOURCECLASS_STRATEGIC`/`RESOURCECLASS_LUXURY`のみ確認)。Catherine de Mediciの`.modinfo`は拡張パック無しのロースター(`Players:StandardPlayers`)でも読み込まれる条件になっており、Requirement自体は拡張パック限定ではない可能性が高いが未確定。実機で「拡張パック無しでもエラー無く3クラスとも発動するか」をDatabase.logで確認すること。

**「改善済み」の実機挙動、2パターン確認(2026-09-20)**: 資源タイルの上に何が建っているかで判定が分かれる。
- **都市中心(City Center)の下の資源 → 改善済み扱いにならない**(ボーナス不発火、実機確認済み)。資源タイルに直接都市を建てると資源へのアクセス自体は維持される(Civ6の既知の仕様)が、それとは別に本Requirementの「改善済み」は満たさない
- **区域(District、少なくとも産業区域`DISTRICT_INDUSTRIAL_ZONE`で確認)の下の資源 → 改善済み扱いになる**(ボーナス発火、実機確認済み)

どちらも`Improvement`ではなく`District`という点は同じだが結果が違うため、「`Improvement`オブジェクトの有無」だけでは説明できない(都市中心だけ特別扱いされている可能性が高い)。産業区域以外の区域でも同様かは未検証。カトリーヌ・ド・メディシスの能力も同じRequirementTypeを使うため理屈上は同じ挙動になるはずだが、そちらでの実機確認はしていない。

これは完全にベースゲームの仕組みだけで完結し、拡張パック依存が無い。実例は`XML/Civilizations.xml`(civ6mod-hololive-regloss本体、`TRAIT_CIVILIZATION_REGLOSS_ICHIJOU`)を参照。当初は`XML/Leaders.xml`のLeaderTraitとして実装していたが、2026-09-19にCivilizationTraitへ移設した。

## 姉妹パターン: 特定のImprovementType(資源クラスでなく個別の改善)で絞り込む

「資源クラス」ではなく「特定の改善(Improvement)そのもの」でプロットを絞り込みたい場合は、`REQUIREMENT_PLOT_IMPROVED_RESOURCE_CLASS_TYPE_MATCHES`の代わりに`REQUIREMENT_PLOT_IMPROVEMENT_TYPE_MATCHES`(引数`ImprovementType`)を使う。構造は同じ(`MODIFIER_PLAYER_CITIES_ATTACH_MODIFIER`→`MODIFIER_CITY_PLOT_YIELDS_ADJUST_PLOT_YIELD`、Requirementだけ差し替え)。実例は独占/大企業モード自身(`DLC/KublaiKhan_Vietnam/Data/KublaiKhan_Vietnam_Monopolies_MODE.xml`、`REQUIREMENT_CITY_GROWTH_INDUSTRY`)と`XML/Leaders_Monopolies.xml`(`TRAIT_LEADER_REGLOSS_ICHIJOU_RIRIKA_MONOPOLIES`、「産業」「大企業」改善+2文化力/+2科学力)。

**罠(2026-09-21、本人指摘で発覚・修正済み)**: 独占/大企業モードの「産業」を`DISTRICT_INDUSTRIAL_ZONE`(産業区域、Kind=KIND_DISTRICT)と誤認し、`MODIFIER_PLAYER_DISTRICTS_ADJUST_YIELD_CHANGE`で実装してしまった。実際には「産業」(`IMPROVEMENT_INDUSTRY`)・上位互換の「大企業」(`IMPROVEMENT_CORPORATION`)は**`Kind="KIND_IMPROVEMENT"`の改善**で、同種の高級資源2つに改善(鉱山/採石場/プランテーション等)を作った後、労働者(産業)/大商人(大企業、要「経済学」)で創出する。「産業区域」という語自体がこのMod内で紛らわしいので、独占/大企業モードの「産業」を指す場合は必ず`IMPROVEMENT_INDUSTRY`と明記し「区域」と呼ばないこと。同種の複数instance(1都市に同時に1つしか存在できない)を1つのRequirementSetで一括判定したい場合、産業→大企業のアップグレードでボーナスが途切れないよう`REQUIREMENTSET_TEST_ANY`で両ImprovementTypeを判定するとよい。
