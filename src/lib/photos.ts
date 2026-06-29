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

export async function getPhotosBySeries(
  locale: string,
  series: string,
): Promise<Photo[]> {
  const photos = await getPhotos(locale);
  if (series === "all") return photos;
  return photos.filter((p) => p.data.series === series);
}

export async function getPhotoBySlug(
  locale: string,
  slug: string,
): Promise<Photo | undefined> {
  const photos = await getPhotos(locale);
  return photos.find((p) => p.id === `${locale}/${slug}.md`);
}

export function getSeriesFromPhotos(photos: Photo[]): string[] {
  const seriesSet = new Set<string>();
  for (const p of photos) {
    if (p.data.series) seriesSet.add(p.data.series);
  }
  return Array.from(seriesSet);
}
