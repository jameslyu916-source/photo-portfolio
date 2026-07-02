import { getCollection, type CollectionEntry } from "astro:content";

export type Photo = CollectionEntry<"photos">;

// Seeded PRNG (LCG)
function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Fisher-Yates shuffle with seed
function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rand = createRng(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function getPhotos(
  locale: string,
): Promise<Photo[]> {
  const photos = await getCollection("photos", (entry) =>
    entry.id.startsWith(`${locale}/`),
  );

  // Compute a stable seed from all photo IDs
  let seed = 0;
  for (const p of photos) {
    for (let i = 0; i < p.id.length; i++) {
      seed = ((seed << 5) - seed + p.id.charCodeAt(i)) | 0;
    }
  }

  // Sort by order (desc) to establish tiers, then shuffle to scatter within tiers
  photos.sort((a, b) => b.data.order - a.data.order);
  return shuffleWithSeed(photos, seed);
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
