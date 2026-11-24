import { defineCollection } from "astro:content";
import { photoMetadataSchema } from "../lib/photo-metadata";

const photoCollection = defineCollection({
  type: "content",
  schema: ({ image }) =>
    photoMetadataSchema.extend({
      image: image(),
    }),
});

export const collections = {
  photos: photoCollection,
};
