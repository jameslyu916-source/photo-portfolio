# JTimes &mdash; light, multiplied by time

A personal photography portfolio built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com). Japanese清新 aesthetic &mdash; clean whitespace, rounded type, sage green accents.

![Astro](https://img.shields.io/badge/astro-v5-ff5a03?logo=astro)
![Tailwind](https://img.shields.io/badge/tailwind-v3-06b6d4?logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Bilingual** &mdash; English and Simplified Chinese (`/en/`, `/zh-cn/`)
- **Masonry gallery** &mdash; CSS columns layout with staggered fade-up animations
- **Series-based filtering** &mdash; organize photos by project, not rigid categories
- **PhotoSwipe lightbox** &mdash; pinch-to-zoom with EXIF metadata display
- **Blur-up image loading** &mdash; 16px placeholder → sharp WebP with smooth transition
- **View Transitions** &mdash; smooth page-swap animations via Astro's SPA router
- **Content Collections** &mdash; type-safe photo metadata with Zod schemas
- **Cycling handwritten logo** &mdash; 3 cursive fonts rotate on the homepage, click to bounce
- **GPU-optimized hover** &mdash; hardware-accelerated scale transforms with isolated layers

## Quick Start

```bash
npm install
npm run dev        # → http://localhost:4321
```

### Adding Photos

1. Place raw JPEG files in `raw-photos/`
2. Optimize them:

   ```bash
   npm run optimize-images
   ```
   Resizes to 2400px max width, JPEG quality 82, preserves EXIF.

3. Scaffold content entries:

   ```bash
   npm run new-photo -- <filename.jpg> <slug>
   ```
   Creates paired `.md` files in `src/content/photos/en/` and `src/content/photos/zh-cn/` with metadata (title, location, camera, series, date).

### Production Build

```bash
npm run build      # → dist/
```

## Project Structure

```
src/
├── assets/images/photos/   # Optimized photos (2400px WebP)
├── components/
│   ├── gallery/            # PhotoGrid, PhotoCard, LazyImage, FilterBar, Lightbox
│   ├── layout/             # BaseLayout, Header, Footer, SEO
│   ├── social/             # SocialLink
│   └── ui/                 # LanguageSwitcher
├── content/photos/         # Photo markdown entries (en/ + zh-cn/)
├── lib/                    # i18n translations, photo data access
├── pages/                  # Route pages (en/ + zh-cn/)
└── styles/global.css       # Tailwind directives + custom styles
scripts/
├── optimize-images.ts      # Sharp-based image pre-processor
└── new-photo.ts            # Interactive photo entry scaffold
```

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| `ink` | `#2d2d2d` | Primary text |
| `paper` | `#fafaf9` | Background |
| `muted` | `#8c8c8c` | Secondary text |
| `accent` | `#7d9b76` | Sage green highlights |
| Display | Zen Maru Gothic | Headings, nav |
| Body | Zen Kaku Gothic New | Body text, UI |
| Logo J | Cormorant Garamond | Hero mark (thin serif) |
| Logo x | Caveat / Waiting for the Sunrise / Nothing You Could Do | Cycling handwriting (3-font loop) |

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | [Astro v5](https://astro.build) |
| Styling | [Tailwind CSS v3](https://tailwindcss.com) + `@astrojs/tailwind` |
| Images | `astro:assets` + Sharp |
| Lightbox | [PhotoSwipe v5](https://photoswipe.com) |
| Fonts | Google Fonts (6 families) |
| i18n | Astro built-in routing |
| Deployment | Vercel (planned) |

> [!NOTE]
> This project originally used `@tailwindcss/vite` (Tailwind CSS v4), but the Vite plugin failed to scan `.astro` template files for class names, producing zero utility classes at build time with no errors. Switching to the official `@astrojs/tailwind` integration with PostCSS and Tailwind v3 resolved the issue. If you're using Astro + Tailwind, stick with v3 until the ecosystem matures.

## License

MIT
