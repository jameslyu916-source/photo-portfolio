import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://jameslyu916.com",
  base: "/",

  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-cn"],
    routing: {
      prefixDefaultLocale: true,
    },
    fallback: {
      "zh-cn": "en",
    },
  },

  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
    breakpoints: [400, 800, 1200, 2400],
  },

  integrations: [tailwindcss(), sitemap()],
});
