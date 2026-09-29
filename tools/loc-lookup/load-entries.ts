// Reads Civ6 localization XML from disk (game install Base + DLC, or this mod's Text/).
// Shared by the lookup tool and the text checker.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parseLocEntries, type LocEntry } from "./loc-entries.js";

export const defaultGamePath = "C:/Program Files (x86)/Steam/steamapps/common/Sid Meier's Civilization VI";

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

export const loadEntries = (rootDirectory: string, sourceLabel: string, includeScenarios: boolean): readonly LocEntry[] =>
  listXmlFiles(rootDirectory)
    .filter((path) => isTextFile(path) && (includeScenarios || !/scenario/i.test(path)))
    .flatMap((path) =>
      parseLocEntries(readFileSync(path, "utf8"), `${sourceLabel}/${relative(rootDirectory, path).split(sep).join("/")}`, directoryLanguage(path)),
    );
