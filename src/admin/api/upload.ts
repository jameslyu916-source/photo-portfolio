import path from "node:path";
import fs from "node:fs";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import Busboy from "busboy";
import sharp from "sharp";

const IMAGE_DIR = path.resolve("src/assets/images/photos");
const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 82;
const THUMBNAIL_WIDTH = 400;

interface UploadResult {
  slug: string;
  imageFilename: string;
  fields: Record<string, string>;
}

export function handleUpload(req: any): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    let tempFile: string | null = null;
    let originalFilename = "";
    let finalFilename = "";
    let fileWritePromise: Promise<void> | null = null;

    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
    });

    busboy.on(
      "file",
      (fieldname: string, file: NodeJS.ReadableStream, info: any) => {
        const { filename, mimeType } = info;
        if (!filename) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/tiff", "image/webp"];
        if (!allowedTypes.includes(mimeType)) {
          reject(new Error(`Unsupported file type: ${mimeType}`));
          file.resume();
          return;
        }

        originalFilename = path.parse(filename).name;
        finalFilename = originalFilename.toLowerCase().replace(/\s+/g, "-") + ".jpg";
        tempFile = path.join(IMAGE_DIR, `.tmp_${Date.now()}_${finalFilename}`);

        fs.mkdirSync(IMAGE_DIR, { recursive: true });
        const ws = createWriteStream(tempFile);
        fileWritePromise = pipeline(file, ws);
      },
    );

    busboy.on("field", (name: string, val: string) => {
      fields[name] = val;
    });

    busboy.on("finish", async () => {
      // Wait for file write to complete before processing
      if (fileWritePromise) {
        try {
          await fileWritePromise;
        } catch (err) {
          reject(err);
          return;
        }
      }

      if (!tempFile || !finalFilename) {
        reject(new Error("No file uploaded"));
        return;
      }

      try {
        const outputPath = path.join(IMAGE_DIR, finalFilename);

        // Check for existing file
        if (fs.existsSync(outputPath)) {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
          reject(new Error(`File "${finalFilename}" already exists. Rename your file before uploading.`));
          return;
        }

        // Compress with sharp
        await sharp(tempFile)
          .resize(MAX_DIMENSION, MAX_DIMENSION, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
          .withMetadata()
          .toFile(outputPath);

        // Clean up temp
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

        const slug = originalFilename.toLowerCase().replace(/\s+/g, "-");

        resolve({
          slug,
          imageFilename: finalFilename,
          fields,
        });
      } catch (err) {
        if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        reject(err);
      }
    });

    busboy.on("error", (err: Error) => reject(err));

    req.pipe(busboy);
  });
}

export async function serveThumbnail(slug: string, res: any): Promise<void> {
  const enMdPath = path.join("src/content/photos/en", `${slug}.md`);

  if (!fs.existsSync(enMdPath)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Photo not found" }));
    return;
  }

  // Extract image filename from frontmatter
  const raw = fs.readFileSync(enMdPath, "utf-8");
  const match = raw.match(/image:\s*["']?([^"'\n\r]+)["']?/);
  if (!match) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "No image reference found" }));
    return;
  }

  const imageRelPath = match[1];
  const imageFilename = path.basename(imageRelPath);
  const imagePath = path.join(IMAGE_DIR, imageFilename);

  if (!fs.existsSync(imagePath)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Image file not found" }));
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=3600");

  const thumbnailStream = sharp(imagePath)
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_WIDTH, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 72 });

  await pipeline(thumbnailStream, res);
}
