// Writes v126's `public.town_net` between the draft's two marked lines: v125's function as it ran (from history), with
// the lines of v126.lines.mjs in place of v125's. Run it after any change to those lines; v126's dry run holds the
// file to the same.
//   node build-v126.mjs [<v126 file>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { migration } from "./pglite-harness.mjs";
import { TOWN_NET } from "./v126.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const file = process.argv[2] ?? here("v126_draft.sql");
const v125 = migration(125).split("\r\n").join("\n");
const at = v125.lastIndexOf("create or replace function public.town_net(");
if (at < 0) throw new Error("v125 has no public.town_net");
let text = v125.slice(at, v125.indexOf("$$;", v125.indexOf("as $$", at) + 5) + 3);
for (const [from, to] of TOWN_NET) {
  if (text.split(from).length !== 2) throw new Error(`a line meant is not in v125's town_net once: ${from.slice(0, 60)}`);
  text = text.replace(from, () => to);
}
if (existsSync(file)) {
  const was = readFileSync(file, "utf8"), nl = was.includes("\r\n") ? "\r\n" : "\n", t = was.split("\r\n").join("\n");
  const open = "-- <town_net>\n", close = "-- </town_net>", a = t.indexOf(open), b = t.indexOf(close);
  if (a < 0 || b < 0) throw new Error("the draft has no marked lines for town_net");
  const next = t.slice(0, a + open.length) + text + "\n" + t.slice(b);
  if (next !== t) { writeFileSync(file, next.split("\n").join(nl)); console.log("public.town_net written again from v125's"); } else console.log("public.town_net is v125's already, with what v126 adds");
}
