/*
 * A piece of the game's own map with a pin on a spot (the owner, 2026-11-25:
 * "เวลา mention ถึง map เช่น Tuliyollal (X: 11.1 Y: 14.6) ขอภาพแมพด้วย").
 *
 *   await mapPicture({ map: "y6t1/00", size: 180, x: 11.1, y: 14.6, label: "Wandering Minstrel" })
 *
 * The map comes from XIVAPI, composed as the game shows it (2048 px across).
 * A map's coordinates run from 1 across 41 ÷ (its size factor ÷ 100), so a
 * coordinate is a pixel by (c − 1) × 2048 × factor ÷ 41. The picture is cut
 * around the spot, wide enough to recognise the place, with a pin and a label.
 */
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require(join(resolve(here, "../.."), "node_modules/sharp"));

const FULL = 2048;
const maps = new Map();

async function wholeMap(id) {
  if (!maps.has(id)) {
    const res = await fetch(`https://v2.xivapi.com/api/asset/map/${id}`);
    if (!res.ok) throw new Error(`map ${id}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    maps.set(id, await sharp(buf).resize(FULL, FULL).toBuffer());
  }
  return maps.get(id);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** A webp of the map around (x, y) with a pin, and its size. */
export async function mapPicture({ map, size, x, y, label, w = 900, h = 600, zoom = 1.4 }) {
  const k = size / 100;
  const px = ((x - 1) * FULL * k) / 41;
  const py = ((y - 1) * FULL * k) / 41;
  // The window on the map, in map pixels, kept inside the map.
  const cw = Math.round(w / zoom), ch = Math.round(h / zoom);
  const left = Math.max(0, Math.min(FULL - cw, Math.round(px - cw / 2)));
  const top = Math.max(0, Math.min(FULL - ch, Math.round(py - ch / 2)));
  const piece = await sharp(await wholeMap(map)).extract({ left, top, width: cw, height: ch }).resize(w, h).toBuffer();
  // Where the spot lands in the cut picture.
  const sx = ((px - left) / cw) * w, sy = ((py - top) / ch) * h;
  const text = `${label ? `${label} · ` : ""}X ${x} Y ${y}`;
  const tw = text.length * 15 + 36;
  const tx = Math.max(12, Math.min(w - tw - 12, sx - tw / 2));
  const ty = sy - 64 < 12 ? sy + 34 : sy - 64;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <circle cx="${sx}" cy="${sy}" r="30" fill="#e5484d" fill-opacity="0.22" stroke="#e5484d" stroke-width="3"/>
    <circle cx="${sx}" cy="${sy}" r="9" fill="#e5484d" stroke="#fff" stroke-width="3"/>
    <rect x="${tx}" y="${ty}" width="${tw}" height="38" rx="10" fill="#0f1319" fill-opacity="0.86" stroke="#e5484d" stroke-width="2"/>
    <text x="${tx + tw / 2}" y="${ty + 26}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#fff" text-anchor="middle">${esc(text)}</text>
  </svg>`;
  const buf = await sharp(piece).composite([{ input: Buffer.from(svg) }]).webp({ quality: 86 }).toBuffer();
  return { buf, w, h };
}
