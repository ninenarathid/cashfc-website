#!/usr/bin/env node
/*
 * WCAG 2 contrast between a colour and one or more backgrounds, where either
 * side may be a hex (#d14b3a, #fff) or one of the site's own token names from
 * the @theme block in app/globals.css (chili, surface, card, bg, ink, muted…).
 *
 *   node contrast.mjs chili bg surface card
 *   node contrast.mjs "#6e3b23" "#161b23"
 *
 * The bars: 4.5:1 for body text, 3:1 for large text (≥24px, or ≥18.66px bold)
 * and for the edges of controls and meaningful icons (WCAG 1.4.3 / 1.4.11).
 * The site's own rules on top: a rare popoto flavour's colour is text on the
 * dark card, so it needs 3:1 there; line-strong clears 3:1 on every surface.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [fg, ...bgs] = process.argv.slice(2);
if (!fg || !bgs.length) {
  console.error("usage: node contrast.mjs <fg> <bg> [more bgs]   (hex or token name, e.g. chili surface)");
  process.exit(2);
}

const tokens = readTokens();
const pad = Math.max(...bgs.map((b) => label(b).length));
for (const bg of bgs) {
  const ratio = contrast(resolve(fg), resolve(bg));
  const verdict = ratio >= 7 ? "AAA text" : ratio >= 4.5 ? "AA text" : ratio >= 3 ? "large text / UI only" : "FAILS";
  console.log(`${label(fg)} on ${label(bg).padEnd(pad)}  ${ratio.toFixed(2)}:1  ${verdict}`);
}

function label(v) {
  return tokens[v] ? `${v} (${tokens[v]})` : v;
}

function resolve(v) {
  const hex = tokens[v] ?? v;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    console.error(`not a hex colour or a known token: ${v}`);
    process.exit(2);
  }
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// --color-<name>: #hex; from the @theme block, if the file is reachable.
function readTokens() {
  const repo = process.env.FC_REPO ?? process.cwd();
  const css = join(repo, "app", "globals.css");
  if (!existsSync(css)) return {};
  const out = {};
  for (const m of readFileSync(css, "utf8").matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{3,6})\b/gi)) out[m[1]] = m[2];
  return out;
}
