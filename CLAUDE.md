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
# Admin panel at http://localhost:4321/admin (dev-only, password in .env)
```

## Project Structure
- `src/pages/` — Route pages (en/ and zh-cn/ for each route)
- `src/components/layout/` — BaseLayout, Header, Footer, SEO
- `src/components/gallery/` — PhotoGrid, PhotoCard, LazyImage, FilterBar, Lightbox
- `src/lib/` — i18n.ts (translations), photos.ts (data access)
- `src/content/photos/{en,zh-cn}/` — Photo markdown entries
- `src/assets/images/photos/` — Optimized photo files
- `src/admin/` — Admin CMS panel (dev-only, browser-based photo management)
- `src/plugins/` — Vite plugins (admin server middleware)
- `scripts/` — optimize-images.ts, new-photo.ts
- `tailwind.config.cjs` — Theme colors, font families
- `astro.config.mjs` — Site config, i18n, integrations

## Design System
- **Brand**: JTimes / J× — "light, multiplied by time"
- **Colors**: ink #2d2d2d, paper #fafaf9, muted #8c8c8c, border #e8e8e4, accent #7d9b76 (sage green)
- **Fonts**: Cormorant Garamond (J logo), Caveat/Waiting for the Sunrise/Nothing You Could Do (x cycling), Zen Maru Gothic (display headings), Zen Kaku Gothic New (body), Noto Sans SC (Chinese)
- **Style**: Japanese清新 — clean, minimal, rounded fonts, breathing room

## Key Design Decisions
- **Homepage**: Large J (serif) + cycling handwritten x (3 fonts, 7.5s loop, click to bounce). Japanese manuscript grid + 18 poetry fragments on right (desktop), 6 fragments (mobile). Scroll-down arrow + bottom gallery CTA. Featured photos in 2+3 curated grid below.
- **Mobile nav**: Hamburger button → full-screen overlay with nav links. Menu overlay is OUTSIDE `<header>` to escape stacking context
- **Gallery**: CSS columns masonry, series-based filtering (not categories)
- **PhotoCard hover**: GPU-isolated scale(1.05) with will-change-transform + backface-hidden. Bottom gradient overlay with title/location.
- **About page**: Poetic 意识流 text, not CV-style

## Photo Content
- Currently 15 Hong Kong Christmas photos, series: "december-liturgy" (renamed from "hong-kong-christmas")
- Content schema uses `series` field (free string), not `category` enum
- Optimized photos in `src/assets/images/photos/`

## i18n Note
- **zh-cn routes use Traditional Chinese**, not Simplified (user is in Hong Kong)

## View Transitions & Scripts (IMPORTANT)
- Astro View Transitions replace DOM on navigation; inline `<script>` only runs once
- Any script with event listeners MUST wrap init in a function and listen to `astro:page-load`:
  ```js
  function init() {
    const el = document.getElementById("my-element");
    if (!el || el.dataset.ready === "true") return;
    el.dataset.ready = "true";
    // ... bind events
  }
  init();
  document.addEventListener("astro:page-load", init);
  ```
- The `data-ready` guard prevents duplicate listeners on back-navigation
- This applies to: hamburger menu toggle, x bounce animation, scroll hint arrow

## CSS Patterns
- **Grid stacking** (overlapping elements that size to content): Use `grid` + `grid-area: 1/1` instead of `absolute inset-0`. The latter collapses the container to 0×0, causing content clipping
- **GPU hover fixes**: See Known GPU Bugs section below

## Known GPU Bugs & Fixes
- Hover white flash: scale(1.05) + overflow-hidden GPU bug → `will-change-transform backface-hidden`
- Overlay text flicker: → `will-change-[opacity]` on overlay
- Blur placeholder showing: → removed hover scale from placeholder img
- Font glitch on hover: → removed animation-play-state pause

## Deployment

**Deployed to Vercel via Cloudflare DNS**:
- URL: `https://jtimes-visual.com`
- Config: `base: "/"`, `site: "https://jtimes-visual.com"` in astro.config.mjs
- Auto-deploys on push to main via Vercel (1-2 min)
- Cloudflare DNS: CNAME `@` + `www` → `cname.vercel-dns.com`, Proxy ON
- Old GitHub Pages URL no longer used

## Next Up
- Add more photo series (glacier/snow mountains, Japan, landscapes, film, etc.)
- GitHub: https://github.com/jameslyu916-source/photo-portfolio
