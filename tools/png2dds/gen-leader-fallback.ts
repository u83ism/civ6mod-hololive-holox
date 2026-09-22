// Build the diplomacy-screen fallback portrait (FALLBACK_NEUTRAL_<leaderId>) from
// the full-body master art in Art/Source/ (read-only; never modified by this script). Trims the
// transparent margin around the character, crops off the bottom (below-knee) portion to match
// official/Hololive EN-ID fallback portraits (they cut off just below the knee, not full body),
// resizes to canvas height 1080 (matching every official FALLBACK_NEUTRAL_*.dds in Civ6 SDK
// Assets pantry/Textures/Expansion1, e.g. FALLBACK_NEUTRAL_ROBERT_THE_BRUCE.dds: width varies
// per character's silhouette, height is always 1080), then applies the top-margin + bottom-fade
// compositing measured from those same official files (see leader-fallback-compositing.ts).
// Also generates the sidecar .tex (copied from the matching official template with
// width/height/mipmap count substituted, since those values differ per character unlike the
// fixed-size badge icon templates) and .xlp.
// Usage: tsx gen-leader-fallback.ts <leaderId> <standingArtFileName>
// Example: tsx gen-leader-fallback.ts REGLOSS_ICHIJOU_RIRIKA ichijou-ririka-stand.webp
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { convertPngToDds, computeMipCount } from "./png2dds.js";
import { padTopMargin, applyBottomFade } from "./leader-fallback-compositing.js";

const [, , leaderId, standingArtFileName] = process.argv;
if (!leaderId || !standingArtFileName) {
  console.error("Usage: tsx gen-leader-fallback.ts <leaderId> <standingArtFileName>");
  process.exit(1);
}

const LEADER_FALLBACK_HEIGHT = 1080;
// Measured across 5 official leaders (see leader-fallback-compositing.ts's header comment):
// top margin ranged 5-15% (avg ~10%), bottom fade start ranged ~17-28% up from the bottom.
const TOP_MARGIN_FRACTION = 0.1;
const BOTTOM_FADE_START_FRACTION = 0.75;
// Official/Hololive EN-ID fallback portraits cut the body off just below the knee, not at the
// feet. Per visual comparison against the source art, that point sits ~20-30% up from the
// bottom of the trimmed full-body source (own estimate, not measured from official pixel data
// like the two constants above).
const KNEE_CROP_FRACTION = 0.25;
const OUR_NAME = `FALLBACK_NEUTRAL_${leaderId}`;
const LEADER_TYPE = `LEADER_${leaderId}`;
const SDK_ASSETS_TEXTURES =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Sid Meier's Civilization VI SDK Assets\\Civ6\\DLC\\Expansion1\\pantry\\Textures";
const TEX_TEMPLATE_NAME = "FALLBACK_NEUTRAL_ROBERT_THE_BRUCE";

const sourcePath = join(import.meta.dirname, "..", "..", "Art", "Source", standingArtFileName);
const iconsDirectory = join(import.meta.dirname, "..", "..", "Art", "Icons");
const textureOutputDirectory = join(import.meta.dirname, "..", "IconBuild", "Textures");
const xlpOutputDirectory = join(import.meta.dirname, "..", "IconBuild", "XLPs");
const iconBuildArtDefDirectory = join(import.meta.dirname, "..", "IconBuild", "ArtDefs");
const modArtDefDirectory = join(import.meta.dirname, "..", "..", "ArtDefs");
mkdirSync(iconsDirectory, { recursive: true });
mkdirSync(textureOutputDirectory, { recursive: true });
mkdirSync(xlpOutputDirectory, { recursive: true });
mkdirSync(iconBuildArtDefDirectory, { recursive: true });
mkdirSync(modArtDefDirectory, { recursive: true });

const buildFallbackPortraitPng = async (): Promise<{ readonly width: number; readonly height: number }> => {
  const { info: trimmedInfo } = await sharp(sourcePath).trim().toBuffer({ resolveWithObject: true });
  const kneeCropHeight = Math.round(trimmedInfo.height * (1 - KNEE_CROP_FRACTION));
  const contentHeight = Math.round(LEADER_FALLBACK_HEIGHT * (1 - TOP_MARGIN_FRACTION));
  const { data, info } = await sharp(sourcePath)
    .trim()
    .extract({ left: 0, top: 0, width: trimmedInfo.width, height: kneeCropHeight })
    .resize({ height: contentHeight })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const content = { data, width: info.width, height: info.height };
  const padded = padTopMargin(content, LEADER_FALLBACK_HEIGHT);
  const faded = applyBottomFade(padded, BOTTOM_FADE_START_FRACTION);

  const pngPath = join(iconsDirectory, `${OUR_NAME}.png`);
  await sharp(faded.data, { raw: { width: faded.width, height: faded.height, channels: 4 } }).png().toFile(pngPath);
  console.log(`${pngPath}: ${faded.width}x${faded.height} (trimmed, resized, top margin + bottom fade applied)`);
  return { width: faded.width, height: faded.height };
};

const buildFallbackPortraitTex = (width: number, height: number): void => {
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

const buildFallbackPortraitXlp = (): void => {
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<AssetObjects..XLP>
\t<m_Version>
\t\t<major>4</major>
\t\t<minor>0</minor>
\t\t<build>434</build>
\t\t<revision>920</revision>
\t</m_Version>
\t<m_ClassName text="LeaderFallback"/>
\t<m_PackageName text="LeaderFallbackImages"/>
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
  const outputPath = join(xlpOutputDirectory, "LeaderFallbackImages.xlp");
  writeFileSync(outputPath, xml);
  console.log(outputPath);
};

// Matches the exact schema of the official pantry/ArtDefs/FallbackLeaders.artdef (verified
// against its LEADER_ROBERT_THE_BRUCE block): one leader per <Element>, with a single
// "DEFAULT" animation state pointing at the fallback image (no per-mood HAPPY/UNHAPPY/etc.
// variants; official leaders only define DEFAULT too, e.g. LEADER_POUNDMAKER/LEADER_ROBERT_THE_BRUCE).
const buildFallbackLeadersArtDef = (): void => {
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<AssetObjects..ArtDefSet>
\t<m_Version>
\t\t<major>4</major>
\t\t<minor>0</minor>
\t\t<build>312</build>
\t\t<revision>68</revision>
\t</m_Version>
\t<m_TemplateName text="LeaderFallback"/>
\t<m_RootCollections>
\t\t<Element>
\t\t\t<m_CollectionName text="Leaders"/>
\t\t\t<m_ReplaceMergedCollectionElements>false</m_ReplaceMergedCollectionElements>
\t\t\t<Element>
\t\t\t\t<m_Fields>
\t\t\t\t\t<m_Values/>
\t\t\t\t</m_Fields>
\t\t\t\t<m_ChildCollections>
\t\t\t\t\t<Element>
\t\t\t\t\t\t<m_CollectionName text="Animations"/>
\t\t\t\t\t\t<m_ReplaceMergedCollectionElements>false</m_ReplaceMergedCollectionElements>
\t\t\t\t\t\t<Element>
\t\t\t\t\t\t\t<m_Fields>
\t\t\t\t\t\t\t\t<m_Values>
\t\t\t\t\t\t\t\t\t<Element class="AssetObjects..BLPEntryValue">
\t\t\t\t\t\t\t\t\t\t<m_EntryName text="${OUR_NAME}"/>
\t\t\t\t\t\t\t\t\t\t<m_XLPClass text="LeaderFallback"/>
\t\t\t\t\t\t\t\t\t\t<m_XLPPath text="LeaderFallbackImages.xlp"/>
\t\t\t\t\t\t\t\t\t\t<m_BLPPackage text="LeaderFallbackImages"/>
\t\t\t\t\t\t\t\t\t\t<m_LibraryName text="LeaderFallback"/>
\t\t\t\t\t\t\t\t\t\t<m_ParamName text="BLP Entry"/>
\t\t\t\t\t\t\t\t\t</Element>
\t\t\t\t\t\t\t\t</m_Values>
\t\t\t\t\t\t\t</m_Fields>
\t\t\t\t\t\t\t<m_ChildCollections/>
\t\t\t\t\t\t\t<m_Name text="DEFAULT"/>
\t\t\t\t\t\t\t<m_AppendMergedParameterCollections>false</m_AppendMergedParameterCollections>
\t\t\t\t\t\t</Element>
\t\t\t\t\t</Element>
\t\t\t\t</m_ChildCollections>
\t\t\t\t<m_Name text="${LEADER_TYPE}"/>
\t\t\t\t<m_AppendMergedParameterCollections>false</m_AppendMergedParameterCollections>
\t\t\t</Element>
\t\t</Element>
\t</m_RootCollections>
</AssetObjects..ArtDefSet>
`;
  for (const directory of [iconBuildArtDefDirectory, modArtDefDirectory]) {
    const outputPath = join(directory, "FallbackLeaders.artdef");
    writeFileSync(outputPath, xml);
    console.log(outputPath);
  }
};

const { width, height } = await buildFallbackPortraitPng();
convertPngToDds(join(iconsDirectory, `${OUR_NAME}.png`), join(textureOutputDirectory, `${OUR_NAME}.dds`));
buildFallbackPortraitTex(width, height);
buildFallbackPortraitXlp();
buildFallbackLeadersArtDef();
