// Writes, between a part's marked lines, the functions of earlier files that the part writes again: each from its own
// text as the stand-in database has it after the last file that ran (stand-in.mjs: the text it last ran with, whichever
// file wrote it), with the lines of <version>.<part>.lines.mjs in place. try-v164.mjs holds the part to the same.
// build-v159.mjs made general: the version and the part are arguments.
//
//   node build-v164.mjs <the worktree's root> <version> <part>      (run where the harness is: the scratch folder)
//
// <version>.<part>.lines.mjs:  export const AGAIN = [[mark, "schema.fn(arg types)", [[from, to], …]], …];
// <version>.<part>.sql has, for each:   -- <mark>   …   -- </mark>
//
// Whoever puts the parts together into one file runs every part's lines over the same text in turn (a function two
// parts change has both parts' lines in it), from a snapshot of the stand-in as it is after the last file that ran
// then: a file that runs in between and writes the same function again is in that text already.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { changed, statement } from "./build-v159.mjs";

const [root, version, part] = process.argv.slice(2);
if (!root || !/^v\d+$/.test(version ?? "") || !part) { console.log("node build-v164.mjs <the worktree's root> <version> <part>"); process.exit(2); }
const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
const file = db(`${version}.${part}.sql`), linesFile = db(`${version}.${part}.lines.mjs`);
if (!existsSync(file) || !existsSync(linesFile)) throw new Error(`no ${file} or no ${linesFile}`);
const { AGAIN } = await import(pathToFileURL(linesFile).href);
const { standIn } = await import("./stand-in.mjs");
const t = await standIn();
const lf = (s) => s.split("\r\n").join("\n");
const was = readFileSync(file, "utf8"), nl = was.includes("\r\n") ? "\r\n" : "\n";
let text = lf(was);
for (const [mark, sig, lines] of AGAIN) {
  const def = (await t.sql(`select pg_get_functiondef($1::regprocedure) as d`, [sig])).rows[0].d;
  const open = `-- <${mark}>\n`, close = `-- </${mark}>`, a = text.indexOf(open), b = text.indexOf(close);
  if (a < 0 || b < 0) throw new Error(`the part has no marked lines for ${mark}`);
  text = text.slice(0, a + open.length) + statement(changed(def, mark, lines)) + "\n" + text.slice(b);
}
if (text !== lf(was)) { writeFileSync(file, text.split("\n").join(nl)); console.log(`written again: ${AGAIN.map(([m]) => m).join(", ")}`); }
else console.log(`they are as they stand already, with what ${version}.${part} changes`);
try { await t.db.close(); } catch { /* closed */ }
process.exit(0);
