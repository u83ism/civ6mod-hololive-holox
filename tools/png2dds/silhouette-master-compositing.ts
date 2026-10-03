// Pure RGBA-buffer steps for turning a rendered line-art/flat-color SVG (dark ink over white or
// transparent) into the white-on-transparent civilization badge master (see gen-silhouette-master.ts).
// Every civilization badge size is tinted at runtime, so only the shape in the alpha channel matters:
// dark ink becomes opaque white, white areas become fully transparent holes that show the badge color.
import type { RgbaImage } from "./leader-fallback-compositing.js";

type ContentBounds = {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
};

type SquareCrop = {
  readonly left: number;
  readonly top: number;
  readonly side: number;
};

const FULLY_OPAQUE_ALPHA = 250;
const CONTENT_ALPHA_THRESHOLD = 8;

const calculateLuminance = (red: number, green: number, blue: number): number => (red + green + blue) / 765;

// Luminance of the darkest fully opaque pixel: the real "ink" color. SVG strokes are rarely pure
// black (e.g. #231f20 is ~0.13), so mapping luminance straight to alpha would cap the ink at ~87%
// opacity; dividing by the ink's own darkness makes the ink exactly opaque.
const deriveInkLuminance = (image: RgbaImage): number => {
  let darkest = 1;
  for (let pixelIndex = 0; pixelIndex < image.data.length; pixelIndex += 4) {
    if (image.data[pixelIndex + 3]! < FULLY_OPAQUE_ALPHA) continue;
    darkest = Math.min(
      darkest,
      calculateLuminance(image.data[pixelIndex]!, image.data[pixelIndex + 1]!, image.data[pixelIndex + 2]!),
    );
  }
  return darkest;
};

// Derived from one render's own pixels (no second mask render), so edge anti-aliasing cannot drift
// between "body" and "holes" (the dest-out trap documented in the make-leader-icons Skill).
const deriveWhiteSilhouette = (image: RgbaImage, inkLuminance: number): RgbaImage => {
  if (inkLuminance >= 0.9) throw new Error("no dark ink found: the source has no opaque dark pixels");
  const silhouetteData = Buffer.from(image.data);
  for (let pixelIndex = 0; pixelIndex < silhouetteData.length; pixelIndex += 4) {
    const luminance = calculateLuminance(
      silhouetteData[pixelIndex]!,
      silhouetteData[pixelIndex + 1]!,
      silhouetteData[pixelIndex + 2]!,
    );
    const inkCoverage = Math.min(1, (1 - luminance) / (1 - inkLuminance));
    silhouetteData[pixelIndex + 3] = Math.round(silhouetteData[pixelIndex + 3]! * inkCoverage);
    silhouetteData[pixelIndex] = 255;
    silhouetteData[pixelIndex + 1] = 255;
    silhouetteData[pixelIndex + 2] = 255;
  }
  return { data: silhouetteData, width: image.width, height: image.height };
};

const findContentBounds = (image: RgbaImage): ContentBounds | undefined => {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3]! <= CONTENT_ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX < 0 ? undefined : { minX, maxX, minY, maxY };
};

// The badge is a circle, so a tall/wide mark hugging its bounding box pokes into the rim. The square
// crop is sized so the content's longer side fills only fillFraction of it, centered on the content.
// left/top may be negative or exceed the image: the caller pads the image before extracting.
const computeSquareCrop = (bounds: ContentBounds, fillFraction: number): SquareCrop => {
  const longerSide = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) + 1;
  const side = Math.ceil(longerSide / fillFraction);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return { left: Math.round(centerX - side / 2), top: Math.round(centerY - side / 2), side };
};

export { deriveInkLuminance, deriveWhiteSilhouette, findContentBounds, computeSquareCrop };
export type { ContentBounds, SquareCrop };
