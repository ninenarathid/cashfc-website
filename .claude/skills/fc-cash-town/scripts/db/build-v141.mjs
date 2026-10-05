// Writes v141's two functions between the draft's marked lines: `town.jar_now` and `public.town_jar_drop` from
// v129's as it ran, each with the line of v141.lines.mjs in place of what was there. v141's dry run holds the file
// to the same.
//   node build-v141.mjs [<v141 file>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { migration } from "./pglite-harness.mjs";
import { JAR_DROP, JAR_NOW } from "./v141.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const file = process.argv[2] ?? here("v141_draft.sql");
const lf = (s) => s.split("\r\n").join("\n");
const V129 = lf(migration(129));
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
export const MADE = { jar_now: () => again(V129, "town.jar_now", JAR_NOW), jar_drop: () => again(V129, "public.town_jar_drop", JAR_DROP) };

if (existsSync(file) && process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const was = readFileSync(file, "utf8"), nl = was.includes("\r\n") ? "\r\n" : "\n";
  let t = lf(was);
  for (const [mark, make] of Object.entries(MADE)) {
    const open = `-- <${mark}>\n`, close = `-- </${mark}>`, a = t.indexOf(open), b = t.indexOf(close);
    if (a < 0 || b < 0) throw new Error(`the draft has no marked lines for ${mark}`);
    t = t.slice(0, a + open.length) + make() + "\n" + t.slice(b);
  }
  if (t !== lf(was)) { writeFileSync(file, t.split("\n").join(nl)); console.log("written again: town.jar_now and public.town_jar_drop from v129's"); } else console.log("both are as they stand already, with what v141 adds");
}
