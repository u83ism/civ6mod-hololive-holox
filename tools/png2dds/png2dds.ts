// Convert a 32-bit RGBA PNG into an uncompressed 32bpp RGBA DDS with a full mip chain,
// matching the byte-for-byte structure of Firaxis's own shipped UI icon DDS files
// (verified against Civ6 SDK Assets pantry/Textures/CivAztec32.dds and Montezuma32.dds).
// Non-square images are supported too (verified against pantry/Textures/
// FALLBACK_NEUTRAL_ROBERT_THE_BRUCE.dds, a non-square leader fallback portrait that also
// ships with a full mip chain down to 1x1 despite civ6wiki.info claiming these have none).
// Usage: tsx png2dds.ts <in.png> <out.dds>
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

type MipLevel = {
  readonly data: Buffer;
  readonly width: number;
  readonly height: number;
};

// Box-filter downsample by exactly half (rounding down), used to build each mip level.
const downsampleByHalf = (source: MipLevel): MipLevel => {
  const newWidth = Math.max(1, source.width >> 1);
  const newHeight = Math.max(1, source.height >> 1);
  const destinationData = Buffer.alloc(newWidth * newHeight * 4);
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const leftX = Math.min(x * 2, source.width - 1);
      const rightX = Math.min(x * 2 + 1, source.width - 1);
      const topY = Math.min(y * 2, source.height - 1);
      const bottomY = Math.min(y * 2 + 1, source.height - 1);
      for (let channelIndex = 0; channelIndex < 4; channelIndex++) {
        const channelSum =
          source.data[(topY * source.width + leftX) * 4 + channelIndex]! +
          source.data[(topY * source.width + rightX) * 4 + channelIndex]! +
          source.data[(bottomY * source.width + leftX) * 4 + channelIndex]! +
          source.data[(bottomY * source.width + rightX) * 4 + channelIndex]!;
        destinationData[(y * newWidth + x) * 4 + channelIndex] = Math.round(channelSum / 4);
      }
    }
  }
  return { data: destinationData, width: newWidth, height: newHeight };
};

const computeMipCount = (size: number): number => {
  let count = 1;
  let remaining = size;
  while (remaining > 1) {
    remaining = remaining >> 1;
    count++;
  }
  return count;
};

const convertPngToDds = (inputPath: string, outputPath: string): void => {
  const png = PNG.sync.read(readFileSync(inputPath));
  const { width, height, data } = png; // RGBA, row-major, top-down

  const mipLevels: MipLevel[] = [{ data, width, height }];
  while (mipLevels[mipLevels.length - 1]!.width > 1 || mipLevels[mipLevels.length - 1]!.height > 1) {
    mipLevels.push(downsampleByHalf(mipLevels[mipLevels.length - 1]!));
  }
  const expectedMipCount = computeMipCount(Math.max(width, height));
  if (mipLevels.length !== expectedMipCount) {
    throw new Error(`internal mip count mismatch: ${mipLevels.length} vs expected ${expectedMipCount}`);
  }

  const pixelBytes = mipLevels.reduce((sum, level) => sum + level.width * level.height * 4, 0);
  const headerSize = 128; // 4-byte magic + 124-byte DDS_HEADER
  const buffer = Buffer.alloc(headerSize + pixelBytes);

  let byteOffset = 0;
  buffer.write("DDS ", byteOffset, "ascii");
  byteOffset += 4;
  buffer.writeUInt32LE(124, byteOffset);
  byteOffset += 4; // dwSize
  buffer.writeUInt32LE(0x00021007, byteOffset);
  byteOffset += 4; // dwFlags: CAPS|HEIGHT|WIDTH|PIXELFORMAT|MIPMAPCOUNT
  buffer.writeUInt32LE(height, byteOffset);
  byteOffset += 4;
  buffer.writeUInt32LE(width, byteOffset);
  byteOffset += 4;
  buffer.writeUInt32LE(0, byteOffset);
  byteOffset += 4; // dwPitchOrLinearSize (unused, matches real files)
  buffer.writeUInt32LE(1, byteOffset);
  byteOffset += 4; // dwDepth (Firaxis writes 1, not 0)
  buffer.writeUInt32LE(expectedMipCount, byteOffset);
  byteOffset += 4; // dwMipMapCount
  buffer.write("FTXT", byteOffset, "ascii"); // dwReserved1[0]: Firaxis marker (present in real files)
  byteOffset += 4 * 11; // rest of dwReserved1 left zero
  buffer.writeUInt32LE(32, byteOffset);
  byteOffset += 4; // pixel format dwSize
  buffer.writeUInt32LE(0x41, byteOffset);
  byteOffset += 4; // DDPF_ALPHAPIXELS|DDPF_RGB
  buffer.writeUInt32LE(0, byteOffset);
  byteOffset += 4; // dwFourCC
  buffer.writeUInt32LE(32, byteOffset);
  byteOffset += 4; // dwRGBBitCount
  buffer.writeUInt32LE(0x000000ff, byteOffset);
  byteOffset += 4; // dwRBitMask
  buffer.writeUInt32LE(0x0000ff00, byteOffset);
  byteOffset += 4; // dwGBitMask
  buffer.writeUInt32LE(0x00ff0000, byteOffset);
  byteOffset += 4; // dwBBitMask
  buffer.writeUInt32LE(0xff000000, byteOffset);
  byteOffset += 4; // dwABitMask
  buffer.writeUInt32LE(0x00401008, byteOffset);
  byteOffset += 4; // dwCaps: COMPLEX|TEXTURE|MIPMAP
  byteOffset += 4 * 4; // dwCaps2/3/4, dwReserved2, left zero

  // Pixel data is straight R,G,B,A per pixel (matches the masks above) for every mip level, largest first.
  for (const level of mipLevels) {
    level.data.copy(buffer, byteOffset);
    byteOffset += level.data.length;
  }

  writeFileSync(outputPath, buffer);
  console.log(`${outputPath}: ${width}x${height}, ${expectedMipCount} mips, ${buffer.length} bytes`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error("Usage: tsx png2dds.ts <in.png> <out.dds>");
    process.exit(1);
  }
  convertPngToDds(inputPath, outputPath);
}

export { convertPngToDds, computeMipCount };
