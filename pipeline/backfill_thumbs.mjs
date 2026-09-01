#!/usr/bin/env node
/**
 * Give every picture already in the gallery the small copy it never had.
 *
 * New uploads make their own thumbnail in the browser. Everything posted before
 * that has only the original, which the grid then has to load at full size —
 * which is the whole reason 49 MB of stored files went out as 10 GB of cached
 * egress in a month. This is the one-off pass that fixes the back catalogue.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node pipeline/backfill_thumbs.mjs
 *
 *   node pipeline/backfill_thumbs.mjs --dry-run    # count the work, change nothing
 *   node pipeline/backfill_thumbs.mjs --limit 20   # a taste first
 *
 * Reads .env.local if it is there, so the two variables usually need not be
 * typed. The service role key is required rather than the anon one: storage
 * writes are filed under the uploader's own id, and this is writing on behalf
 * of five hundred different people.
 *
 * ── What it will not do ─────────────────────────────────────────────────
 *
 * It never touches an original. The thumbnail is a new file beside it and the
 * row gains a column pointing at it; nothing is resized in place, nothing is
 * re-encoded, and if this script is wrong the worst case is some wasted bytes
 * in the bucket rather than a gallery of degraded screenshots.
 *
 * Rows that already have a thumbnail are skipped, so it is safe to run again
 * after it stops, fails, or is interrupted — and safe to run periodically if a
 * few ever slip through.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

/** The same width the browser uses, so the two paths agree. */
const THUMB_WIDTH = 700;
const QUALITY = 82;
const BUCKET = "gallery";
/** One at a time, with a pause. This is a bucket, not a benchmark. */
const PAUSE_MS = 120;

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? Number(args[i + 1]) : null;
})();

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvLocal();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
    + "(or put them in .env.local). The service role key is under "
    + "Project Settings > API in the Supabase dashboard.");
  process.exit(1);
}

const db = createClient(URL_, KEY, { auth: { persistSession: false } });
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The storage path inside the bucket, back out of the public URL. */
function pathOf(url) {
  const at = url.indexOf(`/${BUCKET}/`);
  if (at < 0) return null;
  return decodeURIComponent(url.slice(at + BUCKET.length + 2).split("?")[0]);
}

let made = 0, skipped = 0, failed = 0, savedBytes = 0;

/** One picture: fetch, shrink, store, point the row at it. */
async function one(table, id, urlColumn, url) {
  const at = pathOf(url);
  if (!at) { skipped += 1; return; }

  const dl = await db.storage.from(BUCKET).download(at);
  if (dl.error) { failed += 1; log(`  ! ${at}: ${dl.error.message}`); return; }
  const original = Buffer.from(await dl.data.arrayBuffer());

  const meta = await sharp(original).metadata();
  if (!meta.width || meta.width <= THUMB_WIDTH) {
    // Already its own thumbnail. Left alone rather than given a copy of itself.
    skipped += 1;
    return;
  }
  const small = await sharp(original)
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
  if (small.length >= original.length) { skipped += 1; return; }

  const to = at.replace(/\.[^./]+$/, "") + ".thumb.webp";
  if (DRY) {
    made += 1;
    savedBytes += original.length - small.length;
    return;
  }
  const put = await db.storage.from(BUCKET).upload(to, small, {
    cacheControl: "31536000", upsert: true, contentType: "image/webp",
  });
  if (put.error) { failed += 1; log(`  ! ${to}: ${put.error.message}`); return; }

  const publicUrl = db.storage.from(BUCKET).getPublicUrl(to).data.publicUrl;
  const upd = await db.from(table).update({ thumb_url: publicUrl }).eq("id", id);
  if (upd.error) { failed += 1; log(`  ! ${table}#${id}: ${upd.error.message}`); return; }

  made += 1;
  savedBytes += original.length - small.length;
}

async function pass(table, urlColumn) {
  let query = db.from(table).select(`id, ${urlColumn}`).is("thumb_url", null);
  if (LIMIT) query = query.limit(LIMIT);
  const { data, error } = await query;
  if (error) {
    console.error(`${table}: ${error.message}`);
    if (error.message.includes("thumb_url")) {
      console.error("Run supabase/migration_v22.sql first — it adds the column.");
    }
    process.exit(1);
  }
  log(`${table} — ${data.length} without a thumbnail`);
  for (const [n, row] of data.entries()) {
    await one(table, row.id, urlColumn, row[urlColumn]);
    if ((n + 1) % 20 === 0) log(`  ${n + 1}/${data.length}`);
    await sleep(PAUSE_MS);
  }
}

const mb = (b) => (b / 1024 / 1024).toFixed(1);

log(DRY ? "Dry run — nothing will be written" : "Backfilling thumbnails");
await pass("gallery_posts", "image_url");
await pass("gallery_images", "url");
log("");
log(`${made} thumbnails${DRY ? " would be made" : " made"}, `
  + `${skipped} skipped, ${failed} failed`);
log(`Each grid view of these now sends about ${mb(savedBytes)} MB less.`);
