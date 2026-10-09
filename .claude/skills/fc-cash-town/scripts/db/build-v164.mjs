// The functions of earlier files that a part of v164 writes again are never pasted into the part: a file that runs
// between now and v164 may write the same function again, and a pasted copy would undo it. A part says only WHAT it
// changes: <version>.<part>.lines.mjs names each function and the lines meant, a small marked block hung on one line
// of the function (the anchor). This builds the statements from the function's own text AS IT STANDS in a database,
// with those lines in place (build-v159.mjs's way, made general: the version and the part are arguments, and nothing is
// written into the part).
//
//   <version>.<part>.lines.mjs:   export const AGAIN = [[mark, "schema.fn(arg types)", [[from, to], …]], …];
//   <version>.<part>.sql:         -- <mark>          (an empty place for each: where the built statement goes)
//                                 -- </mark>
//
//   import { againOf, filled, pasted } from "./build-v164.mjs";
//   const blocks = againOf(defs, AGAIN);         // defs: { "schema.fn(arg types)": pg_get_functiondef's text } as the database has them now
//   const sql = filled(partText, blocks);        // the part with each place filled: what is run
//
//   node build-v164.mjs <the worktree's root> <version> <part> [<out.sql>]
//     prints (or writes to <out.sql>, which must not be the part itself) the part with its places filled from the
//     stand-in database as it is after the last file that ran (stand-in.mjs). try-v164.mjs does the same in memory.
//
// Whoever puts v164 together runs every part's lines over the same text in turn, from the database as it is after the
// last file that has run by then: a function two parts change has both blocks in it, and whatever a file in between
// wrote into it is still there. A line meant that is no longer in the function once is said, and nothing is built.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { changed, statement } from "./build-v159.mjs";

/** Each function a part writes again, as a statement: its own text with the part's lines in place. `defs` is the database's wording of every function, by name and argument types. */
export function againOf(defs, AGAIN) {
  return Object.fromEntries(AGAIN.map(([mark, sig, lines]) => {
    if (!defs[sig]) throw new Error(`${sig} is not in the database: nothing to write again`);
    return [mark, statement(changed(defs[sig], mark, lines))];
  }));
}
/** A part's text with each place filled: `-- <mark>` … `-- </mark>`. */
export function filled(text, blocks) {
  for (const [mark, sql] of Object.entries(blocks)) {
    const open = `-- <${mark}>\n`, close = `-- </${mark}>`, a = text.indexOf(open), b = text.indexOf(close);
    if (a < 0 || b < a) throw new Error(`the part has no place for ${mark}`);
    text = text.slice(0, a + open.length) + sql + "\n" + text.slice(b);
  }
  return text;
}
/** The functions a part's own text writes that were in the database before it: pasted copies, which a part must not have. */
export const pasted = (text, defs) => {
  const there = new Set(Object.keys(defs).map((sig) => sig.slice(0, sig.indexOf("("))));
  return [...new Set([...text.matchAll(/create or replace function ((?:public|town)\.[a-z0-9_]+)\s*\(/gi)].map((m) => m[1].toLowerCase()))].filter((name) => there.has(name));
};
/** Every function of the town's as a database words it now: by its name and argument types. `run` answers a query with its rows. */
export async function defsOf(run) {
  return Object.fromEntries((await run(`select n.nspname || '.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ')' as sig, pg_get_functiondef(p.oid) as def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where (n.nspname = 'town' or (n.nspname = 'public' and p.proname like 'town\\_%')) and p.prokind = 'f'`)).map((r) => [r.sig, r.def]));
}
/** A part's lines (none, for a part that writes nothing again). */
export async function linesOf(file) {
  return existsSync(file) ? (await import(pathToFileURL(file).href)).AGAIN ?? [] : [];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [root, version, part, out] = process.argv.slice(2);
  if (!root || !/^v\d+$/.test(version ?? "") || !part) { console.log("node build-v164.mjs <the worktree's root> <version> <part> [<out.sql>]"); process.exit(2); }
  const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
  const file = db(`${version}.${part}.sql`);
  if (!existsSync(file)) throw new Error(`no ${file}`);
  if (out && resolve(out) === resolve(file)) throw new Error("not into the part itself: a function that was there before is never pasted into a part");
  const { standIn } = await import("./stand-in.mjs");
  const t = await standIn({ before164: version === "v164" });
  const text = readFileSync(file, "utf8").split("\r\n").join("\n");
  const made = filled(text, againOf(await defsOf((q) => t.sql(q).then((r) => r.rows)), await linesOf(db(`${version}.${part}.lines.mjs`))));
  if (out) { writeFileSync(out, made); console.log(`${out}: ${version}.${part} with its places filled from the stand-in`); } else console.log(made);
  try { await t.db.close(); } catch { /* closed */ }
  process.exit(0);
}
