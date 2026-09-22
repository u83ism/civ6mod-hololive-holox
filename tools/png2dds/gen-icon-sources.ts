// Regenerate Art/Icons/ICON_*.png at every required size from the master source art in
// Art/Source/. Master art must be square and at least as large as the biggest required size.
// Usage: tsx gen-icon-sources.ts <civilizationId> <leaderId> <civFullColorMasterFileName> <civSilhouetteMasterFileName> <leaderFaceMasterFileName>
// Example: tsx gen-icon-sources.ts REGLOSS_ICHIJOU REGLOSS_ICHIJOU_RIRIKA ichijou-corporation-logo-circle.png ichijou-corporation-logo-circle-for-transparent.png ichijou-ririka-face.png
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { civilizationIconName, civilizationIconSizes, leaderIconName, leaderIconSizes } from "./icon-manifest.js";

const [
  ,
  ,
  civilizationId,
  leaderId,
  civilizationFullColorMasterFileName,
  civilizationSilhouetteMasterFileName,
  leaderFaceMasterFileName,
] = process.argv;
if (
  !civilizationId ||
  !leaderId ||
  !civilizationFullColorMasterFileName ||
  !civilizationSilhouetteMasterFileName ||
  !leaderFaceMasterFileName
) {
  console.error(
    "Usage: tsx gen-icon-sources.ts <civilizationId> <leaderId> <civFullColorMasterFileName> <civSilhouetteMasterFileName> <leaderFaceMasterFileName>",
  );
  process.exit(1);
}

type RgbaImage = {
  readonly data: Buffer;
  readonly width: number;
  readonly height: number;
};

// Alpha-weighted (premultiplied) box-filter downsample: averaging without premultiplying
// by alpha first would bleed fully-transparent background color into the resized edge
// pixels, producing a faint fringe around the icon silhouette.
const downsampleImage = (source: RgbaImage, targetWidth: number, targetHeight: number): RgbaImage => {
  const destinationData = Buffer.alloc(targetWidth * targetHeight * 4);
  const scaleX = source.width / targetWidth;
  const scaleY = source.height / targetHeight;
  for (let destinationY = 0; destinationY < targetHeight; destinationY++) {
    const sourceTop = Math.floor(destinationY * scaleY);
    const sourceBottom = Math.max(sourceTop + 1, Math.floor((destinationY + 1) * scaleY));
    for (let destinationX = 0; destinationX < targetWidth; destinationX++) {
      const sourceLeft = Math.floor(destinationX * scaleX);
      const sourceRight = Math.max(sourceLeft + 1, Math.floor((destinationX + 1) * scaleX));

      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;
      let alphaSum = 0;
      let sampleCount = 0;
      for (let sourceY = sourceTop; sourceY < sourceBottom; sourceY++) {
        for (let sourceX = sourceLeft; sourceX < sourceRight; sourceX++) {
          const sourceIndex = (sourceY * source.width + sourceX) * 4;
          const alpha = source.data[sourceIndex + 3]!;
          redSum += source.data[sourceIndex]! * alpha;
          greenSum += source.data[sourceIndex + 1]! * alpha;
          blueSum += source.data[sourceIndex + 2]! * alpha;
          alphaSum += alpha;
          sampleCount++;
        }
      }

      const destinationIndex = (destinationY * targetWidth + destinationX) * 4;
      destinationData[destinationIndex + 3] = Math.round(alphaSum / sampleCount);
      if (alphaSum > 0) {
        destinationData[destinationIndex] = Math.round(redSum / alphaSum);
        destinationData[destinationIndex + 1] = Math.round(greenSum / alphaSum);
        destinationData[destinationIndex + 2] = Math.round(blueSum / alphaSum);
      }
    }
  }
  return { data: destinationData, width: targetWidth, height: targetHeight };
};

// Civ6 tints most civilization badge sizes at runtime via SetColor(playerColor) (see
// Instances/LeaderIcon.lua, Instances/CivilizationIcon.lua), so the shipped asset must be a
// white silhouette (RGB=255,255,255) carrying only the shape in its alpha channel. The 45px
// size is the one documented exception: it is displayed as-is without tinting (civics/tech
// tree), so it must stay full color. Verified against vanilla CivAztec22/32/45.dds pixel data.
// See icon-blp-pipeline.md's "白シルエット化" section for the full story (this was tried,
// reverted to full-color-everywhere because of a still-unresolved leader-picker/pause-menu
// color bug, and is now being re-tried).
const toWhiteSilhouette = (image: RgbaImage): RgbaImage => {
  const silhouetteData = Buffer.from(image.data);
  for (let pixelIndex = 0; pixelIndex < silhouetteData.length; pixelIndex += 4) {
    silhouetteData[pixelIndex] = 255;
    silhouetteData[pixelIndex + 1] = 255;
    silhouetteData[pixelIndex + 2] = 255;
  }
  return { data: silhouetteData, width: image.width, height: image.height };
};

// Leader portrait badges are displayed inside a circular frame; the master face art fills
// its full square canvas (hair/shoulders reach past the inscribed circle), so without this
// mask that content pokes out past the frame in-game. Coverage fades over the last half
// pixel from the radius instead of a hard cutoff, so the downsampled sizes keep a clean edge.
const maskToInscribedCircle = (image: RgbaImage): RgbaImage => {
  const radius = image.width / 2;
  const centerX = image.width / 2;
  const centerY = image.height / 2;
  const maskedData = Buffer.from(image.data);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const distanceFromCenter = Math.hypot(x + 0.5 - centerX, y + 0.5 - centerY);
      const edgeCoverage = Math.min(1, Math.max(0, radius - distanceFromCenter + 0.5));
      const alphaIndex = (y * image.width + x) * 4 + 3;
      maskedData[alphaIndex] = Math.round(maskedData[alphaIndex]! * edgeCoverage);
    }
  }
  return { data: maskedData, width: image.width, height: image.height };
};

const readRgbaImage = (path: string): RgbaImage => {
  const png = PNG.sync.read(readFileSync(path));
  if (png.width !== png.height) {
    throw new Error(`${path}: master source must be square (got ${png.width}x${png.height})`);
  }
  return { data: png.data, width: png.width, height: png.height };
};

const writeIconPng = (image: RgbaImage, outputPath: string): void => {
  const png = new PNG({ width: image.width, height: image.height });
  image.data.copy(png.data);
  writeFileSync(outputPath, PNG.sync.write(png));
  console.log(`${outputPath}: ${image.width}x${image.height}`);
};

type IconSourceSpec = {
  readonly masterFileName: string;
  readonly sizes: readonly number[];
  readonly nameForSize: (size: number) => string;
  readonly clipToCircle: boolean;
  readonly isFullColor: boolean;
};

const sourceDirectory = join(import.meta.dirname, "..", "..", "Art", "Source");
const outputDirectory = join(import.meta.dirname, "..", "..", "Art", "Icons");

const civilizationFullColorSizes = civilizationIconSizes.filter((size) => size === 45);
const civilizationSilhouetteSizes = civilizationIconSizes.filter((size) => size !== 45);

const iconSources: readonly IconSourceSpec[] = [
  {
    // Civ6 displays this one size as-is (civics/tech tree) instead of tinting it at
    // runtime, so it's the only civilization badge size that stays full color.
    masterFileName: civilizationFullColorMasterFileName,
    sizes: civilizationFullColorSizes,
    nameForSize: (size) => civilizationIconName(civilizationId, size),
    clipToCircle: true, // math-precise circle edge, matching the leader portrait treatment
    isFullColor: true,
  },
  {
    // Every other civilization badge size is tinted at runtime via SetColor(playerColor),
    // so the source must already be a white-on-transparent silhouette (see toWhiteSilhouette
    // above): white background made transparent, only the logo mark left opaque.
    masterFileName: civilizationSilhouetteMasterFileName,
    sizes: civilizationSilhouetteSizes,
    nameForSize: (size) => civilizationIconName(civilizationId, size),
    clipToCircle: false,
    isFullColor: false,
  },
  {
    masterFileName: leaderFaceMasterFileName,
    sizes: leaderIconSizes,
    nameForSize: (size) => leaderIconName(leaderId, size),
    clipToCircle: true,
    // Leader portraits are never tinted by the game, so they stay full color at every size.
    isFullColor: true,
  },
];

for (const { masterFileName, sizes, nameForSize, clipToCircle, isFullColor } of iconSources) {
  const rawMaster = readRgbaImage(join(sourceDirectory, masterFileName));
  const master = clipToCircle ? maskToInscribedCircle(rawMaster) : rawMaster;
  for (const size of sizes) {
    if (size > master.width) {
      throw new Error(`${masterFileName}: master is ${master.width}px, too small to produce a ${size}px icon`);
    }
    const resized = size === master.width ? master : downsampleImage(master, size, size);
    const finalImage = isFullColor ? resized : toWhiteSilhouette(resized);
    writeIconPng(finalImage, join(outputDirectory, `${nameForSize(size)}.png`));
  }
}
