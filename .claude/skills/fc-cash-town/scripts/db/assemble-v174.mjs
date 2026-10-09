/*
 * v174 put together: its head, its two parts in the order they stand on each other (the smith's, then the older
 * tools'), one line that tells the API of it, and the queries that say what it should say afterwards.
 *
 *   node assemble-v174.mjs <the worktree's root> [<out.sql>] [--for-the-owner]
 *     (run where the harness is: the scratch folder of the dry runs, with the stand-in's snapshot beside it.
 *      With no <out.sql> it writes <root>/.claude/skills/fc-cash-town/scripts/db/v174_draft.sql, the draft as it is
 *      kept, which keeper.test.mjs and v174.test.mjs read.)
 *
 * After the pattern of assemble-v164.mjs, which is v164's own and begins from the database before v164: this one
 * begins from the stand-in as it is after v173, the file v174 runs after.
 *
 * A PART'S PLACES ARE FILLED FROM THE DATABASE AS IT STANDS WHEN THE PART IS REACHED. A part never pastes a function
 * of an earlier file: it has an empty place for each (`-- <town.net>` … `-- </town.net>`) and says its lines in
 * v174.<part>.lines.mjs (build-v164.mjs). Both parts write `town.work_counts_of`: the smith's a block, the older
 * tools' a few lines. Two statements built from the same old text would have the later undo the earlier; so each part
 * is RUN on the stand-in as soon as it is built, and the next is built from what that left. The last statement of
 * that function in the file then carries the smith's block too.
 *
 * What is changed of a part's own text, and nothing else:
 *   · its places are filled, and the note above them (which says they are left empty) says what is there now;
 *   · the smith's two lines that mark his guards say what the guards are, with no word to whoever puts the file together;
 *   · the smith's "Reading it" block is taken off his end and put at the file's foot.
 * Each part's head stays, as the head of its section. Its `revoke … on all functions in schema town` stays where it
 * is, and is said once more at the end of the file, after the last function there is.
 *
 * The file's own head is v174.head.sql: a comment for its owner, a line `-- <look first>` where the look for the SQL
 * editor is written by this (the functions written again, each with what its body was before the file), and the
 * file's first statement, which stops it where v173 has not run. Its foot is v174.foot.sql.
 *
 * The file is a draft until its owner asks for it: this refuses to write under a folder called `supabase` (where a
 * file is run on sight) unless it is told `--for-the-owner`.
 *
 *   import { assemble } from "./assemble-v174.mjs";
 *   const { sql, again, was } = await assemble(root, t);   // `t`: the stand-in after v173, nothing run on it since; the parts are run on it
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { againOf, defsOf, filled, linesOf } from "./build-v164.mjs";

export const VERSION = "v174";
/** The last file that has run when this one does: the parts are built on the database as it is after it. */
export const AFTER = 173;
/** The parts, in the order they are run: each after what it says it stands on. */
export const PARTS = ["smith", "tools"];
export const ABOUT = { smith: "the blacksmith, and the forge's great fire", tools: "the seven older tools in the games that are live" };
/** Where the look for the SQL editor goes in the head. */
export const LOOK = "-- <look first>";
const lf = (s) => s.split("\r\n").join("\n");
const bar = (title, rule = "─") => `-- ${rule.repeat(3)} ${title} ${rule.repeat(Math.max(3, 110 - title.length))}`;
/** Whether a path is under a folder called `supabase`: where the owner runs whatever appears. */
export const underSupabase = (path) => resolve(path).split(/[\\/]/).some((seg) => seg.toLowerCase() === "supabase");
/** The parts a part's head says it stands on (`-- stands on: a, b`), as try-v164.mjs reads them. */
const standsOn = (sql) => (sql.split("\n").slice(0, 60).map((l) => /^-- stands on:\s*(.+)$/.exec(l)?.[1]).find(Boolean) ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** The note above each part's places, as the part has it (they are left empty there). */
const NOTE = {
  smith: /^-- \(empty places: build-v164\.mjs puts each function here[^)]*\)\n/m,
  tools: /^-- Each place below is empty here and is filled,[^\n]*\n-- function's own text[^\n]*\n-- `town\.work_counts_of` is built on the text[^\n]*\n/m,
};
/** In the file put together the places are filled, and the note says so. */
function noteOf(text, part, before) {
  if (!NOTE[part].test(text)) throw new Error(`${VERSION}.${part}.sql: the note above its places is not as this expects`);
  return text.replace(NOTE[part], () => [
    `-- (each function below is the database's own text as it stood after v${AFTER}${before.length ? ` and the part${before.length === 1 ? "" : "s"} above` : ""}, with the lines of`,
    `-- ${VERSION}.${part}.lines.mjs in place: built by assemble-v174.mjs, never typed. If a file that writes one of them has`,
    `-- run since v${AFTER}, its change is undone here: this file's head says how to look first.${part === "tools" ? " `town.work_counts_of` is" : ")"}`,
    ...(part === "tools" ? ["-- built on the text the smith's part above left: it carries his block too.)"] : []), "",
  ].join("\n"));
}
/** The smith's guards are marked for whoever puts the file together: here they are the first thing of his section, and say what they are. */
function guardsOf(text) {
  const open = /^-- <guards: the smith's part>[^\n]*\n/m, close = /^-- <\/guards: the smith's part>\n/m;
  if (!open.test(text) || !close.test(text)) throw new Error(`${VERSION}.smith.sql: its guards are not marked as this expects`);
  return text.replace(open, () => "-- (what of earlier files the smith stands on: the file stops here where one of them has not run)\n").replace(close, () => "");
}
/** The smith's text with his "Reading it" block taken off: [what is run, the block's lines without their title]. */
function readingOff(text) {
  const at = text.search(/^-- ─── Reading it \(for whoever puts the file together: these go at its foot\) ──.*$/m);
  if (at < 0) throw new Error(`${VERSION}.smith.sql has no "Reading it" block at its end`);
  const foot = text.slice(at).trimEnd().split("\n");
  if (foot.some((l) => l !== "" && !l.startsWith("--"))) throw new Error(`${VERSION}.smith.sql: something that is no comment comes after its "Reading it" title`);
  return [text.slice(0, at).trimEnd(), foot.slice(1).join("\n").replace(/^--\n/, "").trimEnd()];
}

/**
 * The file. `t` is the stand-in as it is after v173, with nothing run on it since: every part is run on it here, in
 * turn. Gives the text, the functions of earlier files it writes again (by name and argument types, in the order they
 * are first written) and what each was before the file (an md5 of its body).
 */
export async function assemble(root, t) {
  const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
  const rows = (q, p) => t.sql(q, p).then((r) => r.rows);
  for (const need of [`${VERSION}.head.sql`, `${VERSION}.foot.sql`, ...PARTS.map((p) => `${VERSION}.${p}.sql`)]) if (!existsSync(db(need))) throw new Error(`no ${db(need)}`);
  if ((await rows(`select to_regprocedure('town.smith_member()') is not null as there`))[0].there) throw new Error("the stand-in has had v174 already: the parts are built from the database as it is BEFORE the file");
  const head = lf(readFileSync(db(`${VERSION}.head.sql`), "utf8")).trimEnd();
  if (head.split(`${LOOK}\n`).length !== 2) throw new Error(`${VERSION}.head.sql has not the one line \`${LOOK}\` where the look for the SQL editor goes`);

  // (what every function the parts write again is before the file: its body, with no carriage return counted)
  const again = [];
  for (const p of PARTS) for (const [, sig] of await linesOf(db(`${VERSION}.${p}.lines.mjs`))) if (!again.includes(sig)) again.push(sig);
  const was = Object.fromEntries((await rows(`select w.sig, md5(replace(p.prosrc, chr(13), '')) as body from unnest($1::text[]) w(sig) join pg_proc p on p.oid = to_regprocedure(w.sig)`, [again])).map((r) => [r.sig, r.body]));
  const lost = again.filter((sig) => !was[sig]);
  if (lost.length) throw new Error(`not in the database, so nothing to write again: ${lost.join(", ")}`);

  const sections = [], done = [];
  let reading = "";
  for (const p of PARTS) {
    const text = lf(readFileSync(db(`${VERSION}.${p}.sql`), "utf8"));
    const lacks = standsOn(text).filter((b) => !done.includes(b));
    if (lacks.length) throw new Error(`${VERSION}.${p}.sql stands on ${lacks.join(", ")}, which ${lacks.length === 1 ? "is" : "are"} not before it in the order`);
    const lines = await linesOf(db(`${VERSION}.${p}.lines.mjs`));
    // (built from the stand-in as the parts before left it, then run on it, so that the next part is built from this one's)
    const run = filled(text, againOf(await defsOf(rows), lines));
    await t.db.exec(run);
    let body = noteOf(run, p, done).trimEnd();
    if (p === "smith") { [body, reading] = readingOff(guardsOf(body)); }
    sections.push([bar(`Part ${done.length + 1} of ${PARTS.length}: ${ABOUT[p]}`, "═"), "", body, ""].join("\n"));
    done.push(p);
  }

  const look = [
    `-- BEFORE RUNNING IT, if any file of the town's has run since v${AFTER}: the ${again.length} functions this file writes again were`,
    `-- built from their text as it stood after v${AFTER}. This says whether they are that text still (in the SQL editor; it`,
    `-- reads and changes nothing). \`true | ${again.length}\` before the file has ever run; if it says false then, put the file together`,
    `-- again from a stand-in that has the later file (assemble-v174.mjs) and do not run this one. (Once this file has`,
    `-- run it says false, rightly: the ${again.length} have their lines.)`,
    `--`,
    `--   select coalesce(bool_and(md5(replace(p.prosrc, chr(13), '')) = w.was), false) as as_they_were, count(p.oid) as found`,
    `--     from (values`,
    again.map((sig) => `--       ('${sig}', '${was[sig]}')`).join(",\n"),
    `--     ) w(fn, was) left join pg_proc p on p.oid = to_regprocedure(w.fn);`,
    `--   -- true | ${again.length}`,
  ].join("\n");
  const sql = [
    head.replace(`${LOOK}\n`, () => `${look}\n`), "",
    ...sections,
    bar("Nobody calls a rule of schema town"), "",
    "-- (each part says it of its own functions; once more here, after the last function the file makes)",
    "revoke execute on all functions in schema town from public, anon, authenticated;", "",
    "notify pgrst, 'reload schema';", "",
    bar("What it should say afterwards"),
    "--",
    lf(readFileSync(db(`${VERSION}.foot.sql`), "utf8")).trimEnd(),
    "--", `--   ── ${ABOUT.smith} ──`, "--", reading, "",
  ].join("\n");
  return { sql, again, was };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2), forOwner = args.includes("--for-the-owner");
  const [root, given] = args.filter((a) => !a.startsWith("--"));
  if (!root) { console.log("node assemble-v174.mjs <the worktree's root> [<out.sql>] [--for-the-owner]"); process.exit(2); }
  const out = given ?? join(root, ".claude/skills/fc-cash-town/scripts/db", `${VERSION}_draft.sql`);
  if (underSupabase(out) && !forOwner) {
    console.log(`not written: ${resolve(out)} is under supabase/, where a file is run the moment it is seen. A draft goes anywhere else; --for-the-owner writes it there once he has asked for it.`);
    process.exit(2);
  }
  if ([...PARTS, "head", "foot"].some((p) => resolve(out) === resolve(join(root, ".claude/skills/fc-cash-town/scripts/db", `${VERSION}.${p}.sql`)))) throw new Error("not into a part itself");
  const { standIn } = await import("./stand-in.mjs");
  process.env.FC_REPO ??= root;
  const t = await standIn({ upTo: AFTER });
  const { sql, again } = await assemble(root, t);
  writeFileSync(out, sql);
  console.log(`${resolve(out)}: ${VERSION} from ${PARTS.join(", ")}, built on the stand-in after v${AFTER}; ${again.length} functions of earlier files written again`);
  console.log(`  ${sql.split("\n").length - 1} lines, sha256 ${createHash("sha256").update(sql).digest("hex")} (of its text with plain line ends)`);
  try { await t.db.close(); } catch { /* closed */ }
  process.exit(0);
}
