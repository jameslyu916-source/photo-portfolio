import { defineCollection, z } from "astro:content";

const photoCollection = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      image: image(),
      title: z.string(),
      description: z.string().optional(),
      camera: z.string().optional(),
      lens: z.string().optional(),
      settings: z.string().optional(),
      location: z.string().optional(),
      series: z.string().optional(),
      tags: z.array(z.string()).optional(),
      featured: z.boolean().default(false),
      date: z.date(),
      order: z.number().default(0),
      instagramUrl: z.string().url().optional(),
      threadsUrl: z.string().url().optional(),
      xiaohongshuUrl: z.string().url().optional(),
    }),
});

export const collections = {
  photos: photoCollection,
};
