import fs from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import matter from "gray-matter";
import { photoMetadataSchema } from "../../lib/photo-metadata";

const CONTENT_DIR = path.resolve("src/content/photos");
const IMAGE_DIR = path.resolve("src/assets/images/photos");

export interface PhotoListItem {
  slug: string;
  titleEn: string;
  titleZh: string;
  series: string | null;
  featured: boolean;
  date: string;
  order: number;
  imageFilename: string;
}

export interface PhotoLocaleData {
  title: string;
  description: string;
  tags: string[];
}

export interface PhotoDetail {
  slug: string;
  imageFilename: string;
  en: PhotoLocaleData;
  zhCn: PhotoLocaleData;
  camera: string | null;
  lens: string | null;
  settings: string | null;
  location: string | null;
  series: string | null;
  featured: boolean;
  date: string;
  order: number;
  instagramUrl: string | null;
  threadsUrl: string | null;
  xiaohongshuUrl: string | null;
}

export interface PhotoMetadata {
  titleEn: string;
  titleZh: string;
  descriptionEn?: string;
  descriptionZh?: string;
  camera?: string;
  lens?: string;
  settings?: string;
  location?: string;
  series?: string;
  featured?: boolean;
  date?: string;
  order?: number;
  tagsEn?: string[];
  tagsZh?: string[];
  instagramUrl?: string;
  threadsUrl?: string;
  xiaohongshuUrl?: string;
}

function extractImageFilename(frontmatter: any): string {
  const imgPath: string = frontmatter.image ?? "";
  return path.basename(imgPath);
}

function parseMdFile(filePath: string): {
  data: Record<string, any>;
  content: string;
} {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  return { data: parsed.data, content: parsed.content };
}

export async function listPhotos(): Promise<PhotoListItem[]> {
  const enDir = path.join(CONTENT_DIR, "en");
  if (!fs.existsSync(enDir)) return [];

  const files = fs.readdirSync(enDir).filter((f) => f.endsWith(".md"));

  const photos: PhotoListItem[] = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const { data } = parseMdFile(path.join(enDir, file));

    let titleZh = "";
    const zhPath = path.join(CONTENT_DIR, "zh-cn", file);
    if (fs.existsSync(zhPath)) {
      const zhData = parseMdFile(zhPath).data;
      titleZh = zhData.title ?? "";
    }

    const dateStr =
      data.date instanceof Date ? data.date.toISOString().split("T")[0] : String(data.date ?? "");

    photos.push({
      slug,
      titleEn: data.title ?? "",
      titleZh,
      series: data.series ?? null,
      featured: Boolean(data.featured),
      date: dateStr,
      order: Number(data.order ?? 0),
      imageFilename: extractImageFilename(data),
    });
  }

  photos.sort((a, b) => b.order - a.order || b.date.localeCompare(a.date));
  return photos;
}

export async function getPhoto(slug: string): Promise<PhotoDetail | null> {
  const enPath = path.join(CONTENT_DIR, "en", `${slug}.md`);
  if (!fs.existsSync(enPath)) return null;

  const { data: enData } = parseMdFile(enPath);

  let zhData: Record<string, any> = {};
  const zhPath = path.join(CONTENT_DIR, "zh-cn", `${slug}.md`);
  if (fs.existsSync(zhPath)) {
    zhData = parseMdFile(zhPath).data;
  }

  const dateStr =
    enData.date instanceof Date
      ? enData.date.toISOString().split("T")[0]
      : String(enData.date ?? "");

  return {
    slug,
    imageFilename: extractImageFilename(enData),
    en: {
      title: enData.title ?? "",
      description: enData.description ?? "",
      tags: enData.tags ?? [],
    },
    zhCn: {
      title: zhData.title ?? "",
      description: zhData.description ?? "",
      tags: zhData.tags ?? [],
    },
    camera: enData.camera ?? null,
    lens: enData.lens ?? null,
    settings: enData.settings ?? null,
    location: enData.location ?? null,
    series: enData.series ?? null,
    featured: Boolean(enData.featured),
    date: dateStr,
    order: Number(enData.order ?? 0),
    instagramUrl: enData.instagramUrl ?? null,
    threadsUrl: enData.threadsUrl ?? null,
    xiaohongshuUrl: enData.xiaohongshuUrl ?? null,
  };
}


export class PhotoValidationError extends Error {}

function validatePhotoDate(value: string | Date): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const date = new Date(value);
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new PhotoValidationError("Date must be a valid calendar date (YYYY-MM-DD).");
  }
  return date;
}

function buildFrontmatter(data: Record<string, unknown>, content = ""): string {
  const fields = Object.fromEntries(Object.entries(data).filter(
    ([key, value]) => value != null && (value !== "" || key === "title"),
  ));
  const result = photoMetadataSchema.safeParse(fields);
  if (!result.success) {
    throw new PhotoValidationError(result.error.issues.map(
      (issue) => issue.path.join(".") + ": " + issue.message,
    ).join("; "));
  }
  return matter.stringify(content, fields);
}

interface PhotoWrite {
  destination: string;
  data: string | Buffer;
}

function saveFiles(writes: PhotoWrite[], creating = false): void {
  const staged = writes.map(({ destination, data }) => ({
    destination,
    data,
    temporary: path.join(path.dirname(destination), "." + randomUUID() + ".tmp"),
    previous: !creating && fs.existsSync(destination) ? fs.readFileSync(destination) : null,
  }));
  const committed: typeof staged = [];

  try {
    for (const file of staged) {
      fs.writeFileSync(file.temporary, file.data, { flag: "wx" });
    }
    for (const file of staged) {
      if (creating || file.previous === null) {
        // The hard link publishes the staged file without overwriting an existing photo.
        fs.linkSync(file.temporary, file.destination);
      } else {
        fs.renameSync(file.temporary, file.destination);
      }
      committed.push(file);
    }
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const file of committed.reverse()) {
      try {
        if (file.previous === null) {
          fs.rmSync(file.destination);
        } else {
          fs.writeFileSync(file.temporary, file.previous, { flag: "wx" });
          fs.renameSync(file.temporary, file.destination);
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length) {
      throw new AggregateError([error, ...rollbackErrors], "Photo save failed and could not be fully rolled back.");
    }
    throw error;
  } finally {
    for (const file of staged) {
      fs.rmSync(file.temporary, { force: true });
    }
  }
}

export async function createPhoto(
  slug: string,
  imageFilename: string,
  meta: PhotoMetadata,
  image: Buffer,
): Promise<void> {
  const enDir = path.join(CONTENT_DIR, "en");
  const zhDir = path.join(CONTENT_DIR, "zh-cn");
  const enPath = path.join(enDir, slug + ".md");
  const zhPath = path.join(zhDir, slug + ".md");
  const imagePath = path.join(IMAGE_DIR, imageFilename);

  if (fs.existsSync(enPath) || fs.existsSync(zhPath) || fs.existsSync(imagePath)) {
    throw new PhotoValidationError('Photo "' + slug + '" already exists. Rename your file before uploading.');
  }

  const sharedFields = {
    image: "../../../assets/images/photos/" + imageFilename,
    camera: meta.camera,
    lens: meta.lens,
    settings: meta.settings,
    location: meta.location,
    series: meta.series,
    featured: Boolean(meta.featured),
    date: validatePhotoDate(meta.date || new Date().toISOString().slice(0, 10)),
    order: Number(meta.order ?? 0),
    instagramUrl: meta.instagramUrl,
    threadsUrl: meta.threadsUrl,
    xiaohongshuUrl: meta.xiaohongshuUrl,
  };
  const en = buildFrontmatter({
    ...sharedFields,
    title: meta.titleEn || meta.titleZh || slug,
    description: meta.descriptionEn,
    tags: meta.tagsEn,
  });
  const zh = buildFrontmatter({
    ...sharedFields,
    title: meta.titleZh || meta.titleEn || slug,
    description: meta.descriptionZh,
    tags: meta.tagsZh,
  });

  for (const directory of [enDir, zhDir, IMAGE_DIR]) fs.mkdirSync(directory, { recursive: true });
  saveFiles([
    { destination: imagePath, data: image },
    { destination: enPath, data: en },
    { destination: zhPath, data: zh },
  ], true);
}

/**
 * JSON/form bodies can carry booleans or strings. Only an explicit value changes
 * `featured`; anything unparseable means "leave it alone".
 */
function toBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "on" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "off" || s === "no") return false;
  return undefined;
}

export async function updatePhoto(
  slug: string,
  meta: PhotoMetadata,
): Promise<void> {
  const enPath = path.join(CONTENT_DIR, "en", `${slug}.md`);
  const zhPath = path.join(CONTENT_DIR, "zh-cn", `${slug}.md`);

  if (!fs.existsSync(enPath)) {
    throw new Error(`Photo "${slug}" not found`);
  }

  // Read existing to preserve image reference and fields not being updated
  const { data: enExisting, content: enContent } = parseMdFile(enPath);
  const { data: zhExisting, content: zhContent } = fs.existsSync(zhPath)
    ? parseMdFile(zhPath)
    : { data: {}, content: "" };

  // Present-but-empty means "clear this field"; undefined means "leave it".
  // (The old both-empty-means-keep version made it impossible to remove a
  // series, location or camera once it had been set.)
  function merge<T>(newVal: T | undefined, oldVal: T | undefined, fallback: T): T {
    if (newVal !== undefined && newVal !== null) return newVal;
    if (oldVal !== undefined && oldVal !== null) return oldVal;
    return fallback;
  }

  const featured = toBool(meta.featured);

  const imageRelPath = enExisting.image ?? "../../../assets/images/photos/" + slug + ".jpg";
  const date = validatePhotoDate(meta.date || enExisting.date || new Date().toISOString().slice(0, 10));

  const sharedFields: Record<string, any> = {
    image: imageRelPath,
    camera: merge(meta.camera, enExisting.camera, null),
    lens: merge(meta.lens, enExisting.lens, null),
    settings: merge(meta.settings, enExisting.settings, null),
    location: merge(meta.location, enExisting.location, null),
    series: merge(meta.series, enExisting.series, null),
    featured: featured !== undefined ? featured : Boolean(enExisting.featured),
    date,
    order: meta.order !== undefined ? Number(meta.order) : Number(enExisting.order ?? 0),
    instagramUrl: merge(meta.instagramUrl, enExisting.instagramUrl, null),
    threadsUrl: merge(meta.threadsUrl, enExisting.threadsUrl, null),
    xiaohongshuUrl: merge(meta.xiaohongshuUrl, enExisting.xiaohongshuUrl, null),
  };

  // English entry
  const enFields = {
    ...enExisting,
    ...sharedFields,
    title: merge(meta.titleEn || undefined, enExisting.title, ""),
    description: meta.descriptionEn !== undefined ? meta.descriptionEn : (enExisting.description ?? ""),
    tags: meta.tagsEn?.length ? meta.tagsEn : (enExisting.tags?.length ? enExisting.tags : undefined),
  };

  const zhFields = {
    ...zhExisting,
    ...sharedFields,
    location: meta.location === undefined || meta.location === (enExisting.location ?? "")
      ? (zhExisting.location ?? sharedFields.location)
      : sharedFields.location,
    title: merge(meta.titleZh || undefined, zhExisting.title, enFields.title),
    description: meta.descriptionZh !== undefined ? meta.descriptionZh : (zhExisting.description ?? ""),
    tags: meta.tagsZh?.length ? meta.tagsZh : (zhExisting.tags?.length ? zhExisting.tags : undefined),
  };
  const en = buildFrontmatter(enFields, enContent);
  const zh = buildFrontmatter(zhFields, zhContent);
  fs.mkdirSync(path.dirname(zhPath), { recursive: true });
  saveFiles([
    { destination: enPath, data: en },
    { destination: zhPath, data: zh },
  ]);
}

export async function deletePhoto(slug: string): Promise<void> {
  const enPath = path.join(CONTENT_DIR, "en", `${slug}.md`);
  const zhPath = path.join(CONTENT_DIR, "zh-cn", `${slug}.md`);

  if (!fs.existsSync(enPath)) {
    throw new Error(`Photo "${slug}" not found`);
  }

  // Get image filename before deleting .md files
  let imageFilename: string | null = null;
  try {
    const { data } = parseMdFile(enPath);
    imageFilename = extractImageFilename(data);
  } catch {}

  // Delete content files
  if (fs.existsSync(enPath)) fs.unlinkSync(enPath);
  if (fs.existsSync(zhPath)) fs.unlinkSync(zhPath);

  // Delete image if it exists and isn't referenced by other entries
  if (imageFilename) {
    const imagePath = path.join(IMAGE_DIR, imageFilename);
    if (fs.existsSync(imagePath)) {
      // Check if any other .md files reference this image
      let stillReferenced = false;
      const allMdDirs = [path.join(CONTENT_DIR, "en"), path.join(CONTENT_DIR, "zh-cn")];
      for (const dir of allMdDirs) {
        if (!fs.existsSync(dir)) continue;
        for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
          try {
            const { data } = parseMdFile(path.join(dir, f));
            if (extractImageFilename(data) === imageFilename) {
              stillReferenced = true;
              break;
            }
          } catch {}
        }
        if (stillReferenced) break;
      }

      if (!stillReferenced) {
        fs.unlinkSync(imagePath);
      }
    }
  }
}
