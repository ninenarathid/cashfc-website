// Writes, between the draft's marked lines, the six functions v159 writes again: each from its own text as the
// stand-in database has it after the last file that ran (stand-in.mjs: which is the text it last ran with, whichever
// file wrote it), with the lines of v159.lines.mjs in place. v159's dry run holds the file to the same.
//   node build-v159.mjs [<v159 file>]        (run where the harness is: the scratch folder of the dry runs)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { CHEW, GET_UP, KITCHEN, POT_DOWN, TIDY_FIRST } from "./v159.lines.mjs";

/** The functions written again: the mark in the draft, the function as Postgres names it, and its lines. */
export const AGAIN = [
  ["town.chew", "town.chew(jsonb, double precision, bigint)", CHEW],
  ["town.get_up", "town.get_up(jsonb, double precision, bigint)", GET_UP],
  ["public.town_kitchen", "public.town_kitchen()", KITCHEN],
  ["public.town_pot_down", "public.town_pot_down(integer, integer, integer)", POT_DOWN],
  ["public.town_pot_ladle", "public.town_pot_ladle(bigint, integer, integer)", TIDY_FIRST],
  ["public.town_pot_take", "public.town_pot_take(bigint, integer, integer)", TIDY_FIRST],
];
/** A function's text with some lines of it changed: each line meant has to be in it once. */
export function changed(text, name, lines) {
  for (const [from, to] of lines) {
    if (text.split(from).length !== 2) throw new Error(`a line meant is not in ${name} once: ${from.slice(0, 70)}`);
    text = text.replace(from, () => to);
  }
  return text;
}
/** A function as Postgres tells it (pg_get_functiondef), as a statement of a file: its own words, a `$$` body, and its end. */
export const statement = (def) => {
  if (def.includes("$$")) throw new Error("a body with $$ in it cannot be put between $$");
  return def.trimEnd().split("$function$").join("$$").replace(/^CREATE OR REPLACE FUNCTION/, "create or replace function") + ";";
};

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const file = process.argv[2] ?? new URL("./v159_draft.sql", import.meta.url);
  if (!existsSync(file)) throw new Error(`no draft at ${file}`);
  const { standIn } = await import("./stand-in.mjs");
  const t = await standIn();
  const lf = (s) => s.split("\r\n").join("\n");
  const was = readFileSync(file, "utf8"), nl = was.includes("\r\n") ? "\r\n" : "\n";
  let text = lf(was);
  for (const [mark, sig, lines] of AGAIN) {
    const def = (await t.sql(`select pg_get_functiondef($1::regprocedure) as d`, [sig])).rows[0].d;
    const open = `-- <${mark}>\n`, close = `-- </${mark}>`, a = text.indexOf(open), b = text.indexOf(close);
    if (a < 0 || b < 0) throw new Error(`the draft has no marked lines for ${mark}`);
    text = text.slice(0, a + open.length) + statement(changed(def, mark, lines)) + "\n" + text.slice(b);
  }
  if (text !== lf(was)) { writeFileSync(file, text.split("\n").join(nl)); console.log(`written again: ${AGAIN.map(([m]) => m).join(", ")}`); }
  else console.log("they are as they stand already, with what v159 changes");
  try { await t.db.close(); } catch { /* closed */ }
  process.exit(0);
}
