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
