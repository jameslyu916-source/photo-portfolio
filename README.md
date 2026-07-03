# J&times; &mdash; light, multiplied by time

A personal photography portfolio &mdash; clean, minimal, and carefully put together. Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com).

[![Astro](https://img.shields.io/badge/astro-v5-ff5a03?logo=astro)](https://astro.build)
[![Tailwind](https://img.shields.io/badge/tailwind-v3-06b6d4?logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

<!-- language-selector-start -->
[English](README.md) &nbsp;&middot;&nbsp; [繁體中文](README.zh-Hant.md)
<!-- language-selector-end -->

## Screenshots

<p align="center">
  <img src="docs/screenshots/homepage.png" width="49%" alt="Homepage">
  <img src="docs/screenshots/gallery.png" width="49%" alt="Gallery">
  <img src="docs/screenshots/viewer.png" width="49%" alt="Photo Viewer">
  <img src="docs/screenshots/about.png" width="49%" alt="About">
</p>

<details>
<summary>More pages</summary>
<p align="center">
  <img src="docs/screenshots/social.png" width="49%" alt="Social">
  <img src="docs/screenshots/contact.png" width="49%" alt="Contact">
</p>
</details>

## Brand

**J&times;** &mdash; the J is a Cormorant Garamond serif, the &times; cycles through three handwriting fonts every 7.5 seconds. Click to bounce it.

The name comes from the idea that a photograph is *light, multiplied by time* &mdash; the shutter opens, light hits the sensor, and a fraction of a second becomes permanent.

The visual direction is clean and restrained: generous whitespace, a soft sage green accent, rounded Japanese typefaces, and a quiet attention to detail. No heavy frameworks, no starter templates &mdash; every component is built from scratch and tuned by hand.

## Features

### Content management

- **Admin panel** &mdash; browser-based CMS at `/admin` (dev-only). Drag-and-drop upload with auto-compression to 2400px JPEG, batch metadata editing, and numbered-series naming for collection imports. No external services required.
- **Content Collections** &mdash; photo metadata stored as Markdown frontmatter with Zod schemas. Bilingual entries under `src/content/photos/{en,zh-cn}/`.

### Gallery & viewing

- **Masonry gallery** &mdash; CSS columns layout with staggered fade-up animations. Series-based filtering with a global fade transition pattern that avoids per-card timer management.
- **Seeded shuffle** &mdash; Fisher-Yates shuffle with a deterministic PRNG so photo order is random but stable across page loads.
- **FilmStrip viewer** &mdash; custom fullscreen photo browser with blurred ambient background crossfade, vignette overlay, horizontal scroll-snap, floating edge arrows, and sliding navigation dots. Replaces the earlier PhotoSwipe integration.
- **FeaturedWall** &mdash; dual-rail auto-scrolling photo wall on the homepage (top rail scrolls left, bottom rail scrolls right, at different speeds) with CSS `mask-image` faded edges.

### Layout & design

- **Homepage** &mdash; oversized J&times; hero mark, flowing SVG light lines, manuscript grid with fading poetry fragments, scroll-down arrow, and the FeaturedWall below.
- **About page** &mdash; stream-of-consciousness text with an asymmetric alignment rhythm (center &rarr; left &rarr; right &rarr; center). Viewfinder corner brackets frame the text. Selected keywords rendered inline in handwriting fonts for a mixed-typeface literary effect.
- **Social page** &mdash; circular "bubble constellation" &mdash; four platform links as differently-sized circles in an organic flex-wrap S-curve with sage glow on hover.
- **Contact page** &mdash; minimal horizontal link list. Just the essentials.

### Performance & polish

- **CLS prevention** &mdash; `aspect-ratio` on masonry grid items, `contain: layout style`, and FilmStrip deferred image loading (images load only when the viewer opens).
- **GPU-optimized interactions** &mdash; hardware-accelerated hover transforms with isolated compositing layers.
- **View Transitions** &mdash; Astro SPA navigation with `AbortController`-based event listener lifecycle for components with closure state. Documented patterns in `CLAUDE.md`.
- **Responsive** &mdash; hamburger mobile nav, adaptive gallery columns (3 &rarr; 2 &rarr; 1), mobile poetry grid, touch-friendly throughout.

### Internationalization

- **Bilingual** &mdash; English (`/en/`) and Traditional Chinese (`/zh-cn/`). `prefixDefaultLocale` routing. All UI strings in a typed `i18n.ts` dictionary.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | [Astro v5](https://astro.build) |
| Styling | [Tailwind CSS v3](https://tailwindcss.com) + `@astrojs/tailwind` |
| Images | `astro:assets` + Sharp |
| Fonts | Google Fonts (Cormorant Garamond, Zen Maru Gothic, Zen Kaku Gothic New, Caveat, Waiting for the Sunrise, Nothing You Could Do, Noto Sans SC) |
| i18n | Astro built-in routing |
| Screenshots | Playwright |
| Deployment | [Vercel](https://vercel.com) |

> [!IMPORTANT]
> This project originally used `@tailwindcss/vite` (Tailwind CSS v4), but the Vite plugin silently failed to scan `.astro` template files for class names, producing zero utility classes at build time with no errors. Use `@astrojs/tailwind` with PostCSS and Tailwind v3.

## Project Structure

```
src/
├── admin/                  # Browser-based CMS (dev-only)
│   └── api/                #   Auth, photo CRUD, upload handler
├── assets/images/photos/   # Optimized photos (2400px JPEG)
├── components/
│   ├── gallery/            # PhotoGrid, PhotoCard, LazyImage, FilterBar, FilmStrip, FeaturedWall
│   ├── layout/             # BaseLayout, Header, Footer, SEO
│   └── ui/                 # LanguageSwitcher
├── content/photos/         # Photo Markdown entries (en/ + zh-cn/)
├── lib/                    # i18n translations, photo data access
├── pages/                  # Route pages (en/ + zh-cn/)
├── plugins/                # Vite plugins (admin server middleware)
└── styles/global.css       # Tailwind directives + custom styles
scripts/
├── screenshots.mjs         # Playwright — capture desktop + mobile screenshots
├── social-cards.mjs        # Generate social-media-ready card images
├── optimize-images.ts      # Sharp-based image pre-processor
└── new-photo.ts            # Interactive photo entry scaffold
```

## Getting Started

```bash
npm install
npm run dev          # → http://localhost:4321
```

### Adding photos

**Admin panel (recommended):**

Open `http://localhost:4321/admin` while the dev server is running. Drag and drop photos, set metadata once for the batch, and the panel handles compression and bilingual `.md` file generation automatically.

**CLI:**

```bash
npm run optimize-images -- <input-dir>
npm run new-photo -- <filename.jpg> <slug>
```

### Generating screenshots

```bash
npm run dev                              # Start dev server first
node scripts/screenshots.mjs             # Capture all pages → scripts/screenshots/
node scripts/social-cards.mjs            # Generate styled card PNGs → scripts/screenshots/posts/
```

The showcase page at `scripts/screenshots/index.html` presents all screenshots in an editorial layout. Requires Playwright (included in dev dependencies).

### Production build

```bash
npm run build      # → dist/
```

## Design tokens

| Token | Value | Usage |
|---|---|---|
| `ink` | `#2d2d2d` | Primary text |
| `paper` | `#fafaf9` | Background |
| `muted` | `#8c8c8c` | Secondary text |
| `accent` | `#7d9b76` | Sage green highlights |
| Display | Zen Maru Gothic | Headings, navigation |
| Body | Zen Kaku Gothic New | Body text, UI |
| Logo J | Cormorant Garamond | Hero mark (thin serif italic) |
| Logo &times; | Caveat / Waiting for the Sunrise / Nothing You Could Do | Cycling handwriting |

## Deployment

Deployed on [Vercel](https://vercel.com) at **[jtimes-visual.com](https://jtimes-visual.com)** with Cloudflare DNS. Pushes to `main` trigger automatic deploys (typically 1&ndash;2 minutes).

## License

MIT
