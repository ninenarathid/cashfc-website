// Writes v140's two rules between the draft's marked lines: `town.feed` from v110's as it ran and `town.deed_for`
// from v119's, each with the lines of v140.lines.mjs in place of what was there. Run it after any change to those
// lines; v140's dry run holds the file to the same.
//   node build-v140.mjs [<v140 file>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { migration } from "./pglite-harness.mjs";
import { DEED_FOR, FEED } from "./v140.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const file = process.argv[2] ?? here("v140_draft.sql");
const lf = (s) => s.split("\r\n").join("\n");
const V110 = lf(migration(110)), V119 = lf(migration(119));
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
export const MADE = { feed: () => again(V110, "town.feed", FEED), deed_for: () => again(V119, "town.deed_for", DEED_FOR) };

if (existsSync(file) && process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const was = readFileSync(file, "utf8"), nl = was.includes("\r\n") ? "\r\n" : "\n";
  let t = lf(was);
  for (const [mark, make] of Object.entries(MADE)) {
    const open = `-- <${mark}>\n`, close = `-- </${mark}>`, a = t.indexOf(open), b = t.indexOf(close);
    if (a < 0 || b < 0) throw new Error(`the draft has no marked lines for ${mark}`);
    t = t.slice(0, a + open.length) + make() + "\n" + t.slice(b);
  }
  if (t !== lf(was)) { writeFileSync(file, t.split("\n").join(nl)); console.log("written again: town.feed from v110's, town.deed_for from v119's"); } else console.log("both are as they stand already, with what v140 adds");
}
