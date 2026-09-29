// Checks that official terms used in the ja_JP text also appear as their official translation in the
// other languages. This is a heuristic (warnings only): it finds ja substrings equal to an official
// *_NAME text and looks for that tag's translation in the other languages' text.
import { baseLanguage, placeholderPattern, type Finding, type TextIndex } from "./validate-text.js";

const minimumTermLength = 2;
const maskCharacter = "\u0000";

// ja official name -> tags that have it (one string can be the name of several tags)
export const buildTermTable = (officialIndex: TextIndex): ReadonlyMap<string, readonly string[]> =>
  [...officialIndex.entries()]
    .filter(([tag]) => tag.endsWith("_NAME"))
    .reduce((table, [tag, byLanguage]) => {
      const name = byLanguage.get(baseLanguage);
      if (name === undefined || name.length < minimumTermLength || /[[{]/.test(name)) return table;
      return new Map(table).set(name, [...(table.get(name) ?? []), tag]);
    }, new Map<string, readonly string[]>());

// Longest names first, and each match is masked so shorter names inside it are not matched again.
const findTerms = (text: string, namesLongestFirst: readonly string[]): readonly string[] =>
  namesLongestFirst.reduce(
    (state, name) =>
      state.remaining.includes(name)
        ? { remaining: state.remaining.split(name).join(maskCharacter), found: [...state.found, name] }
        : state,
    { remaining: text.replace(placeholderPattern, maskCharacter), found: [] as readonly string[] },
  ).found;

// English inflects (plural etc.), so compare against a crude stem; other languages compare as-is.
const englishStem = (name: string): string => name.toLowerCase().replace(/(ies|es|s|y)$/, "");

const containsTerm = (text: string, term: string, language: string): boolean =>
  language === "en_US" ? text.toLowerCase().includes(englishStem(term)) : text.includes(term);

export const validateTerms = (modIndex: TextIndex, officialIndex: TextIndex, languages: readonly string[]): readonly Finding[] => {
  const termTable = buildTermTable(officialIndex);
  const namesLongestFirst = [...termTable.keys()].sort((nameA, nameB) => nameB.length - nameA.length);
  return [...modIndex.entries()].flatMap(([tag, byLanguage]) => {
    const baseText = byLanguage.get(baseLanguage);
    if (baseText === undefined) return [];
    return findTerms(baseText, namesLongestFirst).flatMap((name) =>
      languages
        .filter((language) => language !== baseLanguage && byLanguage.has(language))
        .flatMap((language): readonly Finding[] => {
          const expectedTerms = (termTable.get(name) ?? []).flatMap((officialTag) => officialIndex.get(officialTag)?.get(language) ?? []);
          const text = byLanguage.get(language) ?? "";
          if (expectedTerms.length === 0 || expectedTerms.some((term) => containsTerm(text, term, language))) return [];
          return [
            {
              severity: "warning",
              tag,
              language,
              message: `公式用語「${name}」の${language}の公式訳が見つからない(期待: ${[...new Set(expectedTerms)].join(" / ")})`,
            },
          ];
        }),
    );
  });
};
