// Build the loading-screen background (LEADER_<leaderId>_BACKGROUND) from the
// wallpaper master art in Art/Source/ (read-only; never modified by this script). This is a
// separate layer from the loading-screen portrait (LEADER_<leaderId>_NEUTRAL,
// made by make-fallback-portrait's sibling pipeline): LoadScreen.xml nests a "Portrait" Image
// control inside "BackgroundImage" as its own independent control, and LoadScreen.lua sets
// their textures via two unrelated Controls.BackgroundImage:SetTexture(...) /
// Controls.Portrait:SetTexture(...) calls -- so this background needs no character on it.
// Resizes to 1920x960 (matching every official LEADER_*_BACKGROUND.dds in Civ6 SDK Assets
// pantry/Textures/Expansion1, e.g. LEADER_ROBERT_THE_BRUCE_BACKGROUND.dds: fixed size across
// every leader, unlike the portrait images) via a center crop-to-fill, since the source
// wallpaper's aspect ratio doesn't match. Also generates the sidecar .tex (copied from the
// matching official template with mipmap count substituted) and .xlp.
// Usage: tsx gen-loading-background.ts <leaderId> <wallpaperFileName>
// Example: tsx gen-loading-background.ts REGLOSS_ICHIJOU_RIRIKA wallpaper-broadcast-night.webp
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { convertPngToDds, computeMipCount } from "./png2dds.js";

const [, , leaderId, wallpaperFileName] = process.argv;
if (!leaderId || !wallpaperFileName) {
  console.error("Usage: tsx gen-loading-background.ts <leaderId> <wallpaperFileName>");
  process.exit(1);
}

const BACKGROUND_WIDTH = 1920;
const BACKGROUND_HEIGHT = 960;
const OUR_NAME = `LEADER_${leaderId}_BACKGROUND`;
const SDK_ASSETS_TEXTURES =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Sid Meier's Civilization VI SDK Assets\\Civ6\\DLC\\Expansion1\\pantry\\Textures";
const TEX_TEMPLATE_NAME = "LEADER_ROBERT_THE_BRUCE_BACKGROUND";

const sourcePath = join(import.meta.dirname, "..", "..", "Art", "Source", wallpaperFileName);
const iconsDirectory = join(import.meta.dirname, "..", "..", "Art", "Icons");
const textureOutputDirectory = join(import.meta.dirname, "..", "IconBuild", "Textures");
const xlpOutputDirectory = join(import.meta.dirname, "..", "IconBuild", "XLPs");
mkdirSync(iconsDirectory, { recursive: true });
mkdirSync(textureOutputDirectory, { recursive: true });
mkdirSync(xlpOutputDirectory, { recursive: true });

const buildBackgroundPng = async (): Promise<void> => {
  const pngPath = join(iconsDirectory, `${OUR_NAME}.png`);
  await sharp(sourcePath)
    .resize(BACKGROUND_WIDTH, BACKGROUND_HEIGHT, { fit: "cover", position: "center" })
    .ensureAlpha()
    .png()
    .toFile(pngPath);
  console.log(`${pngPath}: ${BACKGROUND_WIDTH}x${BACKGROUND_HEIGHT} (center-cropped from source, then resized)`);
};

const buildBackgroundTex = (): void => {
  const templatePath = join(SDK_ASSETS_TEXTURES, `${TEX_TEMPLATE_NAME}.tex`);
  const numMipMaps = computeMipCount(Math.max(BACKGROUND_WIDTH, BACKGROUND_HEIGHT)) - 1; // official .tex excludes the base level
  const xml = readFileSync(templatePath, "utf8")
    .split(TEX_TEMPLATE_NAME)
    .join(OUR_NAME)
    .replace(/<m_NumMipMaps>\d+<\/m_NumMipMaps>/, `<m_NumMipMaps>${numMipMaps}</m_NumMipMaps>`);
  const outputPath = join(textureOutputDirectory, `${OUR_NAME}.tex`);
  writeFileSync(outputPath, xml);
  console.log(`${outputPath} (from ${TEX_TEMPLATE_NAME}.tex, ${numMipMaps} mips)`);
};

const buildBackgroundXlp = (): void => {
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<AssetObjects..XLP>
\t<m_Version>
\t\t<major>4</major>
\t\t<minor>0</minor>
\t\t<build>434</build>
\t\t<revision>920</revision>
\t</m_Version>
\t<m_ClassName text="UITexture"/>
\t<m_PackageName text="UI/RegLoss_Loading"/>
\t<m_Entries>
\t\t<Element>
\t\t\t<m_EntryID text="${OUR_NAME}"/>
\t\t\t<m_ObjectName text="${OUR_NAME}"/>
\t\t</Element>
\t</m_Entries>
\t<m_AllowedPlatforms>
\t\t<Element>WINDOWS</Element>
\t\t<Element>LINUX</Element>
\t\t<Element>MACOS</Element>
\t\t<Element>IOS</Element>
\t</m_AllowedPlatforms>
</AssetObjects..XLP>
`;
  const outputPath = join(xlpOutputDirectory, "RegLoss_Loading.xlp");
  writeFileSync(outputPath, xml);
  console.log(outputPath);
};

await buildBackgroundPng();
convertPngToDds(join(iconsDirectory, `${OUR_NAME}.png`), join(textureOutputDirectory, `${OUR_NAME}.dds`));
buildBackgroundTex();
buildBackgroundXlp();
