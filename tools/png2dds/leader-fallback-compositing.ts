// Pure RGBA-buffer compositing for the diplomacy-screen fallback portrait, replicating two
// effects that turned out to be baked directly into official FALLBACK_NEUTRAL_*.dds pixel data
// (verified by reading raw pixel bytes from Civ6 SDK Assets pantry/Textures/
// FALLBACK_NEUTRAL_ROBERT_THE_BRUCE.dds and 4 other official leaders, not an engine-side
// effect): the character doesn't fill the full canvas height (a transparent margin is left
// above the head, measured 5-15% across the 5 leaders, avg ~10%), and the bottom of the canvas
// fades the character's color -- not its alpha, which stays opaque throughout -- toward black
// (measured fade starting ~20-25% up from the bottom, reaching near-black at the last row).
type RgbaImage = {
  readonly data: Buffer;
  readonly width: number;
  readonly height: number;
};

// Places content flush against the bottom of a taller canvas, leaving the rest transparent.
const padTopMargin = (content: RgbaImage, canvasHeight: number): RgbaImage => {
  const canvasData = Buffer.alloc(content.width * canvasHeight * 4); // zero-filled: fully transparent
  const topOffsetRows = canvasHeight - content.height;
  content.data.copy(canvasData, topOffsetRows * content.width * 4);
  return { data: canvasData, width: content.width, height: canvasHeight };
};

// Linearly darkens RGB (never alpha) from unchanged at fadeStartFraction down to black at the
// last row, matching the smooth (not hard-cutoff) falloff measured in the official DDS files.
const applyBottomFade = (image: RgbaImage, fadeStartFraction: number): RgbaImage => {
  const fadedData = Buffer.from(image.data);
  for (let y = 0; y < image.height; y++) {
    const rowFraction = y / (image.height - 1);
    if (rowFraction < fadeStartFraction) continue;
    const fadeProgress = (rowFraction - fadeStartFraction) / (1 - fadeStartFraction);
    const brightnessMultiplier = 1 - fadeProgress;
    for (let x = 0; x < image.width; x++) {
      const pixelIndex = (y * image.width + x) * 4;
      fadedData[pixelIndex] = Math.round(fadedData[pixelIndex]! * brightnessMultiplier);
      fadedData[pixelIndex + 1] = Math.round(fadedData[pixelIndex + 1]! * brightnessMultiplier);
      fadedData[pixelIndex + 2] = Math.round(fadedData[pixelIndex + 2]! * brightnessMultiplier);
    }
  }
  return { data: fadedData, width: image.width, height: image.height };
};

export { padTopMargin, applyBottomFade };
export type { RgbaImage };
