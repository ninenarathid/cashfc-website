// Writes v131's two functions between the draft's marked lines: `public.town_bugs` from v125's as it ran, and
// `public.town_net` from v126's (supabase/, then history, then its draft beside this file), each with the lines of
// v131.lines.mjs in place of what was there. Run it after any change to those lines, or to v126 while it is a draft;
// v131's dry run holds the file to the same.
//   node build-v131.mjs [<v131 file>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { migration } from "./pglite-harness.mjs";
import { TOWN_BUGS, TOWN_NET } from "./v131.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const file = process.argv[2] ?? here("v131_draft.sql");
const lf = (s) => s.split("\r\n").join("\n");
export const V126 = lf((() => { try { return migration(126); } catch { return readFileSync(here("v126_draft.sql"), "utf8"); } })());
const V125 = lf(migration(125));
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
export const MADE = { town_bugs: () => again(V125, "public.town_bugs", TOWN_BUGS), town_net: () => again(V126, "public.town_net", TOWN_NET) };

if (existsSync(file) && process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const was = readFileSync(file, "utf8"), nl = was.includes("\r\n") ? "\r\n" : "\n";
  let t = lf(was);
  for (const [mark, make] of Object.entries(MADE)) {
    const open = `-- <${mark}>\n`, close = `-- </${mark}>`, a = t.indexOf(open), b = t.indexOf(close);
    if (a < 0 || b < 0) throw new Error(`the draft has no marked lines for ${mark}`);
    t = t.slice(0, a + open.length) + make() + "\n" + t.slice(b);
  }
  if (t !== lf(was)) { writeFileSync(file, t.split("\n").join(nl)); console.log("written again: public.town_bugs from v125's, public.town_net from v126's"); } else console.log("both are as they stand already, with what v131 adds");
}
