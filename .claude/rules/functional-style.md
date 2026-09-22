# 関数型寄りのスタイル(TypeScript/Node.jsコード)

対象は`tools/`配下等のTypeScript/Node.jsコード。Functional Core, Imperative Shell: 純粋な計算をコアに、副作用(ファイルI/O、`process.argv`、`console.log`等)は端(エントリポイント/CLIスクリプト本体)に薄く寄せる。

- classは使わない。継承によるポリモーフィズムも使わない。バリアントが要る場合は関数の型(例: `type Converter = (input: string) => string`)+バリアントごとの独立した関数、で表現する。
- DIコンテナは使わない。依存は関数の引数として渡す、または部分適用する。
- モジュールレベルの共有可変状態を作らない。ファクトリ関数がクロージャ内に可変状態を持つのは問題ない(外から直接importして書き換えられる`export default`変数のような形が問題)。
- `function`宣言は使わない。常に`const foo = (...): ReturnType => {...}`の形で書く(本人の強い好み。`function`宣言によるホイスティングに依存するコードは書かない)。
- 変数スコープは最小化する。`let`より`const`を優先し、ループ内の集計等やむを得ない場合を除き再代入しない。
- 名前で純粋性を示す:
  - 純粋(同じ入力→同じ出力、I/Oなし、`Date.now()`/`Math.random()`なし、外部状態の読み取りなし): `calculate*`/`compute*`/`derive*`/`build*`(メモリ上の構築のみ)/`map*`/`filter*`/`format*`/`parse*`/`toX`/`fromX`/`validate*`/`normalize*`
  - 副作用あり(I/O、時刻、乱数、環境変数): `fetch*`/`load*`/`read*`/`save*`/`create*`(永続化を伴う)/`write*`/`convert*`(ファイル変換のようにI/Oを伴う場合)
