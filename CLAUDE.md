# JTimes Photography Portfolio

## Tech Stack
- **Astro v5** + **Tailwind CSS v3** + **@astrojs/tailwind v6**
- **CRITICAL**: Do NOT use `@tailwindcss/vite` (Tailwind v4) — it silently fails to scan `.astro` files, producing zero utility classes. Must use `@astrojs/tailwind` + `tailwindcss@3`.
- Node v26, npm
- PhotoSwipe v5 for lightbox, Sharp for image optimization
- Astro View Transitions enabled
- i18n: en + zh-cn, prefixDefaultLocale routing

## Commands
```bash
npm run dev          # Start dev server (localhost:4321)
npm run build        # Production build to dist/
npm run optimize-images  # Resize raw photos to 2400px
npm run new-photo    # Interactive CLI to scaffold photo .md files
```

## Project Structure
- `src/pages/` — Route pages (en/ and zh-cn/ for each route)
- `src/components/layout/` — BaseLayout, Header, Footer, SEO
- `src/components/gallery/` — PhotoGrid, PhotoCard, LazyImage, FilterBar, Lightbox
- `src/lib/` — i18n.ts (translations), photos.ts (data access)
- `src/content/photos/{en,zh-cn}/` — Photo markdown entries
- `src/assets/images/photos/` — Optimized photo files
- `scripts/` — optimize-images.ts, new-photo.ts
- `tailwind.config.cjs` — Theme colors, font families
- `astro.config.mjs` — Site config, i18n, integrations

## Design System
- **Brand**: JTimes / J× — "light, multiplied by time"
- **Colors**: ink #2d2d2d, paper #fafaf9, muted #8c8c8c, border #e8e8e4, accent #7d9b76 (sage green)
- **Fonts**: Cormorant Garamond (J logo), Caveat/Waiting for the Sunrise/Nothing You Could Do (x cycling), Zen Maru Gothic (display headings), Zen Kaku Gothic New (body), Noto Sans SC (Chinese)
- **Style**: Japanese清新 — clean, minimal, rounded fonts, breathing room

## Key Design Decisions
- **Homepage**: Large J (serif) + cycling handwritten x (3 fonts, 7.5s loop, click to bounce). Japanese manuscript grid on right. Featured photos in 2+3 curated grid below.
- **Gallery**: CSS columns masonry, series-based filtering (not categories)
- **PhotoCard hover**: GPU-isolated scale(1.05) with will-change-transform + backface-hidden. Bottom gradient overlay with title/location.
- **About page**: Poetic 意识流 text, not CV-style

## Photo Content
- Currently 15 Hong Kong Christmas photos, series: "hong-kong-christmas"
- Content schema uses `series` field (free string), not `category` enum
- Raw photos in `raw-photos/` (gitignored), optimized in `src/assets/images/photos/`

## Known GPU Bugs & Fixes
- Hover white flash: scale(1.05) + overflow-hidden GPU bug → `will-change-transform backface-hidden`
- Overlay text flicker: → `will-change-[opacity]` on overlay
- Blur placeholder showing: → removed hover scale from placeholder img
- Font glitch on hover: → removed animation-play-state pause

## Next Up
- Add more photo series (Japan, landscapes, film, etc.)
- Replace generic photo titles with real descriptions
- Buy domain + deploy to Vercel
- GitHub: https://github.com/jameslyu916-source/photo-portfolio
