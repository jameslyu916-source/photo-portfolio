#!/usr/bin/env node
/**
 * Post-build assertions for dist/.
 *
 * Usage:  npm run build && npm run verify      (or: npm run verify:build)
 *
 * These checks encode the invariants that are easy to break silently — the
 * things that produced no build warning but were still wrong in production:
 *   - JSON-LD must be real JSON (Astro does not interpolate inside <script>)
 *   - every page needs a favicon link
 *   - every photo card must have a matching film-strip frame
 *   - zh-cn pages must be Traditional Chinese
 *   - every local asset referenced by an HTML file must exist in dist/
 *
 * Exits 1 if anything fails, so it can be wired into CI later.
 */
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const results = [];

function check(name, fn) {
  try {
    const detail = fn();
    results.push({ ok: true, name, detail });
  } catch (err) {
    results.push({ ok: false, name, detail: err.message });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const rel = (p) => path.relative(DIST, p).replace(/\\/g, "/") || ".";

// ---------------------------------------------------------------- collect
const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith(".html")) htmlFiles.push(p);
  }
}

assert(fs.existsSync(DIST), "dist/ not found — run `npm run build` first");
walk(DIST);
assert(htmlFiles.length > 0, "no HTML files in dist/");

const pages = htmlFiles.map((file) => ({
  file,
  url: "/" + rel(file).replace(/index\.html$/, "").replace(/\.html$/, ""),
  html: fs.readFileSync(file, "utf8"),
}));

// Astro's i18n layer emits a bare noindex meta-refresh stub for "/" (Vercel
// answers "/" with a 301 before it is ever served). It has no <head> content
// of its own, so head assertions only apply to real pages.
const isRedirectStub = (html) => /http-equiv="refresh"/i.test(html);
const contentPages = pages.filter((p) => !isRedirectStub(p.html));

// Simplifed-only characters: none of these exist in Traditional Chinese, so a
// hit means Simplified text leaked into a zh-cn page.
const SIMPLIFIED_ONLY =
  "联说时东门这为关图书见长开间电话机结给认让记鲜静处归应该种过还进选择与万无阴阳龙马鱼鸟风乐园国爱师义务齐备广宁实宝审层岁币厂历压县页码观规视览绘绝统绿罗习职际陆陈显体从众优会伟传伤价亿仅儿";
const SIMPLIFIED_RE = new RegExp(`[${SIMPLIFIED_ONLY}]`, "g");

// ------------------------------------------------------------------ checks
check(
  "pages present",
  () =>
    `${pages.length} HTML file(s), ${pages.length - contentPages.length} redirect stub(s) skipped`,
);

check("favicon declared on every page", () => {
  const missing = contentPages.filter((p) => !/<link[^>]+rel="icon"[^>]*>/i.test(p.html));
  assert(missing.length === 0, `missing rel="icon": ${missing.map((p) => p.url).join(", ")}`);
  assert(
    contentPages.every((p) => /<link[^>]+href="\/favicon\.svg"/i.test(p.html)),
    "rel=icon present but not pointing at /favicon.svg",
  );
  return `on ${contentPages.length} page(s)`;
});

check("JSON-LD parses as JSON", () => {
  const found = [];
  for (const page of contentPages) {
    const blocks = [
      ...page.html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi),
    ];
    assert(blocks.length > 0, `${page.url} has no JSON-LD block`);
    for (const [, body] of blocks) {
      assert(!body.includes("{site}"), `${page.url} still contains the literal "{site}" placeholder`);
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (err) {
        throw new Error(`${page.url}: invalid JSON (${err.message})`);
      }
      assert(parsed["@context"], `${page.url}: JSON-LD is missing @context`);
      assert(
        typeof parsed.url === "string" && /^https?:\/\//.test(parsed.url),
        `${page.url}: JSON-LD "url" is not an absolute URL (got ${JSON.stringify(parsed.url)})`,
      );
      found.push(parsed["@type"]);
    }
  }
  return `${found.length} block(s), all valid`;
});

check("every photo card has a film-strip frame", () => {
  let checked = 0;
  for (const page of pages) {
    const cardIds = new Set(
      [...page.html.matchAll(/data-photo-id="([^"]+)"/g)].map((m) => m[1]),
    );
    if (cardIds.size === 0) continue;

    const frameIds = new Set(
      [...page.html.matchAll(/id="film-frame-([^"]+)"/g)].map((m) => m[1]),
    );
    assert(frameIds.size > 0, `${page.url} has photo cards but no film-strip frames`);

    for (const id of cardIds) {
      assert(
        frameIds.has(id),
        `${page.url}: card "${id}" has no film-strip frame (clicking it would not open)`,
      );
    }
    assert(
      cardIds.size === frameIds.size,
      `${page.url}: ${cardIds.size} photo card(s) vs ${frameIds.size} frame(s) — the strip and the grid disagree`,
    );
    checked += cardIds.size;
  }
  assert(checked > 0, "no photo cards found in any page");
  return `${checked} card(s) paired with frames`;
});

check("photo cards are keyboard reachable", () => {
  let cards = 0;
  for (const page of contentPages) {
    for (const m of page.html.matchAll(/<a[^>]*data-photo-id="[^"]*"[^>]*>/g)) {
      cards += 1;
      assert(
        /role="button"/.test(m[0]) && /tabindex="0"/.test(m[0]),
        `${page.url}: a photo card lost role=button/tabindex=0 — keyboard users cannot open it`,
      );
    }
  }
  assert(cards > 0, "no photo cards found in any page");
  return `${cards} card(s) focusable`;
});

check("closed film strip is inert", () => {
  let strips = 0;
  for (const page of contentPages) {
    const tag = page.html.match(/<div[^>]*id="film-strip"[^>]*>/);
    if (!tag) continue;
    strips += 1;
    assert(
      /\binert\b/.test(tag[0]),
      `${page.url}: #film-strip is not inert while closed — Tab still reaches its hidden buttons`,
    );
    assert(
      /aria-hidden="true"/.test(tag[0]),
      `${page.url}: #film-strip should start aria-hidden`,
    );
    assert(/role="dialog"/.test(tag[0]) && /aria-modal="true"/.test(tag[0]),
      `${page.url}: #film-strip should be a modal dialog`);
  }
  assert(strips > 0, "no film strip markup found");
  return `${strips} strip(s)`;
});

check("photo cards ship responsive image candidates", () => {
  let checked = 0;
  for (const page of contentPages) {
    const cards = [...page.html.matchAll(/<a[^>]*data-photo-id="[^"]+"[^>]*>[\s\S]*?<\/a>/g)];
    for (const [card] of cards) {
      const image = card.match(/<img\b[^>]*\bsrcset="[^"]+"[^>]*>/)?.[0] ?? "";
      const srcset = image.match(/\bsrcset="([^"]+)"/)?.[1];
      const widths = new Set(Array.from(srcset?.matchAll(/\s(\d+)w(?=,|$)/g) ?? [], (match) => Number(match[1])));
      const fallbackWidth = Number(image.match(/\bwidth="(\d+)"/)?.[1]);
      const minimum = fallbackWidth <= 400 ? 1 : 2;
      assert(widths.size >= minimum && /\bsizes="[^"]+"/.test(image),
        `${page.url}: a photo card lacks image width candidates or a sizes hint`);
      checked++;
    }
  }
  assert(checked > 0, "no photo cards found");
  return `${checked} card(s) with responsive image candidates`;
});

check("brand and closed navigation are consistent", () => {
  for (const page of contentPages) {
    const header = page.html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0] ?? "";
    const brand = header.match(/<a[^>]*class="[^"]*\bfont-brand\b[^"]*"[^>]*>/)?.[0];
    assert(brand && /\blang="en"/.test(brand), `${page.url}: missing stable Latin brand font`);
    const menu = page.html.match(/<div[^>]*id="mobile-menu"[^>]*>/)?.[0];
    assert(menu && /\binert\b/.test(menu) && /aria-hidden="true"/.test(menu),
      `${page.url}: the closed mobile menu is exposed to keyboard or screen readers`);
  }
  return `${contentPages.length} page(s)`;
});

check("zh-cn pages use Traditional Chinese", () => {
  const zhPages = pages.filter((p) => p.url.startsWith("/zh-cn"));
  assert(zhPages.length > 0, "no /zh-cn pages found");
  const hits = [];
  for (const page of zhPages) {
    for (const m of page.html.matchAll(SIMPLIFIED_RE)) {
      hits.push(`${page.url}: "${m[0]}"`);
    }
  }
  assert(hits.length === 0, `Simplified characters found: ${hits.join(", ")}`);
  return `${zhPages.length} page(s) clean`;
});

check("zh-cn page titles use 聯繫", () => {
  const contact = pages.find((p) => p.url === "/zh-cn/contact/");
  assert(contact, "/zh-cn/contact/ not built");
  assert(/<title>[^<]*聯繫[^<]*<\/title>/.test(contact.html), "title does not contain 聯繫");
  return "ok";
});

check("html lang attribute matches the locale", () => {
  for (const page of contentPages) {
    const lang = (page.html.match(/<html[^>]*\blang="([^"]+)"/i) || [])[1];
    assert(lang, `${page.url}: <html> has no lang`);
    if (page.url.startsWith("/zh-cn")) {
      assert(lang === "zh-Hant", `${page.url}: lang="${lang}", expected "zh-Hant"`);
      assert(/rel="alternate" hreflang="zh-Hant"/.test(page.html),
        `${page.url}: missing Traditional Chinese alternate link`);
    } else {
      assert(lang === "en", `${page.url}: lang="${lang}", expected "en"`);
    }
  }
  return `${contentPages.length} page(s)`;
});

check("every local asset referenced by HTML exists", () => {
  const missing = new Set();
  let checked = 0;

  const resolveLocal = (rawUrl) => {
    const url = rawUrl.split("#")[0].split("?")[0];
    if (!url || !url.startsWith("/")) return;
    let target = path.join(DIST, url.replace(/^\/+/, ""));
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, "index.html");
    } else if (!fs.existsSync(target) && url.endsWith("/")) {
      target = path.join(target, "index.html");
    }
    checked += 1;
    if (!fs.existsSync(target)) missing.add(url);
  };

  for (const page of pages) {
    for (const m of page.html.matchAll(/\b(?:src|href)="(\/[^"]*)"/g)) resolveLocal(m[1]);
    for (const m of page.html.matchAll(/\bsrcset="([^"]*)"/g)) {
      for (const part of m[1].split(",")) {
        const url = part.trim().split(/\s+/)[0];
        if (url) resolveLocal(url);
      }
    }
  }
  assert(missing.size === 0, `missing in dist/: ${[...missing].slice(0, 8).join(", ")}`);
  return `${checked} reference(s) resolved`;
});

check("every local asset referenced by CSS exists", () => {
  const cssFiles = [];
  (function walkCss(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walkCss(p);
      else if (entry.name.endsWith(".css")) cssFiles.push(p);
    }
  })(DIST);

  const missing = new Set();
  let checked = 0;
  for (const file of cssFiles) {
    const css = fs.readFileSync(file, "utf8");
    for (const m of css.matchAll(/url\(\s*['"]?(\/[^'")]+)['"]?\s*\)/g)) {
      const url = m[1].split("#")[0].split("?")[0];
      checked += 1;
      if (!fs.existsSync(path.join(DIST, url.replace(/^\/+/, "")))) missing.add(url);
    }
  }
  assert(missing.size === 0, `missing in dist/: ${[...missing].slice(0, 8).join(", ")}`);
  return `${checked} reference(s) in ${cssFiles.length} css file(s)`;
});

check("root is a redirect to /en/", () => {
  const root = pages.find((p) => p.url === "/");
  assert(root, "dist/index.html not built");
  assert(
    /http-equiv="refresh"[^>]*url=\/en\//i.test(root.html) || /location\.replace\(['"]\/en\//.test(root.html),
    "root page does not redirect to /en/",
  );
  return "ok";
});

check("sitemap covers both locales", () => {
  const sitemap = path.join(DIST, "sitemap-0.xml");
  assert(fs.existsSync(sitemap), "dist/sitemap-0.xml not found");
  const xml = fs.readFileSync(sitemap, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert(locs.some((u) => u.endsWith("/en/")), "sitemap has no /en/");
  assert(locs.some((u) => u.includes("/zh-cn/")), "sitemap has no /zh-cn/");
  return `${locs.length} URL(s)`;
});

// ------------------------------------------------------------------ report
const width = Math.max(...results.map((r) => r.name.length));
console.log("\nJTimes build verification\n");
for (const r of results) {
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(width)}  ${r.detail}`);
}
const failed = results.filter((r) => !r.ok);
console.log(
  `\n${failed.length === 0 ? "All checks passed" : `${failed.length} of ${results.length} checks FAILED`}\n`,
);
process.exit(failed.length === 0 ? 0 : 1);
