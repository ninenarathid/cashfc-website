/*
 * v153_draft.sql put together: the head, the catalog's rows (their place: the seed is written between the marked
 * lines from lib/town/catalog.ts afterwards), what every line stands on, and each line's own file in turn.
 *
 *   node build-v153.mjs [line …]        (no line named: every line whose file is here, the farm before the helpers)
 *
 * Each part is as its line wrote and proved it (try-line.mjs); the whole is proved by try-all.mjs part by part and
 * by the dry run of the draft itself.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = (name) => new URL(`./${name}`, import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
export const ORDER = ["kitchen", "farming", "helpers", "well", "fishing", "forest", "insects"];
const ABOUT = { kitchen: "The kitchen", farming: "The farm", helpers: "The helpers (on the farm's)", well: "The well", fishing: "The deck", forest: "The forest", insects: "The insects" };
export const linesHere = () => ORDER.filter((l) => existsSync(here(`v153.${l}.sql`)));

export function build(lines = linesHere()) {
  const bar = (title) => `-- ─── ${title} ${"─".repeat(Math.max(3, 70 - title.length))}`;
  const part = (name) => lf(readFileSync(here(`v153.${name}.sql`), "utf8")).trimEnd();
  const head = existsSync(here("v153.head.sql")) ? lf(readFileSync(here("v153.head.sql"), "utf8")).trimEnd() : "-- v153 (a draft with no head yet)";
  return [
    head, "",
    "do $$ begin",
    "  if to_regprocedure('town.gift_use(jsonb, text, bigint)') is null then raise exception 'v153 needs v152: run supabase/v152 first'; end if;",
    "end $$;", "",
    bar("The catalog's rows"),
    "-- <catalog:v153>", "-- </catalog:v153>", "",
    bar("What every line stands on"), part("shared"), "",
    ...lines.flatMap((l) => [bar(ABOUT[l]), part(l), ""]),
    bar("Nobody calls a rule of schema town"),
    "revoke execute on all functions in schema town from public, anon, authenticated;", "",
    ...(existsSync(here("v153.foot.sql")) ? [lf(readFileSync(here("v153.foot.sql"), "utf8")).trimEnd(), ""] : []),
  ].join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const lines = process.argv.slice(2).length ? process.argv.slice(2) : linesHere();
  writeFileSync(here("v153_draft.sql"), build(lines));
  console.log(`v153_draft.sql: the shared part and ${lines.join(", ")}`);
}
