// Pure parsing/filtering of Civ6 localization XML (<LocalizedText>/<BaseGameText> rows).
// en_US files store rows as <Row Tag="..."> without a Language attribute (the language is the
// directory name), while ja_JP/zh_* are stored as <Replace Tag="..." Language="..."> inside
// consolidated *_Translations_Text.xml / Vanilla_<lang>.xml files. Both shapes are handled here.

export type LocEntry = {
  readonly tag: string;
  readonly language: string;
  readonly text: string;
  readonly source: string;
};

const rowPattern = /<(?:Row|Replace)\b([^>]*)>\s*<Text>([\s\S]*?)<\/Text>/g;
const attributePattern = /(\w+)="([^"]*)"/g;

const parseAttributes = (attributeText: string): ReadonlyMap<string, string> =>
  new Map([...attributeText.matchAll(attributePattern)].map(([, name, value]) => [name ?? "", value ?? ""]));

// defaultLanguage is used for rows that carry no Language attribute (en_US directory files).
export const parseLocEntries = (
  xml: string,
  source: string,
  defaultLanguage: string | undefined,
): readonly LocEntry[] =>
  [...xml.matchAll(rowPattern)].flatMap(([, attributeText, text]) => {
    const attributes = parseAttributes(attributeText ?? "");
    const tag = attributes.get("Tag");
    const language = attributes.get("Language") ?? defaultLanguage;
    return tag === undefined || language === undefined ? [] : [{ tag, language, text: text ?? "", source }];
  });

export type LookupQuery =
  | { readonly kind: "tag"; readonly pattern: RegExp }
  | { readonly kind: "text"; readonly substring: string; readonly language: string; readonly tagPattern: RegExp | undefined };

// A text query finds the tags whose text (in the given language) contains the substring,
// then returns every language's entry for those tags so translations can be compared.
export const filterEntries = (entries: readonly LocEntry[], query: LookupQuery): readonly LocEntry[] => {
  if (query.kind === "tag") {
    return entries.filter((entry) => query.pattern.test(entry.tag));
  }
  const matchedTags = new Set(
    entries
      .filter((entry) => entry.language === query.language && entry.text.includes(query.substring))
      .filter((entry) => query.tagPattern === undefined || query.tagPattern.test(entry.tag))
      .map((entry) => entry.tag),
  );
  return entries.filter((entry) => matchedTags.has(entry.tag));
};

export const filterLanguages = (
  entries: readonly LocEntry[],
  languages: ReadonlySet<string> | "all",
): readonly LocEntry[] => (languages === "all" ? entries : entries.filter((entry) => languages.has(entry.language)));

// Later sources override earlier ones for the same tag+language (DLC/expansion text replaces
// base text, e.g. *_EXPANSION2 rewrites), so the last occurrence wins; the source is kept for review.
export const formatEntries = (entries: readonly LocEntry[]): string => {
  const byTag = new Map<string, Map<string, LocEntry>>();
  for (const entry of entries) {
    const byLanguage = byTag.get(entry.tag) ?? new Map<string, LocEntry>();
    byLanguage.set(entry.language, entry);
    byTag.set(entry.tag, byLanguage);
  }
  return [...byTag.entries()]
    .sort(([tagA], [tagB]) => tagA.localeCompare(tagB))
    .map(([tag, byLanguage]) =>
      [
        `== ${tag}`,
        ...[...byLanguage.values()]
          .sort((entryA, entryB) => entryA.language.localeCompare(entryB.language))
          .map((entry) => `  [${entry.language}] ${entry.text}\n      (${entry.source})`),
      ].join("\n"),
    )
    .join("\n");
};
