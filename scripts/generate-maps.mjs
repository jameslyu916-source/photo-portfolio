import { readFileSync, writeFileSync } from "node:fs";

const DATA_DIR = new URL("./map-data/", import.meta.url).pathname;
const OUTPUT_DIR = new URL("../src/assets/maps/", import.meta.url).pathname;

// "coastline" type = Overpass JSON with many individual LineStrings
// "polygon" type = GeoJSON MultiPolygon (admin boundary)
const REGIONS = {
  "hong-kong": { file: "hong-kong-coastline.json", type: "coastline", label: "Hong Kong", tolerance: 0.00008 },
  sichuan: { file: "sichuan.json", type: "polygon", label: "Sichuan", tolerance: 0.008 },
};

const SVG_SIZE = 400;
const TARGET_POINTS = 900;
const HK_TARGET_POINTS = 3000; // more points for smoother coastlines
const MIN_LINE_POINTS = 2; // keep even short segments

// Ramer-Douglas-Peucker simplification
function simplifyRing(points, tolerance) {
  if (points.length <= 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last[0] - first[0];
  const dy = last[1] - first[1];
  const lenSq = dx * dx + dy * dy;
  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    let dist;
    if (lenSq === 0) {
      dist = Math.hypot(points[i][0] - first[0], points[i][1] - first[1]);
    } else {
      const t = ((points[i][0] - first[0]) * dx + (points[i][1] - first[1]) * dy) / lenSq;
      const ct = Math.max(0, Math.min(1, t));
      dist = Math.hypot(points[i][0] - (first[0] + ct * dx), points[i][1] - (first[1] + ct * dy));
    }
    if (dist > maxDist) { maxDist = dist; maxIdx = i; }
  }
  if (maxDist <= tolerance) return [first, last];
  const left = simplifyRing(points.slice(0, maxIdx + 1), tolerance);
  const right = simplifyRing(points.slice(maxIdx), tolerance);
  return left.slice(0, -1).concat(right);
}

// Mercator projection — Y NEGATED so north = up in SVG
function project(lng, lat) {
  const rad = Math.PI / 180;
  const x = lng * rad;
  const y = -Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));
  return [x, y];
}

function getLineBounds(lines) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const line of lines) {
    for (const [lng, lat] of line) {
      const [x, y] = project(lng, lat);
      if (x < minX) minX = x; else if (x > maxX) maxX = x;
      if (y < minY) minY = y; else if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

function linesToSvg(lines, bbox) {
  const bw = bbox.maxX - bbox.minX;
  const bh = bbox.maxY - bbox.minY;
  const scale = Math.min(SVG_SIZE / bw, SVG_SIZE / bh);
  const offsetX = (SVG_SIZE - bw * scale) / 2 - bbox.minX * scale;
  const offsetY = (SVG_SIZE - bh * scale) / 2 - bbox.minY * scale;

  const parts = [];
  for (const line of lines) {
    if (line.length < 2) continue;
    let d = "";
    for (let i = 0; i < line.length; i++) {
      const [x, y] = project(line[i][0], line[i][1]);
      const sx = (x * scale + offsetX).toFixed(1);
      const sy = (y * scale + offsetY).toFixed(1);
      d += i === 0 ? `M${sx},${sy}` : `L${sx},${sy}`;
    }
    parts.push(d);
  }
  return parts.join(" ");
}

// Merge adjacent line segments whose endpoints are within threshold degrees
function mergeLines(lines, threshold) {
  if (lines.length <= 1) return lines;
  const result = [];
  const used = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    let merged = [...lines[i]];
    used.add(i);
    let grown = true;
    while (grown) {
      grown = false;
      const tail = merged[merged.length - 1];
      const head = merged[0];
      for (let j = 0; j < lines.length; j++) {
        if (used.has(j)) continue;
        const other = lines[j];
        // Try attach to tail
        if (Math.hypot(tail[0] - other[0][0], tail[1] - other[0][1]) < threshold) {
          merged = merged.concat(other.slice(1));
          used.add(j); grown = true; break;
        }
        if (Math.hypot(tail[0] - other[other.length - 1][0], tail[1] - other[other.length - 1][1]) < threshold) {
          merged = merged.concat([...other].reverse().slice(1));
          used.add(j); grown = true; break;
        }
        // Try attach to head
        if (Math.hypot(head[0] - other[other.length - 1][0], head[1] - other[other.length - 1][1]) < threshold) {
          merged = [...other, ...merged.slice(1)];
          used.add(j); grown = true; break;
        }
        if (Math.hypot(head[0] - other[0][0], head[1] - other[0][1]) < threshold) {
          merged = [...([...other].reverse()), ...merged.slice(1)];
          used.add(j); grown = true; break;
        }
      }
    }
    if (merged.length >= 2) result.push(merged);
  }
  return result;
}

function generateCoastline(key, config) {
  console.log(`\n[${config.label}] (coastline)`);
  const raw = JSON.parse(readFileSync(DATA_DIR + config.file, "utf-8"));
  const elements = raw.elements || [];

  // Convert Overpass {lat, lon} → [lng, lat]
  let lines = [];
  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 2) continue;
    lines.push(el.geometry.map((p) => [p.lon, p.lat]));
  }
  console.log(`  Raw segments: ${lines.length}`);

  // Merge adjacent segments
  lines = mergeLines(lines, 0.001); // ~100m gap tolerance
  // Keep only lines with meaningful length
  lines = lines.filter((l) => l.length >= 6);
  console.log(`  Merged: ${lines.length} lines`);

  // Simplify each line
  const target = HK_TARGET_POINTS;
  let tolerance = config.tolerance;
  for (let iter = 0; iter < 10; iter++) {
    const simplified = lines.map((l) => simplifyRing(l, tolerance));
    const total = simplified.reduce((s, l) => s + l.length, 0);
    if (total <= target) break;
    tolerance *= 1.3;
  }
  const finalLines = lines
    .map((l) => simplifyRing(l, tolerance))
    .filter((l) => l.length >= MIN_LINE_POINTS);
  const totalPts = finalLines.reduce((s, l) => s + l.length, 0);
  console.log(`  Points: ${totalPts} (tol=${tolerance.toFixed(5)})`);

  const bbox = getLineBounds(finalLines);
  const pathD = linesToSvg(finalLines, bbox);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" width="${SVG_SIZE}" height="${SVG_SIZE}">
  <path d="${pathD}" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.38" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
  const outPath = OUTPUT_DIR + key + ".svg";
  writeFileSync(outPath, svg);
  console.log(`  → ${outPath} (${Buffer.byteLength(svg)} bytes)`);
}

function generatePolygon(key, config) {
  console.log(`\n[${config.label}] (polygon)`);
  const raw = JSON.parse(readFileSync(DATA_DIR + config.file, "utf-8"));
  const original = raw.coordinates; // MultiPolygon

  // Simplify
  let tolerance = config.tolerance;
  let simplified;
  for (let i = 0; i < 10; i++) {
    simplified = simplifyMultiPolygon(original, tolerance);
    let n = 0;
    for (const p of simplified) for (const r of p) n += r.length;
    if (n <= TARGET_POINTS) break;
    tolerance *= 1.5;
  }
  let n = 0;
  for (const p of simplified) for (const r of p) n += r.length;
  console.log(`  Points: ${countAll(original)} → ${n} (tol=${tolerance.toFixed(5)})`);

  // Convert polygons to line paths
  const lines = [];
  for (const poly of simplified) {
    for (const ring of poly) {
      if (ring.length >= MIN_LINE_POINTS) lines.push(ring);
    }
  }
  const bbox = getLineBounds(lines);
  const pathD = linesToSvg(lines, bbox);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" width="${SVG_SIZE}" height="${SVG_SIZE}">
  <path d="${pathD}" fill="none" stroke="currentColor" stroke-width="0.7" opacity="0.35" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
  const outPath = OUTPUT_DIR + key + ".svg";
  writeFileSync(outPath, svg);
  console.log(`  → ${outPath} (${Buffer.byteLength(svg)} bytes)`);
}

function simplifyMultiPolygon(mp, tol) {
  return mp.map((poly) => poly.map((ring) => simplifyRing(ring, tol)));
}

function countAll(mp) { let n = 0; for (const p of mp) for (const r of p) n += r.length; return n; }

console.log("Generating maps from OSM data...");
for (const [key, config] of Object.entries(REGIONS)) {
  if (config.type === "coastline") {
    generateCoastline(key, config);
  } else {
    generatePolygon(key, config);
  }
}
console.log("\nDone.");
