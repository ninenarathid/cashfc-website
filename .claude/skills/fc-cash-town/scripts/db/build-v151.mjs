// Writes v151's three functions that are written again between the draft's marked lines: each from the file that last
// wrote it, as it ran, with the lines of v151.lines.mjs changed. v151's dry run holds the file to the same.
//   node build-v151.mjs [<v151 file>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { migration } from "./pglite-harness.mjs";
import { STRIKE_WINDOW, TEND, WORK_ANSWER } from "./v151.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const file = process.argv[2] ?? here("v151_draft.sql");
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
  strike_window: [146, "town.strike_window", STRIKE_WINDOW], tend: [119, "town.tend", TEND], work_answer: [149, "town.work_answer", WORK_ANSWER],
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
  else console.log("it is as it stands already, with what v151 changes");
}
