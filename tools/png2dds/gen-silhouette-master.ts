// Build the civilization badge master (white silhouette on transparent, 1024x1024) from a line-art or
// flat-color SVG in Art/Source/ (paths relative to Art/Source/, e.g. kazama-iroha/leaf.svg; the SVG
// is read-only and never modified by this script). Dark ink becomes opaque white and white areas
// become transparent holes (see silhouette-master-compositing.ts), then the mark is centered with a
// margin so it fits inside the circular badge. Feed the output to gen-icon-sources.ts as the
// civilization master.
// Usage: tsx gen-silhouette-master.ts <svgFileName> <outputFileName> [<fillFraction>]
//   fillFraction: how much of the canvas the mark's longer side fills (default 0.65; smaller = more margin)
// Example: tsx gen-silhouette-master.ts kazama-iroha/leaf.svg kazama-iroha/leaf-icon-silhouette-master.png
import { join } from "node:path";
import sharp from "sharp";
import {
  computeSquareCrop,
  deriveInkLuminance,
  deriveWhiteSilhouette,
  findContentBounds,
} from "./silhouette-master-compositing.js";

const RENDER_SIZE = 2048;
const MASTER_SIZE = 1024;
const DEFAULT_FILL_FRACTION = 0.65;
const TRANSPARENT = { r: 255, g: 255, b: 255, alpha: 0 } as const;

const [, , svgFileName, outputFileName, fillFractionArgument] = process.argv;
if (!svgFileName || !outputFileName) {
  console.error("Usage: tsx gen-silhouette-master.ts <svgFileName> <outputFileName> [<fillFraction>]");
  process.exit(1);
}
const fillFraction = fillFractionArgument === undefined ? DEFAULT_FILL_FRACTION : Number(fillFractionArgument);
if (!(fillFraction > 0 && fillFraction <= 1)) {
  console.error(`fillFraction must be in (0, 1], got ${fillFractionArgument}`);
  process.exit(1);
}

const sourceDirectory = join(import.meta.dirname, "..", "..", "Art", "Source");

const { data, info } = await sharp(join(sourceDirectory, svgFileName))
  .resize({ width: RENDER_SIZE, height: RENDER_SIZE, fit: "contain", background: TRANSPARENT })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const rendered = { data, width: info.width, height: info.height };

const silhouette = deriveWhiteSilhouette(rendered, deriveInkLuminance(rendered));
const bounds = findContentBounds(silhouette);
if (!bounds) throw new Error(`${svgFileName}: nothing visible after conversion`);
const crop = computeSquareCrop(bounds, fillFraction);

// sharp runs extract before extend inside one pipeline, so pad first, then crop in a second pass.
const padded = await sharp(silhouette.data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .extend({ top: crop.side, bottom: crop.side, left: crop.side, right: crop.side, background: TRANSPARENT })
  .png()
  .toBuffer();
const outputPath = join(sourceDirectory, outputFileName);
await sharp(padded)
  .extract({ left: crop.left + crop.side, top: crop.top + crop.side, width: crop.side, height: crop.side })
  .resize(MASTER_SIZE, MASTER_SIZE)
  .png()
  .toFile(outputPath);
console.log(`${outputPath}: ${MASTER_SIZE}x${MASTER_SIZE} (mark fills ${Math.round(fillFraction * 100)}% of the canvas)`);
