// Checks this mod's Text/ files for cross-language consistency (write-game-text Skill, step 4):
// tag parity, placeholders, numbers, punctuation rules, and official-term parity.
//
// Usage:
//   npm run check                 all checks (reads the game install for the official-term check)
//   npm run check -- --no-terms   skip the official-term check (no game install needed, much faster)
//   npm run check -- --strict     treat missing tags (a language lacking a tag another language has) as errors
// Missing tags are warnings by default: ja_JP is written first and the other languages are added only when the user asks
// (.claude/rules/localization-order.md). Use --strict for the release gate.
// Exit code is 1 when there are errors (warnings alone do not fail).
// Environment:
//   CIV6_PATH              game install directory (default: the standard Steam location)
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultGamePath, loadEntries } from "./load-entries.js";
import { validateTerms } from "./validate-terms.js";
import {
  buildTextIndex,
  validateNumbers,
  validatePlaceholders,
  validatePunctuation,
  validateTagParity,
  type Finding,
} from "./validate-text.js";

const formatFinding = (finding: Finding): string => `[${finding.severity}] ${finding.language} ${finding.tag}\n    ${finding.message}`;

const modRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const modEntries = loadEntries(join(modRoot, "Text"), basename(modRoot), false);
const modIndex = buildTextIndex(modEntries);
const languages = [...new Set(modEntries.map((entry) => entry.language))].sort();

const officialIndex = process.argv.includes("--no-terms")
  ? undefined
  : buildTextIndex([
      ...loadEntries(join(process.env["CIV6_PATH"] ?? defaultGamePath, "Base", "Assets", "Text"), "Base", false),
      ...loadEntries(join(process.env["CIV6_PATH"] ?? defaultGamePath, "DLC"), "DLC", false),
    ]);

const findings: readonly Finding[] = [
  ...validateTagParity(modIndex, languages, process.argv.includes("--strict") ? "error" : "warning"),
  ...validatePlaceholders(modIndex),
  ...validateNumbers(modIndex),
  ...validatePunctuation(modIndex),
  ...(officialIndex === undefined ? [] : validateTerms(modIndex, officialIndex, languages)),
];

const errorCount = findings.filter((finding) => finding.severity === "error").length;
console.log(`languages: ${languages.join(", ")} / tags: ${modIndex.size}`);
console.log(findings.length === 0 ? "OK: no findings." : findings.map(formatFinding).join("\n"));
console.log(`\n${errorCount} error(s), ${findings.length - errorCount} warning(s)`);
process.exit(errorCount > 0 ? 1 : 0);
