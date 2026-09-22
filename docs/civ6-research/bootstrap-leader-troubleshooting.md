# ブートストラップ期のトラブルシューティング要約(civ6wiki.info、未検証)

> このファイルは`.claude/skills/bootstrap-leader/references/`から移動した。**Skillの行動指示ではなく、civ6wiki.info(2017〜2020年執筆)の未検証な要約**であるため、実機確認済みの行動指示を書く`.claude/skills/`ではなく`docs/civ6-research/`に置く。着手して実機確認できたら、確認済みの事実として`bootstrap-leader` Skillの本文に書き足すこと。

出典: `https://civ6wiki.info/?MOD/作成方法/その他/*`(著者yosxpeee)。`research-mod` Skillの優先順位に従い、都度WebFetchし直す代わりにここへ要約を置く。**このリポジトリで実機確認した事実ではない**ので、`bootstrap-leader` SKILL.md本文(1〜5節)の実機確認済み事実と矛盾したらそちらを優先すること。

## 指導者定義変更時のクラッシュ対処(LeaderCriteria)

`LEADER_JASPER_KITTY`サンプルからxml上で指導者名の定義だけを変更すると、Loading画面に入れずクラッシュすることがある。原因は`LeaderCriteria`の`LeaderPlayable`値がModBuddyのProperty画面からは変更できない(新規追加はできるが既存の書き換えが効かない)こと。対処は2択:

- プロジェクトディレクトリの`*.civ6proj`をテキストエディタで直接開き、`LEADER_JASPER_KITTY`を差し替えた定義名に書き換える
- (推奨、より簡単)そもそも`LeaderCriteria`は設定必須ではないため、Propertyから`LeaderCriteria`の項目自体を削除してしまう

## DLC対応(拡張パック向けの3ドメイン登録)

無印のみ対応で作ったMODを Rise & Fall / Gathering Storm でも選択可能にする手順:

1. `NewLeader_Config.xml`の`Players`/`PlayerItems`の各`Row`を、`Domain="StandardPlayers"`(無印)に加えて`Domain="Players:Expansion1_Players"`(RaF)、`Domain="Players:Expansion2_Players"`(GS)の計3つ分、内容を丸ごと複製する
2. `*.civ6proj`内の`<ActionCriteriaData>`(CDATAで包まれた`<ActionCriteria><Criteria id="LeaderCriteria"><LeaderPlayable>...`)の`LeaderPlayable`値に、`StandardPlayers::LEADER_XXX,Players:Expansion1_Players::LEADER_XXX,Players:Expansion2_Players::LEADER_XXX`のようにカンマ区切りで3ドメイン分を追加する(このファイルはProperty画面ではなくテキストエディタで直接編集する必要がある点は前節と同じ)
3. ビルド後、生成された`.modinfo`の`<Properties>`末尾に`<CompatibleVersions>2.0</CompatibleVersions>`を追記する。**これを忘れるとMOD一覧画面で「(互換性なし)」と表示される。ただしビルドのたびに消えるため、ビルドし直すたびに再度手動追記が必要**(civfanatics公開のModBuddyアドオンで自動化可能だが未検証)

## 参照元URL一覧(再取得用)

- 指導者の定義を変えるとクラッシュする場合の対処: `.../その他/指導者の定義を変えるとクラッシュする場合の対処`
- DLC対応: `.../その他/DLC対応`
