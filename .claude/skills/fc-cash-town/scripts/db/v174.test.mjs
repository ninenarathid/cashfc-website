/*
 * v174 AS ONE FILE (the blacksmith with the forge's great fire, and the seven older tools in the live games, put
 * together by assemble-v174.mjs) tried against the stand-in database as it is after v173 (stand-in.mjs's snapshot,
 * in memory: nothing is written anywhere).
 *
 *   FC_REPO=<the tree whose code is meant> node v174.test.mjs [that tree's root]     (MIGRATION_FILE=<a file> tries that one)
 *     (run where the harness is: the scratch folder of the dry runs, with ./v174/ beside it: the catalog and the two
 *      parts' rule cases, written first in the worktree:
 *        TOWN_VECTORS=<this folder>/v174 npx vitest run lib/town/db-vectors-smith.test.ts lib/town/db-vectors-tools.test.ts )
 *   CASES=0   leaves the rule cases out (the breaks of v174.mutations.mjs are run so: none of them is a rule's)
 *
 * The file it reads, the first there is: MIGRATION_FILE; supabase/v174_*.sql in the root given (the file as its owner
 * has it); <root>/.claude/skills/fc-cash-town/scripts/db/v174_draft.sql (the draft as it is kept); v174_draft.sql
 * beside this script.
 *
 * Each part is proved by its own try (try-v164.mjs: its rule cases, its stories, its breaks). This holds what only the
 * WHOLE can show, and plays both parts' cases and stories once more on the database the whole file leaves:
 *   · the draft is what the assembler makes of the parts as they are now, to the letter; its first statement is the
 *     guard, which stops it on a database that has not had v173 with nothing made; it has one `notify pgrst`, at its
 *     end, a last revoke on the schema `town` after its last function, the lines its head gives its owner (the one
 *     that opens it, the two that put the great fire and the board back to new), and no place left empty;
 *   · the look its head gives for the SQL editor says the thirty functions are as they were, before the file, and not after;
 *   · it runs on the stand-in as it is (its catalog its own, as the live database's is), and runs a second time with
 *     no error and NO CHANGE: every function, grant, table, policy, trigger, index, knob and row as the first run left it;
 *   · what it adds, counted, and nothing else: two tables (closed), two columns, 127 functions (sixteen a member's),
 *     one knob at 0, three catalog rows which are the code's (`catalogOf()`), a row of `town_things` and the great
 *     fire's one row; no other row, knob, policy, trigger or index;
 *   · NO FUNCTION OF AN EARLIER FILE IS CHANGED but the thirty the parts say they write again, and each of those is
 *     the one it replaces, word for word, but for the parts' lines, the smith's first and the older tools' on top
 *     (`town.work_counts_of` carries both, and v164's two blocks);
 *   · no function writes to a table with no WHERE; nothing of the schema `town` is anybody's to call; every function
 *     a member calls is for the signed in and refuses the signed out;
 *   · THE SMITH'S RULE CASES AND HIS STORIES on that database (v174.smith.try.mjs, with the whole file as what is run
 *     once more over all of it); then who may ask, built closed and opened by the one line of the head; the two lines
 *     that put the great fire and the board back to new; the queries at the foot;
 *   · THE OLDER TOOLS' RULE CASES AND THEIR STORIES on a second database the whole file has run on
 *     (v174.tools.try.mjs): the day in the town with tools as they were bought is played on the database BEFORE THE
 *     FILE (the stand-in, its own catalog, nothing of v174) and on the one after it, every answer and every row kept
 *     the same; then each forged tool through its game.
 * (Every rule case of the OLDER files before the file and after it is older-cases-both.mjs's, beside this.)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { standIn } from "./stand-in.mjs";
import { U } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { changed } from "./build-v159.mjs";
import { defsOf, linesOf } from "./build-v164.mjs";
import { AFTER, PARTS, VERSION, assemble, underSupabase } from "./assemble-v174.mjs";

const root = process.argv[2] ?? process.env.FC_REPO;
if (!root) { console.log("FC_REPO=<the tree whose code is meant> node v174.test.mjs [that tree's root]"); process.exit(2); }
process.env.FC_REPO ??= root;
await import("./repo-ts-town.mjs");
const { catalogOf, CATALOG_KEYS } = await import("@/lib/town/catalog");
const LP = await import("@/lib/town/line-points");

const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
const beside = (name) => new URL(`./${name}`, import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith(`${VERSION}_`) && f.endsWith(".sql")) : null;
const [FROM, text] = process.env.MIGRATION_FILE ? [process.env.MIGRATION_FILE, readFileSync(process.env.MIGRATION_FILE, "utf8")]
  : inRepo ? [join(root, "supabase", inRepo), readFileSync(join(root, "supabase", inRepo), "utf8")]
  : existsSync(db(`${VERSION}_draft.sql`)) ? [db(`${VERSION}_draft.sql`), readFileSync(db(`${VERSION}_draft.sql`), "utf8")]
  : [`${VERSION}_draft.sql beside this script`, readFileSync(beside(`${VERSION}_draft.sql`), "utf8")];
const FILE = lf(text);
console.log(`the file: ${FROM}\n  ${FILE.split("\n").length - 1} lines, sha256 ${createHash("sha256").update(FILE).digest("hex")} (of its text with plain line ends)`);
const CODE = catalogOf();
const WITH_CASES = process.env.CASES !== "0";
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null || v === undefined ? null : typeof v === "object" ? JSON.stringify(v) : v);
const no = (r) => r?.code === "42501";

const t0 = Date.now();
const t = await standIn({ upTo: AFTER });
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args.map(param));
  return r.error ? r : r.rows[0].r;
};
const knob = (key, v) => t.sql(`update public.town_knobs set value = $2 where key = $1`, [key, v]);

/** The queries of a comment block of the file (`--   select … ;`), each with the lines that say what it should answer (`--   -- a | b`; none: it is only to run). */
function queriesOf(block) {
  const out = [];
  let sql = [], cur = null;
  for (const raw of block.split("\n")) {
    // (a query and what it should say are set in from the comment's edge by three spaces or more; anything else ends what was being read)
    const m = /^--( {3,})(\S.*)$/.exec(raw);
    if (!m) { cur = null; sql = []; continue; }
    const l = m[2];
    if (/^-- /.test(l)) { const said = l.slice(3).trim(); if (cur && !sql.length && said && !said.startsWith("(")) cur.want.push(said); continue; }
    // (only what reads: a line of prose, a bullet, or a statement that writes is passed over)
    if (!sql.length && !/^(select|with)\b/i.test(l)) { cur = null; continue; }
    cur = null;
    sql.push(m[1].slice(3) + l);
    if (l.trimEnd().endsWith(";")) { cur = { sql: sql.join("\n").trim(), want: [] }; out.push(cur); sql = []; }
  }
  return out;
}
/** A row as the file writes one: its values with ` | ` between them. What the file says may end in a note in brackets, and a value in brackets is whatever it is. */
const shown = (row) => Object.values(row).map((v) => (v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v)));
const squeezed = (s) => s.replace(/\s+/g, "");
function saysSo(got, want) {
  if (got.length !== want.length) return false;
  return got.every((row, i) => {
    const cells = want[i].replace(/\s{3,}\(.*\)\s*$/, "").split(" | ").map((c) => c.trim()), mine = shown(row);
    return cells.length === mine.length && cells.every((c, k) => c.startsWith("(") || squeezed(c) === squeezed(mine[k]));
  });
}
/** Every query of a block run: how many, and those that did not run or did not say what the file says. */
async function held(block) {
  const off = [], qs = queriesOf(block);
  for (const q of qs) {
    try { const got = await rows(q.sql); if (q.want.length && !saysSo(got, q.want)) off.push({ sql: q.sql.slice(0, 90), says: q.want, got: got.map((r) => shown(r).join(" | ")) }); }
    catch (e) { off.push({ sql: q.sql.slice(0, 90), error: e.message }); }
  }
  return { n: qs.length, said: qs.filter((q) => q.want.length).length, off };
}

/** Everything of the town's that a file could change, but what members do. */
const TOWN = `(n.nspname = 'town' or (n.nspname = 'public' and p.proname like 'town\\_%'))`;
async function state() {
  // (how many rows each table of the town's has: a file that only adds rules moves none of them but its own)
  const counts = {};
  for (const r of await rows(`select c.relname as name from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%' order by 1`)) counts[r.name] = (await one(`select count(*)::int as n from public.${r.name}`)).n;
  return {
    counts,
    fns: Object.fromEntries((await rows(`select n.nspname || '.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ')' as sig, md5(pg_get_functiondef(p.oid)) as def, p.prosecdef as definer,
        has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace where ${TOWN} and p.prokind = 'f'`)).map((r) => [r.sig, r])),
    catalog: Object.fromEntries((await rows(`select key, data, updated_at::text as at from public.town_catalog`)).map((r) => [r.key, r])),
    knobs: Object.fromEntries((await rows(`select key, value from public.town_knobs`)).map((r) => [r.key, Number(r.value)])),
    tables: Object.fromEntries((await rows(`select c.relname as name, c.relrowsecurity as closed,
        (select coalesce(jsonb_agg(g.grantee || ':' || g.privilege_type order by g.grantee, g.privilege_type), '[]'::jsonb) from information_schema.role_table_grants g
          where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated', 'service_role')) as grants,
        (select coalesce(jsonb_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod) order by a.attnum), '[]'::jsonb) from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped) as columns
      from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%'`)).map((r) => [r.name, r])),
    policies: (await rows(`select tablename || ': ' || policyname || ' ' || cmd || ' ' || roles::text || ' ' || coalesce(qual, '') || ' ' || coalesce(with_check, '') as p from pg_policies where tablename like 'town\\_%' order by 1`)).map((r) => r.p),
    triggers: (await rows(`select g.tgname || ' ' || pg_get_triggerdef(g.oid) as g from pg_trigger g where not g.tgisinternal order by 1`)).map((r) => r.g),
    indexes: (await rows(`select indexdef from pg_indexes where schemaname = 'public' and tablename like 'town\\_%' order by 1`)).map((r) => r.indexdef),
    things: Object.fromEntries((await rows(`select key, doc from public.town_things`)).map((r) => [r.key, r.doc])),
    secrets: Object.fromEntries((await rows(`select key, md5(word) as word from public.town_secrets`)).map((r) => [r.key, r.word])),
  };
}
/** What of two states differs, by name. (`moments`: catalog rows' moments are left out, where a row is written over with the same.) */
function differs(a, b, { moments = true } = {}) {
  const off = [];
  for (const part of Object.keys(a)) {
    const x = a[part], y = b[part];
    if (Array.isArray(x)) { if (!same(x, y)) off.push(`${part}: ${[...y.filter((v) => !x.includes(v)).map((v) => `+${v.slice(0, 80)}`), ...x.filter((v) => !y.includes(v)).map((v) => `-${v.slice(0, 80)}`)].join("; ")}`); continue; }
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      const u = x[k], v = y[k];
      if (part === "catalog" && !moments && u && v ? !same(u.data, v.data) : !same(u, v)) off.push(`${part}.${k}${u === undefined ? " (new)" : v === undefined ? " (gone)" : ""}`);
    }
  }
  return off;
}

/* ══ the file itself ══ */
t.section(`the file: what the assembler makes of the parts as they are (${PARTS.join(", ")}), built on the stand-in after v${AFTER}`);
const LINES = Object.fromEntries(await Promise.all(PARTS.map(async (p) => [p, await linesOf(db(`${VERSION}.${p}.lines.mjs`))])));
const AGAIN = [...new Set(PARTS.flatMap((p) => LINES[p].map(([, sig]) => sig)))];
if (!process.env.MIGRATION_FILE) {
  const t2 = await standIn({ upTo: AFTER }), made = await assemble(root, t2);
  try { await t2.db.close(); } catch { /* closed */ }
  t.check("the file is the assembler's, to the letter: each part's places filled from the stand-in as the part before it left it", made.sql === FILE,
    made.sql === FILE ? "" : `it differs from line ${made.sql.split("\n").findIndex((l, i) => l !== FILE.split("\n")[i]) + 1}: put it together again (node assemble-v174.mjs <root>)`);
  t.check(`thirty functions of earlier files are written again by it: ${AGAIN.map((s) => s.slice(0, s.indexOf("("))).join(", ")}`, same(made.again, AGAIN) && AGAIN.length === 30, made.again);
}
const body = FILE.split("\n"), isCode = (l) => l.trim() !== "" && !l.startsWith("--");
const lastOf = (test) => body.reduce((at, l, i) => (test(l) ? i : at), -1);
const notifies = body.filter((l) => /^notify pgrst, 'reload schema';$/.test(l)).length, notifyAt = lastOf((l) => l.startsWith("notify pgrst"));
t.check("it begins by saying what it is, tells the API of itself once, as its last statement, and nothing but comment comes after", /^-- v174 — /.test(body[0]) && notifies === 1 && notifyAt === lastOf(isCode), { notifies, notifyAt, last: lastOf(isCode) });
const firstCode = body.findIndex(isCode), firstFn = body.findIndex((l) => /^create or replace function /i.test(l)), firstWrite = body.findIndex((l) => /^(insert|update|delete|alter|create) /i.test(l));
const guard = body.slice(firstCode, firstCode + 6).join("\n");
t.check("its first statement is the guard: it reads whether the rule of felling has had v173's block, and stops the file where it has not, before anything is made",
  body[firstCode] === "do $$ begin" && /position\('v173:' in/.test(guard) && /raise exception 'v174 needs v173/.test(guard) && firstCode < firstWrite && firstCode < firstFn, guard);
const revokeAt = lastOf((l) => l === "revoke execute on all functions in schema town from public, anon, authenticated;"), fnAt = lastOf((l) => /^create or replace function /i.test(l)), grantAt = lastOf((l) => /^grant execute on function /.test(l));
t.check("the schema `town` is taken from every browser once more at the end: after the last function the file makes and after the last part's own grants", revokeAt > fnAt && revokeAt > grantAt && fnAt > 0 && revokeAt < notifyAt, { revokeAt, fnAt, grantAt });
const head = body.slice(0, firstCode).join("\n");
const OPENS = "update public.town_knobs set value = 1 where key = 'smith_open';";
const FIRE_NEW = "update public.town_great_fire set doc = '{}'::jsonb, updated_at = now() where one;";
const BOARD_NEW = `update public.town_things set doc = '{"tops": {}, "found": {}}'::jsonb, updated_at = now() where key = 'smith';`;
t.check("its head says: run once, after v173, safe to run twice; THE CODE GOES OUT FIRST; built closed, with the one line that opens it; an admin can try everything while it is closed, with the line that puts the great fire back to new; and where to see what it should say",
  /after v173/.test(head) && /Running it again is safe/.test(head) && /Safe to run twice/.test(head) && /THE SITE'S CODE FOR IT GOES OUT FIRST/.test(head) && /BUILT CLOSED/.test(head) && head.includes(`--   ${OPENS}`)
  && /AN ADMIN CAN TRY EVERYTHING WHILE IT IS CLOSED/.test(head) && head.includes(`--   ${FIRE_NEW}`) && head.includes(`--   ${BOARD_NEW}`) && /at the file's foot/.test(head) && /BEFORE RUNNING IT/.test(head));
t.check("…and the owner's words it was made on: the round, and the forging table made harder", head.includes("ทำต่อได้เลยนะครับ รอบสอง") && head.includes("ช่วยเพิ่มให้การตีบวก") && head.includes("x3 ไปเลย") && /3, 5, 6, 9 and 12/.test(head) && /12, 12, 15, 15 and 18/.test(head) && /Claude's/.test(head));
const empty = [...FILE.matchAll(/^-- <((?:town|public)\.[a-z_]+)>\n(.*)$/gm)].filter((m) => !/^create or replace function /.test(m[2])).map((m) => m[1]);
const places = [...FILE.matchAll(/^-- <((?:town|public)\.[a-z_]+)>$/gm)].map((m) => m[1]);
t.check(`no place of a part is left empty: ${places.length} statements built from the database's own text, the one that both parts write among them twice`, empty.length === 0 && places.length === 31
  && places.filter((p) => p === "town.work_counts_of").length === 2 && !/empty places: build-v164/.test(FILE) && !/Each place below is empty here/.test(FILE) && !/whoever puts the file together/.test(FILE), { empty, places: places.length });
t.check("the smith's part comes first and the older tools' after it: the second statement of `town.work_counts_of` is the one with both parts' lines",
  FILE.indexOf("-- ═══ Part 1 of 2: the blacksmith") > 0 && FILE.indexOf("-- ═══ Part 1 of 2: the blacksmith") < FILE.indexOf("-- ═══ Part 2 of 2: the seven older tools")
  && (() => { const at = FILE.lastIndexOf("-- <town.work_counts_of>"), end = FILE.indexOf("-- </town.work_counts_of>", at), s = FILE.slice(at, end); return s.includes("the blacksmith (v174)") && s.includes("the older tools (v174)"); })());
t.check("it would not be written under supabase/ unasked", underSupabase(join(root, "supabase", "v174_x.sql")) && underSupabase("C:/x/Supabase/y.sql") && !underSupabase(db("v174_draft.sql")));

/* ══ the guard ══ */
t.section("the guard: a database that has not had v173");
if (existsSync(beside(`snap-v${AFTER - 1}-with-164.tar`))) {
  const g = await standIn({ upTo: AFTER - 1 });
  let stopped = null;
  try { await g.db.exec(FILE); } catch (e) { stopped = e.message; }
  const left = (await g.sql(`select (select count(*)::int from public.town_knobs where key = 'smith_open') as knob, to_regprocedure('town.smith_member()') is not null as gate, to_regclass('public.town_smiths') is not null as smiths,
    (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'town_plots' and column_name = 'damp') as damp`)).rows[0];
  t.check("on the database as it was after v172 the file stops at its first statement, saying that it needs v173", /v174 needs v173/.test(stopped ?? ""), stopped);
  t.check("…and nothing of it is made there: no knob, no gate, no table, no column", left.knob === 0 && left.gate === false && left.smiths === false && left.damp === 0, left);
  try { await g.db.close(); } catch { /* closed */ }
} else console.log(`  (NOT TRIED: no snap-v${AFTER - 1}-with-164.tar beside this script: the database as it was before v${AFTER})`);

/* ══ before it ══ */
t.section("before it: nothing of the smith");
const OLD = await defsOf(rows), WAS = await state();
const looks = queriesOf(head).filter((q) => /as_they_were/.test(q.sql));
t.check("the head's look for the SQL editor is one query, and before the file it says the thirty functions are as they were when the file was built: true | 30",
  looks.length === 1 && same(looks[0].want, ["true | 30"]) && saysSo(await rows(looks[0].sql), looks[0].want), looks.length === 1 ? await rows(looks[0].sql) : looks);
const asked = await call(U.admin, "town_smith_open");
t.check("a page that asks whether the smith is open is answered that there is no such function (which a page takes for no)", !!asked?.error && /does not exist/.test(asked.error), asked);
const DEED = (what, thing, n, doc = {}) => ({ from: "deed", what, thing, n, doc });
const BEFORE = [DEED("net", "ladybird", 1), DEED("stone_lay", "stone", 1), DEED("lamp_light", null, 1), DEED("dust", null, 1, { whose: U.m2 }), DEED("gather", "glowMushroom", 2, { how: "pick" }), DEED("pour", null, 1),
  DEED("fell", "pine", 1, { tree: 3, misses: 0, girth: 1, timber: 2 }), DEED("mine", "stone", 1, { got: "shardCopper", shards: 2 }), DEED("water", "kangkong", 1, { whose: U.m2 }), DEED("no such deed", null, 1)];
const countsOf = async (done, doer = U.m1) => (await one(`select town.work_counts_of($1::jsonb, $2) as c`, [JSON.stringify(done), doer])).c;
const countedWas = []; for (const d of BEFORE) countedWas.push(await countsOf(d));
const WORDS = [...new Set([...OLD["town.deed_th(text)"].matchAll(/when '([a-z_]+)' then '/g)].map((m) => m[1]))];
const wordsWas = Object.fromEntries((await rows(`select w, town.deed_th(w) as th from unnest($1::text[]) w`, [WORDS])).map((r) => [r.w, r.th]));
t.check(`the tally has a word for ${WORDS.length} deeds, the mountain's among them, and none for the smith's; and the bellows count on no line yet`, WORDS.length > 60 && wordsWas.fell !== "fell" && wordsWas.mine !== "mine"
  && (await one(`select town.deed_th('forge') as f`)).f === "forge" && same(await countsOf(DEED("bellows", "oreIron", 1, { whose: U.m2 })), []), WORDS.length);
const diffsWas = Object.keys(CODE).filter((k) => !same(CODE[k], WAS.catalog[k]?.data));
// (the rows the file's own block writes: read from the file, so that this still holds once it has run and lib/town/catalog's CATALOG_KEYS names it no more)
const BLOCK = FILE.slice(FILE.indexOf(`-- <catalog:${VERSION}>`), FILE.indexOf(`-- </catalog:${VERSION}>`)), rowsIn = (s) => [...s.matchAll(/^ {2}\('([a-z_]+)', \$town\$/gm)].map((m) => m[1]);
const seededRows = BLOCK.includes("on conflict (key) do nothing;") ? rowsIn(BLOCK.slice(0, BLOCK.indexOf("on conflict (key) do nothing;"))) : [], K174 = { keys: seededRows, over: rowsIn(BLOCK).filter((k) => !seededRows.includes(k)) };
t.check("the file's block of catalog rows seeds none and writes three over: forge, fishing, insects (the rows lib/town/catalog says a pending v174 writes, while it says so)",
  K174.keys.length === 0 && same([...K174.over].sort(), ["fishing", "forge", "insects"]) && (!CATALOG_KEYS[VERSION] || same(CATALOG_KEYS[VERSION], K174)), K174);
t.check("the database's catalog differs from the code's in the three rows the file is to write, and in no other: the block is the code's as it is now",
  same([...diffsWas].sort(), [...K174.over].sort()) && K174.over.every((k) => !!WAS.catalog[k]), diffsWas);

/* ══ twice over ══ */
t.section("v174, the whole file, twice over, on the stand-in as it is");
await t.run(FILE, "v174");
const ONCE = await state(), NOW1 = await defsOf(rows);
let again = null;
try { await t.db.exec(FILE); } catch (e) { again = e.message; }
t.check("v174 runs a second time", again === null, again);
const TWICE = await state();
const moved = differs(ONCE, TWICE, { moments: false }), first = differs(WAS, ONCE, { moments: false });
// (the same look sees what the first run did, so that seeing nothing after the second means there was nothing)
t.check(`…and the second run changes nothing: every function, who may call it, every table, policy, trigger, index, knob and row as the first run left it (the first run changed ${first.length} of them)`, moved.length === 0 && first.length >= 127 + 30 + 2 + 2 + 1 + 3 + 1, moved);
t.check("…the three catalog rows are written over again with the same", K174.over.every((k) => TWICE.catalog[k].at !== ONCE.catalog[k].at && same(TWICE.catalog[k].data, ONCE.catalog[k].data)));
const foot = FILE.slice(FILE.indexOf("─── What it should say afterwards"));
const [saying, reading] = foot.split(/^-- ─── Reading it.*$/m);
const said = await held(saying);
t.check(`the queries at its foot say what the file says they say: ${said.said} of them held to their lines (${said.n} run)`, said.off.length === 0 && said.said >= 9, said.off);
const read0 = await held(reading ?? "");
t.check(`…and those under "Reading it" run: ${read0.n}`, read0.off.length === 0 && read0.n >= 9, read0.off);
t.check("the head's look says false once the file has run: the thirty have their lines", saysSo(await rows(looks[0].sql), ["false | 30"]), await rows(looks[0].sql));

/* ══ what it adds, and nothing else ══ */
t.section("what it adds, and nothing else");
const NOW = await defsOf(rows), IS = TWICE;
const fresh = Object.keys(NOW).filter((k) => !(k in OLD)), gone = Object.keys(OLD).filter((k) => !(k in NOW));
const CALLED = fresh.filter((k) => k.startsWith("public.")).sort();
t.check("127 functions more and none gone: 111 rules of the schema `town`, sixteen a member's to call", fresh.length === 127 && gone.length === 0 && CALLED.length === 16 && fresh.filter((k) => k.startsWith("town.")).length === 111, { fresh: fresh.length, gone, called: CALLED.length });
t.check("the sixteen: each security definer, for the signed in, not for the signed out", CALLED.every((k) => IS.fns[k].definer && IS.fns[k].member && !IS.fns[k].anon), CALLED.filter((k) => !(IS.fns[k].definer && IS.fns[k].member && !IS.fns[k].anon)));
// (after the FIRST run as after the second: a rule left open by one run and shut by the next would be open on the live database, where the file runs once)
const open = [...new Set([ONCE, IS].flatMap((st) => Object.values(st.fns).filter((f) => f.sig.startsWith("town.") && (f.anon || f.member)).map((f) => f.sig)))];
t.check("nothing of the schema `town` is anybody's to call, the new rules among it, after the first run as after the second", open.length === 0 && Object.keys(IS.fns).filter((k) => k.startsWith("town.")).length === Object.keys(WAS.fns).filter((k) => k.startsWith("town.")).length + 111, open);
for (const sig of AGAIN) {
  const by = PARTS.filter((p) => LINES[p].some(([, s]) => s === sig));
  let want = OLD[sig], why = "";
  try { for (const p of by) for (const [mark, s, lines] of LINES[p]) if (s === sig) want = changed(want, mark, lines); } catch (e) { why = e.message; }
  t.check(`${sig.slice(0, sig.indexOf("("))} is the one it replaces, word for word, but for the lines of ${by.map((p) => `v174.${p}`).join(" and of ")}`, !why && NOW[sig] === want && NOW[sig] !== OLD[sig] && NOW1[sig] === want, why || `${(NOW[sig] ?? "").length} characters against ${(want ?? "").length}`);
}
const others = Object.keys(OLD).filter((k) => !AGAIN.includes(k) && (NOW[k] !== OLD[k] || IS.fns[k].def !== WAS.fns[k].def));
t.check(`NO OTHER FUNCTION THAT WAS THERE IS CHANGED: ${Object.keys(OLD).length - AGAIN.length} of them, each its own text from before`, others.length === 0 && Object.keys(OLD).length === Object.keys(WAS.fns).length, others);
const regranted = Object.keys(WAS.fns).filter((k) => IS.fns[k].anon !== WAS.fns[k].anon || IS.fns[k].member !== WAS.fns[k].member || IS.fns[k].definer !== WAS.fns[k].definer);
t.check("…and who may call each of them is as it was, the thirty written again among them", regranted.length === 0, regranted);
const wco = NOW["town.work_counts_of(jsonb, text)"], dth = NOW["town.deed_th(text)"];
t.check("`town.work_counts_of` carries the smith's block AND the older tools' lines, with the woodcutters' and the miners' blocks that were there; `town.deed_th` the smith's words with theirs",
  wco.includes("the blacksmith (v174)") && wco.includes("the older tools (v174)") && wco.includes("the mountain's trees (v164)") && wco.includes("the mountain's rocks (v164)")
  && dth.includes("the blacksmith (v174)") && dth.includes("the mountain's trees (v164)") && dth.includes("the mountain's rocks (v164)"));
t.check("the rule of felling is not written: v172's and v173's blocks are in it as they were", NOW["town.fell(jsonb, jsonb, text, jsonb, integer, integer, bigint, jsonb, text)"] === OLD["town.fell(jsonb, jsonb, text, jsonb, integer, integer, bigint, jsonb, text)"]
  && NOW["town.fell(jsonb, jsonb, text, jsonb, integer, integer, bigint, jsonb, text)"].includes("v172:") && NOW["town.fell(jsonb, jsonb, text, jsonb, integer, integer, bigint, jsonb, text)"].includes("v173:"));
const bare = await bareWrites(rows);
t.check("no function writes to a table with no WHERE, over the whole database", bare.length === 0, bare);

const tablesNew = Object.keys(IS.tables).filter((k) => !(k in WAS.tables)).sort();
const MORE = { town_plots: "damp boolean", town_pots: "marks jsonb" };
t.check("two tables more; two columns more, `town_plots.damp` and `town_pots.marks`; and every other table that was there as it was (its columns, its row security, its grants)",
  same(tablesNew, ["town_great_fire", "town_smiths"]) && Object.keys(WAS.tables).every((k) => (MORE[k] ? same(IS.tables[k], { ...WAS.tables[k], columns: [...WAS.tables[k].columns, MORE[k]] }) : same(IS.tables[k], WAS.tables[k]))),
  [tablesNew, Object.keys(WAS.tables).filter((k) => !same(IS.tables[k], WAS.tables[k]))]);
t.check("…the two tables closed: row security on, nothing granted to a browser, no policy; and no policy more anywhere", tablesNew.every((k) => IS.tables[k].closed && !IS.tables[k].grants.some((g) => /^(anon|authenticated):/.test(g))) && same(IS.policies, WAS.policies), tablesNew.map((k) => IS.tables[k].grants));
t.check("…no trigger more, and no index of a table that was there made, changed or dropped", same(IS.triggers, WAS.triggers) && same(IS.indexes.filter((d) => !/ON public\.town_(smiths|great_fire) /.test(d)), WAS.indexes), [IS.triggers.filter((g) => !WAS.triggers.includes(g)), IS.indexes.filter((d) => !WAS.indexes.includes(d))]);
const knobsNew = Object.keys(IS.knobs).filter((k) => !(k in WAS.knobs)).sort();
t.check("one knob more, the smith's, at 0: it is built closed; every knob that was there as it was", same(knobsNew, ["smith_open"]) && IS.knobs.smith_open === 0 && Object.keys(WAS.knobs).every((k) => IS.knobs[k] === WAS.knobs[k]), knobsNew);
const off = Object.keys(CODE).filter((k) => !same(CODE[k], IS.catalog[k]?.data));
t.check(`the catalog is the code's now, every row of it (${Object.keys(CODE).length}): the three the file writes are what catalogOf() gives, the forging table's new numbers among them`,
  off.length === 0 && same(Object.keys(IS.catalog).sort(), Object.keys(CODE).sort()) && same(IS.catalog.forge.data.tries.filter((x) => x.to >= 5 && x.to <= 9).map((x) => [x.n, x.timber]), [[3, 12], [5, 12], [6, 15], [9, 15], [12, 18]]), off);
const touched = Object.keys(WAS.catalog).filter((k) => !same(ONCE.catalog[k], WAS.catalog[k])).sort();
t.check("…and no other row of it was written: the three are the only ones that moved, in one go", same(touched, [...K174.over].sort()) && new Set(K174.over.map((k) => ONCE.catalog[k].at)).size === 1, touched);
t.check("the village's board as a row of its things, empty; the great fire's one row, as new; no smithy; and no other thing, word or row of any table of the town's touched",
  same(IS.things.smith, { tops: {}, found: {} }) && Object.keys(WAS.things).every((k) => same(IS.things[k], WAS.things[k])) && Object.keys(IS.things).length === Object.keys(WAS.things).length + 1 && same(IS.secrets, WAS.secrets)
  && same(await rows(`select one, doc from public.town_great_fire`), [{ one: true, doc: {} }]) && IS.counts.town_smiths === 0
  && Object.keys(WAS.counts).every((k) => IS.counts[k] === WAS.counts[k] + (k === "town_knobs" || k === "town_things" ? 1 : 0)), Object.keys(WAS.counts).filter((k) => IS.counts[k] !== WAS.counts[k]));
const countedNow = []; for (const d of BEFORE) countedNow.push(await countsOf(d));
t.check("every deed that counted before counts as it did (an insect netted, a stone laid, a lamp lit, fae dust, a thing gathered, a pour, a tree felled, a rock broken, a plant of somebody else's watered); and what counted for nothing still does",
  BEFORE.every((d, i) => same(countedNow[i], countedWas[i])) && countedWas[0].length > 0 && countedWas[6].length > 0 && countedWas[7].length > 0 && countedWas[9].length === 0, BEFORE.map((d, i) => [d.what, countedNow[i], countedWas[i]]));
const bellows = DEED("bellows", "oreIron", 1, { whose: U.m2 });
t.check("…the bellows worked for somebody else count on the helpers' line now, as lib/town/line-points counts them", same(await countsOf(bellows), JSON.parse(JSON.stringify(LP.countsOf(bellows, U.m1)))) && (await countsOf(bellows)).length === 1, await countsOf(bellows));
const wordsNow = Object.fromEntries((await rows(`select w, town.deed_th(w) as th from unnest($1::text[]) w`, [WORDS])).map((r) => [r.w, r.th]));
const NEW_WORDS = ["smelt", "smelted", "smith_wider", "bellows", "forge", "forge_draw", "forge_choose", "forge_redraw", "forge_first", "gem_set", "forge_move", "fire_found", "fire_join", "fire_leave", "power"];
const newWords = Object.fromEntries((await rows(`select w, town.deed_th(w) as th from unnest($1::text[]) w`, [NEW_WORDS])).map((r) => [r.w, r.th]));
t.check(`every word the tally had is the word it was (${WORDS.length}), and each deed of the smith's has a Thai word of its own`, same(wordsNow, wordsWas)
  && NEW_WORDS.every((w) => newWords[w] && newWords[w] !== w && /[\u0E00-\u0E7F]/.test(newWords[w])) && new Set(Object.values(newWords)).size === NEW_WORDS.length, newWords);

/* ══ the smith's part, on the database the whole file leaves ══ */
const cases = async (T, part) => {
  const file = beside(`${VERSION}/vectors-${part}.json`);
  if (!WITH_CASES) { console.log(`  (CASES=0: the ${part} part's rule cases are not asked)`); return; }
  const vectors = JSON.parse(readFileSync(file, "utf8")), CALL = JSON.parse(readFileSync(db(`${VERSION}.${part}.calls.json`), "utf8"));
  t.section(`the ${part} part's rule cases on the whole: ${vectors.length}, each as the code answers it`);
  const tally = new Map();
  for (const v of vectors) {
    const r = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
    tally.set(v.fn, r);
    r.n++;
    const sql = CALL[v.fn];
    if (!sql) { r.bad++; r.first ??= `no SQL for ${v.fn} in ${VERSION}.${part}.calls.json`; continue; }
    let got, error = null;
    try { got = (await T.db.query(`select ${sql} as r`, v.args.map((x) => (x === null ? null : typeof x === "object" ? JSON.stringify(x) : x)))).rows[0].r; } catch (e) { error = e.message; }
    if (typeof got === "bigint") got = Number(got);
    if (error || !same(got ?? null, v.want)) { r.bad++; r.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  }
  for (const [fn, r] of tally) t.check(`${fn}: ${r.n} cases`, r.bad === 0, r.bad ? `${r.bad} differ; the first: ${JSON.stringify(r.first).slice(0, 2400)}` : "");
};
/** What a part's stories are handed, as try-v164.mjs hands it, of a database. */
const handed = (T) => {
  const one_ = async (sql, params) => (await T.sql(sql, params)).rows[0];
  const purseOf = async (who) => (await one_(`select doc from public.town_purses where member_id = $1`, [who]))?.doc;
  return {
    t: T, U, one: one_, same, CODE, root, sql: FILE, purseOf,
    call: async (who, fn, ...args) => { const r = await T.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args.map((x) => (x === null ? null : typeof x === "object" ? JSON.stringify(x) : x))); return r.error ? r : r.rows[0].r; },
    deeds: async (what) => (await T.sql(`select member_id, thing, n::int as n, coins::int as coins, doc from public.town_deeds where what = $1 order by id`, [what])).rows,
    give: async (who, gifts) => {
      await T.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
      await T.sql(`update public.town_purses set doc = jsonb_set(coalesce(doc, '{}'::jsonb), '{gifts}', $2::jsonb) where member_id = $1`, [who, JSON.stringify({ had: [], charms: [], owed: 0, familiar: null, used: {}, ...gifts })]);
      return (await purseOf(who))?.gifts;
    },
    patch: async (who, fields) => {
      const { coins, ...doc } = fields;
      await T.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
      await T.sql(`update public.town_purses set doc = coalesce(doc, '{}'::jsonb) || $2::jsonb where member_id = $1`, [who, JSON.stringify(doc)]);
      if (coins !== undefined) await T.sql(`update public.town_purses set coins = $2 where member_id = $1`, [who, coins]);
      return purseOf(who);
    },
    rank: async (who, ln, points) => {
      await T.sql(`insert into public.town_work (member_id, line, kept) values ($1, $2, jsonb_build_object('points', $3::numeric)) on conflict (member_id, line) do update set kept = coalesce(public.town_work.kept, '{}'::jsonb) || jsonb_build_object('points', $3::numeric)`, [who, ln, points]);
      return (await one_(`select town.rank_on($1, $2) as r`, [who, ln])).r;
    },
  };
};
await cases(t, "smith");
t.section("THE SMITH'S STORIES on the whole (v174.smith.try.mjs; what is run once more over all of it is the whole file)");
// (his own functions are read from his own section of the file: the older tools' part writes functions a member calls too)
const OWN = FILE.slice(FILE.indexOf("-- ═══ Part 1 of 2:"), FILE.indexOf("-- ═══ Part 2 of 2:"));
await (await import(pathToFileURL(db(`${VERSION}.smith.try.mjs`)).href)).default({ ...handed(t), own: OWN });

/* ══ who may, by the lines of the head ══ */
t.section("who may ask: closed, and opened by the one line of the file's head (the game and the far side open, as they are live)");
await knob("game_open", 1); await knob("far_open", 1); await knob("smith_open", 0);
const BY = [Math.floor(CODE.forge.stand.at[0]), Math.floor(CODE.forge.stand.at[1])];
const ASKS = [["town_smith_open"], ["town_smith"], ["town_smith_smelt", "oreCopper", 1], ["town_smith_take"], ["town_smith_widen"], ["town_smith_near", `{${U.m2}}`], ["town_smith_bellows", U.m2],
  ["town_smith_try", 0], ["town_smith_draw", 0], ["town_smith_choose", 0, "pkPeek"], ["town_smith_redraw", 0, 0, "gemRuby"], ["town_smith_gem", 0, "gemRuby"], ["town_smith_move", 0, 1, BY[0], BY[1], false],
  ["town_fire_join"], ["town_fire_leave"], ["town_tool_power", "ntWide"]];
t.check("every function of the file that a member calls is asked here", same(ASKS.map(([fn]) => `public.${fn}`).sort(), CALLED.map((s) => s.slice(0, s.indexOf("("))).sort()), CALLED);
const ask = async (who) => { const out = {}; for (const [fn, ...args] of ASKS) out[fn] = await call(who, fn, ...args); return out; };
// (his own gate is before fourteen of them; `town_smith_open` is the question itself, and `town_tool_power` begins with the game's gate)
const GATED = ASKS.map(([fn]) => fn).filter((fn) => fn !== "town_smith_open" && fn !== "town_tool_power");
const sayOf = (did) => Object.fromEntries(Object.entries(did).map(([fn, r]) => [fn, r?.code ?? r?.error ?? r?.why ?? (r?.ok === true ? "ok" : r)]));
const answered = (r) => r !== null && r !== undefined && !r.error;
let did = await ask("anon");
t.check("somebody signed out is refused all sixteen, the question of whether he is open among them", Object.values(did).every(no), sayOf(did));
for (const [who, name] of [[U.nochar, "a member with no character"], [U.unver, "a member whose character was never proved"]]) {
  did = await ask(who);
  t.check(`${name}: told no by \`town_smith_open\`, and refused by the fifteen others`, did.town_smith_open === false && GATED.every((fn) => no(did[fn])) && no(did.town_tool_power), sayOf(did));
}
did = await ask(U.m1);
t.check("a proved member who is no admin, while he is closed: told no, refused by the fourteen behind his gate, and answered by `town_tool_power`, which is behind the game's alone",
  did.town_smith_open === false && GATED.every((fn) => no(did[fn])) && answered(did.town_tool_power), sayOf(did));
did = await ask(U.admin);
t.check("an admin is told yes and answered by all fifteen while he is closed", did.town_smith_open === true && GATED.every((fn) => answered(did[fn])) && answered(did.town_tool_power), sayOf(did));
await t.sql(head.split("\n").find((l) => l.includes(OPENS)).replace(/^--\s*/, ""));
t.check("the one line of the file's head opens him", (await one(`select value from public.town_knobs where key = 'smith_open'`)).value == 1);
did = await ask(U.m1);
t.check("opened, a proved member is told yes and answered by all fifteen", did.town_smith_open === true && GATED.every((fn) => answered(did[fn])) && answered(did.town_tool_power), sayOf(did));
await knob("far_open", 0);
did = await ask(U.m1);
t.check("with the far side shut a proved member is told no and refused again, though the smith's own knob says open", did.town_smith_open === false && GATED.every((fn) => no(did[fn])), sayOf(did));
await knob("far_open", 1); await knob("game_open", 0);
did = await ask(U.m1);
t.check("…and with the game itself shut too, `town_tool_power` with the rest", did.town_smith_open === false && GATED.every((fn) => no(did[fn])) && no(did.town_tool_power), sayOf(did));
await knob("game_open", 1);

t.section("the two lines of the head that put the great fire and the board back to new, over what the stories left");
const fireWas = (await one(`select doc from public.town_great_fire where one`)).doc, boardWas = (await one(`select doc from public.town_things where key = 'smith'`)).doc;
await t.sql(`update public.town_great_fire set doc = '{"flint": {"by": "x", "name": "x", "at": 1}, "due": 5}'::jsonb where one`);
await t.sql(head.split("\n").find((l) => l.includes(FIRE_NEW)).replace(/^--\s*/, ""));
await t.sql(head.split("\n").find((l) => l.includes(BOARD_NEW)).replace(/^--\s*/, ""));
const afterNew = await call(U.admin, "town_smith");
t.check("the great fire's row is as the file made it, the board is empty, and the smith answers as of a village that has found nothing yet",
  same((await one(`select doc from public.town_great_fire where one`)).doc, {}) && same((await one(`select doc from public.town_things where key = 'smith'`)).doc, { tops: {}, found: {} }) && (await one(`select count(*)::int as n from public.town_great_fire`)).n === 1
  && answered(afterNew) && same(afterNew.smith.board, { tops: {}, found: {} }) && Object.keys(boardWas.found ?? {}).length > 0, { fireWas: Object.keys(fireWas), afterNew: afterNew?.smith?.fire });
const read = await held(reading ?? "");
t.check(`the queries under "Reading it" run over what members have done at the smith: ${read.n}`, read.off.length === 0 && read.n >= 9, read.off);
try { await t.db.close(); } catch { /* closed */ }

/* ══ the older tools' part, on a second database the whole file has run on ══ */
t.section("a second database: the stand-in, and the whole file run on it twice");
const b = await standIn({ upTo: AFTER });
let ran = null;
try { await b.db.exec(FILE); await b.db.exec(FILE); } catch (e) { ran = e.message; }
t.check("the whole file runs on it, twice", ran === null, ran);
// (its checks are counted with the rest)
const B = { ...b, check: t.check, section: t.section, done: () => {} };
await cases(B, "tools");
t.section("THE OLDER TOOLS' STORIES on the whole (v174.tools.try.mjs): the day with tools as they were bought, on the database before the file and on this one");
await (await import(pathToFileURL(db(`${VERSION}.tools.try.mjs`)).href)).default({ ...handed(B),
  before: { open: () => standIn({ upTo: AFTER }), made: { tables: ["town_great_fire", "town_smiths"], rows: { town_catalog: [...K174.over], town_knobs: ["smith_open"], town_things: ["smith"] } } } });

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await b.db.close(); } catch { /* closed */ }
process.exit(code);
