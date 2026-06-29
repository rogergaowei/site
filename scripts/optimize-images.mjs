import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ASSET_ROOT = "blog/assets";
const MAX_SIZE = "1600x1600>";
const QUALITY = "82";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

const magick = await findMagick();
const images = await collectImages(ASSET_ROOT);
let created = 0;
let skipped = 0;
let originalBytes = 0;
let webpBytes = 0;

for (const image of images) {
  const output = `${image.slice(0, -extname(image).length)}.webp`;
  const sourceInfo = await stat(image);
  originalBytes += sourceInfo.size;

  if (await isFresh(output, sourceInfo.mtimeMs)) {
    const outputInfo = await stat(output);
    webpBytes += outputInfo.size;
    skipped += 1;
    continue;
  }

  await execFileAsync(magick, [
    image,
    "-auto-orient",
    "-resize",
    MAX_SIZE,
    "-strip",
    "-quality",
    QUALITY,
    output,
  ]);

  const outputInfo = await stat(output);
  webpBytes += outputInfo.size;
  created += 1;
}

const savings = originalBytes > 0 ? Math.round((1 - webpBytes / originalBytes) * 100) : 0;
console.log(`Optimized images: ${created} created, ${skipped} unchanged.`);
console.log(`Original total: ${formatBytes(originalBytes)}. WebP total: ${formatBytes(webpBytes)}. Savings: ${savings}%.`);

async function collectImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectImages(path));
    } else if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(path);
    }
  }
  return files;
}

async function isFresh(path, sourceMtimeMs) {
  try {
    const outputInfo = await stat(path);
    return outputInfo.mtimeMs >= sourceMtimeMs;
  } catch {
    return false;
  }
}

async function findMagick() {
  const candidates = [
    "magick",
    "C:\\Program Files\\ImageMagick-7.1.2-Q16-HDRI\\magick.exe",
  ];

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ["-version"]);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("ImageMagick was not found. Install it with: winget install --id ImageMagick.ImageMagick --exact");
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
