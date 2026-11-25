#!/usr/bin/env node
/*
 * Draws a guide's pictures from scenes written as data.
 *
 *   node scripts/guides/render.mjs <fight.json> [--only <step index>] [--out <dir>]
 *
 * The owner, 2026-11-25: the Extreme guides follow game8's plans, but the
 * pictures are our own, drawn again to match game8's — the same arena, the
 * same waymarks, the same places for every role. game8's diagrams are their
 * own work and may not be copied; a plan (who stands where, what goes off
 * where) is a fact about the fight, and this draws that fact in our style
 * with the game's own role and waymark icons (public/guides/icons).
 *
 * A scene is in percent of its frame: x 0–100 from the left, y 0–100 from the
 * top, sizes in percent of the frame's width. Every role's position is also
 * the spot the page lights up for that role, so a scene written once gives
 * both the picture and the eight spotlights.
 *
 * The format is in scripts/guides/README.md.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const require = createRequire(import.meta.url);
const sharp = require(join(repo, "node_modules/sharp"));

const W = 1200; // drawn width; height follows the frame

const COLOR = {
  orange: "#ff9b3d", red: "#ff4d4d", blue: "#4da3ff", purple: "#b46cff", yellow: "#ffd84d",
  green: "#5fd36b", white: "#ffffff", grey: "#9a9a9a", black: "#111111", cyan: "#4de1ff",
  pink: "#ff6fb3",
};
const col = (c, fallback = "orange") => COLOR[c ?? fallback] ?? c ?? COLOR[fallback];

const SEATS = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"];
const SEAT_BADGE = { MT: "#3a62c2", ST: "#3a62c2", H1: "#2f7d3b", H2: "#2f7d3b", D1: "#c2453c", D2: "#c2453c", D3: "#c2453c", D4: "#c2453c" };
const WAYMARKS = ["A", "B", "C", "D", "1", "2", "3", "4"];

const icons = {};
function icon(name) {
  if (icons[name]) return icons[name];
  const file = join(repo, "public/guides/icons", `${name}.png`);
  if (!existsSync(file)) throw new Error(`no icon ${name}`);
  icons[name] = `data:image/png;base64,${readFileSync(file).toString("base64")}`;
  return icons[name];
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Points of a list: one [x,y] or several. */
const pts = (v) => (v == null ? [] : Array.isArray(v[0]) ? v : [v]);

export function sceneSvg(scene, defaults = {}) {
  const frame = scene.frame ?? defaults.frame ?? [4, 3];
  const H = Math.round((W * frame[1]) / frame[0]);
  const X = (p) => (p / 100) * W;
  const Y = (p) => (p / 100) * H;
  const S = (p) => (p / 100) * W; // sizes are in percent of the width
  const out = [];
  const bg = scene.bg ?? defaults.bg ?? "#3b3d42";
  out.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`);

  // The arena: the floor, a soft light in the middle, and a rim.
  const arena = scene.arena === null ? null : { ...(defaults.arena ?? {}), ...(scene.arena ?? {}) };
  if (arena && arena.shape) {
    const fill = arena.fill ?? "#8a8c91";
    const edge = arena.edge ?? "#2b2c30";
    out.push(`<defs><radialGradient id="floor" cx="50%" cy="50%" r="60%">
      <stop offset="0" stop-color="${fill}" stop-opacity="1"/>
      <stop offset="1" stop-color="${fill}" stop-opacity="0.82"/></radialGradient></defs>`);
    const [ax, ay] = arena.at ?? [50, 50];
    if (arena.shape === "circle") {
      out.push(`<circle cx="${X(ax)}" cy="${Y(ay)}" r="${S(arena.r ?? 45)}" fill="url(#floor)" stroke="${edge}" stroke-width="${S(0.8)}"/>`);
    } else {
      const w = S(arena.w ?? 80), h = S(arena.h ?? arena.w ?? 80);
      out.push(`<rect x="${X(ax) - w / 2}" y="${Y(ay) - h / 2}" width="${w}" height="${h}" fill="url(#floor)" stroke="${edge}" stroke-width="${S(0.8)}"/>`);
    }
    // A faint cross through the middle and rings, as a floor would have.
    if (arena.lines !== false) {
      const r = arena.shape === "circle" ? S(arena.r ?? 45) : Math.min(S(arena.w ?? 80), S(arena.h ?? arena.w ?? 80)) / 2;
      out.push(`<g stroke="#ffffff" stroke-opacity="0.10" stroke-width="${S(0.25)}" fill="none">
        <line x1="${X(ax) - r}" y1="${Y(ay)}" x2="${X(ax) + r}" y2="${Y(ay)}"/>
        <line x1="${X(ax)}" y1="${Y(ay) - r}" x2="${X(ax)}" y2="${Y(ay) + r}"/>
        <circle cx="${X(ax)}" cy="${Y(ay)}" r="${r * 0.5}"/></g>`);
    }
  }

  // What goes off, under everybody.
  for (const s of scene.shapes ?? []) {
    const c = col(s.c);
    const o = s.o ?? 0.45;
    const stroke = `stroke="${c}" stroke-opacity="${Math.min(1, o + 0.4)}" stroke-width="${S(s.wd ?? 0.35)}"`;
    if (s.t === "circle") {
      out.push(`<circle cx="${X(s.at[0])}" cy="${Y(s.at[1])}" r="${S(s.r)}" fill="${c}" fill-opacity="${o}" ${stroke}/>`);
    } else if (s.t === "ring") {
      out.push(`<circle cx="${X(s.at[0])}" cy="${Y(s.at[1])}" r="${S(s.r)}" fill="none" stroke="${c}" stroke-width="${S(s.wd ?? 0.6)}" stroke-opacity="${s.o ?? 0.95}"/>`);
    } else if (s.t === "donut") {
      const cx = X(s.at[0]), cy = Y(s.at[1]), R = S(s.r), r = S(s.r2 ?? s.r / 2);
      out.push(`<path fill-rule="evenodd" d="M ${cx - R} ${cy} a ${R} ${R} 0 1 0 ${2 * R} 0 a ${R} ${R} 0 1 0 ${-2 * R} 0 Z M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z" fill="${c}" fill-opacity="${o}" ${stroke}/>`);
    } else if (s.t === "cone") {
      const cx = X(s.at[0]), cy = Y(s.at[1]), L = S(s.len ?? 60);
      const a0 = ((s.dir ?? 0) - (s.spread ?? 90) / 2 - 90) * (Math.PI / 180);
      const a1 = ((s.dir ?? 0) + (s.spread ?? 90) / 2 - 90) * (Math.PI / 180);
      const large = (s.spread ?? 90) > 180 ? 1 : 0;
      out.push(`<path d="M ${cx} ${cy} L ${cx + L * Math.cos(a0)} ${cy + L * Math.sin(a0)} A ${L} ${L} 0 ${large} 1 ${cx + L * Math.cos(a1)} ${cy + L * Math.sin(a1)} Z" fill="${c}" fill-opacity="${o}" ${stroke}/>`);
    } else if (s.t === "rect") {
      const cx = X(s.at[0]), cy = Y(s.at[1]), w = S(s.w), h = S(s.h);
      out.push(`<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" transform="rotate(${s.rot ?? 0} ${cx} ${cy})" fill="${c}" fill-opacity="${o}" ${stroke}/>`);
    } else if (s.t === "line" || s.t === "arrow") {
      const x1 = X(s.from[0]), y1 = Y(s.from[1]), x2 = X(s.to[0]), y2 = Y(s.to[1]);
      const wd = S(s.wd ?? 0.7);
      out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${wd}" stroke-linecap="round" ${s.dash ? `stroke-dasharray="${wd * 2.5} ${wd * 2}"` : ""} stroke-opacity="${s.o ?? 0.95}"/>`);
      if (s.t === "arrow") {
        const a = Math.atan2(y2 - y1, x2 - x1), hl = wd * 4.2;
        const p1 = [x2 - hl * Math.cos(a - 0.45), y2 - hl * Math.sin(a - 0.45)];
        const p2 = [x2 - hl * Math.cos(a + 0.45), y2 - hl * Math.sin(a + 0.45)];
        out.push(`<path d="M ${x2} ${y2} L ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} Z" fill="${c}" fill-opacity="${s.o ?? 0.95}"/>`);
      }
    } else if (s.t === "text") {
      const size = S(s.size ?? 3.2);
      out.push(`<text x="${X(s.at[0])}" y="${Y(s.at[1])}" font-family="Arial, sans-serif" font-weight="700" font-size="${size}" fill="${c === COLOR.orange ? "#fff" : c}" text-anchor="middle" dominant-baseline="middle" stroke="#000" stroke-opacity="0.6" stroke-width="${size * 0.12}" paint-order="stroke">${esc(s.s)}</text>`);
    } else if (s.t === "dot") {
      out.push(`<circle cx="${X(s.at[0])}" cy="${Y(s.at[1])}" r="${S(s.r ?? 1.6)}" fill="${c}" fill-opacity="${s.o ?? 1}" stroke="#000" stroke-opacity="0.5" stroke-width="${S(0.25)}"/>`);
    } else {
      throw new Error(`unknown shape ${s.t}`);
    }
  }

  // The waymarks, the game's own.
  const marks = scene.waymarks === null ? {} : { ...(defaults.waymarks ?? {}), ...(scene.waymarks ?? {}) };
  const ms = S(scene.markSize ?? defaults.markSize ?? 5.5);
  for (const k of WAYMARKS) {
    if (!marks[k]) continue;
    out.push(`<image href="${icon(k)}" x="${X(marks[k][0]) - ms / 2}" y="${Y(marks[k][1]) - ms / 2}" width="${ms}" height="${ms}" opacity="0.9"/>`);
  }

  // The boss, and anything else that is a body rather than a shape.
  for (const b of pts(scene.boss)) {
    const bs = S(scene.bossSize ?? defaults.bossSize ?? 9);
    out.push(`<image href="${icon("boss")}" x="${X(b[0]) - bs / 2}" y="${Y(b[1]) - bs / 2}" width="${bs}" height="${bs}"/>`);
  }

  // The party: the game's role badge, with the seat written on it, because
  // MT and ST wear the same badge in the game.
  const is = S(scene.iconSize ?? defaults.iconSize ?? 6.5);
  for (const seat of SEATS) {
    for (const p of pts(scene.roles?.[seat])) {
      const x = X(p[0]), y = Y(p[1]);
      out.push(`<image href="${icon(seat)}" x="${x - is / 2}" y="${y - is / 2}" width="${is}" height="${is}"/>`);
      const tw = is * 0.62, th = is * 0.36;
      out.push(`<rect x="${x + is * 0.12}" y="${y + is * 0.22}" width="${tw}" height="${th}" rx="${th * 0.3}" fill="${SEAT_BADGE[seat]}" stroke="#fff" stroke-width="${S(0.15)}"/>`);
      out.push(`<text x="${x + is * 0.12 + tw / 2}" y="${y + is * 0.22 + th / 2}" font-family="Arial, sans-serif" font-weight="700" font-size="${th * 0.78}" fill="#fff" text-anchor="middle" dominant-baseline="central">${seat}</text>`);
    }
  }

  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join("")}</svg>`, w: W, h: H };
}

/**
 * Where each seat stands in a scene, as the page's spots: percent of the picture.
 *
 * `strict` says which seats get a ring (the owner, 2026-11-25: "วงตำแหน่ง
 * เฉพาะส่วนที่ strict position จริงๆ"): true or left out, every seat in the
 * picture; false, none — everybody together, a shape being shown, a rough
 * place; a list, only those seats. A seat without a ring keeps its line.
 */
export function sceneSpots(scene, says = {}, strict = true, saysEn = {}) {
  const spots = {};
  const ringed = (seat) => strict === true || strict == null || (Array.isArray(strict) && strict.includes(seat));
  for (const seat of SEATS) {
    const at = ringed(seat)
      ? pts(scene.roles?.[seat]).slice(0, 4).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10])
      : [];
    const say = says[seat]?.trim();
    const sayEn = saysEn?.[seat]?.trim();
    if (at.length || say || sayEn) {
      spots[seat] = { ...(at.length ? { at } : {}), ...(say ? { say } : {}), ...(sayEn ? { say_en: sayEn } : {}) };
    }
  }
  return spots;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) { console.error("usage: render.mjs <fight.json> [--only n] [--out dir]"); process.exit(1); }
  const only = args.includes("--only") ? Number(args[args.indexOf("--only") + 1]) : null;
  const fight = JSON.parse(readFileSync(file, "utf8"));
  const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : join(dirname(file), fight.guide.slug);
  mkdirSync(out, { recursive: true });
  const defaults = fight.defaults ?? {};
  let n = 0;
  for (const [i, step] of fight.steps.entries()) {
    if (only != null && i !== only) continue;
    if (!step.scene) continue;
    const { svg } = sceneSvg(step.scene, defaults);
    const name = `${String(i).padStart(2, "0")}.webp`;
    await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(join(out, name));
    n++;
  }
  console.log(`${n} pictures → ${out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
