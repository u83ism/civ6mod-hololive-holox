// Pure consistency checks over this mod's localization text (see write-game-text Skill, step 4).
// ja_JP is the baseline only for mechanical parity (placeholders/numbers); wording is never compared.
import type { LocEntry } from "./loc-entries.js";

export type Finding = {
  readonly severity: "error" | "warning";
  readonly tag: string;
  readonly language: string;
  readonly message: string;
};

// tag -> language -> text (later entries win, same as the lookup tool)
export type TextIndex = ReadonlyMap<string, ReadonlyMap<string, string>>;

export const baseLanguage = "ja_JP";

export const buildTextIndex = (entries: readonly LocEntry[]): TextIndex => {
  const index = new Map<string, Map<string, string>>();
  for (const entry of entries) {
    const byLanguage = index.get(entry.tag) ?? new Map<string, string>();
    byLanguage.set(entry.language, entry.text);
    index.set(entry.tag, byLanguage);
  }
  return index;
};

export const placeholderPattern = /\[[A-Za-z0-9_]+\]|\{\d+_\w+\}/g;

const extractPlaceholders = (text: string): readonly string[] => (text.match(placeholderPattern) ?? []).map((token) => token.toLowerCase());

const extractNumbers = (text: string): readonly string[] => text.replace(placeholderPattern, "").match(/\d+(?:\.\d+)?/g) ?? [];

const countTokens = (tokens: readonly string[]): ReadonlyMap<string, number> =>
  tokens.reduce((counts, token) => new Map(counts).set(token, (counts.get(token) ?? 0) + 1), new Map<string, number>());

const describeDifferences = (baseTokens: readonly string[], otherTokens: readonly string[]): readonly string[] => {
  const baseCounts = countTokens(baseTokens);
  const otherCounts = countTokens(otherTokens);
  return [...new Set([...baseCounts.keys(), ...otherCounts.keys()])]
    .filter((token) => baseCounts.get(token) !== otherCounts.get(token))
    .map((token) => `${token} (${baseLanguage}:${baseCounts.get(token) ?? 0}, here:${otherCounts.get(token) ?? 0})`);
};

export const validateTagParity = (index: TextIndex, languages: readonly string[]): readonly Finding[] =>
  [...index.entries()].flatMap(([tag, byLanguage]) =>
    languages
      .filter((language) => !byLanguage.has(language))
      .map((language): Finding => ({ severity: "error", tag, language, message: "この言語にタグが無い" })),
  );

const validateAgainstBase = (
  index: TextIndex,
  label: string,
  extract: (text: string) => readonly string[],
): readonly Finding[] =>
  [...index.entries()].flatMap(([tag, byLanguage]) => {
    const baseText = byLanguage.get(baseLanguage);
    if (baseText === undefined) return [];
    return [...byLanguage.entries()]
      .filter(([language]) => language !== baseLanguage)
      .flatMap(([language, text]): readonly Finding[] => {
        const differences = describeDifferences(extract(baseText), extract(text));
        return differences.length === 0
          ? []
          : [{ severity: "error", tag, language, message: `${label}が${baseLanguage}と一致しない: ${differences.join(", ")}` }];
      });
  });

export const validatePlaceholders = (index: TextIndex): readonly Finding[] =>
  validateAgainstBase(index, "プレースホルダー([ICON_*]/[NEWLINE]/{N_*}等)", extractPlaceholders);

export const validateNumbers = (index: TextIndex): readonly Finding[] => validateAgainstBase(index, "数値", extractNumbers);

type PunctuationRule = { readonly pattern: RegExp; readonly severity: "error" | "warning"; readonly message: string };

const kanaPattern = /[぀-ヿ]/;
const halfWidthPunctuationPattern = /(?<!\d)[,:]|[,:](?!\d)|[;?!]/;
const cjkPattern = /[぀-ヿ一-鿿]/;

// Rules come from references/lang-*.md of the write-game-text Skill.
const chineseRules: readonly PunctuationRule[] = [
  { pattern: halfWidthPunctuationPattern, severity: "warning", message: "半角の句読点がある(全角にする。数字の桁区切り・小数点は除く)" },
  { pattern: /％/, severity: "warning", message: "全角の%がある(%だけは半角)" },
  { pattern: kanaPattern, severity: "warning", message: "日本語の仮名が残っている" },
];

const punctuationRules: ReadonlyMap<string, readonly PunctuationRule[]> = new Map([
  [
    "ja_JP",
    [{ pattern: /[０-９％＋－（）：]/, severity: "warning", message: "全角の数字・記号がある(数値・%・+/-・括弧・コロンは半角)" }],
  ],
  [
    "en_US",
    [
      { pattern: /["“”]/, severity: "warning", message: "引用符がある(英語は固有名詞を引用符で囲まない。台詞の引用は除く)" },
      { pattern: /\[ICON_[A-Za-z0-9_]+\][A-Za-z0-9]/, severity: "warning", message: "[ICON_*]の直後に半角スペースが無い" },
      { pattern: cjkPattern, severity: "warning", message: "日本語/中国語の文字が残っている" },
    ],
  ],
  ["zh_Hans_CN", [...chineseRules, { pattern: /[「」]/, severity: "warning", message: "簡体字に鉤括弧「」がある(簡体字は“ ”)" }]],
  ["zh_Hant_HK", [...chineseRules, { pattern: /[“”]/, severity: "warning", message: "繁体字にカーブ引用符“ ”がある(繁体字は「」)" }]],
]);

export const validatePunctuation = (index: TextIndex): readonly Finding[] =>
  [...index.entries()].flatMap(([tag, byLanguage]) =>
    [...byLanguage.entries()].flatMap(([language, text]) =>
      (punctuationRules.get(language) ?? [])
        .filter((rule) => rule.pattern.test(text))
        .map((rule): Finding => ({ severity: rule.severity, tag, language, message: rule.message })),
    ),
  );
