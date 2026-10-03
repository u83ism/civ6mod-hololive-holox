# ブランチ戦略

- `main` = リリース済み安定版。`develop` = 開発中の作業ブランチ。
- 通常の作業コミットは`develop`に積む。`main`に直接コミットしない。
- リリースのタイミングで`develop`を`main`にマージする。GitHub上でPRは作らず、ローカルで`develop`を`main`にmerge/fast-forwardしてそのままpushする(個人開発のためPRのオーバーヘッドを避ける)。
- GitHubリポジトリのデフォルトブランチは`develop`。
- `develop`を`main`にマージする前に`npm run check -- --strict`(`tools/loc-lookup`)を実行し、他言語のタグ欠落(ja_JPだけにあるタグ)が無いか確認する。欠落が残る場合は一覧を本人に示し、未対応のまま公開するかを本人が判断する(AIが勝手にen/zhを埋めて解消しない。`localization-order.md`)。
