// Writes v145's four functions between the draft's marked lines: `town.feed` and `town.deed_for` from v140's as it
// ran, `town.cure` from v110's, `public.town_tend` from v121's, each with the lines of v145.lines.mjs in place of what was there. Run it after
// any change to those lines; v145's dry run holds the file to the same. (The catalog's block is fill-catalog.mjs's:
// `FC_REPO=<the tree> node fill-catalog.mjs v145 <the draft>`.)
//   node build-v145.mjs [<v145 file>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { migration } from "./pglite-harness.mjs";
import { CURE, DEED_FOR, FEED, TOWN_TEND } from "./v145.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const file = process.argv[2] ?? here("v145_draft.sql");
const lf = (s) => s.split("\r\n").join("\n");
const V140 = lf(migration(140)), V121 = lf(migration(121)), V110 = lf(migration(110));
/** A function of a file's as it stands, with some lines of it changed. */
export function again(sql, name, lines) {
  const at = sql.lastIndexOf(`create or replace function ${name}(`);
  if (at < 0) throw new Error(`no ${name} to write again`);
  let text = sql.slice(at, sql.indexOf("$$;", sql.indexOf("as $$", at) + 5) + 3);
  for (const [from, to] of lines) {
    if (text.split(from).length !== 2) throw new Error(`a line meant is not in ${name} once: ${from.slice(0, 60)}`);
    text = text.replace(from, () => to);
  }
  return text;
}
export const MADE = {
  feed: () => again(V140, "town.feed", FEED), deed_for: () => again(V140, "town.deed_for", DEED_FOR),
  cure: () => again(V110, "town.cure", CURE), town_tend: () => again(V121, "public.town_tend", TOWN_TEND),
};

if (existsSync(file) && process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const was = readFileSync(file, "utf8"), nl = was.includes("\r\n") ? "\r\n" : "\n";
  let t = lf(was);
  for (const [mark, make] of Object.entries(MADE)) {
    const open = `-- <${mark}>\n`, close = `-- </${mark}>`, a = t.indexOf(open), b = t.indexOf(close);
    if (a < 0 || b < 0) throw new Error(`the draft has no marked lines for ${mark}`);
    t = t.slice(0, a + open.length) + make() + "\n" + t.slice(b);
  }
  if (t !== lf(was)) { writeFileSync(file, t.split("\n").join(nl)); console.log("written again: town.feed and town.deed_for from v140's, town.cure from v110's, public.town_tend from v121's"); } else console.log("all four are as they stand already, with what v145 adds");
}
