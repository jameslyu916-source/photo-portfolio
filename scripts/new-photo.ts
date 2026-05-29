/**
 * Scaffold a new photo entry (both en and zh-cn .md files).
 *
 * Usage: npm run new-photo -- <image-filename> [slug]
 * Example: npm run new-photo -- mountains-sunset.jpg
 *
 * The image must already be in src/assets/images/photos/.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const IMAGE_DIR = "./src/assets/images/photos";
const EN_DIR = "./src/content/photos/en";
const ZH_DIR = "./src/content/photos/zh-cn";

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  const imageFile = process.argv[2];
  if (!imageFile) {
    console.log("Usage: npm run new-photo -- <image-filename> [slug]");
    console.log("Example: npm run new-photo -- mountains-sunset.jpg");
    process.exit(1);
  }

  const imagePath = path.join(IMAGE_DIR, imageFile);
  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found: ${imagePath}`);
    console.log("Make sure to run optimize-images first, or place the file in", IMAGE_DIR);
    process.exit(1);
  }

  const slug =
    process.argv[3] ?? path.parse(imageFile).name.toLowerCase().replace(/\s+/g, "-");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`\nCreating photo entry for: ${imageFile}`);
  console.log(`Slug: ${slug}\n`);

  const titleEn = await ask(rl, "English title: ");
  const titleZh = await ask(rl, "中文标题: ");
  const location = await ask(rl, "Location (optional): ");
  const camera = await ask(rl, "Camera (optional): ");
  const lens = await ask(rl, "Lens (optional): ");
  const settings = await ask(rl, "Settings, e.g. f/2.8 1/500s ISO 100 (optional): ");
  const catInput = await ask(
    rl,
    "Category [landscape|street|portrait|nature|architecture|abstract|black-and-white]: ",
  );
  const featuredInput = await ask(rl, "Featured? [y/N]: ");
  const dateInput = await ask(rl, "Date [YYYY-MM-DD]: ");

  rl.close();

  const date = dateInput || new Date().toISOString().split("T")[0];
  const featured = featuredInput.toLowerCase() === "y";
  const category = catInput || undefined;

  const enMd = `---
image: "../../../assets/images/photos/${imageFile}"
title: "${titleEn}"
description: ""
${
  location
    ? `location: "${location}"
`
    : ""}${
  camera
    ? `camera: "${camera}"
`
    : ""}${
  lens
    ? `lens: "${lens}"
`
    : ""}${
  settings
    ? `settings: "${settings}"
`
    : ""}${
  category
    ? `category: "${category}"
`
    : ""}featured: ${featured}
date: ${date}
order: 0
---
`;

  const zhMd = `---
image: "../../../assets/images/photos/${imageFile}"
title: "${titleZh}"
description: ""
${
  location
    ? `location: "${location}"
`
    : ""}${
  camera
    ? `camera: "${camera}"
`
    : ""}${
  lens
    ? `lens: "${lens}"
`
    : ""}${
  settings
    ? `settings: "${settings}"
`
    : ""}${
  category
    ? `category: "${category}"
`
    : ""}featured: ${featured}
date: ${date}
order: 0
---
`;

  fs.mkdirSync(EN_DIR, { recursive: true });
  fs.mkdirSync(ZH_DIR, { recursive: true });
  fs.writeFileSync(path.join(EN_DIR, `${slug}.md`), enMd);
  fs.writeFileSync(path.join(ZH_DIR, `${slug}.md`), zhMd);

  console.log(`\nCreated:`);
  console.log(`  ${EN_DIR}/${slug}.md`);
  console.log(`  ${ZH_DIR}/${slug}.md`);
  console.log(`\nEdit these files to add descriptions and fine-tune metadata.`);
}

main();
