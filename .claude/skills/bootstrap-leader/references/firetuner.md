# FireTuner(実機で稼働中のゲームをLive操作するデバッグツール)

出典: `https://brokenhumanoid.oops.jp/public/mdwiki/#!FireTuner.md`(著者yosxpeee)の要約に、このリポジトリで実機確認した具体的なパス・設定値を追記したもの。`research-mod` Skillの優先順位に従い、都度取得し直す代わりにここへ要約を置く。

## これは何か

Civ6 SDKに同梱されている開発者向けツール。稼働中のCiv6にLive接続し、文明のゴールド付与・テクノロジー強制解禁・都市への生産力注入・外交状態の確認/操作などをその場で行える。`Modding.log`/`Database.log`(`bootstrap-leader` Skill5節)が「後から読むログ」なのに対し、FireTunerは「今動いているゲームの状態を直接いじる」ツールなので、Trait/Modifierの効果やAIの反応(Opinion/Agenda等)をログに出る前にその場で確認・誘発したいときに向いている。実績解除には使えない(開発者ツール扱いのため)。

## 有効化(初回のみ)

デフォルトでは無効。`%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VI\AppOptions.txt`の`[Debug]`セクションに以下がある(実機確認済み、2026-09-20時点でこのマシンではデフォルト`0`だった):

```
[Debug]
;Enable FireTuner.
EnableTuner 0
```

`EnableTuner 1`に書き換えてCiv6を完全終了→再起動する(`bootstrap-leader` Skill5節の「変更を加えたら必ず完全終了→再起動」と同じ注意)。すぐ下に`EnableDebugMenu 0`(ゲーム内デバッグメニュー)もあるが、これは別機能で今回は未検証・未使用。

## 起動方法

- 本体: `Sid Meier's Civilization VI SDK\FireTuner\FireTuner2.exe`(実機確認済み、Steam版SDKインストール時にこのパスに存在する)
- または ModBuddyの`TOOLS → Launch FireTuner`から
- ゲーム本体とFireTunerはどちらを先に起動してもよい

## パネルの開き方

起動しただけでは何も表示されない。`Sid Meier's Civilization VI\Debug\`フォルダ(ゲーム本体のインストールフォルダ直下、SDKではない)に`.ltp`というプリセットパネルファイルが並んでいるので、FireTunerの`File → Open Panel`から目的のものを開く。実機で確認した主な`.ltp`一覧(抜粋、いずれも実在ファイル):

- `Players.ltp` / `Player.ltp` — 文明単位の操作。テクノロジー/社会制度の強制解禁、ゴールド等リソースの付与
- `Diplomacy.ltp` — 外交状態の確認・操作。AIの好み/嫌い(Agenda由来のOpinion)や戦争状態がらみのTrait/Modifierを検証したいときはここが本命
- `City.ltp` — 都市への生産力注入(遺産の強制建造等)
- `Requirements.ltp` / `Modifiers.ltp` — Requirement/Modifierまわりの内部状態を覗ける可能性がある(未検証、名前から推測)
- 他多数(`AI.ltp`/`Unit.ltp`/`Map.ltp`/`WorldBuilder.ltp`等、用途別に多数存在する)

## Luaベースである点の補足

パネルの中身はLuaスクリプトで書かれている。つまりModのLua実装(`GameplayScripts/`)で使えるAPI呼び出しをそのまま踏襲している。凝ったLua実装をする際、動いているパネルのLuaコードは実例として参考になる可能性がある(未検証、このリポジトリではまだLua実装に着手していない)。

## 既知の制約: 「未接触の文明と強制的に出会う」手段は無い(2026-09-20、パネルの中身を直接読んで確認)

- `Diplomacy.ltp`のプレイヤー一覧(Score/At War等)は`playerDiplomacy:HasMet(i)`が`true`の相手しかリストに出さない実装になっている。つまり**まだ出会っていない文明はこのパネルの選択肢に出てこず、Visibility操作等も適用できない**
- `Map.ltp`の「Reveal All」は`PlayersVisibility:ChangeVisibilityCount()`で霧を晴らすだけで、外交上の接触判定(HasMet)は一切呼んでいない。マップが見えても「出会った」扱いにはならない可能性が高い(未検証だが呼び出しコード上そう読める)
- `Unit.ltp`にテレポート/座標指定系のアクションは無い(全アクション名を確認済み)

上記からFireTunerの標準パネルだけでは「別大陸のAIと今すぐ接触したい」を解決できない。現実的な代替:
1. 実際にユニット(船・偵察ユニット等)をその方向へ進める。`Map.ltp`の「Reveal All」で位置だけ先に確認するのは有効
2. FireTuner2本体にはパネルとは別の汎用Luaコンソールがあるはず(Firaxis製品共通機能、`HavokScript_Release.dll`同梱を確認済み)。そこから`Players[me]:GetDiplomacy():SetHasMet(other, true)`のようなAPIを直接叩ける可能性はあるが、**このsetterがLuaに公開されているか自体は未確認**(ハズレなら単にエラーになるだけで安全に試せる)
3. Agenda/Opinionの検証が目的なら、小マップ・少人数(例: Duelサイズ+2〜4文明)の専用テストゲームを別に立てた方が早いことが多い

## このリポジトリでの検証状況

2026-09-20時点で「有効化した」ところまでは実機確認済み(`AppOptions.txt`の書き換えと再起動)。パネルを使った実際のTrait/Agenda検証(例: `Diplomacy.ltp`でOpinion内訳を見る)はまだ実施していない。実際に使ってみて知見が増えたら、この節を実機確認済みの内容に更新すること。
