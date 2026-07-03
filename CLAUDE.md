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
node scripts/screenshots.mjs   # Capture desktop+mobile screenshots of all pages
node scripts/social-cards.mjs  # Generate social-media-ready card images from screenshots
```

## Project Structure
- `src/pages/` — Route pages (en/ and zh-cn/ for each route)
- `src/components/layout/` — BaseLayout, Header, Footer, SEO
- `src/components/gallery/` — PhotoGrid, PhotoCard, LazyImage, FilterBar, FilmStrip, FeaturedWall
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
- **Homepage**: Large J (serif) + cycling handwritten x (3 fonts, 7.5s loop, click to bounce). Japanese manuscript grid + 18 poetry fragments on right (desktop), 6 fragments (mobile). Scroll-down arrow + bottom gallery CTA. Featured photos displayed in `FeaturedWall` — asymmetric dual-rail auto-scrolling wall (taller top rail 34vh ← left, shorter bottom rail 24vh → right, different speeds) with CSS mask-image faded edges. `FilmStrip` fullscreen viewer with blurred ambient background, vignette overlay, floating edge arrows, navigation dots (sliding window when >8 photos), auto-hide UI, infinite loop navigation.
- **Mobile nav**: Hamburger button → full-screen overlay with nav links. Menu overlay is OUTSIDE `<header>` to escape stacking context
- **Gallery**: CSS columns masonry with CLS prevention (aspect-ratio on grid `<a>` + `contain:layout style`), series-based filtering (not categories), seeded Fisher-Yates shuffle for photo order
- **PhotoCard hover**: GPU-isolated scale(1.05) with will-change-transform + backface-hidden. Bottom gradient overlay with title/location.
- **Social page**: Circular "bubble constellation" layout — 4 platform cards as rounded-full circles of varying sizes (180-230px desktop). Flex-wrap with staggered vertical mt offsets for organic S-curve flow. Sage glow (`box-shadow`) + scale(1.08) on hover. Manuscript grid background inherited from homepage. Distinct from Contact page's horizontal list cards.
- **About page**: Poetic 意识流 text with asymmetric poetry rhythm layout — 4 paragraphs alternating center/left/right/center alignment. Three viewfinder corner brackets (top-right, bottom-left, bottom-right — hero-rule doubles as top-left). Selected keywords rendered inline in handwriting fonts (Caveat / Waiting for the Sunrise / Nothing You Could Do) for a mixed-typeface literary effect.

## Photo Content
- Series: "december-liturgy" (Hong Kong Christmas), "snow-vein" (glacier/mountains), "between-tides" (Hong Kong seaside street photography)
- Content schema uses `series` field (free string), not `category` enum
- Optimized photos in `src/assets/images/photos/`
- Series name format: lowercase kebab-case (auto-converted on upload)

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
- This applies to: hamburger menu toggle, x bounce animation, scroll hint arrow, FilterBar (series filter clicks)
- **For components with closure variables** (e.g. FilmStrip's `photosData`): use `AbortController` instead of `data-ready`. On each `init()` call, `abort()` the previous controller to remove old listeners, then register new ones with `{ signal }`. This prevents stale closures from previous pages interfering with the current page's data.
  ```js
  let ac;
  function init() {
    if (ac) ac.abort();
    ac = new AbortController();
    const { signal } = ac;
    el.addEventListener("click", handler, { signal });
    // ...
  }
  ```

## CSS Patterns
- **Grid stacking** (overlapping elements that size to content): Use `grid` + `grid-area: 1/1` instead of `absolute inset-0`. The latter collapses the container to 0×0, causing content clipping
- **Absolute painting order**: `absolute` elements (z-index: auto) paint AFTER normal-flow siblings. Overlays with absolute backgrounds need `relative z-10` on UI bars to stay clickable
- **Dual-layer crossfade**: Use two `<img>` layers (A/B toggle) for background transitions; avoids the transparency flash of a single-layer fade
- **GPU hover fixes**: See Known GPU Bugs section below
- **CLS prevention in CSS columns**: Put `aspect-ratio` on the grid ITEM (the `<a>` tag), not a child div. Add `contain: layout style` to isolate each card's internal layout from the column flow. This lets the browser determine column heights before any images load.
- **FilmStrip deferred loading**: Do NOT set `src` on FilmStrip track images at build time. Use `data-src` + a 1px placeholder GIF. Swap `data-src` → `src` only when the overlay opens and for images within ±2 frames of the current index. This prevents 40+ large images from loading on page load and causing resource contention / CLS.
- **FilmStrip filter awareness**: The `open()` function MUST check `document.querySelector(".filter-btn.filter-active")` and filter `visiblePhotos` accordingly. This logic was lost once in a merge — verify it's present after any FilmStrip refactor.
- **Filter transitions**: Use a "global fade" pattern — add a `.filtering` class to the gallery container to fade ALL cards out (opacity transition), swap display states synchronously while invisible (setTimeout 250ms), then remove the class to let `fade-up` animations restart naturally. Never per-card timer management. Ensure `animation: none` during the filtering phase to avoid transition/animation conflicts on the same property.

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
- Add more photo series (Japan, landscapes, film, etc.)
- GitHub: https://github.com/jameslyu916-source/photo-portfolio
