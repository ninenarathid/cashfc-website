#!/usr/bin/env node
/*
 * Puts one fight's guide from its data file into the database (v344).
 *
 *   node scripts/guides/import.mjs scripts/guides/data/<slug>.json [--draft] [--dry]
 *
 * Run from the project folder (it reads .env.local for the service key, the
 * same way scripts/evercold-check.mjs does). It draws the pictures again with
 * render.mjs, uploads them and the reference pictures to the `guides` bucket,
 * and writes the guide and its steps. A guide already there under the same
 * slug is replaced whole, its old pictures taken out of the bucket after the
 * new ones are in, so running it twice leaves one copy.
 *
 * Published unless --draft. --dry builds everything and writes nothing.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { sceneSvg, sceneSpots } from "./render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const require = createRequire(import.meta.url);
const sharp = require(join(repo, "node_modules/sharp"));

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const draft = args.includes("--draft");
const dry = args.includes("--dry");
if (!file) { console.error("usage: import.mjs <fight.json> [--draft] [--dry]"); process.exit(1); }

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local"); process.exit(1); }
const H = { apikey: KEY, authorization: `Bearer ${KEY}` };

async function rest(path, init = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init, headers: { ...H, "content-type": "application/json", prefer: "return=representation", ...(init.headers ?? {}) },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${r.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function upload(path, buf) {
  const r = await fetch(`${URL_}/storage/v1/object/guides/${path}`, {
    method: "POST", headers: { ...H, "content-type": "image/webp", "cache-control": "31536000", "x-upsert": "false" }, body: buf,
  });
  if (!r.ok) throw new Error(`upload ${path}: ${r.status} ${await r.text()}`);
}

async function removeFiles(paths) {
  if (!paths.length) return;
  const r = await fetch(`${URL_}/storage/v1/object/guides`, {
    method: "DELETE", headers: { ...H, "content-type": "application/json" }, body: JSON.stringify({ prefixes: paths }),
  });
  if (!r.ok) console.warn(`could not remove old pictures: ${r.status}`);
}

const rand = () => Math.random().toString(36).slice(2, 8).padEnd(4, "0");

async function main() {
  const fight = JSON.parse(readFileSync(file, "utf8"));
  const g = fight.guide;
  const defaults = fight.defaults ?? {};

  // The pictures are filed under an admin's folder, as the editor files them.
  const admins = await rest("profiles?select=id&is_admin=eq.true&limit=1");
  const owner = admins?.[0]?.id;
  if (!owner) throw new Error("no admin profile to file the pictures under");

  const steps = [];
  const uploads = [];
  let t = Date.now();
  for (const [i, step] of fight.steps.entries()) {
    let picture = null, pic_w = null, pic_h = null;
    if (step.scene) {
      const { svg, w, h } = sceneSvg(step.scene, defaults);
      const buf = await sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
      picture = `${owner}/g-${t++}-${rand()}.webp`;
      pic_w = w; pic_h = h;
      uploads.push([picture, buf]);
    }
    const refs = [];
    for (const r of (step.refs ?? []).slice(0, 4)) {
      const res = await fetch(r.src, { headers: { "user-agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`${r.src}: ${res.status}`);
      const src = Buffer.from(await res.arrayBuffer());
      const m = await sharp(src).metadata();
      const k = Math.min(1, 1000 / (m.width ?? 1000));
      const w = Math.round((m.width ?? 1000) * k), h = Math.round((m.height ?? 750) * k);
      const path = `${owner}/g-${t++}-${rand()}.webp`;
      uploads.push([path, await sharp(src).resize(w, h).webp({ quality: 85 }).toBuffer()]);
      refs.push({ path, w, h, ...(r.say ? { say: r.say.slice(0, 160) } : {}) });
    }
    steps.push({
      sort: i + 1, phase: step.phase ?? null, mech: step.mech ?? null, name: step.name.slice(0, 80),
      note: step.note ?? null, picture, pic_w, pic_h, ring: step.ring ?? defaults.ring ?? 6,
      spots: sceneSpots(step.scene ?? {}, step.says ?? {}, step.strict), refs,
    });
  }
  console.log(`${g.slug}: ${steps.length} steps, ${uploads.length} pictures`);
  if (dry) { console.log("dry run: nothing written"); return; }

  for (const [path, buf] of uploads) await upload(path, buf);

  const old = await rest(`guides?select=id&slug=eq.${encodeURIComponent(g.slug)}`);
  let oldPics = [];
  if (old?.[0]) {
    const s = await rest(`guide_steps?select=picture,refs&guide_id=eq.${old[0].id}`);
    oldPics = s.flatMap((x) => [x.picture, ...(x.refs ?? []).map((r) => r.path)]).filter(Boolean);
    await rest(`guides?id=eq.${old[0].id}`, { method: "DELETE" });
  }
  const [row] = await rest("guides", {
    method: "POST",
    body: JSON.stringify({
      slug: g.slug, name: g.name, short: g.short ?? null, expansion: g.expansion ?? "Dawntrail",
      category: g.category ?? "extreme", patch: g.patch ?? null, source_name: g.source_name ?? "game8",
      source_url: g.source_url ?? null, note: g.note ?? null, content_key: g.content_key ?? null,
      published: !draft, sort: g.sort ?? 0,
    }),
  });
  await rest("guide_steps", { method: "POST", body: JSON.stringify(steps.map((s) => ({ ...s, guide_id: row.id }))) });
  await removeFiles(oldPics);
  console.log(`written: /guides/${g.slug} (${draft ? "draft" : "published"})`);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
