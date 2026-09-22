// Generate .tex sidecar files by copying Firaxis's own shipped UI icon .tex templates
// (Civ6 SDK Assets pantry/Textures/CivAztec*.tex, Montezuma*.tex) and substituting the name.
// This matches the documented approach (civ6wiki.info) of copying+renaming a real .tex
// rather than hand-authoring one, since only the SDK-shipped files are known-good.
// Usage: tsx gen-tex.ts <civilizationId> <leaderId>
// Example: tsx gen-tex.ts REGLOSS_ICHIJOU REGLOSS_ICHIJOU_RIRIKA
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { civilizationIconName, civilizationIconSizes, leaderIconName, leaderIconSizes } from "./icon-manifest.js";

const [, , civilizationId, leaderId] = process.argv;
if (!civilizationId || !leaderId) {
  console.error("Usage: tsx gen-tex.ts <civilizationId> <leaderId>");
  process.exit(1);
}

const SDK_ASSETS_TEXTURES =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Sid Meier's Civilization VI SDK Assets\\Civ6\\pantry\\Textures";

type TexMapping = {
  readonly ourName: string;
  readonly templateName: string;
};

const outputDirectory = join(import.meta.dirname, "..", "IconBuild", "Textures");
mkdirSync(outputDirectory, { recursive: true });

const mappings: readonly TexMapping[] = [
  ...civilizationIconSizes.map((size) => ({
    ourName: civilizationIconName(civilizationId, size),
    templateName: `CivAztec${size}`,
  })),
  ...leaderIconSizes.map((size) => ({
    ourName: leaderIconName(leaderId, size),
    templateName: `Montezuma${size}`,
  })),
];

for (const { ourName, templateName } of mappings) {
  const templatePath = join(SDK_ASSETS_TEXTURES, `${templateName}.tex`);
  const xml = readFileSync(templatePath, "utf8").split(templateName).join(ourName);
  const outputPath = join(outputDirectory, `${ourName}.tex`);
  writeFileSync(outputPath, xml);
  console.log(`${outputPath} (from ${templateName}.tex)`);
}
