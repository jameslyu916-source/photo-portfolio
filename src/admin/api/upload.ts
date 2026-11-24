import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
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
  image: Buffer;
}


export async function handleUpload(req: IncomingMessage): Promise<UploadResult> {
  const fields: Record<string, string> = {};
  const tempFile = path.join(os.tmpdir(), "jtimes-upload-" + randomUUID());
  let slug = "";
  let fileWrite: Promise<void> | undefined;
  let fileError: unknown;
  const busboy = Busboy({
    headers: req.headers,
    limits: { files: 1, fileSize: 100 * 1024 * 1024 },
  });

  busboy.on("file", (_fieldname, file, { filename, mimeType }) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/tiff", "image/webp"];
    if (!filename || !allowedTypes.includes(mimeType)) {
      fileError = new Error(filename ? "Unsupported file type: " + mimeType : "No file uploaded.");
      file.resume();
      return;
    }

    slug = path.parse(filename).name.toLowerCase().replace(/\s+/g, "-");
    file.on("limit", () => { fileError = new Error("Image exceeds the 100 MB upload limit."); });
    fileWrite = pipeline(file, createWriteStream(tempFile, { flags: "wx" })).catch((error) => {
      fileError = error;
    });
  });

  busboy.on("filesLimit", () => { fileError = new Error("Upload one photo per request."); });
  busboy.on("field", (name, value, info) => {
    if (info.nameTruncated || info.valueTruncated) {
      fileError = new Error("An upload field exceeds the supported size.");
    }
    fields[name] = value;
  });

  try {
    await pipeline(req, busboy);
    await fileWrite;
    if (fileError) throw fileError;
    if (!slug || !fileWrite) throw new Error("No file uploaded.");

    const image = await sharp(tempFile)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .withMetadata()
      .toBuffer();

    return { slug, imageFilename: slug + ".jpg", fields, image };
  } finally {
    await fileWrite;
    fs.rmSync(tempFile, { force: true });
  }
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
