/*
 * v164 put together: its head, its three parts in the order they stand on each other (the base, the woodcutters', the
 * miners'), one line that tells the API of it, and the queries that say what it should say afterwards.
 *
 *   node assemble-v164.mjs <the worktree's root> <out.sql> [--for-the-owner]
 *     (run where the harness is: the scratch folder of the dry runs, with the snapshot of the stand-in beside it)
 *
 * A PART'S PLACES ARE FILLED FROM THE DATABASE AS IT STANDS WHEN THE PART IS REACHED. A part never pastes a function
 * of an earlier file: it has an empty place for each (`-- <town.deed_th>` … `-- </town.deed_th>`) and says its lines
 * in v164.<part>.lines.mjs (build-v164.mjs). The woodcutters' part and the miners' each add a block to the same two
 * functions, `town.work_counts_of` and `town.deed_th`. Two statements built from the same old text would have the
 * later undo the earlier; so each part is RUN on the stand-in as soon as it is built, and the next is built from what
 * that left. The last statement of each function in the file then carries every block before it.
 *
 * What is changed of a part's own text, and nothing else:
 *   · its places are filled, and the note above them (which says they are left empty) says what is there now;
 *   · its "what it should say afterwards" block is taken off its end and put at the file's foot with the others.
 * Its head stays, as the head of its section. Its `revoke … on all functions in schema town` stays where it is, and
 * is said once more at the end of the file, after the last function there is.
 *
 * The file is a draft until its owner asks for it: this refuses to write under a folder called `supabase` (where a
 * file is run on sight) unless it is told `--for-the-owner`.
 *
 *   import { assemble } from "./assemble-v164.mjs";
 *   const { sql, again } = await assemble(root, t);   // `t`: a stand-in nothing has been run on; the parts are run on it
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { againOf, defsOf, filled, linesOf } from "./build-v164.mjs";

export const VERSION = "v164";
/** The parts, in the order they are run: each after what it says it stands on. */
export const PARTS = ["base", "felling", "mining"];
const ABOUT = { base: "the base, which the two others stand on", felling: "the woodcutters' part: the mountain's trees", mining: "the miners' part: the mountain's rocks and the cave" };
const lf = (s) => s.split("\r\n").join("\n");
const bar = (title, rule = "─") => `-- ${rule.repeat(3)} ${title} ${rule.repeat(Math.max(3, 110 - title.length))}`;
/** Whether a path is under a folder called `supabase`: where the owner runs whatever appears. */
export const underSupabase = (path) => resolve(path).split(/[\\/]/).some((seg) => seg.toLowerCase() === "supabase");
/** The parts a part's head says it stands on (`-- stands on: a, b`), as try-v164.mjs reads them. */
const standsOn = (sql) => (sql.split("\n").slice(0, 60).map((l) => /^-- stands on:\s*(.+)$/.exec(l)?.[1]).find(Boolean) ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** A part's text with its foot taken off: [what is run, the foot's lines without their title]. */
function footOff(text, part) {
  const at = text.search(/^-- ─── What .* should say afterwards/m);
  if (at < 0) throw new Error(`${VERSION}.${part}.sql has no "should say afterwards" block at its end`);
  const foot = text.slice(at).trimEnd().split("\n");
  if (foot.some((l) => l !== "" && !l.startsWith("--"))) throw new Error(`${VERSION}.${part}.sql: something that is no comment comes after its "should say afterwards" title`);
  return [text.slice(0, at).trimEnd(), foot.slice(1).join("\n").replace(/^--\n/, "").trimEnd()];
}
/** The note above a part's places says they are left empty; in the file put together they are filled, and the note says so. */
function noteOf(text, part, ran, before) {
  const note = /^-- \(empty places: build-v164\.mjs puts each function here[^)]*\)\n/m;
  if (!note.test(text)) throw new Error(`${VERSION}.${part}.sql: the note above its places is not as this expects ("-- (empty places: build-v164.mjs puts each function here …)")`);
  return text.replace(note, () => [
    `-- (each function below is the database's own text as it stood after v${ran}${before.length ? ` and the part${before.length === 1 ? "" : "s"} above` : ""}, with the lines of`,
    `-- ${VERSION}.${part}.lines.mjs in place: built by assemble-v164.mjs, never typed. If a file that writes one of them has`,
    `-- run since v${ran}, its change is undone here: this file's head says how to look first.)`, "",
  ].join("\n"));
}

/**
 * The file. `t` is the stand-in as it is after the last file that ran, with nothing run on it since: every part is
 * run on it here, in turn. Gives the text, the functions of earlier files it writes again (by name and argument
 * types, in the order they are first written) and what each was before the file (an md5 of its body).
 */
export async function assemble(root, t, { ran } = {}) {
  const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
  const rows = (q, p) => t.sql(q, p).then((r) => r.rows);
  ran ??= (await import("./stand-in.mjs")).RAN;
  for (const need of [`${VERSION}.head.sql`, `${VERSION}.foot.sql`, ...PARTS.map((p) => `${VERSION}.${p}.sql`)]) if (!existsSync(db(need))) throw new Error(`no ${db(need)}`);
  if ((await rows(`select to_regprocedure('public.town_far()') is not null as there`))[0].there) throw new Error("the stand-in has had v164 already: the parts are built from the database as it is BEFORE the file");

  // (what every function the parts write again is before the file: its body, with no carriage return counted)
  const again = [];
  for (const p of PARTS) for (const [, sig] of await linesOf(db(`${VERSION}.${p}.lines.mjs`))) if (!again.includes(sig)) again.push(sig);
  const was = Object.fromEntries((await rows(`select w.sig, md5(replace(p.prosrc, chr(13), '')) as body from unnest($1::text[]) w(sig) join pg_proc p on p.oid = to_regprocedure(w.sig)`, [again])).map((r) => [r.sig, r.body]));
  const lost = again.filter((sig) => !was[sig]);
  if (lost.length) throw new Error(`not in the database, so nothing to write again: ${lost.join(", ")}`);

  const sections = [], feet = [], done = [];
  for (const p of PARTS) {
    const text = lf(readFileSync(db(`${VERSION}.${p}.sql`), "utf8"));
    const lacks = standsOn(text).filter((b) => !done.includes(b));
    if (lacks.length) throw new Error(`${VERSION}.${p}.sql stands on ${lacks.join(", ")}, which ${lacks.length === 1 ? "is" : "are"} not before it in the order`);
    const lines = await linesOf(db(`${VERSION}.${p}.lines.mjs`));
    // (built from the stand-in as the parts before left it, then run on it, so that the next part is built from this one's)
    const run = filled(text, againOf(await defsOf(rows), lines));
    await t.sql(run);
    const [body, foot] = footOff(lines.length ? noteOf(run, p, ran, done) : run, p);
    sections.push([bar(`Part ${done.length + 1} of ${PARTS.length}: ${ABOUT[p]}`, "═"), "", body, ""].join("\n"));
    feet.push(foot);
    done.push(p);
  }

  const look = [
    `-- BEFORE RUNNING IT, if any file of the town's has run since v${ran}: the ${again.length} functions this file writes again were`,
    `-- built from their text as it stood after v${ran}. This says whether they are that text still (in the SQL editor; it`,
    `-- reads and changes nothing). \`true | ${again.length}\` before the file has ever run; if it says false then, put the file together`,
    `-- again from a stand-in that has the later file (assemble-v164.mjs) and do not run this one. (Once this file has`,
    `-- run it says false, rightly: the ${again.length} have their blocks.)`,
    `--`,
    `--   select coalesce(bool_and(md5(replace(p.prosrc, chr(13), '')) = w.was), false) as as_they_were, count(p.oid) as found`,
    `--     from (values`,
    again.map((sig) => `--       ('${sig}', '${was[sig]}')`).join(",\n"),
    `--     ) w(fn, was) left join pg_proc p on p.oid = to_regprocedure(w.fn);`,
    `--   -- true | ${again.length}`,
  ].join("\n");
  const sql = [
    lf(readFileSync(db(`${VERSION}.head.sql`), "utf8")).trimEnd(),
    "--", look, "",
    ...sections,
    bar("Nobody calls a rule of schema town"), "",
    "-- (each part says it of its own functions; once more here, after the last function the file makes)",
    "revoke execute on all functions in schema town from public, anon, authenticated;", "",
    "notify pgrst, 'reload schema';", "",
    bar("What it should say afterwards"),
    "--",
    ...feet.flatMap((f, i) => [`--   ── ${ABOUT[PARTS[i]]} ──`, "--", f, "--"]),
    lf(readFileSync(db(`${VERSION}.foot.sql`), "utf8")).trimEnd(), "",
  ].join("\n");
  return { sql, again, was };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2), forOwner = args.includes("--for-the-owner");
  const [root, out] = args.filter((a) => !a.startsWith("--"));
  if (!root || !out) { console.log("node assemble-v164.mjs <the worktree's root> <out.sql> [--for-the-owner]"); process.exit(2); }
  if (underSupabase(out) && !forOwner) {
    console.log(`not written: ${resolve(out)} is under supabase/, where a file is run the moment it is seen. A draft goes anywhere else; --for-the-owner writes it there once he has asked for it.`);
    process.exit(2);
  }
  if (PARTS.some((p) => resolve(out) === resolve(join(root, ".claude/skills/fc-cash-town/scripts/db", `${VERSION}.${p}.sql`)))) throw new Error("not into a part itself");
  const { standIn, RAN } = await import("./stand-in.mjs");
  const t = await standIn();
  const { sql, again } = await assemble(root, t, { ran: RAN });
  writeFileSync(out, sql);
  console.log(`${resolve(out)}: ${VERSION} from ${PARTS.join(", ")}, built on the stand-in after v${RAN}; ${again.length} functions of earlier files written again`);
  console.log(`  ${sql.split("\n").length - 1} lines, sha256 ${createHash("sha256").update(sql).digest("hex")}`);
  try { await t.db.close(); } catch { /* closed */ }
  process.exit(0);
}
