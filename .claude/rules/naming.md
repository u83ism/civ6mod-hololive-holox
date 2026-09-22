# 命名(TypeScript/Node.jsコード)

- 省略形を使わない。ループカウンタの`i`/`j`/`k`のみ例外。
- 1〜2文字の変数名を使わない(ループカウンタ除く)。
- よくある禁止省略形と言い換え例:
  - `res` → `response`
  - `dir` → `directory`
  - `idx` → `index`
  - `buf` → `buffer`
  - `fn` → `function`(またはその関数が何をするかを具体的に表す名前)
  - `cb` → `callback`
  - `cfg` → `config`
  - `ctx` → `context`
  - `tmp` → `tempXxx`(一時的に何を保持しているかを名前にする)
  - `in`/`out`(パス変数) → `inputPath`/`outputPath`
- ドメイン固有の頭字語(`PNG`/`DDS`/`XML`/`XLP`等)は省略形として扱わない。
