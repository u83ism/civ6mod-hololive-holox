// Pure RGBA-buffer compositing for Historic Moment illustrations (MomentIllustrations.Texture),
// replicating the elliptical vignette baked into official Moment_UniqueUnit_*.dds pixel data
// (verified by reading raw alpha bytes from Civ6 SDK Assets pantry/Textures/
// Moment_UniqueUnit_Cree.dds: all four corners are fully transparent, the center is ~95% opaque,
// and the falloff is elliptical rather than a hard rectangular fade).
type RgbaImage = {
  readonly data: Buffer;
  readonly width: number;
  readonly height: number;
};

// Places content centered on a canvas of the given size, leaving the rest transparent.
const centerOnCanvas = (content: RgbaImage, canvasWidth: number, canvasHeight: number): RgbaImage => {
  const canvasData = Buffer.alloc(canvasWidth * canvasHeight * 4); // zero-filled: fully transparent
  const offsetX = Math.round((canvasWidth - content.width) / 2);
  const offsetY = Math.round((canvasHeight - content.height) / 2);
  for (let y = 0; y < content.height; y++) {
    const canvasY = y + offsetY;
    if (canvasY < 0 || canvasY >= canvasHeight) continue;
    for (let x = 0; x < content.width; x++) {
      const canvasX = x + offsetX;
      if (canvasX < 0 || canvasX >= canvasWidth) continue;
      const sourceIndex = (y * content.width + x) * 4;
      const destinationIndex = (canvasY * canvasWidth + canvasX) * 4;
      content.data.copy(canvasData, destinationIndex, sourceIndex, sourceIndex + 4);
    }
  }
  return { data: canvasData, width: canvasWidth, height: canvasHeight };
};

const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Multiplies alpha by an elliptical vignette: unchanged inside innerRadiusFraction (as a
// fraction of the half-width/half-height), fading smoothly to fully transparent at the canvas
// edge (normalized elliptical distance 1.0). Matches the measured official falloff (corners at
// distance sqrt(2) are always past 1.0 and end up fully transparent).
const applyEllipticalVignette = (image: RgbaImage, innerRadiusFraction: number): RgbaImage => {
  const vignetted = Buffer.from(image.data);
  const centerX = (image.width - 1) / 2;
  const centerY = (image.height - 1) / 2;
  for (let y = 0; y < image.height; y++) {
    const normalizedY = (y - centerY) / (image.height / 2);
    for (let x = 0; x < image.width; x++) {
      const normalizedX = (x - centerX) / (image.width / 2);
      const ellipticalDistance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
      const alphaMultiplier = 1 - smoothstep(innerRadiusFraction, 1, ellipticalDistance);
      const pixelIndex = (y * image.width + x) * 4 + 3;
      vignetted[pixelIndex] = Math.round(vignetted[pixelIndex]! * alphaMultiplier);
    }
  }
  return { data: vignetted, width: image.width, height: image.height };
};

export { centerOnCanvas, applyEllipticalVignette };
export type { RgbaImage };
