/*
 * One picture with the whole fight on it, to keep on a phone (the owner,
 * 2026-11-25: "cheatsheet ดึงมาจาก xivjpraids แต่เอามาแปลไทยก่อนลง ให้เครดิต").
 *
 *   const { buf, w, h } = await cheatsheetPicture(fight.cheatsheet, fight.defaults, "th")
 *
 * The sheet is drawn again, panel by panel, in our style (render.mjs's scenes:
 * the same arena, waymarks and role icons as the guide), laid out as the
 * source lays it out, with every heading in Thai (or English for "en"), and a
 * line at the foot saying where it comes from. A panel without a scene is
 * words only, large.
 *
 *   cheatsheet: {
 *     title: "Thai", title_en: "English",
 *     columns: 3,
 *     panels: [{ title: "Thai", title_en: "…", scene: { … } | null,
 *                lines: ["Thai", …], lines_en: ["…"], span: 1 | 2 }],
 *     footer: "Thai", footer_en: "…",
 *     credit: "Thai", credit_en: "…"
 *   }
 */
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sceneSvg } from "./render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require(join(resolve(here, "../.."), "node_modules/sharp"));

// Thai with its marks stacked right (ขั้น, ทั้ง): Leelawadee UI draws them.
const FONT = "Leelawadee UI, Tahoma, sans-serif";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export async function cheatsheetPicture(sheet, defaults = {}, lang = "th") {
  const en = lang === "en";
  const pick = (th, eng) => (en && eng ? eng : th);
  const cols = sheet.columns ?? 3;
  const PW = 520, PIC = 480, HEAD = 64, PAD = 20, GAP = 18;
  const TOP = 120, FOOT = 120;
  const panels = sheet.panels ?? [];

  // Lay the panels out in rows; a panel may take two columns.
  const cells = [];
  let col = 0, row = 0;
  for (const p of panels) {
    const span = Math.min(cols, p.span ?? 1);
    if (col + span > cols) { col = 0; row++; }
    cells.push({ p, col, row, span });
    col += span;
  }
  const rows = row + 1;
  const W = PAD * 2 + cols * PW + (cols - 1) * GAP;
  const CH = HEAD + PIC + 16;
  const H = TOP + rows * CH + (rows - 1) * GAP + FOOT;

  const comps = [];
  let fg = ""; // drawn over the pictures: the captions, the footer, the credit
  let svg = `<rect width="${W}" height="${H}" fill="#0f1319"/>`;
  svg += `<rect x="0" y="0" width="${W}" height="${TOP - 24}" fill="#173a52"/>`;
  svg += `<text x="${W / 2}" y="${(TOP - 24) / 2 + 16}" font-family="${FONT}" font-size="44" font-weight="700" fill="#fff" text-anchor="middle">${esc(pick(sheet.title, sheet.title_en))}</text>`;

  for (const { p, col: c, row: r, span } of cells) {
    const x = PAD + c * (PW + GAP), y = TOP + r * (CH + GAP);
    const w = span * PW + (span - 1) * GAP;
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${CH}" rx="16" fill="#161c25" stroke="#2b3444" stroke-width="2"/>`;
    svg += `<text x="${x + w / 2}" y="${y + 44}" font-family="${FONT}" font-size="30" font-weight="700" fill="#ffd27a" text-anchor="middle">${esc(pick(p.title, p.title_en))}</text>`;
    if (p.scene) {
      const { svg: s } = sceneSvg({ frame: [1, 1], ...p.scene }, defaults);
      const pic = await sharp(Buffer.from(s)).resize(PIC, PIC).png().toBuffer();
      comps.push({ input: pic, left: Math.round(x + (w - PIC) / 2), top: y + HEAD });
    }
    const lines = pick(p.lines, p.lines_en) ?? [];
    if (lines.length) {
      const big = !p.scene;
      const size = big ? 40 : 26;
      const startY = big ? y + HEAD + PIC / 2 - ((lines.length - 1) * size * 1.5) / 2 : y + HEAD + PIC - 10 - (lines.length - 1) * size * 1.3;
      lines.forEach((l, i) => {
        fg += `<text x="${x + w / 2}" y="${startY + i * size * (big ? 1.5 : 1.3)}" font-family="${FONT}" font-size="${size}" font-weight="700" fill="#e8ecf2" text-anchor="middle" stroke="#0f1319" stroke-width="${big ? 0 : 5}" paint-order="stroke">${esc(l)}</text>`;
      });
    }
  }
  const footer = pick(sheet.footer, sheet.footer_en);
  if (footer) {
    fg += `<text x="${W / 2}" y="${H - FOOT + 52}" font-family="${FONT}" font-size="36" font-weight="700" fill="#fff" text-anchor="middle">${esc(footer)}</text>`;
  }
  const credit = pick(sheet.credit, sheet.credit_en);
  if (credit) {
    fg += `<text x="${W / 2}" y="${H - 22}" font-family="${FONT}" font-size="22" fill="#8b93a1" text-anchor="middle">${esc(credit)}</text>`;
  }

  const base = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`)).png().toBuffer();
  const over = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${fg}</svg>`);
  const buf = await sharp(base).composite([...comps, { input: over, left: 0, top: 0 }]).webp({ quality: 88 }).toBuffer();
  return { buf, w: W, h: H };
}
