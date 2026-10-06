// Writes v145's ten functions that are written again between the draft's marked lines: each from the file that last
// wrote it, as it ran, with the lines of v145.lines.mjs changed. v145's dry run holds the file to the same.
//   node build-v145.mjs [<v145 file>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { migration } from "./pglite-harness.mjs";
import { CAST_LINE, CHEW, COST_OF, HAS_BUFF, ODDS, PURSE_OF, SIT_DOWN, STRIKE_WINDOW, TOWN_CAST, WATER } from "./v145.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const file = process.argv[2] ?? here("v145_draft.sql");
const lf = (s) => s.split("\r\n").join("\n");
const from = new Map();
const V = (n) => { if (!from.has(n)) from.set(n, lf(migration(n))); return from.get(n); };
/** A function of a file's as it stands, with some lines of it changed. */
export function again(sql, name, lines) {
  const at = sql.lastIndexOf(`create or replace function ${name}(`);
  if (at < 0) throw new Error(`no ${name} to write again`);
  let text = sql.slice(at, sql.indexOf("$$;", sql.indexOf("as $$", at) + 5) + 3);
  for (const [was, to] of lines) {
    if (text.split(was).length !== 2) throw new Error(`a line meant is not in ${name} once: ${was.slice(0, 60)}`);
    text = text.replace(was, () => to);
  }
  return text;
}
/** Each function written again: the file it was last written in, its name, and the lines of it that change. */
export const AGAIN = {
  sit_down: [107, "town.sit_down", SIT_DOWN], chew: [111, "town.chew", CHEW], has_buff: [123, "town.has_buff", HAS_BUFF], cost_of: [123, "town.cost_of", COST_OF],
  strike_window: [123, "town.strike_window", STRIKE_WINDOW], water: [123, "town.water", WATER], odds: [122, "town.odds", ODDS], cast_line: [122, "town.cast_line", CAST_LINE],
  town_cast: [123, "public.town_cast", TOWN_CAST], purse_of: [123, "town.purse_of", PURSE_OF],
};
export const MADE = Object.fromEntries(Object.entries(AGAIN).map(([mark, [n, name, lines]]) => [mark, () => again(V(n), name, lines)]));

if (existsSync(file) && process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const was = readFileSync(file, "utf8"), nl = was.includes("\r\n") ? "\r\n" : "\n";
  let t = lf(was);
  for (const [mark, make] of Object.entries(MADE)) {
    const open = `-- <${mark}>\n`, close = `-- </${mark}>`, a = t.indexOf(open), b = t.indexOf(close);
    if (a < 0 || b < 0) throw new Error(`the draft has no marked lines for ${mark}`);
    t = t.slice(0, a + open.length) + make() + "\n" + t.slice(b);
  }
  if (t !== lf(was)) { writeFileSync(file, t.split("\n").join(nl)); console.log(`written again: ${Object.values(AGAIN).map(([n, name]) => `${name} (v${n}'s)`).join(", ")}`); }
  else console.log("it is as it stands already, with what v145 changes");
}
