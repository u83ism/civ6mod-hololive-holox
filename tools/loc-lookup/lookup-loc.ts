// Look up Civ6 official localized text across languages, from the game install (Base + DLC)
// and this mod's own Text/ files. The game's localization files are the authoritative
// dictionary for official terms (see .claude/rules/game-terms.md).
//
// Usage:
//   npm run lookup -- <tag regex>                    e.g. "^LOC_BUILDING_AQUARIUM_(NAME|DESCRIPTION)$"
//   npm run lookup -- --text <substring> [--lang ja_JP] [<tag regex>]
//                          reverse lookup by text (default language ja_JP), optionally narrowed by tag
// Options:
//   --all-langs            show every language (default: en_US, ja_JP, zh_Hans_CN, zh_Hant_HK)
//   --include-scenarios    also read scenario DLC text (excluded by default: they override names for scenarios)
// Environment:
//   CIV6_PATH              game install directory (default: the standard Steam location)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { filterEntries, filterLanguages, formatEntries, parseLocEntries, type LocEntry, type LookupQuery } from "./loc-entries.js";

const defaultGamePath = "C:/Program Files (x86)/Steam/steamapps/common/Sid Meier's Civilization VI";
const defaultLanguages: ReadonlySet<string> = new Set(["en_US", "ja_JP", "zh_Hans_CN", "zh_Hant_HK"]);

const listXmlFiles = (directory: string): readonly string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return listXmlFiles(path);
    return name.toLowerCase().endsWith(".xml") ? [path] : [];
  });

// Only files under a Text directory are localization files (Gameplay Data XML is skipped).
const isTextFile = (path: string): boolean => path.split(sep).some((segment) => segment === "Text");

// Rows without a Language attribute belong to the language directory they live in (en_US/...).
const directoryLanguage = (path: string): string | undefined =>
  path.split(sep).find((segment) => /^[a-z]{2}_[A-Za-z]+(_[A-Z]{2})?$/.test(segment));

const loadEntries = (rootDirectory: string, sourceLabel: string, includeScenarios: boolean): readonly LocEntry[] =>
  listXmlFiles(rootDirectory)
    .filter((path) => isTextFile(path) && (includeScenarios || !/scenario/i.test(path)))
    .flatMap((path) =>
      parseLocEntries(readFileSync(path, "utf8"), `${sourceLabel}/${relative(rootDirectory, path).split(sep).join("/")}`, directoryLanguage(path)),
    );

// Values of --text/--lang are not positional arguments.
const positionalArguments = (argumentList: readonly string[]): readonly string[] =>
  argumentList.filter((argument, index) => !argument.startsWith("--") && !["--text", "--lang"].includes(argumentList[index - 1] ?? ""));

const parseQuery = (argumentList: readonly string[]): LookupQuery => {
  const textIndex = argumentList.indexOf("--text");
  if (textIndex >= 0) {
    const substring = argumentList[textIndex + 1];
    if (substring === undefined) throw new Error("--text needs a substring");
    const languageIndex = argumentList.indexOf("--lang");
    const language = languageIndex >= 0 ? argumentList[languageIndex + 1] : "ja_JP";
    if (language === undefined) throw new Error("--lang needs a language code");
    const tagPattern = positionalArguments(argumentList)[0];
    return { kind: "text", substring, language, tagPattern: tagPattern === undefined ? undefined : new RegExp(tagPattern) };
  }
  const tagPattern = positionalArguments(argumentList)[0];
  if (tagPattern === undefined) throw new Error("Usage: npm run lookup -- <tag regex> | --text <substring> [--lang ja_JP]");
  return { kind: "tag", pattern: new RegExp(tagPattern) };
};

// Piping into head etc. closes stdout early; that is not an error for a lookup tool.
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE" || error.code === "EOF") process.exit(0);
  throw error;
});

const argumentList = process.argv.slice(2);
const query = parseQuery(argumentList);
const includeScenarios = argumentList.includes("--include-scenarios");
const gamePath = process.env["CIV6_PATH"] ?? defaultGamePath;
const modTextDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "Text");

const entries = [
  ...loadEntries(join(gamePath, "Base", "Assets", "Text"), "Base", includeScenarios),
  ...loadEntries(join(gamePath, "DLC"), "DLC", includeScenarios),
  ...loadEntries(modTextDirectory, basename(join(modTextDirectory, "..")), includeScenarios),
];
const languages = argumentList.includes("--all-langs") ? "all" : defaultLanguages;
const result = filterLanguages(filterEntries(entries, query), languages);
console.log(result.length === 0 ? "No match." : formatEntries(result));
