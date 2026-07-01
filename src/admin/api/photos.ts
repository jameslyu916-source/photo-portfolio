import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

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

function buildFrontmatter(data: Record<string, any>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === "") continue;
    if (key === "tags" && Array.isArray(value) && value.length === 0) continue;

    if (key === "image") {
      lines.push(`${key}: "${value}"`);
    } else if (key === "date" && typeof value === "string") {
      // Write dates unquoted so YAML/Astro parse them as Date objects
      lines.push(`${key}: ${value}`);
    } else if (typeof value === "string") {
      lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else if (Array.isArray(value)) {
      const items = value.map((v) => `"${v}"`).join(", ");
      lines.push(`${key}: [${items}]`);
    } else if (value instanceof Date) {
      lines.push(`${key}: ${value.toISOString().split("T")[0]}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---\n");
  return lines.join("\n");
}

export async function createPhoto(
  slug: string,
  imageFilename: string,
  meta: PhotoMetadata,
): Promise<void> {
  const enDir = path.join(CONTENT_DIR, "en");
  const zhDir = path.join(CONTENT_DIR, "zh-cn");
  fs.mkdirSync(enDir, { recursive: true });
  fs.mkdirSync(zhDir, { recursive: true });

  const enPath = path.join(enDir, `${slug}.md`);
  const zhPath = path.join(zhDir, `${slug}.md`);

  if (fs.existsSync(enPath) || fs.existsSync(zhPath)) {
    throw new Error(`Photo with slug "${slug}" already exists`);
  }

  const imageRelPath = "../../../assets/images/photos/" + imageFilename;
  const date = meta.date || new Date().toISOString().split("T")[0];

  const sharedFields: Record<string, any> = {
    image: imageRelPath,
    camera: meta.camera || undefined,
    lens: meta.lens || undefined,
    settings: meta.settings || undefined,
    location: meta.location || undefined,
    series: meta.series || undefined,
    featured: Boolean(meta.featured),
    date,
    order: Number(meta.order ?? 0),
    instagramUrl: meta.instagramUrl || undefined,
    threadsUrl: meta.threadsUrl || undefined,
    xiaohongshuUrl: meta.xiaohongshuUrl || undefined,
  };

  // English entry
  const enFields: Record<string, any> = {
    ...sharedFields,
    title: meta.titleEn,
    description: meta.descriptionEn ?? "",
    tags: meta.tagsEn?.length ? meta.tagsEn : undefined,
  };
  fs.writeFileSync(enPath, buildFrontmatter(enFields));

  // Chinese entry
  const zhFields: Record<string, any> = {
    ...sharedFields,
    title: meta.titleZh,
    description: meta.descriptionZh ?? "",
    tags: meta.tagsZh?.length ? meta.tagsZh : undefined,
  };
  fs.writeFileSync(zhPath, buildFrontmatter(zhFields));
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
  const { data: enExisting } = parseMdFile(enPath);

  function merge<T>(newVal: T | undefined, oldVal: T | undefined, fallback: T): T {
    if (newVal !== undefined && newVal !== null && newVal !== "") return newVal;
    if (oldVal !== undefined && oldVal !== null && oldVal !== "") return oldVal;
    return fallback;
  }

  const imageRelPath = enExisting.image ?? "../../../assets/images/photos/" + slug + ".jpg";
  const date = meta.date
    || (enExisting.date instanceof Date
      ? enExisting.date.toISOString().split("T")[0]
      : String(enExisting.date || ""))
    || new Date().toISOString().split("T")[0];

  const sharedFields: Record<string, any> = {
    image: imageRelPath,
    camera: merge(meta.camera, enExisting.camera, null),
    lens: merge(meta.lens, enExisting.lens, null),
    settings: merge(meta.settings, enExisting.settings, null),
    location: merge(meta.location, enExisting.location, null),
    series: merge(meta.series, enExisting.series, null),
    featured: meta.featured !== undefined ? Boolean(meta.featured) : Boolean(enExisting.featured),
    date,
    order: meta.order !== undefined ? Number(meta.order) : Number(enExisting.order ?? 0),
    instagramUrl: merge(meta.instagramUrl, enExisting.instagramUrl, null),
    threadsUrl: merge(meta.threadsUrl, enExisting.threadsUrl, null),
    xiaohongshuUrl: merge(meta.xiaohongshuUrl, enExisting.xiaohongshuUrl, null),
  };

  // English entry
  const enFields: Record<string, any> = {
    ...sharedFields,
    title: merge(meta.titleEn, enExisting.title, ""),
    description: meta.descriptionEn !== undefined ? meta.descriptionEn : (enExisting.description ?? ""),
    tags: meta.tagsEn?.length ? meta.tagsEn : (enExisting.tags?.length ? enExisting.tags : undefined),
  };
  fs.writeFileSync(enPath, buildFrontmatter(enFields));

  // Chinese entry — read existing if available
  let zhExisting: Record<string, any> = {};
  if (fs.existsSync(zhPath)) {
    zhExisting = parseMdFile(zhPath).data;
  }

  const zhFields: Record<string, any> = {
    ...sharedFields,
    title: merge(meta.titleZh, zhExisting.title, ""),
    description: meta.descriptionZh !== undefined ? meta.descriptionZh : (zhExisting.description ?? ""),
    tags: meta.tagsZh?.length ? meta.tagsZh : (zhExisting.tags?.length ? zhExisting.tags : undefined),
  };
  fs.writeFileSync(zhPath, buildFrontmatter(zhFields));
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
