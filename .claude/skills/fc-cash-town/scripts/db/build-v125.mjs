// Brings v125's draft up to date with what it is written over: `town.deed_th` and `town.wishes` are v123's (the
// fountain's, another session's, still a draft when this was written) with two words and two wishes more, so their
// text is taken from v123 as it stands (supabase/, then history, then its draft beside this file) and put between
// the draft's marked lines. Run it whenever v123 changes; v125's dry run fails when the two have drifted.
//   node build-v125.mjs [<v125 file>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { migration } from "./pglite-harness.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const file = process.argv[2] ?? here("v125_draft.sql");
const v123 = (() => { try { return migration(123); } catch { return readFileSync(here("v123_draft.sql"), "utf8"); } })().split("\r\n").join("\n");
/** A function of v123's as it stands, with one line of it changed. */
function again(name, from, to) {
  const at = v123.lastIndexOf(`create or replace function ${name}(`);
  if (at < 0) throw new Error(`v123 has no ${name}`);
  const was = v123.slice(at, v123.indexOf("$$;", v123.indexOf("as $$", at) + 5) + 3);
  if (was.split(from).length !== 2) throw new Error(`the line meant is not in v123's ${name} once`);
  return was.replace(from, () => to);
}
/** What each is changed by: the dry run holds the draft to the same. */
export const CHANGES = {
  wishes: ["town.wishes", "'] $$", "', 'forage', 'net'] $$"],
  deed_th: ["town.deed_th", "when 'exchange' then", "when 'gather' then 'เก็บของป่า' when 'net' then 'จับแมลง'\n    when 'exchange' then"],
};

if (existsSync(file)) {
  const text = readFileSync(file, "utf8"), nl = text.includes("\r\n") ? "\r\n" : "\n", before = text.split("\r\n").join("\n");
  let t = before;
  for (const [mark, [name, from, to]] of Object.entries(CHANGES)) {
    const open = `-- <${mark}>\n`, close = `-- </${mark}>`, a = t.indexOf(open), b = t.indexOf(close);
    if (a < 0 || b < 0) throw new Error(`the draft has no marked lines for ${name}`);
    t = t.slice(0, a + open.length) + again(name, from, to) + "\n" + t.slice(b);
  }
  if (t !== before) { writeFileSync(file, t.split("\n").join(nl)); console.log("written again from v123's: town.wishes, town.deed_th"); } else console.log("both are v123's already, with what v125 adds");
}
