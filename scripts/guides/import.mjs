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
import { mapPicture } from "./map.mjs";
import { cheatsheetPicture } from "./cheatsheet.mjs";

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
    for (const [k, r] of (step.refs ?? []).slice(0, 4).entries()) {
      // A link, or a file on this machine (a frame cut from a video, v350),
      // relative to the fight's data file.
      let src;
      if (/^https?:\/\//.test(r.src)) {
        const res = await fetch(r.src, { headers: { "user-agent": "Mozilla/5.0" } });
        if (!res.ok) throw new Error(`${r.src}: ${res.status}`);
        src = Buffer.from(await res.arrayBuffer());
      } else {
        src = readFileSync(resolve(dirname(resolve(file)), r.src));
      }
      // Whose picture and the way back to the video (v350): https only.
      if (r.url && !/^https:\/\/[A-Za-z0-9.-]+(\/[^\s"'<>]*)?$/.test(r.url)) throw new Error(`bad credit link: ${r.url}`);
      const m = await sharp(src).metadata();
      // `scale`, not `k`: a `k` here once hid the loop's own index, and every
      // picture's English caption was read from the wrong place (or nowhere).
      const scale = Math.min(1, 1000 / (m.width ?? 1000));
      const w = Math.round((m.width ?? 1000) * scale), h = Math.round((m.height ?? 750) * scale);
      const path = `${owner}/g-${t++}-${rand()}.webp`;
      uploads.push([path, await sharp(src).resize(w, h).webp({ quality: 85 }).toBuffer()]);
      const sayEn = step.en?.refs?.[k];
      refs.push({
        path, w, h, ...(r.say ? { say: r.say.slice(0, 160) } : {}), ...(sayEn ? { say_en: sayEn.slice(0, 160) } : {}),
        ...(r.by ? { by: r.by.slice(0, 60) } : {}), ...(r.url ? { url: r.url } : {}),
      });
    }
    steps.push({
      sort: i + 1, phase: step.phase ?? null, mech: step.mech ?? null, name: step.name.slice(0, 80),
      note: step.note ?? null,
      phase_en: step.en?.phase ?? null, mech_en: step.en?.mech ?? null,
      name_en: step.en?.name?.slice(0, 80) ?? null, note_en: step.en?.note ?? null,
      // Only sent when the fight has a second way to play somewhere, so a
      // guide without one imports whether or not v350 has run; and then on
      // every step, as one insert of many rows wants the same keys on each.
      ...(fight.steps.some((s) => s.plan)
        ? { plan: step.plan?.slice(0, 40) ?? null, plan_en: step.plan ? step.en?.plan?.slice(0, 40) ?? null : null }
        : {}),
      picture, pic_w, pic_h,
      // A whole number in the database (smallint); the data may say 5.5.
      ring: Math.min(30, Math.max(3, Math.round(step.ring ?? defaults.ring ?? 6))),
      spots: sceneSpots(step.scene ?? {}, step.says ?? {}, step.strict, step.en?.says ?? {}), refs,
    });
  }
  // What the fight gives (v347): the game's icons and the pictures, made webp.
  const rewards = [];
  // A picture is a link, or a spot on the game's map ({ map, size, x, y, label }).
  const keep = async (src, max) => {
    let buf;
    if (typeof src === "object") buf = (await mapPicture(src)).buf;
    else {
      const res = await fetch(src, { headers: { "user-agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`${src}: ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
    }
    const m = await sharp(buf).metadata();
    const k = Math.min(1, max / (m.width ?? max));
    const w = Math.round((m.width ?? max) * k), h = Math.round((m.height ?? max) * k);
    const path = `${owner}/g-${t++}-${rand()}.webp`;
    uploads.push([path, await sharp(buf).resize(w, h).webp({ quality: 88 }).toBuffer()]);
    return { path, w, h };
  };
  for (const [i, r] of (fight.rewards ?? []).entries()) {
    const icon = r.icon_src ? (await keep(r.icon_src, 160)).path : null;
    const pics = [];
    for (const q of (r.pics ?? []).slice(0, 4)) {
      pics.push({ ...(await keep(q.map ?? q.src, 1000)), ...(q.say ? { say: q.say.slice(0, 160) } : {}), ...(q.say_en ? { say_en: q.say_en.slice(0, 160) } : {}) });
    }
    const pieces = [];
    for (const q of (r.pieces ?? []).slice(0, 40)) {
      const kept = q.icon_src ? await keep(q.icon_src, 160) : null;
      pieces.push({ name: q.name.slice(0, 80), ...(q.job ? { job: q.job.slice(0, 20) } : {}), ...(kept ? { icon: kept.path } : {}) });
    }
    rewards.push({ sort: i + 1, kind: r.kind ?? "other", name: r.name.slice(0, 80), ilvl: r.ilvl ?? null,
      say: r.say ?? null, say_en: r.say_en ?? null, icon, pics, pieces });
  }
  // The cheatsheet: panels drawn alone, and the whole sheet in Thai and English.
  const cheatPanels = [];
  const cheatPics = [], cheatPicsEn = [];
  if (fight.cheatsheet) {
    for (const panel of (fight.cheatsheet.panels ?? []).slice(0, 16)) {
      let pic = {};
      if (panel.scene) {
        const { svg, w, h } = sceneSvg({ frame: [1, 1], ...panel.scene }, defaults);
        const path = `${owner}/g-${t++}-${rand()}.webp`;
        uploads.push([path, await sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer()]);
        pic = { path, w, h };
      }
      cheatPanels.push({
        title: panel.title.slice(0, 60), ...(panel.title_en ? { title_en: panel.title_en.slice(0, 60) } : {}), ...pic,
        ring: Math.min(30, Math.max(3, Math.round(panel.ring ?? defaults.ring ?? 6))),
        spots: panel.scene ? sceneSpots(panel.scene, {}, panel.strict) : {},
        ...(panel.lines?.length ? { lines: panel.lines.slice(0, 6) } : {}),
        ...(panel.lines_en?.length ? { lines_en: panel.lines_en.slice(0, 6) } : {}),
      });
    }
    for (const [lang, list] of [["th", cheatPics], ["en", cheatPicsEn]]) {
      const { buf, w, h } = await cheatsheetPicture(fight.cheatsheet, defaults, lang);
      const path = `${owner}/g-${t++}-${rand()}.webp`;
      uploads.push([path, buf]);
      list.push({ path, w, h });
    }
  }

  const unlockPics = [];
  for (const q of (g.req?.unlock_pics ?? []).slice(0, 4)) {
    unlockPics.push({ ...(await keep(q.map ?? q.src, 1000)), ...(q.say ? { say: q.say.slice(0, 160) } : {}), ...(q.say_en ? { say_en: q.say_en.slice(0, 160) } : {}) });
  }
  console.log(`${g.slug}: ${steps.length} steps, ${rewards.length} rewards, ${uploads.length} pictures`);
  if (dry) { console.log("dry run: nothing written"); return; }

  for (const [path, buf] of uploads) await upload(path, buf);

  const old = await rest(`guides?select=id&slug=eq.${encodeURIComponent(g.slug)}`);
  let oldPics = [];
  if (old?.[0]) {
    const s = await rest(`guide_steps?select=picture,refs&guide_id=eq.${old[0].id}`);
    oldPics = s.flatMap((x) => [x.picture, ...(x.refs ?? []).map((r) => r.path)]).filter(Boolean);
    // And the old rewards' pictures, where the database has rewards (v347).
    try {
      const og = await rest(`guides?select=unlock_pics,cheat_panels,cheat_pics,cheat_pics_en&id=eq.${old[0].id}`);
      const o = og?.[0] ?? {};
      oldPics.push(...[...(o.unlock_pics ?? []), ...(o.cheat_panels ?? []), ...(o.cheat_pics ?? []), ...(o.cheat_pics_en ?? [])]
        .map((p) => p.path).filter(Boolean));
      const rw = await rest(`guide_rewards?select=icon,pics,pieces&guide_id=eq.${old[0].id}`);
      oldPics.push(...rw.flatMap((x) => [x.icon, ...(x.pics ?? []).map((p) => p.path), ...(x.pieces ?? []).map((p) => p.icon)]).filter(Boolean));
    } catch { /* no rewards table yet */ }
    await rest(`guides?id=eq.${old[0].id}`, { method: "DELETE" });
  }
  const [row] = await rest("guides", {
    method: "POST",
    body: JSON.stringify({
      slug: g.slug, name: g.name, short: g.short ?? null, expansion: g.expansion ?? "Dawntrail",
      category: g.category ?? "extreme", patch: g.patch ?? null, source_name: g.source_name ?? "game8",
      source_url: g.source_url ?? null, note: g.note ?? null, note_en: g.en?.note ?? null,
      req_level: g.req?.level ?? null, req_ilvl: g.req?.ilvl ?? null, req_party: g.req?.party ?? null,
      req_minutes: g.req?.minutes ?? null, unlock: g.req?.unlock ?? null, unlock_en: g.req?.unlock_en ?? null,
      unlock_pics: unlockPics,
      macro_en: g.macro_en ?? null, macro_ja: g.macro_ja ?? null,
      xref_name: g.xref_name ?? null, xref_url: g.xref_url ?? null,
      cheat_panels: cheatPanels, cheat_pics: cheatPics, cheat_pics_en: cheatPicsEn,
      content_key: g.content_key ?? null,
      published: !draft, sort: g.sort ?? 0,
    }),
  });
  try {
    await rest("guide_steps", { method: "POST", body: JSON.stringify(steps.map((s) => ({ ...s, guide_id: row.id }))) });
    if (rewards.length) {
      await rest("guide_rewards", { method: "POST", body: JSON.stringify(rewards.map((r) => ({ ...r, guide_id: row.id }))) });
    }
  } catch (e) {
    // Half a guide is worse than none: take it and its new pictures back out.
    await rest(`guides?id=eq.${row.id}`, { method: "DELETE" }).catch(() => {});
    await removeFiles(uploads.map(([p]) => p));
    throw e;
  }
  await removeFiles(oldPics);
  console.log(`written: /guides/${g.slug} (${draft ? "draft" : "published"})`);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
