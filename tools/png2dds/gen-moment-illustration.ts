// Build a Historic Moment illustration (e.g. Moment_UniqueUnit_ReglossIchijou_Uni) shown when a
// UU (e.g. UNIT_REGLOSS_ICHIJOU_UNI, uses UU_uni.md naming) is trained for the first time, from
// a flat illustration in Art/Source/ (read-only; never modified by this script).
// Canvas size 456x332 and format (uncompressed RGBA, full mip chain) match every official
// Moment_UniqueUnit_*.dds in Civ6 SDK Assets pantry/Textures/Expansion1 (7 of 7 samples
// identical). The elliptical alpha vignette (fully opaque center, fully transparent corners)
// replicates the falloff measured from Moment_UniqueUnit_Cree.dds's raw alpha channel.
// Also generates the sidecar .tex (copied from that same official template with only the name
// substituted, since width/height/mipmap count are identical) and a new XLP package
// (UI/RegLoss_Moments, following the UITexture class used by RegLoss_Icons.xlp etc.).
// Usage: tsx gen-moment-illustration.ts <momentIllustrationName> <unitType> <sourceFileName>
// Example: tsx gen-moment-illustration.ts Moment_UniqueUnit_ReglossIchijou_Uni UNIT_REGLOSS_ICHIJOU_UNI toy-poodle.png
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { convertPngToDds, computeMipCount } from "./png2dds.js";
import { centerOnCanvas, applyEllipticalVignette } from "./moment-illustration-compositing.js";

const [, , momentIllustrationName, unitType, sourceFileName] = process.argv;
if (!momentIllustrationName || !unitType || !sourceFileName) {
  console.error("Usage: tsx gen-moment-illustration.ts <momentIllustrationName> <unitType> <sourceFileName>");
  process.exit(1);
}

const CANVAS_WIDTH = 456;
const CANVAS_HEIGHT = 332;
// Character fills most of the canvas height but leaves margin so the vignette doesn't eat into
// its silhouette (own choice, not measured from official data like the canvas size/format are).
const CONTENT_HEIGHT_FRACTION = 0.85;
// Measured from Moment_UniqueUnit_Cree.dds's alpha channel: ~20% in from an edge is already
// near-fully-opaque, so the vignette's opaque core extends to roughly 0.55-0.6 of the half-extent.
const VIGNETTE_INNER_RADIUS_FRACTION = 0.55;
const OUR_NAME = momentIllustrationName;
const UNIT_TYPE = unitType;
const SDK_ASSETS_TEXTURES =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Sid Meier's Civilization VI SDK Assets\\Civ6\\DLC\\Expansion1\\pantry\\Textures";
const TEX_TEMPLATE_NAME = "Moment_UniqueUnit_Cree";

const sourcePath = join(import.meta.dirname, "..", "..", "Art", "Source", sourceFileName);
const textureOutputDirectory = join(import.meta.dirname, "..", "IconBuild", "Textures");
const xlpOutputDirectory = join(import.meta.dirname, "..", "IconBuild", "XLPs");
mkdirSync(textureOutputDirectory, { recursive: true });
mkdirSync(xlpOutputDirectory, { recursive: true });

const buildMomentIllustrationPng = async (): Promise<void> => {
  const { data, info } = await sharp(sourcePath)
    .trim()
    .resize({ height: Math.round(CANVAS_HEIGHT * CONTENT_HEIGHT_FRACTION) })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const content = { data, width: info.width, height: info.height };
  const canvas = centerOnCanvas(content, CANVAS_WIDTH, CANVAS_HEIGHT);
  const vignetted = applyEllipticalVignette(canvas, VIGNETTE_INNER_RADIUS_FRACTION);

  const pngPath = join(textureOutputDirectory, `${OUR_NAME}.png`);
  await sharp(vignetted.data, { raw: { width: vignetted.width, height: vignetted.height, channels: 4 } })
    .png()
    .toFile(pngPath);
  console.log(`${pngPath}: ${vignetted.width}x${vignetted.height} (centered, elliptical vignette applied)`);
};

const buildMomentIllustrationTex = (): void => {
  const templatePath = join(SDK_ASSETS_TEXTURES, `${TEX_TEMPLATE_NAME}.tex`);
  const numMipMaps = computeMipCount(Math.max(CANVAS_WIDTH, CANVAS_HEIGHT)) - 1; // official .tex excludes the base level
  const xml = readFileSync(templatePath, "utf8")
    .split(TEX_TEMPLATE_NAME)
    .join(OUR_NAME)
    .replace(/<m_Height>\d+<\/m_Height>/, `<m_Height>${CANVAS_HEIGHT}</m_Height>`)
    .replace(/<m_Width>\d+<\/m_Width>/, `<m_Width>${CANVAS_WIDTH}</m_Width>`)
    .replace(/<m_NumMipMaps>\d+<\/m_NumMipMaps>/, `<m_NumMipMaps>${numMipMaps}</m_NumMipMaps>`);
  const outputPath = join(textureOutputDirectory, `${OUR_NAME}.tex`);
  writeFileSync(outputPath, xml);
  console.log(`${outputPath} (from ${TEX_TEMPLATE_NAME}.tex, ${CANVAS_WIDTH}x${CANVAS_HEIGHT}, ${numMipMaps} mips)`);
};

const buildMomentIllustrationXlp = (): void => {
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<AssetObjects..XLP>
\t<m_Version>
\t\t<major>4</major>
\t\t<minor>0</minor>
\t\t<build>434</build>
\t\t<revision>920</revision>
\t</m_Version>
\t<m_ClassName text="UITexture"/>
\t<m_PackageName text="UI/RegLoss_Moments"/>
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
  const outputPath = join(xlpOutputDirectory, "RegLoss_Moments.xlp");
  writeFileSync(outputPath, xml);
  console.log(outputPath);
};

await buildMomentIllustrationPng();
convertPngToDds(join(textureOutputDirectory, `${OUR_NAME}.png`), join(textureOutputDirectory, `${OUR_NAME}.dds`));
buildMomentIllustrationTex();
buildMomentIllustrationXlp();
console.log(`\nRemember: this Moment illustration is for ${UNIT_TYPE} (UU "Uni").`);
