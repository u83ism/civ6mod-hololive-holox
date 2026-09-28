// Pure tone-matching for photo-based Historic Moment illustrations, so a real photo sits next to
// the official art (hand-drawn ink lines over a single dark-brown -> ochre gradient) without
// looking like a color photo. The reference palette is measured from the official
// Moment_*.dds pixels rather than hand-picked:
//   1. luminance histogram of the photo is matched to the official luminance distribution
//   2. edges (Sobel on a 3x3-blurred luminance) are darkened to imitate ink outlines
//   3. each luminance is replaced by the average official color at that luminance
import type { RgbaImage } from "./moment-illustration-compositing.js";

type ToneReference = {
  // Average official RGB for each luminance 0-255.
  readonly colorByLuminance: readonly (readonly [number, number, number])[];
  // Cumulative distribution of official luminance (0-1) for each luminance 0-255.
  readonly luminanceCdf: readonly number[];
};

// Pixels at or above this alpha count as picture (below it is the vignette falloff).
const OPAQUE_ALPHA_THRESHOLD = 200;
// Edge magnitude where ink starts / reaches full strength, and how dark full-strength ink gets.
// Own choice tuned by eye against the official art, not measured.
const INK_EDGE_START = 40;
const INK_EDGE_FULL = 160;
const INK_MAX_DARKENING = 0.75;

const toLuminance = (red: number, green: number, blue: number): number => 0.299 * red + 0.587 * green + 0.114 * blue;

const toCdf = (histogram: readonly number[]): readonly number[] => {
  const total = histogram.reduce((sum, count) => sum + count, 0);
  let accumulated = 0;
  return histogram.map((count) => {
    accumulated += count;
    return accumulated / total;
  });
};

const findNearestMeasuredBelow = (measured: readonly unknown[], luminance: number): number => {
  for (let index = luminance - 1; index >= 0; index--) if (measured[index] !== undefined) return index;
  return -1;
};

const buildToneReference = (images: readonly RgbaImage[]): ToneReference => {
  const sums = Array.from({ length: 256 }, () => [0, 0, 0, 0]);
  for (const image of images) {
    for (let i = 0; i < image.data.length; i += 4) {
      if (image.data[i + 3]! < OPAQUE_ALPHA_THRESHOLD) continue;
      const bucket = sums[Math.round(toLuminance(image.data[i]!, image.data[i + 1]!, image.data[i + 2]!))]!;
      bucket[0]! += image.data[i]!;
      bucket[1]! += image.data[i + 1]!;
      bucket[2]! += image.data[i + 2]!;
      bucket[3]! += 1;
    }
  }
  const measured = sums.map(([red, green, blue, count]) =>
    count ? ([red! / count, green! / count, blue! / count] as const) : undefined,
  );
  // Luminances the official art never uses are linearly interpolated from the nearest measured ones.
  const colorByLuminance = measured.map((color, luminance) => {
    if (color) return color;
    const below = findNearestMeasuredBelow(measured, luminance);
    const above = measured.findIndex((candidate, index) => index > luminance && candidate !== undefined);
    if (below < 0) return measured[above]!;
    if (above < 0) return measured[below]!;
    const weight = (luminance - below) / (above - below);
    const [low, high] = [measured[below]!, measured[above]!];
    const lerp = (from: number, to: number): number => from + (to - from) * weight;
    return [lerp(low[0], high[0]), lerp(low[1], high[1]), lerp(low[2], high[2])] as const;
  });
  return { colorByLuminance, luminanceCdf: toCdf(sums.map((bucket) => bucket[3]!)) };
};

const computeBlurredLuminance = (luminance: Float32Array, width: number, height: number): Float32Array => {
  const at = (x: number, y: number): number =>
    luminance[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))]!;
  const blurred = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += at(x + dx, y + dy);
      blurred[y * width + x] = sum / 9;
    }
  }
  return blurred;
};

const computeSobelMagnitude = (source: Float32Array, width: number, height: number, x: number, y: number): number => {
  const at = (px: number, py: number): number =>
    source[Math.min(height - 1, Math.max(0, py)) * width + Math.min(width - 1, Math.max(0, px))]!;
  const gradientX =
    at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
  const gradientY =
    at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
  return Math.hypot(gradientX, gradientY);
};

const applyOfficialTone = (image: RgbaImage, reference: ToneReference): RgbaImage => {
  const { width, height } = image;
  const luminance = new Float32Array(width * height);
  const histogram = new Array<number>(256).fill(0);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const i = pixel * 4;
    luminance[pixel] = toLuminance(image.data[i]!, image.data[i + 1]!, image.data[i + 2]!);
    if (image.data[i + 3]! >= OPAQUE_ALPHA_THRESHOLD) histogram[Math.round(luminance[pixel]!)]! += 1;
  }
  const matchedLuminance = toCdf(histogram).map((share) => {
    const index = reference.luminanceCdf.findIndex((officialShare) => officialShare >= share);
    return index < 0 ? 255 : index;
  });
  const blurred = computeBlurredLuminance(luminance, width, height);
  const toned = Buffer.from(image.data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const edge = computeSobelMagnitude(blurred, width, height, x, y);
      const inkStrength = Math.min(1, Math.max(0, (edge - INK_EDGE_START) / (INK_EDGE_FULL - INK_EDGE_START)));
      const inked = matchedLuminance[Math.round(luminance[pixel]!)]! * (1 - INK_MAX_DARKENING * inkStrength);
      const color = reference.colorByLuminance[Math.max(0, Math.min(255, Math.round(inked)))]!;
      toned[pixel * 4] = Math.round(color[0]);
      toned[pixel * 4 + 1] = Math.round(color[1]);
      toned[pixel * 4 + 2] = Math.round(color[2]);
    }
  }
  return { data: toned, width, height };
};

export { buildToneReference, applyOfficialTone };
export type { ToneReference };
