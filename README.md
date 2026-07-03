# JTimes &mdash; light, multiplied by time

A personal photography portfolio built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com). Japanese清新 aesthetic &mdash; clean whitespace, rounded type, sage green accents.

[![Astro](https://img.shields.io/badge/astro-v5-ff5a03?logo=astro)](https://astro.build)
[![Tailwind](https://img.shields.io/badge/tailwind-v3-06b6d4?logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## Features

- **Admin CMS panel** &mdash; local browser-based upload with drag-drop, batch import, batch edit, numbered-series naming, and auto image optimization
- **FilmStrip photo viewer** &mdash; horizontal film-strip browser replacing lightbox, with deferred loading and CLS prevention
- **FeaturedWall** &mdash; dual-rail auto-scrolling photo wall on homepage with CSS mask-image fades
- **Mobile-first responsive** &mdash; hamburger nav menu, mobile poetry grid, adaptive gallery columns
- **Bilingual** &mdash; English and Traditional Chinese (`/en/`, `/zh-cn/`)
- **Masonry gallery** &mdash; CSS columns layout with staggered fade-up animations
- **Series-based filtering** &mdash; organize photos by project, not rigid categories
- **PhotoSwipe lightbox** &mdash; pinch-to-zoom with EXIF metadata display
- **Blur-up image loading** &mdash; 16px placeholder → sharp WebP with smooth transition
- **View Transitions** &mdash; smooth page-swap animations via Astro's SPA router
- **Content Collections** &mdash; type-safe photo metadata with Zod schemas
- **Cycling handwritten logo** &mdash; 3 cursive fonts rotate on the homepage, click to bounce
- **GPU-optimized hover** &mdash; hardware-accelerated scale transforms with isolated layers

## Screenshots

<p align="center">
  <img src="docs/screenshots/homepage.png" width="49%" alt="Homepage">
  <img src="docs/screenshots/gallery.png" width="49%" alt="Gallery">
  <img src="docs/screenshots/viewer.png" width="49%" alt="Photo Viewer">
  <img src="docs/screenshots/about.png" width="49%" alt="About">
</p>

<details>
<summary>All pages</summary>
<p align="center">
  <img src="docs/screenshots/social.png" width="49%" alt="Social">
  <img src="docs/screenshots/contact.png" width="49%" alt="Contact">
</p>
</details>

> Generate updated screenshots anytime with `node scripts/screenshots.mjs` then `node scripts/social-cards.mjs`.

## Quick Start

```bash
npm install
npm run dev        # → http://localhost:4321
```

### Adding Photos

**Admin panel (recommended):**

```bash
npm run dev        # → http://localhost:4321/admin
```

Browser-based CMS &mdash; drag-drop photos, fill metadata once for the whole batch, auto-compress (2400px, JPEG q82), auto-generate bilingual `.md` content files. Supports numbered-series naming for collection imports.

**CLI (alternative):**

```bash
npm run optimize-images -- <input-dir>
npm run new-photo -- <filename.jpg> <slug>
```

The CLI resizes raw photos with Sharp and scaffolds paired `.md` entries interactively.

### Production Build

```bash
npm run build      # → dist/
```

## Project Structure

```
src/
├── admin/                  # Admin CMS panel (dev-only, browser-based)
│   └── api/                #   auth, photo CRUD, upload handler
├── assets/images/photos/   # Optimized photos (2400px JPEG)
├── components/
│   ├── gallery/            # PhotoGrid, PhotoCard, LazyImage, FilterBar, Lightbox
│   ├── layout/             # BaseLayout, Header, Footer, SEO
│   ├── social/             # SocialLink
│   └── ui/                 # LanguageSwitcher
├── content/photos/         # Photo markdown entries (en/ + zh-cn/)
├── lib/                    # i18n translations, photo data access
├── pages/                  # Route pages (en/ + zh-cn/)
├── plugins/                # Vite plugins (admin server middleware)
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
| Deployment | [Vercel](https://vercel.com) (`jtimes-visual.com`) |

> [!NOTE]
> This project originally used `@tailwindcss/vite` (Tailwind CSS v4), but the Vite plugin failed to scan `.astro` template files for class names, producing zero utility classes at build time with no errors. Switching to the official `@astrojs/tailwind` integration with PostCSS and Tailwind v3 resolved the issue. If you're using Astro + Tailwind, stick with v3 until the ecosystem matures.

## Screenshots

Generate page screenshots and social-media-ready card images:

```bash
npm run dev                              # Start dev server first
node scripts/screenshots.mjs             # Capture all pages (desktop + mobile) to scripts/screenshots/
node scripts/social-cards.mjs            # Generate styled card PNGs to scripts/screenshots/posts/
```

The showcase page at `scripts/screenshots/index.html` presents all screenshots in an editorial layout. Requires Playwright (`npm install`).

## License

MIT
