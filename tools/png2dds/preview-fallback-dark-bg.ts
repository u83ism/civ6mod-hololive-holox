// Composite Art/Icons/FALLBACK_NEUTRAL_*.png onto a dark background approximating the
// diplomacy screen, so the top-margin/knee-crop/bottom-fade tuning in gen-leader-fallback.ts
// can be checked by eye before spending a ModBuddy build+copy round trip on it (the PNG viewed
// directly renders on white, which hides how the bottom fade -- a color-only fade, alpha stays
// opaque -- actually reads against a dark panel).
// Usage: tsx preview-fallback-dark-bg.ts <FALLBACK_NEUTRAL_*.png>
import { join } from "node:path";
import sharp from "sharp";

const [, , inputFileName] = process.argv;
if (!inputFileName) {
  console.error("Usage: tsx preview-fallback-dark-bg.ts <FALLBACK_NEUTRAL_*.png>");
  process.exit(1);
}

const iconsDirectory = join(import.meta.dirname, "..", "..", "Art", "Icons");
const inputPath = join(iconsDirectory, inputFileName);
const outputPath = join(iconsDirectory, inputFileName.replace(/\.png$/, "_preview-dark-bg.png"));

await sharp(inputPath).flatten({ background: { r: 10, g: 10, b: 20 } }).toFile(outputPath);
console.log(outputPath);
