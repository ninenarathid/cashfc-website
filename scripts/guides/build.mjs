#!/usr/bin/env node
/*
 * Builds one fight's guide from its data file, for a look before it goes in.
 *
 *   node scripts/guides/build.mjs scripts/guides/data/<slug>.json
 *
 * Writes, all of it git-ignored or temporary:
 *   public/guides/preview/<slug>/NN.webp       our pictures, one per step with a scene
 *   public/guides/preview/<slug>/ref-NN-K.webp the reference pictures, made small
 *   public/guides/preview/<slug>.rows.json     the guide and its steps as the page reads them
 *   public/guides/preview/index.json           which fights the dev preview loads
 *   <scratch>/<slug>-compare-N.png             game8's picture beside ours, six to a sheet
 *
 * The rows use made-up storage paths (the preview page maps them to the files
 * above); scripts/guides/import.mjs puts the real thing into the database.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { sceneSvg, sceneSpots } from "./render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const require = createRequire(import.meta.url);
const sharp = require(join(repo, "node_modules/sharp"));

const FAKE_UID = "00000000-0000-4000-8000-000000000000";
const pad = (n) => String(n).padStart(2, "0");

async function fetchPicture(url) {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

export async function buildFight(file, { compareDir } = {}) {
  const fight = JSON.parse(readFileSync(file, "utf8"));
  const slug = fight.guide.slug;
  const pub = join(repo, "public/guides/preview", slug);
  mkdirSync(pub, { recursive: true });
  const defaults = fight.defaults ?? {};
  const rows = [];
  const pics = {};
  const pairs = [];
  let id = 1000 * (Math.abs([...slug].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 900 + 100);

  for (const [i, step] of fight.steps.entries()) {
    let picture = null, pic_w = null, pic_h = null;
    if (step.scene) {
      const { svg, w, h } = sceneSvg(step.scene, defaults);
      const out = join(pub, `${pad(i)}.webp`);
      await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(out);
      picture = `${FAKE_UID}/g-${1764000000000 + id + i}-${slug.replace(/[^a-z0-9]/g, "").slice(0, 8).padEnd(4, "x")}.webp`;
      pics[picture] = `/guides/preview/${slug}/${pad(i)}.webp`;
      pic_w = w; pic_h = h;
      if (step.game8?.[0]) pairs.push({ i, label: `${pad(i)} ${step.mech ?? ""} / ${step.name}`, game8: step.game8[0], ours: out });
    }
    const refs = [];
    for (const [k, r] of (step.refs ?? []).entries()) {
      const buf = await fetchPicture(r.src);
      const img = sharp(buf);
      const m = await img.metadata();
      const scale = Math.min(1, 1000 / (m.width ?? 1000));
      const w = Math.round((m.width ?? 1000) * scale), h = Math.round((m.height ?? 750) * scale);
      const out = join(pub, `ref-${pad(i)}-${k}.webp`);
      await sharp(buf).resize(w, h).webp({ quality: 85 }).toFile(out);
      const path = `${FAKE_UID}/g-${1764000000000 + id + 500 + i * 4 + k}-ref${k}x.webp`;
      pics[path] = `/guides/preview/${slug}/ref-${pad(i)}-${k}.webp`;
      const sayEn = step.en?.refs?.[k];
      refs.push({ path, w, h, ...(r.say ? { say: r.say } : {}), ...(sayEn ? { say_en: sayEn } : {}) });
    }
    rows.push({
      id: id + i, guide_id: id, sort: i + 1, phase: step.phase ?? null, mech: step.mech ?? null,
      name: step.name, note: step.note ?? null,
      phase_en: step.en?.phase ?? null, mech_en: step.en?.mech ?? null,
      name_en: step.en?.name ?? null, note_en: step.en?.note ?? null,
      picture, pic_w, pic_h,
      ring: step.ring ?? defaults.ring ?? 6, spots: sceneSpots(step.scene ?? {}, step.says ?? {}, step.strict, step.en?.says ?? {}),
      refs,
    });
  }

  // What the fight gives: icons and pictures fetched once, kept beside the rest.
  const rewards = [];
  let rk = 0;
  const keep = async (src, tag, max = 1000) => {
    const buf = await fetchPicture(src);
    const m = await sharp(buf).metadata();
    const k = Math.min(1, max / (m.width ?? max));
    const w = Math.round((m.width ?? max) * k), h = Math.round((m.height ?? max) * k);
    const file = `rw-${tag}.webp`;
    await sharp(buf).resize(w, h).webp({ quality: 88 }).toFile(join(pub, file));
    const path = `${FAKE_UID}/g-${1764000000000 + id + 800 + rk++}-rw${String(rk).padStart(3, "0")}.webp`;
    pics[path] = `/guides/preview/${slug}/${file}`;
    return { path, w, h };
  };
  for (const [i, r] of (fight.rewards ?? []).entries()) {
    const icon = r.icon_src ? (await keep(r.icon_src, `${i}-icon`, 160)).path : null;
    const rpics = [];
    for (const [k, q] of (r.pics ?? []).entries()) {
      const kept = await keep(q.src, `${i}-pic${k}`);
      rpics.push({ ...kept, ...(q.say ? { say: q.say } : {}), ...(q.say_en ? { say_en: q.say_en } : {}) });
    }
    const pieces = [];
    for (const [k, q] of (r.pieces ?? []).entries()) {
      const kept = q.icon_src ? await keep(q.icon_src, `${i}-p${k}`, 160) : null;
      pieces.push({ name: q.name, ...(q.job ? { job: q.job } : {}), ...(kept ? { icon: kept.path } : {}) });
    }
    rewards.push({ id: id + 900 + i, guide_id: id, sort: i + 1, kind: r.kind ?? "other", name: r.name,
      ilvl: r.ilvl ?? null, say: r.say ?? null, say_en: r.say_en ?? null, icon, pics: rpics, pieces });
  }

  const guide = {
    id, slug, name: fight.guide.name, short: fight.guide.short ?? null,
    expansion: fight.guide.expansion ?? "Dawntrail", category: fight.guide.category ?? "extreme",
    patch: fight.guide.patch ?? null, source_name: fight.guide.source_name ?? "game8",
    source_url: fight.guide.source_url ?? null, note: fight.guide.note ?? null,
    note_en: fight.guide.en?.note ?? null,
    req_level: fight.guide.req?.level ?? null, req_ilvl: fight.guide.req?.ilvl ?? null,
    req_party: fight.guide.req?.party ?? null, req_minutes: fight.guide.req?.minutes ?? null,
    unlock: fight.guide.req?.unlock ?? null, unlock_en: fight.guide.req?.unlock_en ?? null,
    content_key: fight.guide.content_key ?? null, published: true, sort: fight.guide.sort ?? 0,
  };
  writeFileSync(join(repo, "public/guides/preview", `${slug}.rows.json`), JSON.stringify({ guide, steps: rows, rewards, pics }));

  const indexFile = join(repo, "public/guides/preview/index.json");
  const index = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, "utf8")) : [];
  if (!index.includes(slug)) index.push(slug);
  writeFileSync(indexFile, JSON.stringify(index));

  // game8's picture beside ours, for checking the two say the same thing.
  if (compareDir && pairs.length) {
    mkdirSync(compareDir, { recursive: true });
    const CW = 440, CH = 330, PAD = 10, LBL = 26;
    for (let s = 0; s * 6 < pairs.length; s++) {
      const chunk = pairs.slice(s * 6, s * 6 + 6);
      const H = chunk.length * (CH + LBL + PAD) + PAD;
      const comps = [];
      let svg = "";
      for (const [k, p] of chunk.entries()) {
        const y = PAD + k * (CH + LBL + PAD);
        const g = await sharp(await fetchPicture(p.game8)).resize(CW, CH, { fit: "contain", background: "#222" }).png().toBuffer();
        const o = await sharp(p.ours).resize(CW, CH, { fit: "contain", background: "#222" }).png().toBuffer();
        comps.push({ input: g, left: PAD, top: y + LBL }, { input: o, left: PAD * 2 + CW, top: y + LBL });
        svg += `<text x="${PAD}" y="${y + 18}" font-family="Arial" font-size="16" fill="#ffd27a">${p.label.replace(/[&<>]/g, "")}  (left: game8, right: ours)</text>`;
      }
      const sheet = join(compareDir, `${slug}-compare-${s + 1}.png`);
      await sharp({ create: { width: CW * 2 + PAD * 3, height: H, channels: 3, background: "#2a2a30" } })
        .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW * 2 + PAD * 3}" height="${H}">${svg}</svg>`), left: 0, top: 0 }])
        .png().toFile(sheet);
      console.log(sheet);
    }
  }
  console.log(`${slug}: ${rows.length} steps, ${rows.filter((r) => r.picture).length} pictures, ${rows.reduce((a, r) => a + r.refs.length, 0)} refs, ${rewards.length} rewards`);
  return { guide, rows };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const compareDir = args.includes("--compare") ? args[args.indexOf("--compare") + 1] : undefined;
  buildFight(file, { compareDir }).catch((e) => { console.error(e); process.exit(1); });
}
