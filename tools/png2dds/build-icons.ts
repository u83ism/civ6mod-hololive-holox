// Regenerate every ICON_*.dds in Art/Icons from its ICON_*.png source.
// Usage: tsx build-icons.ts
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { convertPngToDds } from "./png2dds.js";

const iconSourceDirectory = join(import.meta.dirname, "..", "..", "Art", "Icons");
const outputDirectory = join(import.meta.dirname, "..", "IconBuild", "Textures");
mkdirSync(outputDirectory, { recursive: true });

for (const fileName of readdirSync(iconSourceDirectory)) {
  if (!fileName.startsWith("ICON_") || !fileName.endsWith(".png")) continue;
  const inputPath = join(iconSourceDirectory, fileName);
  const outputPath = join(outputDirectory, fileName.replace(/\.png$/, ".dds"));
  convertPngToDds(inputPath, outputPath);
}
