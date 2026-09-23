# 未解決: リーダー選択画面の能力アイコン色/パウズメニューの黒表示

> 汎用的な制作手順ではなく、本Mod固有の未解決バグのデバッグログ(`.claude/skills/make-leader-icons/references/icon-blp-pipeline.md`から分離)。次にこの領域を触るセッションは、着手前にこのファイル全体を読み、同じ道を辿り直さないこと。

## 【試して撤回した】白シルエット化(2026-09-19〜20実機検証、最終的にフルカラー1本に戻した)

一時期、文明アイコンを45px以外だけ「白+透過のシルエット」化する実装を入れたが、後述の未解決問題(リーダー選択画面の能力アイコンが不安定)が出たため**最終的に全サイズフルカラー1枚(`ichijou-corporation-logo-circle.png`)に戻した**。現在の`tools/png2dds/gen-icon-sources.ts`はフルカラーのみで、白シルエット化コード(`toWhiteSilhouette`)は削除済み。ただし調査で分かった技術的知見(`SetColor`の着色メカニズム、DDS直接検証の方法、GIMPでの変換手順)は将来別のReGLOSSメンバーで再度必要になる可能性があるため、以下に経緯ごと残す。

### 分かった仕組み(SetColor着色、2026-09-19実機検証)

文明アイコンを「白+透過のシルエット」で作る必要がある**理由**は、ゲーム側UI Luaが実行時に`:SetColor(プレイヤーカラー)`でRGBを掛け合わせて着色するから。素材が既にフルカラーだと二重に色が乗って破綻する(プレイヤーカラーによっては背景に同化してほぼ見えなくなる)。この仕組みはwikiに書かれておらず、Civ6本体の`Base/Assets/UI/Instances/LeaderIcon.lua`と`Instances/CivilizationIcon.lua`を実際に読んで確認した:

```lua
-- LeaderIcon.lua (外交パネル/プレイヤーリスト等で使用)
self.Controls.CivIcon:SetIcon("ICON_"..pPlayerConfig:GetCivilizationTypeName());
...
local backColor, frontColor = UI.GetPlayerColors( playerID ); -- (Primary, Secondary)の順
self.Controls.CivIndicator:SetColor(backColor);   -- 円形の背景をプレイヤーカラーで着色
self.Controls.CivIcon:SetColor(frontColor);        -- アイコン本体をセカンダリカラーで着色
```

`Instances/CivilizationIcon.lua`(ランキング画面・交易画面・エスピオナージ画面等の汎用文明バッジ)、`Menus/InGameTopOptionsMenu.lua`(ESCメニュー上部)も同じ`SetColor(secondaryColor)`パターン。45x45だけは技術・社会制度ツリーで生のまま(着色なし)表示されるため、この45pxだけフルカラーのままにする。

**裏取り**: バニラの`Sid Meier's Civilization VI SDK Assets\Civ6\pantry\Textures\CivAztec22.dds`/`CivAztec32.dds`をDDSバイナリレベルで直接読むと、全不透明ピクセルのRGBが`(255,255,255)`固定でアルファだけが形状を表現していた。`CivAztec45.dds`だけはRGBに実際の色(濃紺系)が入っていた。DDSは128バイトヘッダ+ABGR8生ピクセル(`tools/png2dds/png2dds.ts`のコメント参照)なので、Node.jsで`readFileSync`して128バイト目以降を読むだけで検証できる。

### ハマった実例: フルカラーの円形ロゴ素材を単純に白色化すると破綻する

一条コーポレーションのロゴ(`Art/Source/ichijou-corporation-logo-circle.png`)は、円の内側が最初から**全ピクセル不透明**(アルファは円形マスクのみを表現し、ロゴの形自体はRGBの色コントラストで表現)という作りだった。ここで「既存のアルファを維持したままRGBだけ白に強制する」という素朴な実装(`toWhiteSilhouette`: 全ピクセルのRGBを255に上書き、アルファは無変更)を書くと、円全体が単なる白い(またはプレイヤーカラーで塗られた)円になり、ロゴの意匠が完全に消えた(外交パネルでは黒、文明選択画面では白一色の円として症状が出た)。

**正しい変換**は「アルファチャンネル自体を作り直す」こと: 白背景(このロゴはグラデーション背景+白抜きではなく、白背景+色付きロゴという配色だった。配色の思い込みで判断せず、`civ6wiki.info`のブランドガイドライン画像等の一次資料で実際の配色を確認すること)を透明に、色が付いている部分(ロゴ本体)を不透明にする。GIMP 3.2での手順:

1. レイヤー → 透明部分 → アルファチャンネルの追加
2. 色 → 色域を透明に(Color to Alpha)、対象色を白(#FFFFFF)に指定してOK
   - 白に近いほど透明、彩度が高いほど不透明になる。境界のアンチエイリアスも自動でぼける
3. **元の配色が淡い(白に近い)場合、アルファの最大値が255まで伸びず薄くなることがある**(このロゴは最大90/255だった)。色 → レベル → チャンネルを「アルファ」にして、入力の白側スライダーを実際の最大値まで下げて255まで伸ばす
4. 書き出したRGBの正確さは気にしなくてよい(後段パイプラインの`toWhiteSilhouette`がどのみちRGBを白に上書きする)。**アルファの形だけ**が最終的な見た目を決める

### 検証方法(かき捨てスクリプトの作り方)

手直しした元画像が正しいか確認するには、実際にゲーム内のレイヤー構造(`CivIndicator`にプレイヤーカラーPrimary、`CivIcon`にSecondary、RGB強制白)を模した合成プレビューを作ると一目で分かる。pngjsで読み込み、`alpha/255`をカバレッジとして「255(白) * coverage + backingColor * (1 - coverage)」を各チャンネルで計算し、円形のプレイヤーカラー背景に合成したPNGを書き出して`Read`ツールで見る、というのが最短。透過そのものを見たいだけなら暗い背景に合成するだけでも十分(`Read`ツールは透過PNGを白背景で表示するため、素の透過確認には使えない)。このスクリプトは特定のロゴ専用の彩度ヒューリスティックを含めずに保つこと(将来の他ReGLOSSメンバーの文明アイコンにも使い回せるよう、アルファチャンネルを検証するだけの汎用ツールに留める)。

### 円の外側は数学的に正確な円形マスクでアルファ化する(これは撤回後も有効な知見)

文明アイコンは(白シルエット化していた頃の45px版に限らず、今の全サイズフルカラー版でも)**バニラ/他Modの指導者・文明バッジと並んだときに見た目が揃っている必要がある**(文明選択画面のドロップダウン等、公式文明・他Mod文明のバッジと横に並ぶ)。GIMPで手動マスクした円は縁がガタつきやすく、単体で見ている分には気づかないが、他の綺麗な円形バッジと並べると一目瞭然に「浮いて」見える。指導者ポートレートに使っている`maskToInscribedCircle`(中心からの距離で半径判定、境界は半ピクセルでフェード)を文明アイコン側にも適用して解決した(`gen-icon-sources.ts`の`clipToCircle: true`)。

## 未解決問題: リーダー選択画面の能力アイコン色/パウズメニューの黒表示(2026-09-20時点)

文明アイコン(`ICON_CIVILIZATION_REGLOSS_ICHIJOU`)が、ゲーム側で`SetColor`により着色される場面で症状が変わる。ソース素材の作り方を変えても解決しておらず、**原因未特定のまま**。次にこの領域を触るセッションは、以下の再現条件と切り分け済み事項を先に読んでから調査すること(同じ道を辿り直さないため)。

### 症状(ソース素材のパターンごと)

- **白シルエット版(45px以外を`toWhiteSilhouette`で白+透過化)**: リーダー選択画面の文明能力アイコンとパウズメニューのバッジが、**うちのピンクではなく常にオレンジ/紺色系になる**
- **フルカラー版(全サイズ`ichijou-corporation-logo-circle.png`)**: リーダー選択画面の文明能力アイコンの色が変(フィルターがかかったような発色)。パウズメニューは真っ黒

どちらのパターンでも「外交パネル/プレイヤーリストのバッジ」「文明選択画面のバッジ(45px)」は正常。**リーダー選択画面の能力アイコンとパウズメニューの2箇所だけ**が問題を起こす。

**重要な手がかり**: 白シルエット版で出る「オレンジ/紺色」は、バニラの`Base/Assets/UI/Colors/PlayerColors.xml`に実在する汎用色プール(`Usage="Major"`)の`PLAYERCOLOR_ORANGE`(オレンジ+白)・`PLAYERCOLOR_DARK_BLUE`(紺+白)と一致する。うちの`PlayerColors`エントリ(`LEADER_REGLOSS_ICHIJOU_RIRIKA`、ピンク+白)ではない。**つまりこの2箇所は、そもそもうちの`PlayerColors`エントリを見ておらず、プレイヤー枠に自動割り当てされる汎用色プールから色を取っている**可能性が高い。フルカラー版で見える「フィルターがかかったような色」「黒」も、同じ汎用色による着色(オレンジ/紺をフルカラー画像に掛け合わせた結果、パウズメニューでは暗い色同士の掛け合わせでほぼ黒に見えている)である可能性がある。

**Civ6/Jersey System側の一般的な制限ではなく、本Mod固有の問題と確定**: インストール済みの他Hololive Mod(湊あくあ等)は、この2箇所(パウズメニュー/能力パネル)でもキャラのイメージカラーに近い固定のPrimary/Secondaryで正しく着色されている(2026-09-20、本人による目視確認)。つまり「Jersey System自体が全Modで壊れている」わけではなく、**うちの`PlayerColors`エントリだけが解決に失敗している**。原因不明のまま次に持ち越す場合、Discordのmod制作者コミュニティ等で他の実装者に聞く際もこの前提(他Modは正常、うちだけ異常)で質問すること。

### 切り分け済み(原因ではないと確認できたこと)

- **文明アイコンのサイズ一覧の過不足** ではない(バッジアイコンの正しいサイズ一覧は`.claude/skills/make-leader-icons/references/icon-blp-pipeline.md`参照、12/8サイズが正しい)
- **`PlayerColors`にAlt1〜Alt3(Gathering Stormの「Jersey System」、同じ文明が複数プレイヤーで重複した際の代替色。未設定だと一部UIで色解決が失敗するとされる既知の仕様)を追加しても直らない**。追加自体はGitHub公開されている完成度の高い指導者Mod2本(`KevinLiuxy/Senren-Banka-Murasame-Civilization-6`、`dwughjsd/LandsolYuni_civ6mod`)と比較して構造的な差分なし(どちらもAlt1〜3を設定し、`Config.xml`相当に`PlayerColor`列を明示していない、という同じパターン)
- **Alt1〜3を属性(`<Row Type="..." Alt1PrimaryColor="..."/>`)ではなく子要素(`<Row><Type>...</Type><Alt1PrimaryColor>...</Alt1PrimaryColor></Row>`)で書いても直らない**。DLC本体(`Expansion2_PlayerColors.xml`)や他Modの実例は子要素形式だったため試したが、症状(オレンジ/紺色)は変わらなかった
- **`Config.xml`のPlayersテーブルに`PlayerColor`列を明示追加しても直らない**(このテーブルはフロントエンド選択画面専用で、実ゲーム内のプレイヤーカラー解決とは別経路の可能性がある)
- **Mod競合ではない**: 他のHololive Mod群を全部無効化し、本Mod単体(+依存先のGathering Storm)の新規ゲームでもパウズメニューは黒いまま
- **ゲーム開始直後のタイミング問題でもなさそう**: 他Mod(フルカラーのみの素材)は新規ゲーム開始直後からパウズメニューで正しく表示される(「1パターン固定」=着色されず素材そのままの色で表示されている可能性が高い)ため、うちだけがタイミングで遅延して直る、という仮説は他Modとの比較で弱い
- **アイコン名前解決の失敗ではない**: `UserInterface.log`に`IconManager is unable to find the icon`のようなエラーは一切出ていない。`Database.log`に`[ColorManager] ERROR: UNIQUE constraint failed: Colors.Type`(`COLOR_UNKNOWN`関連)が出るが、`.modinfo`のFrontEnd/InGame両アクションへの`Colors.xml`二重登録は他の`Config`/`Icons`/`Art`アクションとも共通する正常な構成で、このエラー自体もうちの`Colors.xml`の内容とは直接一致しない(原因不明のノイズの可能性が高い)
- **`InGameTopOptionsMenu.lua`(パウズメニュー)のロジック自体は`Base/Assets/UI/Menus/InGameTopOptionsMenu.lua`が実行されている**(Expansion2の`UI/Replacements/Expansion1_InGameTopOptionsMenu.lua`は`CivIcon`/`RefreshIconData`/`PlayerColor`に一切触れていないため上書きされていない)。このコードは`UI.GetPlayerColors(m_pPlayer:GetID())`で色を取得し`Controls.CivIcon:SetColor(m_secondaryColor)`を呼ぶだけの単純な作りで、外交パネル(`LeaderIcon.lua`)と全く同じ関数呼び出しパターンだが、外交パネルは正常でパウズメニューだけ黒くなる。メニューを開くたび(`SetupButtons()`経由)に毎回再計算される作りなので、初回ロード時の一度きりの初期化不良でもない

### 未検証の残った方向性

- **なぜ「Major」汎用色プールが使われるのか**が次に追うべき本丸。`UI.GetPlayerColorValues(info.PlayerColor, info.PlayerColorIndex or 0)`(`PlayerSetupLogic.lua`851行目)や`UI.GetPlayerColors(m_pPlayer:GetID())`(`InGameTopOptionsMenu.lua`)が、うちの`PlayerColors.Type="LEADER_REGLOSS_ICHIJOU_RIRIKA"`エントリを見つけられず、Civ6標準のフォールバック(プレイヤー枠の並び順等でMajor色プールから自動割り当て)に落ちている可能性が高い。一方で全く同じ`UI.GetPlayerColors(playerID)`を使う外交パネル(`LeaderIcon.lua`)は正常にピンクを表示するので、**同じ関数でも呼び出し元によって解決結果が違う**(playerIDの解決タイミングか、Civilizations/Leadersテーブル側の何らかの登録漏れが影響している可能性)
- パウズメニューのLuaに一時的なデバッグ用の上書き(`UI/Replacements/`相当の仕組みで`RefreshIconData`を再定義し、`m_primaryColor`/`m_secondaryColor`の実際の値を`print()`でLua.logに出力する)を仕込み、実際に何が返ってきているかを直接観測する。Civ6のUI Context上書きの仕組み自体をこのリポジトリでまだ使ったことがないため、そこから調べる必要がある
- リーダー選択画面の能力アイコン(`PlayerSetupLogic.lua`849行目、`civAbility.Icon:SetIcon(info.CivilizationIcon)`)は`info.CivilizationAbilityIcon`ではなく`info.CivilizationIcon`(通常の文明バッジ)を見ている、という点は特定済み

### 2026-09-20追記: リーダー選択画面の能力アイコンは「フォールバック割当」ではなく「サイレント失敗+使い回しインスタンスの色残留」の可能性が高い

Sailor Cat's Modding Tutorial(英語ガイド)の内容自体はColors/PlayerColors/Jerseyシステムに一切触れておらず、**この不具合の直接の手がかりにはならなかった**。ただし照合作業のついでに、実機にインストール済みの本体ファイル(`Base/Assets/UI/FrontEnd/PlayerSetupLogic.lua`、`Base/Assets/UI/Colors/PlayerColors.xml`)を直接読んで以下を確認した:

- `Base/Assets/UI/Colors/PlayerColors.xml`のバニラ実データでは、`LEADER_*`の各行は例外なく`<Usage>Unique</Usage>`+`Alt1〜3PrimaryColor/SecondaryColor`を子要素で持つ(本Modの`XML/Colors.xml`と構造が完全一致)。**Usage/Alt1〜3の形式自体は原因ではないとさらに裏付けが取れた**(上記「切り分け済み」の内容を実物データで再確認)
- `PlayerSetupLogic.lua`849〜855行目(リーダー選択画面のツールチップ、`info.CivilizationAbility`がある場合のみ実行される能力バッジ描画部分)の実際のコード:
  ```lua
  civAbility.Icon:SetIcon(info.CivilizationIcon);
  local backColor, frontColor = UI.GetPlayerColorValues(info.PlayerColor, info.PlayerColorIndex or 0);
  if(backColor and frontColor and backColor ~= 0 and frontColor ~= 0) then
      civAbility.Icon:SetColor(frontColor);
      civAbility.IconBG:SetColor(backColor);
  end
  ```
  **`if`の中でしか`SetColor`を呼んでいない**。つまり`UI.GetPlayerColorValues`(エンジン内蔵関数、Luaソース無し)がうちの`LEADER_REGLOSS_ICHIJOU_RIRIKA`の解決に失敗して`nil`/`0`を返した場合、**このコードは何もせず`SetColor`を呼ばずに抜ける**(「Major色プールへの自動フォールバック割当」のような能動的な代替処理はLua側には存在しない)。`civAbility.Icon`/`civAbility.IconBG`は`tooltipControls.CivHeaderIconIM:GetInstance()`(InstanceManagerの使い回しプール)から取得したインスタンスなので、**直前に別の文明のツールチップを表示した際に付いた色が、SetColorされないままそのインスタンスに残留して見えている**可能性が高い。観測された「オレンジ/紺色」は汎用色プールへの積極的な割当結果ではなく、**直前に表示した別リーダー(たまたまオレンジ/紺系の配色だった)の残り香**という解釈の方が、コードの実態と整合する
  - `info.PlayerColor`自体は`row.PlayerColor or leader_type`(`PlayerSetupLogic.lua`527行目、`Config.Players.PlayerColor`列が無ければ`LeaderType`文字列をそのまま使う)なので、**`Config.xml`にPlayerColor列を明示しても・しなくても同じ文字列になる**。既存の「PlayerColor列を明示追加しても直らなかった」という実験結果と矛盾しない(そもそも変わりようがなかった)
- **次の一手はこの仮説の検証**: `UI/Replacements/`相当の仕組みで`PlayerSetupLogic.lua`の該当関数を上書きし、`info.PlayerColor`・`info.PlayerColorIndex`・`backColor`・`frontColor`を`print()`でLua.logに出力する。`backColor`/`frontColor`が`nil`または`0`であれば「サイレント失敗」説が確定し、次は「なぜ`UI.GetPlayerColorValues`(ネイティブ関数)がFrontEnd DBから`LEADER_REGLOSS_ICHIJOU_RIRIKA`行を引けないのか」(FrontEnd用DBとInGame用DBのどちらを参照する関数なのか、`UpdateColors`アクションのタイミング等)を追うのが筋になる

## 2026-09-23追記: 姉妹Mod(civ6mod-hololive-holox、沙花叉クロヱ)でも同一症状を確認、Alt1〜3除去は効果なし

civ6mod-hololive-holox(配色は黒/白、莉々華とは別のPlayerColorsエントリ・別のGUID)でも、**リーダー選択画面の能力アイコン・パウズメニューの両方で「白シルエットがオレンジ/紺色に着色される」症状が寸分違わず再現した**。これは配色もリポジトリも別の2つ目のModで確認できた初めてのケースで、「莉々華個人のPlayerColorsエントリが壊れている」説より「白シルエット方式(または両リポジトリが共有するbootstrap由来の何らかの構造)自体に原因がある」説を補強する材料になる。

**実機にインストール済みの参考Mod(`Hololive 2nd Generation`、湊あくあ等)を調査した新知見**:
- `Data/Colors.sql`を見ると、`PlayerColors`は`Type`・`Usage='Unique'`・`PrimaryColor`・`SecondaryColor`の4列のみで、**Alt1〜Alt3を一切登録していない**(莉々華/クロヱ両方が「パウズメニュー黒対策」として明示登録していたAlt1〜3が、少なくとも湊あくあでは存在しない)
- **検証実験(2026-09-23、クロヱMod)**: `XML/Colors.xml`のPlayerColorsからAlt1〜3を全て削除し、湊あくあと同じ最小構成(`Usage="Unique"`+Primary/Secondaryのみ)にして実機再確認したが、**症状は一切変化しなかった**(能力アイコン・パウズメニューとも引き続きオレンジ/紺のシルエット)。**Alt1〜3の有無はこのバグの原因ではないと確定した**(前述の「切り分け済み」リストに追加してよい)
- 湊あくあの文明アイコンDDS自体が白シルエットかフルカラーかは`.blp`にコンパイル済みのため未確認(`.blp`はFiraxis独自バイナリで直接のピクセル抽出手段が無い、`icon-blp-pipeline.md`のModBuddyはOSSではない節参照)
- **`Hololive 2nd Generation.modinfo`を確認**: `UpdateColors`アクション自体はうちと同じ(`FrontEndActions`/`InGameActions`両方に`<UpdateColors><File>Data/Colors.sql</File></UpdateColors>`)。ファイル形式が生SQL(`INSERT OR REPLACE INTO PlayerColors ...`)かXML(`<PlayerColors><Row>...</Row></PlayerColors>`)かの違いだけで、アクション種別・登録タイミングに差は無い。**SQL/XMLの記法差はこのバグの原因ではないと判断してよい**

### 2026-09-23実験: フルカラー方式に戻して再確認 → 色バグ自体は直らず、ただし原因メカニズムを強く示す新証拠が得られた

`tools/png2dds/gen-icon-sources.ts`の`civilizationSilhouetteSizes`を空にし、文明アイコンを全サイズフルカラー(45pxと同じ黒シャチ)に戻して再ビルド・実機確認した。**症状は直らなかったが、「指導者管理画面」内の3箇所で症状が全て違う見え方をしており、これが原因メカニズムの切り分けに直結する重要な手がかりになった**:

1. **指導者アイコンの真横の文明バッジ**(`PlayerSetupLogic.lua`の`GetPlayerIcons`経由、ドロップダウン一覧の36x36/45pxアイコン): フルカラー版のまま正常表示。この箇所は`if(backColor and frontColor and backColor~=0 and frontColor~=0)`が真でも偽でも、偽の場合は45px版をそのまま(白tintで無着色)表示するフォールバックがあるため、フルカラー化した今は「たまたま正しく見える」(そもそも着色に依存しない表示になっている)可能性が高い
2. **能力紹介パネル内の文明アイコン**(`SetUniqueCivLeaderData`内の`civAbility.Icon`/`civAbility.IconBG`、86行目): **背景色が可変になり、直前に選択していた別の指導者のベースカラーを引き継いだまま**、その上に(tintされていない)黒/白のシャチが乗って見える、という報告を得た。これは`docs`91行目で立てた仮説「`if`ブロックがスキップされ`SetColor`が一切呼ばれないため、`CivHeaderIconIM`の使い回しインスタンスに残った前回表示分の色がそのまま見えている」を**そのまま裏付ける観測結果**(コード読解による仮説が、これで実機観測とも一致した)。「オレンジ/紺色」という具体的な色は汎用色プールへの積極的割当ではなく、**たまたま直前に表示had他の指導者(オレンジ/紺系の配色)の残り香**、という解釈が確定的になった
3. **ゲーム中(実プレイ画面)の文明アイコン**: フルカラー化後も**引き続きオレンジ地に紺のまま**。上記2と違って「直前に選んだ指導者次第で変わる」ような可変性は無く、常に同じ配色になる。ゲーム中のこの箇所は指導者選択画面とは別のUIコード(場面によって`InGameTopOptionsMenu.lua`等)が担当しており、**そちらは常に同じ「基準となる別の何か」(バニラの汎用文明バッジのデフォルト色、あるいは常に最初に初期化される何らかの固定インスタンス)を参照しているため、毎回同じオレンジ/紺に落ち着いている**、という解釈が2・3の対比から浮かび上がる

**結論**: フルカラー化は色バグそのものを解決しなかった。**アイコンのピクセル形式(白シルエットかフルカラーか)はこのバグの本質的な原因ではなく**、`UI.GetPlayerColorValues`(または同系のネイティブ関数)がうちのMod由来の`LEADER_*`エントリを解決できていないこと自体が根本原因だと、以前より強く裏付けられた。フルカラー化は「着色に失敗した時に何が見えるか」を可視化しやすくした点で有益な実験だったが、修正そのものには至っていない。アイコンのピクセル形式(フルカラー/白シルエットのどちらに戻すか)は見た目の好み・パウズメニュー黒化リスクとのトレードオフの問題であり、バグの解決とは独立した判断でよい

### 2026-09-23: Luaフックで直接観測、根本原因をほぼ確定(`Usage="Major"`汎用プールへのフォールバック割当と数値レベルで一致)

`Lua/HoloXColorDebug.lua`(`AddUserInterfaces id="HoloXColorDebug"`、`Context=InGame`、`Events.LoadScreenClose`で発火)を追加し、新規ゲーム開始直後に`UI.GetPlayerColors(playerID)`と`UI.GetPlayerColorValues(leaderType, 0〜3)`の戻り値を直接`Lua.log`へ出力した。結果:

```
UI.GetPlayerColors( 0 ) ok=true backColor=-15564289 frontColor=-15198184
leaderType= LEADER_HOLOX_SAKAMATA_CHLOE
UI.GetPlayerColorValues( LEADER_HOLOX_SAKAMATA_CHLOE , 0 ) ok=true backColor=nil frontColor=nil
UI.GetPlayerColorValues( LEADER_HOLOX_SAKAMATA_CHLOE , 1 ) ok=true backColor=nil frontColor=nil
UI.GetPlayerColorValues( LEADER_HOLOX_SAKAMATA_CHLOE , 2 ) ok=true backColor=nil frontColor=nil
UI.GetPlayerColorValues( LEADER_HOLOX_SAKAMATA_CHLOE , 3 ) ok=true backColor=nil frontColor=nil
```

`backColor`/`frontColor`の符号付き32bit整数をABGR8のバイト列(LSBから)に分解すると、`backColor=-15564289`→RGB`(255,129,18)`、`frontColor=-15198184`→RGB`(24,24,24)`になる。この2色をバニラの`Base/Assets/UI/Colors/PlayerStandardColors.xml`/`PlayerColors.xml`と照合したところ、**`COLOR_STANDARD_ORANGE_MD`(255,129,18)・`COLOR_STANDARD_WHITE_DK`(24,24,24)の組み合わせは、`PlayerColors.xml`の`PLAYERCOLOR_ORANGE`(`Usage="Major"`の汎用プール色)そのものと完全一致**した。

**これでほぼ確定した根本原因**:
- `UI.GetPlayerColorValues(leaderType, index)`(リーダー選択画面の能力アイコンが使う関数)は、`index`を0〜3のどれにしても一貫して`nil`を返す。**うちの`Type="LEADER_HOLOX_SAKAMATA_CHLOE"`・`Usage="Unique"`行は、この関数からは一切見つかっていない**
- `UI.GetPlayerColors(playerID)`(パウズメニュー・外交パネル・ゲーム中の文明バッジが使う関数)は`nil`を返さないが、**うちの`Usage="Unique"`行を使わず、`Usage="Major"`の汎用プールから`PLAYERCOLOR_ORANGE`を機械的に割り当てて返している**。これは「プレイヤー固有色が見つからなかった時にゲームが行う正規のフォールバック処理」がそのまま起きている、という解釈が数値的に裏付けられた
- 2つの関数は「見つからない場合の挙動」が違う(片方は正直に`nil`、もう片方は汎用色に自動フォールバック)だけで、**どちらも根っこは同じ: エンジンが`LEADER_HOLOX_SAKAMATA_CHLOE`用の`Usage="Unique"`な`PlayerColors`行を、実行時に一切解決できていない**という一点に収斂する

**まだ未確定なこと(次に持ち越す)**: なぜ`Usage="Unique"`行が実行時に見つからないのか、という一段深い原因はまだ特定できていない。`XML/Colors.xml`のタグ形式自体は公式データ(`PlayerColors.xml`の`LEADER_GILGAMESH`行等)と一致しており構文上の誤りは見当たらない。可能性としては、(a) `UpdateColors`アクションで読み込まれるDBコンテキストと、`UI.GetPlayerColors`/`GetPlayerColorValues`が実際にクエリしているDBコンテキストが何らかの理由でズレている、(b) `PlayerColors`テーブルへのInsert自体は成功しているが、何らかの一意性制約/型変換でうちの行だけが除外されている、(c) `LeaderType`文字列とゲームが内部的に紐づけるプレイヤーの色解決キーとの間に、Config.xml側では見えない別の対応付けが必要、等が考えられるが、いずれも未検証。次にここを触るセッションは、FireTunerの汎用Luaコンソール(`bootstrap-leader/references/firetuner.md`参照、ただし`UI.*`はUI Lua VM限定でFireTuner=Gameplay Lua VMからは呼べない可能性が高い点に注意)や、`DB.Query`相当のAPIで`PlayerColors`テーブルの実行時の中身を直接覗く方法を探ることを推奨する

## 2026-09-23: 解決。原因は`UpdateColors`にXMLファイルを渡していたこと自体だった(SQLファイルに変えたら直った)

**修正内容**: `XML/Colors.xml`(`<Colors><Row.../></Colors>`/`<PlayerColors><Row>...</Row></PlayerColors>`形式)をやめ、`XML/Colors.sql`(湊あくあの`Data/Colors.sql`と全く同じ`INSERT OR REPLACE INTO Colors/PlayerColors (...) VALUES (...)`形式)に置き換え、`.modinfo`の`UpdateColors`(`FrontEndActions`/`InGameActions`両方)が読むファイルをこちらに差し替えた。**これだけで、外交交渉画面・パウズメニュー・リーダー選択画面の能力アイコン・ゲーム中の文明アイコンの全箇所で、うちの配色(黒/白)が正しく反映されるようになったことを実機確認した(2026-09-23)**。「黒地に黒/白のシャチアイコンで見づらい」という新たな感想が出たが、これは色解決自体が直った上での、シャチ配色(黒メイン)そのものの視認性の問題であり、今回のバグとは別問題(必要なら文明アイコンの配色や向きを見直す、程度の話)。

**確定した根本原因**: `UpdateColors`アクションが読み込むファイルが**XML形式かSQL形式かによって、実行時の`PlayerColors`解決結果が変わる**。XML(`<PlayerColors><Row>...`)で登録した場合、`Modding.log`にエラーは出ずファイル自体は読み込まれるものの、`UI.GetPlayerColorValues`/`UI.GetPlayerColors`からは実質的に見えない状態になり、`Usage="Major"`の汎用プールへフォールバックしていた。SQL(`INSERT OR REPLACE INTO ...`)で全く同じ内容を登録すると正しく解決される。**XML版の`UpdateColors`パーサーに何らかの不具合がある(またはXML版とSQL版とでロードされるタイミング/DBコンテキストが異なる)と推測されるが、Firaxis側の内部実装の話であり、これ以上の深掘りはユーザースクリプトからは難しい。実用上の結論としては「`UpdateColors`アクションには常にSQLファイルを渡す、XMLは使わない」で確定してよい**

**教訓**: `Colors`/`PlayerColors`テーブルは他の大半のテーブル(`UpdateDatabase`で読むCivilizations/Leaders等)と違い、専用の`UpdateColors`アクションを経由する。他のテーブルではXML/SQLどちらでも問題なく動くことを確認済みなので、**「うちのMod全体がXML経由で壊れている」わけではなく、`UpdateColors`アクション特有の問題**という点に注意(汎化して他のUpdateDatabase系アクションまでSQLに書き換える必要はない)

**civ6mod-hololive-regloss側への示唆**: 莉々華Modの`XML/Colors.xml`も同じXML形式で登録されており、この投稿冒頭からの症状(白シルエット版のオレンジ/紺色化等)は同一原因の可能性が高い。`Data/Colors.sql`形式への切り替えで同様に直る見込みが高いので、次にregloss側を触るセッションはこの節を読んでから対応すること

**後片付け**: 診断用に追加した`Lua/HoloXColorDebug.lua`/`.xml`(`AddUserInterfaces id="HoloXColorDebug"`)は目的を終えたため削除してよい。`XML/Colors.xml`(旧XML版)は`.modinfo`から参照されなくなったが、経緯を残す観点で当面残置している
