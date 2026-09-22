# TypeScript / Node.js

このリポジトリの主体はCiv6 Mod本体(XML/Lua)で、TypeScriptコードは`tools/`配下のビルドスクリプト等に限られる。ここに書く規約は、その**TypeScript/Node.jsコードを書くときに適用する**(XML/Luaには適用しない)。

- ESM専用(`"type": "module"`)。理由なくCommonJSを使わない。
- 実行は`tsx`(TypeScript即時実行ツール)を使う。ビルドステップ(事前トランスパイル)を挟まず`.ts`ファイルをそのまま実行できる状態を保つ。
- strictモード常時on(`tsconfig.json`参照)。コンパイルを通すためにコンパイラオプションを緩めない。
- `any`は暗黙・明示を問わず禁止。型が本当に不明な場合は`unknown`にして絞り込む。
- exportする関数には明示的な戻り値型を付ける。
- 呼び出し側が変更しない値には`readonly`を付ける(オブジェクト/配列のフィールド・引数)。
- `enum`よりユニオン型を優先する。
- `interface`は使わない。常に`type`エイリアスを使う(本人の強い好み。`interface`の宣言マージ等の機能は使わない前提)。
- 分岐ロジックには判別可能ユニオン(`type`/`kind`フィールド)を使う。型キャストや`instanceof`チェーンは避ける。
- `verbatimModuleSyntax`がonの前提: type-onlyなimport/re-exportには`import type`/`export type`を使う。
- 相対importはNodeNext解決に従い、実体が`.ts`でも`.js`拡張子で書く(例: `import { foo } from "./bar.js";`)。
