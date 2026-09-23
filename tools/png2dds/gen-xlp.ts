// Build XLPs/HoloX_Icons.xlp using the exact header/footer structure of Firaxis's own
// Civ6 SDK Assets pantry/XLPs/Icons.xlp, with only our own icon entries.
// Usage: tsx gen-xlp.ts <civilizationId> <leaderId>
// Example: tsx gen-xlp.ts REGLOSS_ICHIJOU REGLOSS_ICHIJOU_RIRIKA
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { civilizationIconName, civilizationIconSizes, leaderIconName, leaderIconSizes } from "./icon-manifest.js";

const [, , civilizationId, leaderId] = process.argv;
if (!civilizationId || !leaderId) {
  console.error("Usage: tsx gen-xlp.ts <civilizationId> <leaderId>");
  process.exit(1);
}

const entries = [
  ...civilizationIconSizes.map((size) => civilizationIconName(civilizationId, size)),
  ...leaderIconSizes.map((size) => leaderIconName(leaderId, size)),
];

const elements = entries
  .map((name) => `\t\t<Element>\n\t\t\t<m_EntryID text="${name}"/>\n\t\t\t<m_ObjectName text="${name}"/>\n\t\t</Element>`)
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<AssetObjects..XLP>
\t<m_Version>
\t\t<major>4</major>
\t\t<minor>0</minor>
\t\t<build>434</build>
\t\t<revision>920</revision>
\t</m_Version>
\t<m_ClassName text="UITexture"/>
\t<m_PackageName text="UI/HoloX_Icons"/>
\t<m_Entries>
${elements}
\t</m_Entries>
\t<m_AllowedPlatforms>
\t\t<Element>WINDOWS</Element>
\t\t<Element>LINUX</Element>
\t\t<Element>MACOS</Element>
\t\t<Element>IOS</Element>
\t</m_AllowedPlatforms>
</AssetObjects..XLP>
`;

const outputDirectory = join(import.meta.dirname, "..", "IconBuild", "XLPs");
mkdirSync(outputDirectory, { recursive: true });
const outputPath = join(outputDirectory, "HoloX_Icons.xlp");
writeFileSync(outputPath, xml);
console.log(outputPath);
