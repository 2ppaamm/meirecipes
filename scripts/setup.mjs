#!/usr/bin/env node
/**
 * Setup script — runs on `npm run setup` and as a postinstall step.
 *
 * Downloads brand assets from the live WordPress site:
 *  - /public/mei-mark.png       — the 梅 logo, transparent PNG
 *  - /app/icon.png              — favicon (Next.js App Router convention)
 *  - /public/favicon.ico        — legacy favicon path
 *
 * Idempotent. If a file is missing OR is detected as not being a real PNG
 * (e.g. mis-named JPEG from an earlier session), it gets re-downloaded.
 * Failures are warnings, not errors — the site still renders without them.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const APP = join(ROOT, "app");

const FAVICON_URL =
  "https://www.meirecipes.com/wp-content/uploads/2020/07/cropped-MEI_Logo_2_192x192-32x32.png";

const MARK_URL =
  "https://www.meirecipes.com/wp-content/uploads/2020/07/MEI_Logo_2_192x192.png";

// PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isRealPng(filepath) {
  try {
    if (!existsSync(filepath)) return false;
    const buf = readFileSync(filepath);
    if (buf.length < 8) return false;
    return buf.subarray(0, 8).equals(PNG_MAGIC);
  } catch {
    return false;
  }
}

async function fetchBytes(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "meirecipes-next setup (Node fetch)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error("empty response");
  // Verify the response really is a PNG before writing it
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error("response is not a valid PNG");
  }
  return buf;
}

async function downloadAsset(label, url, dests) {
  // dests is an array of destination paths; we write the same bytes to each.
  // Skip if ALL destinations already have real PNG content.
  if (dests.every(isRealPng)) {
    console.log(`[setup] ${label} already present and valid — skipping`);
    return;
  }
  console.log(`[setup] downloading ${label} from ${url}`);
  try {
    const buf = await fetchBytes(url);
    for (const dest of dests) {
      const dir = dirname(dest);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(dest, buf);
    }
    console.log(`[setup] ${label} written (${buf.length} bytes) to ${dests.length} location(s)`);
  } catch (err) {
    console.warn(`[setup] could not download ${label}: ${err.message}`);
    console.warn(`[setup] manual fallback: curl -o ${dests[0]} ${url}`);
  }
}

await downloadAsset("favicon", FAVICON_URL, [
  join(APP, "icon.png"),
  join(PUBLIC, "favicon.ico"),
]);

await downloadAsset("mei-mark (logo)", MARK_URL, [
  join(PUBLIC, "mei-mark.png"),
]);

console.log("[setup] done");
