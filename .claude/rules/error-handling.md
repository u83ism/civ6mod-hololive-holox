# エラーハンドリング(TypeScript/Node.jsコード)

失敗が「起こりうる正常系の一種」か「本来ありえないバグ」かで使い分ける。

- **Result型** — 「今はできない」という想定内の失敗を返す場合に使う(例: 変換条件を満たさない入力、パースできないフォーマット)。
  ```ts
  type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
  const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
  const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
  ```
  チェーン型API(`.andThen()`等)は使わず、素朴な早期returnで書く。
- **throw** — 呼び出し側が正しく使っていれば起こらないはずの不変条件違反や、CLIスクリプトの境界層(引数不足、ファイルが読めない等、そのまま`process.exit(1)`で終了してよいもの)に使う。`tools/png2dds/`の各スクリプトのように、ロジックのほぼ全体がファイルI/Oと変換を行うCLIスクリプト自体である場合は、境界層として素朴にthrow/`process.exit`してよい。
- コアロジック(将来ライブラリ的に切り出される計算部分)が肥大化してきたら、想定内の失敗はResult型に寄せることを検討する。数十行のCLIスクリプト1本にResult型を持ち込むような過剰設計はしない。
