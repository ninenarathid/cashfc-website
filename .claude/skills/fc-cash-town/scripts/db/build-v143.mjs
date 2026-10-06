// Writes v143's one function between the draft's marked lines: `town.shop_open` from v142's as it ran, with the line
// of v143.lines.mjs in place of what was there. v143's dry run holds the file to the same.
//   node build-v143.mjs [<v143 file>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { migration } from "./pglite-harness.mjs";
import { SHOP_OPEN } from "./v143.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const file = process.argv[2] ?? here("v143_draft.sql");
const lf = (s) => s.split("\r\n").join("\n");
const V142 = lf(migration(142));
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
export const MADE = { shop_open: () => again(V142, "town.shop_open", SHOP_OPEN) };

if (existsSync(file) && process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const was = readFileSync(file, "utf8"), nl = was.includes("\r\n") ? "\r\n" : "\n";
  let t = lf(was);
  for (const [mark, make] of Object.entries(MADE)) {
    const open = `-- <${mark}>\n`, close = `-- </${mark}>`, a = t.indexOf(open), b = t.indexOf(close);
    if (a < 0 || b < 0) throw new Error(`the draft has no marked lines for ${mark}`);
    t = t.slice(0, a + open.length) + make() + "\n" + t.slice(b);
  }
  if (t !== lf(was)) { writeFileSync(file, t.split("\n").join(nl)); console.log("written again: town.shop_open from v142's"); } else console.log("it is as it stands already, with what v143 changes");
}
