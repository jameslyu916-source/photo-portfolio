import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:4321";
const OUT = "scripts/screenshots";
mkdirSync(OUT, { recursive: true });

const pages = [
  { name: "01-homepage", path: "/en" },
  { name: "02-homepage-scrolled", path: "/en", scroll: 600 },
  { name: "03-gallery", path: "/en/gallery" },
  { name: "04-gallery-filtered", path: "/en/gallery", click: ".filter-btn[data-filter='between-tides']", postClick: true },
  { name: "05-about", path: "/en/about" },
  { name: "06-social", path: "/en/social" },
  { name: "07-contact", path: "/en/contact" },
];

const browser = await chromium.launch();

async function shot(pageConfig, viewport, suffix) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + pageConfig.path, { waitUntil: "networkidle" });

  // Hide Astro dev toolbar
  await page.addStyleTag({ content: "astro-dev-toolbar { display: none !important; }" });

  // Wait for staggered animations + lazy images
  await page.waitForTimeout(2000);

  // Scroll if needed
  if (pageConfig.scroll) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), pageConfig.scroll);
    await page.waitForTimeout(1000);
  }

  // Click + wait for filter animation + lazy images
  if (pageConfig.click) {
    await page.click(pageConfig.click);
    // Filter triggers opacity fade → display swap → animation restart
    await page.waitForTimeout(500);  // filtering class applied
    await page.waitForTimeout(500);  // display swapped, fade-up restarting
    // Scroll to trigger lazy loading of newly-visible images
    if (pageConfig.postClick) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(300);
      await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1500); // extra buffer for lazy images
  }

  await page.screenshot({
    path: `${OUT}/${pageConfig.name}${suffix}.png`,
    fullPage: false,
  });
  await ctx.close();
  console.log(`  ✓ ${pageConfig.name}${suffix}`);
}

console.log("Desktop (1440×900)…");
for (const p of pages) {
  await shot(p, { width: 1440, height: 900 }, "-desktop");
}

console.log("Mobile (390×844)…");
for (const p of pages) {
  await shot(p, { width: 390, height: 844 }, "-mobile");
}

// FilmStrip overlay
console.log("FilmStrip overlay…");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/en/gallery", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "astro-dev-toolbar { display: none !important; }" });
  await page.waitForTimeout(2000);
  await page.click(".grid-gallery > a:first-child");
  await page.waitForTimeout(2500);
  // Navigate to trigger proper map initialization
  await page.click("#film-strip-next");
  await page.waitForTimeout(1500);
  await page.click("#film-strip-prev");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/08-filmstrip-desktop.png` });
  await ctx.close();
  console.log("  ✓ 08-filmstrip-desktop");
}

await browser.close();
console.log(`\nDone — ${OUT}/`);
