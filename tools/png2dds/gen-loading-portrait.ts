// Build the loading-screen portrait (LEADER_<leaderId>_NEUTRAL) from the full-body
// master art in Art/Source/ (read-only; never modified by this script). This is the
// LoadScreen-specific sibling of the diplomacy-screen fallback portrait
// (FALLBACK_NEUTRAL_<leaderId>, see gen-leader-fallback.ts / the
// make-fallback-portrait Skill): same source art, same knee-crop + top-margin + bottom-fade
// treatment (verified against official LEADER_ROBERT_THE_BRUCE_NEUTRAL.dds pixel data, which
// has the identical baked-in top margin and color-only bottom fade as FALLBACK_NEUTRAL_*), just
// a different canvas height (1024, matching every official LEADER_*_NEUTRAL.dds in Civ6 SDK
// Assets pantry/Textures/Expansion1: width varies per character, height is always 1024) and a
// different registration path (plain UITexture XLP class, like badge icons -- no ArtDef, unlike
// FALLBACK_NEUTRAL_* which goes through FallbackLeaders.artdef's LeaderFallback class).
// Usage: tsx gen-loading-portrait.ts <leaderId> <standingArtFileName>
// Example: tsx gen-loading-portrait.ts REGLOSS_ICHIJOU_RIRIKA ichijou-ririka-stand.webp
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { convertPngToDds, computeMipCount } from "./png2dds.js";
import { padTopMargin, applyBottomFade } from "./leader-fallback-compositing.js";

const [, , leaderId, standingArtFileName] = process.argv;
if (!leaderId || !standingArtFileName) {
  console.error("Usage: tsx gen-loading-portrait.ts <leaderId> <standingArtFileName>");
  process.exit(1);
}

const PORTRAIT_HEIGHT = 1024;
// Same values as gen-leader-fallback.ts, re-verified against LEADER_ROBERT_THE_BRUCE_NEUTRAL.dds
// (top margin ~10.7%, bottom fade starting ~74.6% down -- consistent with FALLBACK_NEUTRAL_*).
const TOP_MARGIN_FRACTION = 0.1;
const BOTTOM_FADE_START_FRACTION = 0.75;
const KNEE_CROP_FRACTION = 0.25;
const OUR_NAME = `LEADER_${leaderId}_NEUTRAL`;
const SDK_ASSETS_TEXTURES =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Sid Meier's Civilization VI SDK Assets\\Civ6\\DLC\\Expansion1\\pantry\\Textures";
const TEX_TEMPLATE_NAME = "LEADER_ROBERT_THE_BRUCE_NEUTRAL";

const sourcePath = join(import.meta.dirname, "..", "..", "Art", "Source", standingArtFileName);
const iconsDirectory = join(import.meta.dirname, "..", "..", "Art", "Icons");
const textureOutputDirectory = join(import.meta.dirname, "..", "IconBuild", "Textures");
const xlpOutputDirectory = join(import.meta.dirname, "..", "IconBuild", "XLPs");
mkdirSync(iconsDirectory, { recursive: true });
mkdirSync(textureOutputDirectory, { recursive: true });
mkdirSync(xlpOutputDirectory, { recursive: true });

const buildPortraitPng = async (): Promise<{ readonly width: number; readonly height: number }> => {
  const { info: trimmedInfo } = await sharp(sourcePath).trim().toBuffer({ resolveWithObject: true });
  const kneeCropHeight = Math.round(trimmedInfo.height * (1 - KNEE_CROP_FRACTION));
  const contentHeight = Math.round(PORTRAIT_HEIGHT * (1 - TOP_MARGIN_FRACTION));
  const { data, info } = await sharp(sourcePath)
    .trim()
    .extract({ left: 0, top: 0, width: trimmedInfo.width, height: kneeCropHeight })
    .resize({ height: contentHeight })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const content = { data, width: info.width, height: info.height };
  const padded = padTopMargin(content, PORTRAIT_HEIGHT);
  const faded = applyBottomFade(padded, BOTTOM_FADE_START_FRACTION);

  const pngPath = join(iconsDirectory, `${OUR_NAME}.png`);
  await sharp(faded.data, { raw: { width: faded.width, height: faded.height, channels: 4 } }).png().toFile(pngPath);
  console.log(`${pngPath}: ${faded.width}x${faded.height} (trimmed, knee-cropped, resized, top margin + bottom fade applied)`);
  return { width: faded.width, height: faded.height };
};

const buildPortraitTex = (width: number, height: number): void => {
  const templatePath = join(SDK_ASSETS_TEXTURES, `${TEX_TEMPLATE_NAME}.tex`);
  const numMipMaps = computeMipCount(Math.max(width, height)) - 1; // official .tex excludes the base level
  const xml = readFileSync(templatePath, "utf8")
    .split(TEX_TEMPLATE_NAME)
    .join(OUR_NAME)
    .replace(/<m_Height>\d+<\/m_Height>/, `<m_Height>${height}</m_Height>`)
    .replace(/<m_Width>\d+<\/m_Width>/, `<m_Width>${width}</m_Width>`)
    .replace(/<m_NumMipMaps>\d+<\/m_NumMipMaps>/, `<m_NumMipMaps>${numMipMaps}</m_NumMipMaps>`);
  const outputPath = join(textureOutputDirectory, `${OUR_NAME}.tex`);
  writeFileSync(outputPath, xml);
  console.log(`${outputPath} (from ${TEX_TEMPLATE_NAME}.tex, ${width}x${height}, ${numMipMaps} mips)`);
};

// Same package as gen-loading-background.ts's RegLoss_Loading.xlp would be reasonable too, but
// kept separate here since the two are independently regenerated and it avoids one script
// needing to read-and-merge the other's output.
const buildPortraitXlp = (): void => {
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<AssetObjects..XLP>
\t<m_Version>
\t\t<major>4</major>
\t\t<minor>0</minor>
\t\t<build>434</build>
\t\t<revision>920</revision>
\t</m_Version>
\t<m_ClassName text="UITexture"/>
\t<m_PackageName text="UI/RegLoss_LoadingPortrait"/>
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
  const outputPath = join(xlpOutputDirectory, "RegLoss_LoadingPortrait.xlp");
  writeFileSync(outputPath, xml);
  console.log(outputPath);
};

const { width, height } = await buildPortraitPng();
convertPngToDds(join(iconsDirectory, `${OUR_NAME}.png`), join(textureOutputDirectory, `${OUR_NAME}.dds`));
buildPortraitTex(width, height);
buildPortraitXlp();
