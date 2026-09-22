# ブランチ戦略

- `main` = リリース済み安定版。`develop` = 開発中の作業ブランチ。
- 通常の作業コミットは`develop`に積む。`main`に直接コミットしない。
- リリースのタイミングで`develop`を`main`にマージする。GitHub上でPRは作らず、ローカルで`develop`を`main`にmerge/fast-forwardしてそのままpushする(個人開発のためPRのオーバーヘッドを避ける)。
- GitHubリポジトリのデフォルトブランチは`develop`。
