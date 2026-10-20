// work/pasture/chars.json written again from what PixelLab made (each work/pl/pasture2-char-<look>/response.json): two
// runs of pasture-looks.mjs at once each wrote their own copy over the other's (2026-10-20), so the file is taken from
// the characters themselves. A look's kind is its species' (a back character's `back`, `backbird`, `backsheep`).
//
//   node pasture-chars.mjs
import fs from "node:fs";
import path from "node:path";
import { charsFromPl } from "./pasture-frames.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const FILE = path.join(HERE, "work", "pasture", "chars.json");
const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {}, chars = charsFromPl();
for (const k of Object.keys(chars)) chars[k] = { ...(old[k] ?? {}), ...chars[k] };
fs.writeFileSync(FILE, JSON.stringify(chars, null, 1));
console.log(`${Object.keys(chars).length} characters (was ${Object.keys(old).length})`);
