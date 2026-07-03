import { chromium } from "playwright";
import { mkdirSync } from "fs";

const TEMPLATE = `file://${import.meta.dirname}/screenshots/cards.html`;
const OUT = "scripts/screenshots/posts";
mkdirSync(OUT, { recursive: true });

const cards = [
  "card-homepage",
  "card-gallery",
  "card-viewer",
  "card-about",
  "card-social",
  "card-contact",
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(TEMPLATE, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

for (const id of cards) {
  const el = await page.$(`#${id}`);
  if (!el) { console.log(`  ✗ ${id} — not found`); continue; }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await el.screenshot({ path: `${OUT}/${id.replace("card-", "")}.png` });
  console.log(`  ✓ ${id.replace("card-", "")}`);
}

await ctx.close();
await browser.close();
console.log(`\nDone — ${OUT}/`);
