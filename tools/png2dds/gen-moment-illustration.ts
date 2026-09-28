// Build a Historic Moment illustration (MomentIllustrations.Texture) shown for the first unique
// unit/district/building, from art in Art/Source/ (path relative to Art/Source/, e.g.
// sakamata-chloe/foo.png; read-only; never modified by this script).
// Canvas size 456x332 and format (uncompressed RGBA, full mip chain) match every official
// Moment_UniqueUnit_*.dds and Moment_Infrastructure_*.dds in Civ6 SDK Assets
// pantry/Textures/Expansion1. The elliptical alpha vignette (fully opaque center, fully
// transparent corners) replicates the falloff measured from their raw alpha channels.
// Two fit modes:
//   cutout: transparent-background character art, trimmed and centered at 85% of the height
//   photo:  opaque photo/illustration, cropped to the canvas aspect ratio (bottom edge kept,
//           horizontally centered) and then downscaled to fill the whole canvas, then recolored
//           to the official sepia tone with ink-like edges (moment-illustration-tone.ts; the
//           reference palette is measured from every official Moment_*.dds at run time)
// Also generates the sidecar .tex (copied from the official template with only the name
// substituted) and adds the entry to the shared UI/HoloX_Moments XLP package (existing entries kept).
// Usage: tsx gen-moment-illustration.ts <cutout|photo> <momentIllustrationName> <sourceFileName>
// Example: tsx gen-moment-illustration.ts photo Moment_Infrastructure_HoloxOrcaParadise sakamata-chloe/waterpark.jpg
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp, { type Sharp } from "sharp";
import { convertPngToDds, computeMipCount } from "./png2dds.js";
import {
  centerOnCanvas,
  applyEllipticalVignette,
  computeBottomCenteredCropBox,
  type RgbaImage,
} from "./moment-illustration-compositing.js";
import { parseXlpEntryIds, buildMomentXlp } from "./moment-xlp.js";
import { buildToneReference, applyOfficialTone, type ToneReference } from "./moment-illustration-tone.js";

const [, , fitMode, momentIllustrationName, sourceFileName] = process.argv;
if ((fitMode !== "cutout" && fitMode !== "photo") || !momentIllustrationName || !sourceFileName) {
  console.error("Usage: tsx gen-moment-illustration.ts <cutout|photo> <momentIllustrationName> <sourceFileName>");
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
const SDK_ASSETS_TEXTURES =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Sid Meier's Civilization VI SDK Assets\\Civ6\\DLC\\Expansion1\\pantry\\Textures";
const TEX_TEMPLATE_NAME = "Moment_UniqueUnit_Cree";

const sourcePath = join(import.meta.dirname, "..", "..", "Art", "Source", sourceFileName);
const textureOutputDirectory = join(import.meta.dirname, "..", "IconBuild", "Textures");
const xlpOutputPath = join(import.meta.dirname, "..", "IconBuild", "XLPs", "HoloX_Moments.xlp");
mkdirSync(textureOutputDirectory, { recursive: true });

const toRgbaImage = async (pipeline: Sharp): Promise<RgbaImage> => {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};

const loadCutoutCanvas = async (): Promise<RgbaImage> => {
  const content = await toRgbaImage(
    sharp(sourcePath).trim().resize({ height: Math.round(CANVAS_HEIGHT * CONTENT_HEIGHT_FRACTION) }),
  );
  return centerOnCanvas(content, CANVAS_WIDTH, CANVAS_HEIGHT);
};

const loadPhotoCanvas = async (): Promise<RgbaImage> => {
  const { width, height } = await sharp(sourcePath).metadata();
  const cropBox = computeBottomCenteredCropBox(width, height, CANVAS_WIDTH / CANVAS_HEIGHT);
  return toRgbaImage(sharp(sourcePath).extract(cropBox).resize(CANVAS_WIDTH, CANVAS_HEIGHT, { fit: "fill" }));
};

// Official Moment_*.dds files are uncompressed RGBA (R in the lowest byte, checked via the
// header's red bit mask) with the plain 128-byte DDS header.
const loadOfficialToneReference = (): ToneReference => {
  const officialImages = readdirSync(SDK_ASSETS_TEXTURES)
    .filter((fileName) => /^Moment_(Infrastructure|UniqueUnit)_.*.dds$/.test(fileName))
    .map((fileName): RgbaImage => {
      const file = readFileSync(join(SDK_ASSETS_TEXTURES, fileName));
      if (file.readUInt32LE(92) !== 0xff) throw new Error(`${fileName}: unexpected DDS pixel layout`);
      const height = file.readUInt32LE(12);
      const width = file.readUInt32LE(16);
      return { data: file.subarray(128, 128 + width * height * 4), width, height };
    });
  if (officialImages.length === 0) throw new Error(`No official Moment_*.dds found in ${SDK_ASSETS_TEXTURES}`);
  return buildToneReference(officialImages);
};

const saveMomentIllustrationPng = async (): Promise<string> => {
  const canvas = fitMode === "cutout" ? await loadCutoutCanvas() : await loadPhotoCanvas();
  const vignetted = applyEllipticalVignette(canvas, VIGNETTE_INNER_RADIUS_FRACTION);
  // Toned after the vignette so the luminance histogram only counts the visible (opaque) core.
  const finished = fitMode === "photo" ? applyOfficialTone(vignetted, loadOfficialToneReference()) : vignetted;
  const pngPath = join(textureOutputDirectory, `${OUR_NAME}.png`);
  await sharp(finished.data, { raw: { width: finished.width, height: finished.height, channels: 4 } })
    .png()
    .toFile(pngPath);
  console.log(`${pngPath}: ${finished.width}x${finished.height} (${fitMode}, elliptical vignette applied)`);
  return pngPath;
};

const writeMomentIllustrationTex = (): void => {
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

const writeMomentXlp = (): void => {
  const existingEntryIds = existsSync(xlpOutputPath) ? parseXlpEntryIds(readFileSync(xlpOutputPath, "utf8")) : [];
  const entryIds = existingEntryIds.includes(OUR_NAME) ? existingEntryIds : [...existingEntryIds, OUR_NAME];
  writeFileSync(xlpOutputPath, buildMomentXlp(entryIds));
  console.log(`${xlpOutputPath}: ${entryIds.join(", ")}`);
};

const pngPath = await saveMomentIllustrationPng();
convertPngToDds(pngPath, join(textureOutputDirectory, `${OUR_NAME}.dds`));
writeMomentIllustrationTex();
writeMomentXlp();
