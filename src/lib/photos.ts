import { getCollection, type CollectionEntry } from "astro:content";

export type Photo = CollectionEntry<"photos">;

export async function getPhotos(
  locale: string,
): Promise<Photo[]> {
  const photos = await getCollection("photos", (entry) =>
    entry.id.startsWith(`${locale}/`),
  );
  return photos.sort(
    (a, b) =>
      b.data.order - a.data.order ||
      b.data.date.getTime() - a.data.date.getTime(),
  );
}

export async function getFeaturedPhotos(
  locale: string,
): Promise<Photo[]> {
  const photos = await getPhotos(locale);
  return photos.filter((p) => p.data.featured);
}

export async function getPhotosByCategory(
  locale: string,
  category: string,
): Promise<Photo[]> {
  const photos = await getPhotos(locale);
  if (category === "all") return photos;
  return photos.filter((p) => p.data.category === category);
}

export async function getPhotoBySlug(
  locale: string,
  slug: string,
): Promise<Photo | undefined> {
  const photos = await getPhotos(locale);
  return photos.find((p) => p.id === `${locale}/${slug}.md`);
}

export const categoryLabels: Record<string, { en: string; "zh-cn": string }> =
  {
    all: { en: "All", "zh-cn": "全部" },
    landscape: { en: "Landscape", "zh-cn": "风光" },
    street: { en: "Street", "zh-cn": "街拍" },
    portrait: { en: "Portrait", "zh-cn": "人像" },
    nature: { en: "Nature", "zh-cn": "自然" },
    architecture: { en: "Architecture", "zh-cn": "建筑" },
    abstract: { en: "Abstract", "zh-cn": "抽象" },
    "black-and-white": { en: "Black & White", "zh-cn": "黑白" },
  };
