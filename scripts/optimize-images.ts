/**
 * Pre-optimize raw photos before committing to the repo.
 *
 * Usage: npm run optimize-images -- <input-dir> [output-dir]
 * Defaults: input = ./raw-photos, output = ./src/assets/images/photos
 *
 * Resizes to max 2400px, JPEG quality 82, preserves EXIF metadata.
 */

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const INPUT_DIR = process.argv[2] ?? "./raw-photos";
const OUTPUT_DIR = process.argv[3] ?? "./src/assets/images/photos";
const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 82;

async function optimizePhoto(inputPath: string, outputPath: string) {
  const start = Date.now();
  try {
    await sharp(inputPath)
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true,
      })
      .withMetadata()
      .toFile(outputPath);

    const inputSize = (fs.statSync(inputPath).size / (1024 * 1024)).toFixed(1);
    const outputSize = (fs.statSync(outputPath).size / 1024).toFixed(0);
    const elapsed = Date.now() - start;
    console.log(
      `  ${path.basename(inputPath)}: ${inputSize}MB → ${outputSize}KB (${elapsed}ms)`,
    );
  } catch (err) {
    console.error(`  Error processing ${inputPath}:`, err);
  }
}

async function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Input directory "${INPUT_DIR}" not found.`);
    console.log(
      "Usage: npm run optimize-images -- <input-dir> [output-dir]",
    );
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = fs
    .readdirSync(INPUT_DIR)
    .filter((f) => /\.(jpe?g|tiff?|png|webp)$/i.test(f));

  if (files.length === 0) {
    console.log("No image files found in", INPUT_DIR);
    process.exit(0);
  }

  console.log(
    `Optimizing ${files.length} image(s) to max ${MAX_DIMENSION}px, JPEG q=${JPEG_QUALITY}...\n`,
  );

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputName = path.parse(file).name + ".jpg";
    const outputPath = path.join(OUTPUT_DIR, outputName);
    await optimizePhoto(inputPath, outputPath);
  }

  console.log(`\nDone. Optimized images saved to ${OUTPUT_DIR}`);
}

main();
