/*
 * v164 AS ONE FILE (the far side: the base, the woodcutters' part and the miners', put together by assemble-v164.mjs)
 * tried against the stand-in database as it is after the last file that ran (stand-in.mjs's snapshot, in memory:
 * nothing is written anywhere).
 *
 *   FC_REPO=<the tree whose code is meant> node v164.test.mjs [that tree's root]     (MIGRATION_FILE=<a file> tries that one)
 *
 * The file it reads, the first there is: MIGRATION_FILE; supabase/v164_*.sql in the root given (the file as its owner
 * has it); <root>/.claude/skills/fc-cash-town/scripts/db/v164_draft.sql (the draft as it is kept); v164_draft.sql
 * beside this script; history, once it has run.
 *
 * Each part is proved by its own try (try-v164.mjs: its rule cases, its scenes, its breaks). This holds what only the
 * WHOLE can show:
 *   · the draft is what the assembler makes of the parts as they are now, to the letter; it has one `notify pgrst`, at
 *     its end, a last revoke on the schema `town` after its last function, the one line that opens it in its head,
 *     and no place left empty;
 *   · the look its head gives for the SQL editor says the eleven functions are as they were, before the file, and not after;
 *   · it runs, and runs a second time with no error and NO CHANGE: every function, grant, table, policy, trigger,
 *     knob and row as the first run left it;
 *   · what it adds, counted, and nothing else: two tables (closed; the site's key may read and insert the cave's days
 *     and no more), a trigger, 168 functions (seventeen a member's), three knobs, thirteen catalog rows which are the
 *     code's (`catalogOf()`), a row of `town_things` and one of `town_secrets`; no other row, knob, policy or trigger;
 *   · NO FUNCTION OF AN EARLIER FILE IS CHANGED but the eleven the parts say they write again, and each of those is the
 *     one it replaces, word for word, but for the parts' lines; `town.work_counts_of` and `town.deed_th` carry BOTH
 *     blocks (and v160's and v163's), every word and every count that was there answers as before, and a tree felled
 *     and a rock broken are each worded and each counted on its own line of work, as lib/town/line-points counts them;
 *   · no function writes to a table with no WHERE; nothing of the schema `town` is anybody's to call;
 *   · every function a member calls refuses somebody signed out, a member with no character, one never proved, and
 *     (built closed) a proved member who is no admin, and answers an admin; opened by the one line of the file's
 *     head, it answers a proved member; with the game itself shut it refuses them again;
 *   · ONE MEMBER'S STORY ACROSS BOTH LINES, by the functions a member calls, each call held to the code itself on
 *     what the database kept before it (lib/town/trees, mining, cave-state, vein-account; the twins are the parts'
 *     own tries', cut down to one member): a tree felled, the pick taken up, a rock of the mountain's foot broken, a
 *     rock of the cave that hides a vein broken, the vein played out, and the wood put away at the chest at the
 *     mountain's foot (the storage box is v134's; the far side's chest opens it). After each: the purse, the grove and
 *     the place's row as the code says; at the end, the deeds written down and the points on the two lines;
 *   · the file once more, over all of that: opened it stays open, and nothing a member did is touched;
 *   · the queries at its foot say what it says they say (on a database it has just run on), and "Reading it" runs.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn, RAN } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { changed } from "./build-v159.mjs";
import { defsOf, linesOf } from "./build-v164.mjs";
import { PARTS, VERSION, assemble, underSupabase } from "./assemble-v164.mjs";

const root = process.argv[2] ?? process.env.FC_REPO;
if (!root) { console.log("FC_REPO=<the tree whose code is meant> node v164.test.mjs [that tree's root]"); process.exit(2); }
process.env.FC_REPO ??= root;
await import("./repo-ts-town.mjs");
const { catalogOf, CATALOG_KEYS } = await import("@/lib/town/catalog");
const T = await import("@/lib/town/trees");
const { farTrees, farCedar } = await import("@/lib/town/far-side");
const M = await import("@/lib/town/mining");
const CS = await import("@/lib/town/cave-state");
const V = await import("@/lib/town/vein");
const VA = await import("@/lib/town/vein-account");
const LP = await import("@/lib/town/line-points");
const { caveLayout } = await import("@/lib/town/mining-row");
const { dayOf } = await import("@/lib/town/stamina");
const { hold } = await import("@/lib/town/trade");
const BOXES = await import("@/lib/town/box");

const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith(`${VERSION}_`) && f.endsWith(".sql")) : null;
const beside = new URL(`./${VERSION}_draft.sql`, import.meta.url);
const [FROM, text] = process.env.MIGRATION_FILE ? [process.env.MIGRATION_FILE, readFileSync(process.env.MIGRATION_FILE, "utf8")]
  : inRepo ? [join(root, "supabase", inRepo), readFileSync(join(root, "supabase", inRepo), "utf8")]
  : existsSync(db(`${VERSION}_draft.sql`)) ? [db(`${VERSION}_draft.sql`), readFileSync(db(`${VERSION}_draft.sql`), "utf8")]
  : existsSync(beside) ? [`${VERSION}_draft.sql beside this script`, readFileSync(beside, "utf8")] : ["history", migration(164)];
const FILE = lf(text);
console.log(`the file: ${FROM}\n  ${FILE.split("\n").length - 1} lines, sha256 ${createHash("sha256").update(FILE).digest("hex")} (of its text with plain line ends)`);
const CODE = catalogOf();
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null || v === undefined ? null : typeof v === "object" ? JSON.stringify(v) : v);
const no = (r) => r?.code === "42501";

const t0 = Date.now();
const t = await standIn();
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
  return {
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
/** What of two states differs, by name. (`but`: catalog rows' moments are left out, where a row is written over with the same.) */
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
t.section(`the file: what the assembler makes of the parts as they are (${PARTS.join(", ")}), built on the stand-in after v${RAN}`);
const LINES = Object.fromEntries(await Promise.all(PARTS.map(async (p) => [p, await linesOf(db(`${VERSION}.${p}.lines.mjs`))])));
const AGAIN = [...new Set(PARTS.flatMap((p) => LINES[p].map(([, sig]) => sig)))];
if (!process.env.MIGRATION_FILE) {
  const t2 = await standIn(), made = await assemble(root, t2, { ran: RAN });
  try { await t2.db.close(); } catch { /* closed */ }
  t.check("the file is the assembler's, to the letter: each part's places filled from the stand-in as the parts before it left it", made.sql === FILE,
    made.sql === FILE ? "" : `it differs from line ${made.sql.split("\n").findIndex((l, i) => l !== FILE.split("\n")[i]) + 1}: put it together again (node assemble-v164.mjs <root> <out>)`);
  t.check(`eleven functions of earlier files are written again by it: ${AGAIN.map((s) => s.slice(0, s.indexOf("("))).join(", ")}`, same(made.again, AGAIN) && AGAIN.length === 11, made.again);
}
const body = FILE.split("\n"), isCode = (l) => l.trim() !== "" && !l.startsWith("--");
const lastOf = (test) => body.reduce((at, l, i) => (test(l) ? i : at), -1);
const notifies = body.filter((l) => /^notify pgrst, 'reload schema';$/.test(l)).length, notifyAt = lastOf((l) => l.startsWith("notify pgrst"));
t.check("it begins by saying what it is, tells the API of itself once, as its last statement, and nothing but comment comes after", /^-- v164 — /.test(body[0]) && notifies === 1 && notifyAt === lastOf(isCode), { notifies, notifyAt, last: lastOf(isCode) });
const revokeAt = lastOf((l) => l === "revoke execute on all functions in schema town from public, anon, authenticated;"), fnAt = lastOf((l) => /^create or replace function /i.test(l)), grantAt = lastOf((l) => /^grant execute on function /.test(l));
t.check("the schema `town` is taken from every browser once more at the end: after the last function the file makes and after the last part's own grants", revokeAt > fnAt && revokeAt > grantAt && fnAt > 0 && revokeAt < notifyAt, { revokeAt, fnAt, grantAt });
const head = body.slice(0, body.findIndex(isCode)).join("\n");
const OPENS = "update public.town_knobs set value = 1 where key = 'far_open';";
t.check("its head says that the blacksmith is not in it, that it is built closed with the one line that opens it, that it is safe to run twice, and where to see what it should say",
  /BLACKSMITH IS NOT IN IT/.test(head) && /BUILT CLOSED/.test(head) && head.includes(`--   ${OPENS}`) && /Running it again is safe/.test(head) && /Safe to run twice/.test(head) && /at the file's foot/.test(head));
const empty = [...FILE.matchAll(/^-- <((?:town|public)\.[a-z_]+)>\n(.*)$/gm)].filter((m) => !/^create or replace function /.test(m[2])).map((m) => m[1]);
const places = [...FILE.matchAll(/^-- <((?:town|public)\.[a-z_]+)>$/gm)].map((m) => m[1]);
t.check(`no place of a part is left empty: ${places.length} statements built from the database's own text, the two that two parts write among them twice`, empty.length === 0 && places.length === 13
  && places.filter((p) => p === "town.work_counts_of").length === 2 && places.filter((p) => p === "town.deed_th").length === 2 && !/empty places: build-v164/.test(FILE), { empty, places });
t.check("it would not be written under supabase/ unasked", underSupabase(join(root, "supabase", "v164_x.sql")) && underSupabase("C:/x/Supabase/y.sql") && !underSupabase(db("v164_draft.sql")));

/* ══ before it ══ */
t.section("before it: nothing of the far side");
const OLD = await defsOf(rows), WAS = await state();
const looks = queriesOf(head).filter((q) => /as_they_were/.test(q.sql));
t.check("the head's look for the SQL editor is one query, and before the file it says the eleven functions are as they were when the file was built: true | 11",
  looks.length === 1 && same(looks[0].want, ["true | 11"]) && saysSo(await rows(looks[0].sql), looks[0].want), looks.length === 1 ? await rows(looks[0].sql) : looks);
const asked = await call(U.admin, "town_far");
t.check("a page that asks whether the far side is open is answered that there is no such function (which a page takes for no)", !!asked?.error && /does not exist/.test(asked.error), asked);
/** Deeds of the kinds that were there, and of the far side's, as a line counts them and as the tally words them. */
const DEED = (what, thing, n, doc = {}) => ({ from: "deed", what, thing, n, doc });
const BEFORE = [DEED("net", "ladybird", 1), DEED("stone_lay", "stone", 1), DEED("stone_hand", "stone", 1), DEED("lamp_light", null, 1), DEED("lamp_hand", null, 1), DEED("dust", null, 1, { whose: U.m2 }), DEED("gather", "glowMushroom", 2, { how: "pick" }),
  DEED("pour", null, 1), DEED("fell", "pine", 1), DEED("mine", "stone", 1, { got: "shardCopper" }), DEED("no such deed", null, 1)];
const countsOf = async (done, doer = U.m1) => (await one(`select town.work_counts_of($1::jsonb, $2) as c`, [JSON.stringify(done), doer])).c;
const countedWas = []; for (const d of BEFORE) countedWas.push(await countsOf(d));
t.check("…and a tree felled or a rock broken counts on no line yet", same(countedWas[8], []) && same(countedWas[9], []) && countedWas.slice(0, 5).every((c) => c.length > 0), countedWas);
const WORDS = [...new Set([...OLD["town.deed_th(text)"].matchAll(/when '([a-z_]+)' then '/g)].map((m) => m[1]))];
const wordsWas = Object.fromEntries((await rows(`select w, town.deed_th(w) as th from unnest($1::text[]) w`, [WORDS])).map((r) => [r.w, r.th]));
t.check(`the tally has a word for ${WORDS.length} deeds, the bridge's and the lamps' among them, and none for the far side's`, WORDS.length > 60 && wordsWas.stone_lay !== "stone_lay" && wordsWas.lamp_light !== "lamp_light"
  && (await one(`select town.deed_th('fell') as f, town.deed_th('mine') as m`)).f === "fell", WORDS.length);
const diffsWas = Object.keys(CODE).filter((k) => !same(CODE[k], WAS.catalog[k]?.data));
// (the rows the file's own block writes: those it seeds, before `on conflict (key) do nothing`, and those it writes over.
// Read from the file, so that this still holds once it has run and lib/town/catalog's CATALOG_KEYS names it no more)
const BLOCK = FILE.slice(FILE.indexOf(`-- <catalog:${VERSION}>`), FILE.indexOf(`-- </catalog:${VERSION}>`)), rowsIn = (s) => [...s.matchAll(/^ {2}\('([a-z_]+)', \$town\$/gm)].map((m) => m[1]);
const seededRows = rowsIn(BLOCK.slice(0, BLOCK.indexOf("on conflict (key) do nothing;"))), K164 = { keys: seededRows, over: rowsIn(BLOCK).filter((k) => !seededRows.includes(k)) };
t.check("the file's block of catalog rows names four it seeds and nine it writes over (the rows lib/town/catalog says a pending v164 writes, while it says so)",
  K164.keys.length === 4 && K164.over.length === 9 && (!CATALOG_KEYS[VERSION] || same(CATALOG_KEYS[VERSION], K164)), K164);
t.check(`the catalog differs from the code's in the thirteen rows the file is to write, and in no other: ${K164.keys.join(", ")} are not there, ${K164.over.join(", ")} are not the code's`,
  same([...diffsWas].sort(), [...K164.keys, ...K164.over].sort()) && K164.keys.every((k) => !WAS.catalog[k]) && K164.over.every((k) => !!WAS.catalog[k]) && CODE.trees.wood.length > 0 && CODE.mining.rocks.length > 0, diffsWas);

/* ══ twice over ══ */
t.section("v164, the whole file, twice over");
await t.run(FILE, "v164");
const ONCE = await state(), NOW1 = await defsOf(rows);
// (so that a seeded row written again would show: the four are made old before the second run)
await t.sql(`update public.town_catalog set updated_at = now() - interval '2 hours' where key = any($1)`, [K164.keys]);
const ONCE_ = await state();
let again = null;
try { await t.db.exec(FILE); } catch (e) { again = e.message; }
t.check("v164 runs a second time", again === null, again);
const TWICE = await state();
const moved = differs(ONCE_, TWICE, { moments: false }), first = differs(WAS, ONCE, { moments: false });
// (the same look sees what the first run did, so that seeing nothing after the second means there was nothing)
t.check(`…and the second run changes nothing: every function, who may call it, every table, policy, trigger, index, knob and row as the first run left it (the first run changed ${first.length} of them)`, moved.length === 0 && first.length >= 168 + 11 + 2 + 3 + 13 + 2, moved);
t.check("…the four rows it seeds are left as they are by a second run (a number changed since would outlive it), the nine it writes over are written again with the same",
  K164.keys.every((k) => TWICE.catalog[k].at === ONCE_.catalog[k].at) && K164.over.every((k) => TWICE.catalog[k].at !== ONCE_.catalog[k].at && same(TWICE.catalog[k].data, ONCE_.catalog[k].data)));
const foot = FILE.slice(FILE.indexOf("─── What it should say afterwards"));
const [saying, reading] = foot.split(/^-- ─── Reading it.*$/m);
const said = await held(saying);
t.check(`the queries at its foot say what the file says they say: ${said.said} of them held to their lines (${said.n} run)`, said.off.length === 0 && said.said >= 14, said.off);
const read = await held(reading ?? "");
t.check(`…and those under "Reading it" run: ${read.n}`, read.off.length === 0 && read.n >= 5, read.off);
t.check("the head's look says false once the file has run: the eleven have their blocks", saysSo(await rows(looks[0].sql), ["false | 11"]), await rows(looks[0].sql));

/* ══ what it adds, and nothing else ══ */
t.section("what it adds, and nothing else");
const NOW = await defsOf(rows), IS = TWICE;
const fresh = Object.keys(NOW).filter((k) => !(k in OLD)), gone = Object.keys(OLD).filter((k) => !(k in NOW));
const CALLED = fresh.filter((k) => k.startsWith("public.")).sort();
t.check("168 functions more and none gone: 151 rules of the schema `town`, seventeen a member's to call", fresh.length === 168 && gone.length === 0 && CALLED.length === 17 && fresh.filter((k) => k.startsWith("town.")).length === 151, { fresh: fresh.length, gone, called: CALLED.length });
t.check("the seventeen: each security definer, for the signed in, not for the signed out", CALLED.every((k) => IS.fns[k].definer && IS.fns[k].member && !IS.fns[k].anon), CALLED.filter((k) => !(IS.fns[k].definer && IS.fns[k].member && !IS.fns[k].anon)));
const open = Object.values(IS.fns).filter((f) => f.sig.startsWith("town.") && (f.anon || f.member)).map((f) => f.sig);
t.check("nothing of the schema `town` is anybody's to call, the new rules among it", open.length === 0 && Object.keys(IS.fns).filter((k) => k.startsWith("town.")).length === Object.keys(WAS.fns).filter((k) => k.startsWith("town.")).length + 151, open);
for (const sig of AGAIN) {
  const by = PARTS.filter((p) => LINES[p].some(([, s]) => s === sig));
  let want = OLD[sig], why = "";
  try { for (const p of by) for (const [mark, s, lines] of LINES[p]) if (s === sig) want = changed(want, mark, lines); } catch (e) { why = e.message; }
  t.check(`${sig.slice(0, sig.indexOf("("))} is the one it replaces, word for word, but for the lines of ${by.map((p) => `v164.${p}`).join(" and of ")}`, !why && NOW[sig] === want && NOW[sig] !== OLD[sig] && NOW1[sig] === want, why || `${(NOW[sig] ?? "").length} characters against ${(want ?? "").length}`);
}
const others = Object.keys(OLD).filter((k) => !AGAIN.includes(k) && (NOW[k] !== OLD[k] || IS.fns[k].def !== WAS.fns[k].def));
t.check(`NO OTHER FUNCTION THAT WAS THERE IS CHANGED: ${Object.keys(OLD).length - AGAIN.length} of them, each its own text from before`, others.length === 0 && Object.keys(OLD).length === Object.keys(WAS.fns).length, others);
const regranted = Object.keys(WAS.fns).filter((k) => IS.fns[k].anon !== WAS.fns[k].anon || IS.fns[k].member !== WAS.fns[k].member || IS.fns[k].definer !== WAS.fns[k].definer);
t.check("…and who may call each of them is as it was, the eleven written again among them", regranted.length === 0, regranted);
const both = (def) => [def.includes("the mountain's trees (v164)"), def.includes("the mountain's rocks (v164)"), /the bridge|v160/.test(def), /the lamp|v163/.test(def)];
t.check("`town.work_counts_of` and `town.deed_th` carry BOTH blocks, the woodcutters' and the miners', with the bridge's and the lamps' that were there",
  both(NOW["town.work_counts_of(jsonb, text)"]).every(Boolean) && both(NOW["town.deed_th(text)"]).every(Boolean), [both(NOW["town.work_counts_of(jsonb, text)"]), both(NOW["town.deed_th(text)"])]);
const bare = await bareWrites(rows);
t.check("no function writes to a table with no WHERE, over the whole", bare.length === 0, bare);

const tablesNew = Object.keys(IS.tables).filter((k) => !(k in WAS.tables)).sort();
t.check("two tables more, and every table that was there as it was (its columns, its row security, its grants)", same(tablesNew, ["town_cave", "town_cave_days"]) && Object.keys(WAS.tables).every((k) => same(IS.tables[k], WAS.tables[k])), tablesNew);
t.check("…each closed: row security on, nothing granted to a browser, no policy; and no policy more anywhere", tablesNew.every((k) => IS.tables[k].closed && !IS.tables[k].grants.some((g) => /^(anon|authenticated):/.test(g))) && same(IS.policies, WAS.policies), tablesNew.map((k) => IS.tables[k].grants));
t.check("…the site's key may read and insert the cave's days, and no more", same(IS.tables.town_cave_days.grants, ["service_role:INSERT", "service_role:SELECT"]), IS.tables.town_cave_days.grants);
const trigNew = IS.triggers.filter((g) => !WAS.triggers.includes(g));
t.check("one trigger more, which keeps a floor as it was laid; every trigger that was there as it was", trigNew.length === 1 && /^town_cave_days_kept /.test(trigNew[0]) && WAS.triggers.every((g) => IS.triggers.includes(g)), trigNew);
t.check("…and no index of a table that was there is made, changed or dropped", same(IS.indexes.filter((d) => !/ON public\.town_cave(_days)? /.test(d)), WAS.indexes), IS.indexes.filter((d) => !WAS.indexes.includes(d)));
const knobsNew = Object.keys(IS.knobs).filter((k) => !(k in WAS.knobs)).sort();
t.check("three knobs more: the far side closed, and the most a gem and a gem's fragment may be asked for; every knob that was there as it was",
  same(knobsNew, ["far_open", "notice_chip", "notice_gem"]) && IS.knobs.far_open === 0 && IS.knobs.notice_gem === 100000 && IS.knobs.notice_chip === 10000 && Object.keys(WAS.knobs).every((k) => IS.knobs[k] === WAS.knobs[k]), knobsNew);
const off = Object.keys(CODE).filter((k) => !same(CODE[k], IS.catalog[k]?.data));
t.check(`the catalog is the code's now, every row of it (${Object.keys(CODE).length}): the thirteen the file writes are what catalogOf() gives`, off.length === 0 && same(Object.keys(IS.catalog).sort(), Object.keys(CODE).sort()), off);
const touched = Object.keys(WAS.catalog).filter((k) => !same(ONCE.catalog[k], WAS.catalog[k])).sort();
t.check("…and no other row of it was written: the nine written over are the only ones that moved, in one go", same(touched, [...K164.over].sort()) && new Set(K164.over.map((k) => ONCE.catalog[k].at)).size === 1, touched);
t.check("the village's trees as a row of its things, none down; the rocks' word, sixty-four letters; and no other thing or word touched",
  same(IS.things.grove, { down: {}, half: [] }) && Object.keys(WAS.things).every((k) => same(IS.things[k], WAS.things[k])) && Object.keys(IS.things).length === Object.keys(WAS.things).length + 1
  && (await one(`select length(word) as n from public.town_secrets where key = 'mine'`)).n === 64 && Object.keys(WAS.secrets).every((k) => IS.secrets[k] === WAS.secrets[k]) && Object.keys(IS.secrets).length === Object.keys(WAS.secrets).length + 1 && IS.secrets.mine === ONCE.secrets.mine);

/* ══ the two functions both lines add to ══ */
t.section("a deed of each line is worded, and counted on its own line; what was there is as it was");
const countedNow = []; for (const d of BEFORE) countedNow.push(await countsOf(d));
t.check("every deed that counted before counts as it did (an insect netted, a stone laid and handed, a lamp lit and handed, fae dust, a thing gathered); and what counted for nothing still does",
  BEFORE.every((d, i) => d.what === "fell" || d.what === "mine" || same(countedNow[i], countedWas[i])), BEFORE.map((d, i) => [d.what, countedNow[i]]));
const FAR = [DEED("fell", "pine", 1, { tree: 3, misses: 0, girth: 1, timber: 2 }), DEED("fell", "pine", 1, { tree: 3, braced: U.m2 }), DEED("fell", "elder", 1), DEED("brace", "pine", 1, { tree: 3, feller: U.m2 }), DEED("root", null, 1, { tree: 3 }),
  DEED("mine", "stone", 1, { floor: 1, rock: 3, hand: "pick" }), DEED("mine", "stone", 1, { got: "shardCopper", shards: 2 }), DEED("vein", "shardCopper", 4, { passed: 4, of: 5 }), DEED("vein", "shardIron", 5, { again: true, chip: "chipTopaz" }),
  DEED("delve", null, 1, { floor: 4, rock: 9 }), DEED("hew", "stone", 1, { whose: U.m2 }), DEED("hew", "stone", 1, { whose: U.m1 }), DEED("crystal", "stone", 1, { got: "shardSilver", chip: "chipDiamond" }), DEED("lift", null, 10), DEED("torch", "torch", 1), DEED("vein_odd", null, 0)];
const farOff = []; for (const d of FAR) { const got = await countsOf(d), want = LP.countsOf(d, U.m1); if (!same(got, JSON.parse(JSON.stringify(want)))) farOff.push({ deed: [d.what, d.thing, d.doc], got, want }); }
t.check(`the far side's deeds count as lib/town/line-points counts them (${FAR.length} of them: a tree felled, one with its trunk braced, a rock, a vein, a way down, a hand lent, the crystal rock; and those that count for nothing)`, farOff.length === 0, farOff);
const felled = await countsOf(FAR[0]), mined = await countsOf(FAR[6]);
t.check("a tree felled counts on the woodcutters' line and on no other; a rock broken on the miners' and on no other",
  felled.length === 1 && felled[0].line === "felling" && felled[0].raw === CODE.work.felling.pine && felled[0].first === "felling:pine" && mined.length === 1 && mined[0].line === "mining" && mined[0].raw === CODE.work.mining.rock && mined[0].first === "mining:shardCopper", [felled, mined]);
const wordsNow = Object.fromEntries((await rows(`select w, town.deed_th(w) as th from unnest($1::text[]) w`, [WORDS])).map((r) => [r.w, r.th]));
t.check(`every word the tally had is the word it was (${WORDS.length})`, same(wordsNow, wordsWas));
const NEW_WORDS = ["fell", "brace", "root", "mine", "crystal", "delve", "hew", "vein", "vein_odd", "lift", "torch"];
const newWords = Object.fromEntries((await rows(`select w, town.deed_th(w) as th from unnest($1::text[]) w`, [NEW_WORDS])).map((r) => [r.w, r.th]));
t.check("…and each deed of the far side has a word of its own: three of the woodcutters', eight of the miners'; what is no deed is said as it is",
  NEW_WORDS.every((w) => newWords[w] && newWords[w] !== w && /[\u0E00-\u0E7F]/.test(newWords[w])) && new Set(Object.values(newWords)).size === NEW_WORDS.length && newWords.fell === "ตัดต้นไม้" && newWords.mine === "ทุบหิน"
  && (await one(`select town.deed_th('no such deed') as x`)).x === "no such deed", newWords);

/* ══ who may ══ */
t.section("who may ask: built closed, opened by the one line of the file's head");
const K = CODE.mining, KT = CODE.trees, TURN = K.turn, SEC = 1000;
const wood = T.woodOf(farTrees(), farCedar()), pines = wood.filter((w) => w.tier === 1 && !w.elder);
const beside_ = (w) => [w.x - 1, w.y];
const ASKS = [["town_far"], ["town_cave_days"], ["town_pouch_out", "thingSack", 0], ["town_pouch_in", 0],
  ["town_trees"], ["town_fell_begin", -1, 5, 5], ["town_fell", { tree: -1, plain: true, secs: 0 }, 5, 5], ["town_fell_brace", U.guest, 5, 5], ["town_fell_root", -1],
  ["town_cave", 0, null, null], ["town_mine", 0, 0, 39, 231, 1, null], ["town_mine_peek", 0, 0], ["town_cave_reach", 10], ["town_lift", 0], ["town_torch", 5, 330], ["town_drill", 5, 330], ["town_vein", {}]];
t.check("every function of the file that a member calls is asked here", same(ASKS.map(([fn]) => `public.${fn}`).sort(), CALLED.map((s) => s.slice(0, s.indexOf("("))).sort()), CALLED);
const ask = async (who) => { const out = {}; for (const [fn, ...args] of ASKS) out[fn] = await call(who, fn, ...args); return out; };
const GATED = ASKS.map(([fn]) => fn).filter((fn) => fn !== "town_far");
const refusedAll = (did) => GATED.every((fn) => no(did[fn]));
const answeredAll = (did) => GATED.every((fn) => !!did[fn] && typeof did[fn] === "object" && !did[fn].error);
const sayOf = (did) => Object.fromEntries(Object.entries(did).map(([fn, r]) => [fn, r?.code ?? r?.error ?? r?.why ?? (r?.ok === true ? "ok" : r)]));
const quiet = async () => ({ grove: (await one(`select doc from public.town_things where key = 'grove'`)).doc, cave: await rows(`select place, doc from public.town_cave order by place`), days: (await one(`select count(*)::int as n from public.town_cave_days`)).n,
  deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n, purses: (await one(`select md5(coalesce(string_agg(member_id::text || coins::text || doc::text, '|' order by member_id), '')) as h from public.town_purses`)).h });
t.check("the far side is built closed, and the game itself is open", IS.knobs.far_open === 0 && IS.knobs.game_open === 1, IS.knobs);
const quietWas = await quiet();
let did = await ask("anon");
t.check("somebody signed out is refused all seventeen, the question of whether it is open among them", no(did.town_far) && refusedAll(did), sayOf(did));
for (const [who, name] of [[U.nochar, "a member with no character"], [U.unver, "a member whose character was never proved"], [U.m1, "a proved member who is no admin, while it is closed"]]) {
  did = await ask(who);
  t.check(`${name}: told no by \`town_far\`, and refused by the sixteen others`, did.town_far === false && refusedAll(did), sayOf(did));
}
t.check("…and nothing came of any of it: no tree, no place of the cave, no floor laid, no deed, no purse touched", same(await quiet(), quietWas));
did = await ask(U.admin);
t.check("an admin is told yes and answered by all sixteen while it is closed (each says what the rules say of an empty hand and a day not laid)", did.town_far === true && answeredAll(did)
  && did.town_cave.why === "unlaid" && did.town_cave_days.why === "unlaid" && same(did.town_trees.trees, { down: [], half: [] }) && did.town_fell.ok === false && did.town_vein.ok === false, sayOf(did));
await t.sql(head.split("\n").find((l) => l.includes(OPENS)).replace(/^--\s*/, ""));
t.check("the one line of the file's head opens it", (await one(`select value from public.town_knobs where key = 'far_open'`)).value == 1);
did = await ask(U.m1);
t.check("opened, a proved member is told yes and answered by all sixteen", did.town_far === true && answeredAll(did), sayOf(did));
for (const [who, name] of [["anon", "somebody signed out"], [U.nochar, "a member with no character"], [U.unver, "a member whose character was never proved"]]) {
  did = await ask(who);
  t.check(`still refused once it is open: ${name}`, refusedAll(did) && (who === "anon" ? no(did.town_far) : did.town_far === false), sayOf(did));
}
await knob("game_open", 0);
did = await ask(U.m1);
const adminStill = await ask(U.admin);
t.check("with the game itself shut a proved member is told no and refused again, though the far side's own knob says open; an admin is answered still", did.town_far === false && refusedAll(did) && adminStill.town_far === true && answeredAll(adminStill), sayOf(did));
await knob("game_open", 1);

/* ══ one member's story across both lines ══ */
t.section("one member's story across both lines: a tree felled, a rock of the foot broken, a rock of the cave broken, a vein played");
// (the test's clock in the place of the database's, after every function was held to what it was: a moment of the
// real today, a little after a turn's edge, since the site's key lays today's floors by the database's own clock)
const REAL = Date.now();
let T0 = Math.floor(REAL / TURN) * TURN + 5000;
if (dayOf(T0) !== dayOf(REAL)) T0 += TURN;
await t.sql(`create table if not exists town.test_clock (ms bigint not null); delete from town.test_clock where true; insert into town.test_clock values (${T0});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
let CLOCK = T0;
const tick = async (ms) => { CLOCK = Math.round(CLOCK + ms); await t.sql(`update town.test_clock set ms = ${CLOCK} where true`); };
const today = dayOf(T0), ME = U.m1;
const WORD = (await one(`select town.mine_word() as w`)).w, NAME = (await one(`select town.mine_name($1) as n`, [ME])).n;
const LAID = new Map();
const laidOn = (floor) => { if (!LAID.has(floor)) LAID.set(floor, caveLayout(floor, today)); return LAID.get(floor); };
const laid = await t.as("service", `insert into public.town_cave_days (day, floor, layout) select $1::integer, e.ord::integer, e.v from jsonb_array_elements($2::jsonb) with ordinality e(v, ord) on conflict do nothing`,
  [today, JSON.stringify(Array.from({ length: K.floors }, (_, i) => laidOn(i + 1)))]);
const meddled = [await t.as("service", `update public.town_cave_days set layout = layout where day = $1 and floor = 1`, [today]), await t.as("service", `delete from public.town_cave_days where day = $1 and floor = 1`, [today]),
  await t.as("service", `insert into public.town_cave_days (day, floor, layout) values ($1, 1, $2::jsonb)`, [today + 5, JSON.stringify(laidOn(1))]), await t.as(ME, `select count(*) from public.town_cave_days`), await t.as("anon", `select count(*) from public.town_cave_days`),
  await t.as(ME, `select count(*) from public.town_cave`), await t.as(ME, `insert into public.town_cave (place) values (7)`)];
t.check("the site's key lays the day's thirty floors from the code's own generator; it changes none, takes none away and lays no day far off; and no browser reads a floor or a place, or writes one",
  !laid.error && laid.affected === K.floors && meddled.every((r) => !!r.error) && (await one(`select count(*)::int as n from public.town_cave_days`)).n === K.floors, [laid.error ?? laid.affected, ...meddled.map((r) => r.code ?? "let by")]);

const purseNow = async (who = ME) => (await one(`select town.purse_of($1::uuid, false) as p`, [who])).p;
const groveKept = async () => (await one(`select doc from public.town_things where key = 'grove'`)).doc;
const lastDeed = async () => Number((await one(`select coalesce(max(id), 0)::int as n from public.town_deeds`)).n);
const deedsAfter = async (id) => rows(`select member_id, what, thing, n::float8 as n, coins::float8 as coins, doc from public.town_deeds where id > $1 order by id`, [id]);
const pointsOf = async (line) => Number((await one(`select coalesce((town.work_told($1::uuid, town.now_ms())->($2::text)->>'points')::float8, 0) as p`, [ME, line])).p);
const lineKept = async (line) => (await one(`select w.kept from public.town_work w where w.member_id = $1 and w.line = $2`, [ME, line]))?.kept ?? null;
const unlike = (pairs) => pairs.filter(([, a, b]) => !same(a, b)).map(([name, a, b]) => `${name}: ${JSON.stringify(a)?.slice(0, 700)} is not ${JSON.stringify(b)?.slice(0, 700)}`);
const bag = (...stacks) => Array.from({ length: 10 }, (_, i) => stacks[i] ?? null);
// (a purse is kept whole the first time a function of the game keeps it; then an axe and a pick in the bag, the axe in the hand, a day's stamina)
await call(ME, "town_hold", null);
await t.sql(`update public.town_purses set coins = 50, doc = doc || $2::jsonb where member_id = $1`, [ME, JSON.stringify({ bag: bag({ item: "axe", n: 1 }, { item: "pick", n: 1 }), hand: "axe", handAt: 0, stamina: { day: today, left: 100 }, powers: {}, felling: {}, mine: {}, pouches: {} })]);
await t.sql(`delete from public.town_work where member_id = $1 and line in ('felling', 'mining')`, [ME]);
const mark = await lastDeed(), began = await purseNow();

/* the mountain's trees: the woodcutters' twin (v164.felling.try.mjs's), with the numbers of chance the database is about to draw read off first */
let seeded = 0;
const chance = async (n, fits = () => true) => {
  for (let tries = 0; tries < 4000; tries++) {
    const s = (((++seeded) * 0.6180339887) % 1) * 2 - 1;
    await t.sql(`select setseed($1::double precision)`, [s]);
    const drawn = (await rows(`select random()::float8 as r from generate_series(1, $1::int)`, [n])).map((r) => Number(r.r));
    if (!fits(drawn)) continue;
    await t.sql(`select setseed($1::double precision)`, [s]);
    return drawn;
  }
  throw new Error("no numbers of chance fit what the scene asks for");
};
const luckOf = (drawn) => Array.from({ length: KT.echo.trees }, (_, i) => ({ dark: drawn[i * 6], scent: drawn[i * 6 + 1], which: drawn[i * 6 + 2], chain: drawn[i * 6 + 3], keep: drawn[i * 6 + 4], kind: drawn[i * 6 + 5] }));
const plainLuck = (drawn) => luckOf(drawn).every((l) => !(l.keep < 1 / KT.keepsake.in));
const pine = pines[0], from = beside_(pine);
{
  const looked = await call(ME, "town_trees"), groveWas = T.tidied(T.groveOf(await groveKept()), CLOCK, wood);
  const drawn = await chance(KT.echo.trees * 6, plainLuck), purse = await purseNow(), before = await lastDeed();
  const want = T.fell(purse, groveWas, ME, { tree: pine.id, plain: true, secs: 0 }, from, CLOCK, luckOf(drawn), wood, "Member One");
  const got = await call(ME, "town_fell", { tree: pine.id, plain: true, secs: 0 }, from[0], from[1]);
  const kept = await groveKept(), mine = await purseNow(), written = await deedsAfter(before);
  const { purse: _p, grove: _g, found, ...rest } = want.ok ? want : {}, { purse: _q, trees: _t, now: _n, keeps, ...answered } = got ?? {};
  const why = unlike([["what the trees are told before", looked?.trees, T.toldOf(groveWas, purse, CLOCK, wood)], ["the answer", { ...answered, found: keeps }, { ...rest, found }], ["the grove kept", kept, want.grove], ["the purse kept", mine, want.purse], ["the purse told", got?.purse, mine],
    ["the trees told", got?.trees, T.toldOf(want.grove, want.purse, CLOCK, wood)], ["the deed", written.map((d) => [d.member_id, d.what, d.thing, d.n, d.doc.tree, d.doc.how]), [[ME, "fell", "pine", 1, pine.id, "plain"]]]]);
  t.check(`a pine felled with the axe in the hand, the plain way: its ${KT.logs} logs in the bag for ${KT.cost} stamina, the tree a stump of mine in the grove; the answer, the purse and the grove as lib/town/trees says`,
    want.ok === true && got?.ok === true && why.length === 0 && same(got.got, [["log", KT.logs]]) && mine.stamina.left === 100 - KT.cost && same(kept.down[pine.id], { at: CLOCK, by: ME }), why.length ? why : got);
}
t.check("…and it counts on the woodcutters' line: a pine's points and the first of its kind; on the miners', nothing", (await pointsOf("felling")) === CODE.work.felling.pine + CODE.work.first && (await pointsOf("mining")) === 0, [await pointsOf("felling"), await pointsOf("mining")]);

/* the pick taken up: `town.hold`, which the base gives a key more (the slot the thing was taken up from) */
await tick(5 * SEC);
{
  const purse = await purseNow(), want = hold(purse, 1), got = await call(ME, "town_hold", 1), mine = await purseNow();
  t.check("the pick is taken up from its slot of the bag, as lib/town/trade's hold says: in the hand, with the slot it came from", want.ok && same(mine, want.purse) && mine.hand === "pick" && mine.handAt === 1 && same(got?.purse, mine), unlike([["the purse kept", mine, want.purse]]));
}

/* the mountain's rocks: the miners' twin (v164.mining.try.mjs's: what the trial's keeper does at a call, with the code's rules, on what the database kept), cut down to a member alone */
const PICK = { item: "pick", n: 1 };
const rocksOn = (floor) => (floor === 0 ? K.rocks : floor >= 1 && floor <= K.floors ? laidOn(floor).rocks : []).map(([id, x, y, look]) => ({ id, x, y, look }));
const crystal = M.crystalOf(WORD, today, (f) => rocksOn(f));
const caves = async () => rows(`select place, doc from public.town_cave order by place`);
const wholeOf = (f, d) => ({ day: d.day, ways: { [String(f)]: d.way }, broken: { [String(f)]: d.broken }, struck: { [String(f)]: d.struck }, crystal: d.crystal, deepest: null, torches: d.torches, moss: d.moss });
async function stateNow() {
  let s = CS.newCave(dayOf(CLOCK));
  for (const { place, doc } of await caves()) {
    const o = CS.caveAt(wholeOf(place, doc), CLOCK);
    s = { ...s, ways: { ...s.ways, ...o.ways }, broken: { ...s.broken, ...o.broken }, struck: { ...s.struck, ...o.struck }, crystal: o.crystal ?? s.crystal, torches: [...s.torches, ...o.torches], moss: [...s.moss, ...o.moss] };
  }
  return s;
}
const placeOf = (s, f) => ({ day: s.day, way: s.ways[String(f)] ?? null, crystal: crystal?.floor === f ? s.crystal : null, broken: s.broken[String(f)] ?? { turn: M.turnOf(CLOCK), ids: [] }, struck: s.struck[String(f)] ?? { turn: M.turnOf(CLOCK), rocks: {} },
  torches: s.torches.filter((x) => x.f === f), moss: s.moss.filter((x) => x.f === f) });
const placeNow = async (f) => (await one(`select town.cave_at((select c.doc from public.town_cave c where c.place = $1), $2::bigint) as d`, [f, CLOCK])).d;
const todayAt = (floor, s) => {
  if (floor <= 0) return { way: null, crystal: null };
  const here = crystal && crystal.floor === floor ? crystal.rock : null;
  return { way: s.ways[String(floor)] ? null : M.wayRockOf(WORD, floor, s.day, rocksOn(floor), here), crystal: s.crystal ? null : here };
};
const stoodOn = (floor, x, y, rocks, stands) => { const r = rocks.find((q) => q.x === x && q.y === y); return r ? !stands(r.id) : floor === 0 ? CS.floorAtTile(x, y) === 0 : CS.floorTile(floor, today, x, y); };
/** A rock of a place that holds what is wanted for a plain pick now, nobody's yet, and a tile beside it to strike from. */
function find(floor, want, s) {
  const here = crystal && crystal.floor === floor ? crystal.rock : null, td = todayAt(floor, s), rocks = rocksOn(floor), stands = (id) => CS.stands(s, floor, id, CLOCK, here);
  for (const r of rocks) {
    if (!stands(r.id) || CS.struckAt(s, floor, r.id, CLOCK) || !want(M.holdsOf(WORD, floor, r.id, M.turnOf(CLOCK), td, PICK))) continue;
    const at = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => [r.x + dx, r.y + dy]).find(([x, y]) => stoodOn(floor, x, y, rocks, stands));
    if (at) return { floor, rock: r, at };
  }
  return null;
}
/** A rock struck whole away by the member alone, of the database and of the code: what does not agree, and the answer. */
async function strike(spot, swings) {
  const s = await stateNow(), purse = await purseNow(), points = await pointsOf("mining"), before = await lastDeed();
  const { floor, rock, at } = spot, rocks = rocksOn(floor), here = crystal && crystal.floor === floor ? crystal.rock : null;
  const go = { now: CLOCK, floor, rock: rock.id, at, swings, rocks, standing: (id) => CS.stands(s, floor, id, CLOCK, here), salt: WORD, day: s.day, today: todayAt(floor, s), element: M.elementOf(WORD, floor, s.day), points, quake: false, who: ME, name: NAME,
    struck: (id) => CS.struckAt(s, floor, id, CLOCK) };
  const want = M.mine(purse, go);
  const got = await call(ME, "town_mine", floor, rock.id, at[0], at[1], swings, null), mine = await purseNow(), written = await deedsAfter(before);
  if (!want.ok || want.done !== true) return { got, want, why: [`the code does not break it: ${JSON.stringify(want).slice(0, 300)}`] };
  let next = CS.breakRocks(s, floor, want.broke, CLOCK);
  for (const id of want.moss) { const r = rocks.find((x) => x.id === id); if (r && floor > 0) next = CS.setMoss(next, floor, r.x, r.y, ME, CLOCK); }
  const { purse: _p, now: _n, cave: told, caveMine: _m, ...answer } = got ?? {};
  const wantDeeds = want.each.map((e) => [ME, "mine", "stone", 1, floor, e.rock, e.shards ? M.oreOf(floor) : null, e.kind === "vein" ? true : null]);
  const why = unlike([["the answer", answer, { ok: true, got: want.got, broke: want.broke, way: want.way !== null, vein: want.vein, crystal: want.crystal, chained: want.chained, cost: want.cost, part: 1, moss: want.moss.length > 0 }],
    ["the purse kept", mine, want.purse], ["the purse told", got?.purse, mine], ["the place's row", await placeNow(floor), placeOf(CS.caveAt(next, CLOCK), floor)], ["what is told of what is gone here", told?.gone?.[String(floor)], CS.goneAt(next, floor, CLOCK)],
    ["the deeds", written.map((d) => [d.member_id, d.what, d.thing, d.n, d.doc.floor, d.doc.rock, d.doc.got ?? null, d.doc.vein ?? null]), wantDeeds]]);
  return { got, want, mine, why };
}
const s0 = await stateNow(), plain = (h) => h.kind === "stone" && !h.moss;
const footRock = find(0, plain, s0), footNeed = M.swingsFor(PICK, 0, false, false, 0);
let x = await strike(footRock, footNeed);
t.check(`a rock of the mountain's foot struck away in ${footNeed} swings of a plain pick: a stone (and the fragments it held) for a point of stamina, the rock gone from the foot's row; the answer, the purse and the row as lib/town/mining and cave-state say`,
  x.why.length === 0 && x.got.ok === true && same(x.got.broke, [footRock.rock.id]) && x.got.got[0][0] === "stone" && x.got.cost === K.stamina && x.mine.stamina.left === 100 - KT.cost - K.stamina
  && same((await caves()).map((c) => c.place), [0]), x.why.length ? x.why : x.got);
await tick(60 * SEC);
let veinAt = null;
{ const s = await stateNow(); for (let f = 1; f <= K.floors && !veinAt; f++) if (M.isDug(f)) veinAt = find(f, (h) => h.kind === "vein" && !h.gem, s); }
const caveNeed = M.swingsFor(PICK, veinAt.floor, false, false, await pointsOf("mining"));
x = await strike(veinAt, caveNeed);
const opened = x.mine?.mine?.vein ?? null;
t.check(`a rock of the cave (floor ${veinAt.floor}) that hides a vein, struck away in ${caveNeed}: it breaks, its floor has a row, and the vein is mine, kept in my purse as the code keeps one; the stamina of the rock and of the vein`,
  x.why.length === 0 && x.got.ok === true && !!opened && same(opened, x.want.vein) && opened.f === veinAt.floor && opened.rock === veinAt.rock.id && opened.gem === null && x.got.cost === K.stamina + K.vein.stamina
  && same((await caves()).map((c) => c.place), [0, veinAt.floor]), x.why.length ? x.why : x.got);
await tick(20 * SEC);
{
  const strikes = V.bestRoute(V.faceOf(opened.seed, false), opened.mods).strikes, purse = await purseNow(), before = await lastDeed(), rowsWas = await caves();
  const want = M.veinEnd(purse, strikes, CLOCK), account = VA.accountOf(opened, strikes);
  const got = await call(ME, "town_vein", account), mine = await purseNow(), written = await deedsAfter(before);
  const { purse: _p, now: _n, cave: _c, caveMine: own, ...answer } = got ?? {};
  const ore = M.oreOf(opened.f);
  const why = unlike([["the answer", answer, want.ok ? { ok: true, got: want.got, passed: want.passed, of: want.of, again: want.again } : want], ["the purse kept", mine, want.purse], ["the purse told", got?.purse, mine],
    ["my own of the cave", own?.vein ?? null, null], ["the cave's rows", await caves(), rowsWas],
    ["the deed", written.map((d) => [d.member_id, d.what, d.thing, d.n, d.doc.floor, d.doc.rock, d.doc.passed, d.doc.of]), [[ME, "vein", want.got?.some((g) => g[0] === ore) ? ore : null, want.passed, opened.f, opened.rock, want.passed, want.of]]]]);
  t.check(`the vein played out by its best go, told by the page as its account (lib/town/vein-account): ${want.passed} of ${want.of} glinting cells passed, the fragments in the bag, the vein closed; the answer and the purse as lib/town/mining's veinEnd says, and no row of the cave touched`,
    want.ok === true && got?.ok === true && why.length === 0 && want.passed > 0 && mine.mine.vein === null && same(written[0]?.doc.said?.ore, account.ore), why.length ? why : got);
}

/* the chest at the mountain's foot: the storage box is v134's, and the far side's chest opens it (the base's `box.more`, and its lines in `town.by_box`) */
await tick(10 * SEC);
{
  const chest = BOXES.MORE_CHESTS[0], tile = [chest.x - 1, chest.y], purse = await purseNow(), slot = purse.bag.findIndex((b) => b?.item === "log");
  const boxWas = (await call(ME, "town_box")).box, want = BOXES.stow(purse, boxWas, slot, KT.logs, tile);
  const got = await call(ME, "town_box_put", slot, KT.logs, tile[0], tile[1]), mine = await purseNow(), boxIs = (await call(ME, "town_box")).box;
  const off = await call(ME, "town_box_put", 0, 1, chest.x + BOXES.BOX.reach + 1, chest.y), plaza = await call(ME, "town_box_take", boxIs.things.findIndex((b) => b?.item === "log"), 1, CODE.box.at[0] + 1, CODE.box.at[1]);
  t.check("the logs are put away at the chest at the mountain's foot, which opens my storage box as the plaza's does: out of the bag and into the box as lib/town/box says; from three tiles off it is too far; and one of them is taken out at the plaza's chest",
    want.ok === true && got?.ok === true && same(mine, want.purse) && same(boxIs, want.box) && boxIs.things.some((b) => b?.item === "log" && b.n === KT.logs) && off?.why === "far" && plaza?.ok === true
    && same(CODE.box.more, [[chest.x, chest.y]]), [got?.why ?? got?.ok, off?.why ?? off?.ok, plaza?.why ?? plaza?.ok]);
}
const told = await deedsAfter(mark), day = dayOf(CLOCK);
let felling = LP.newLine(), mining = LP.newLine();
for (const d of told) for (const c of LP.countsOf({ from: "deed", what: d.what, thing: d.thing, n: d.n, doc: d.doc }, ME)) { if (c.to === null && c.line === "felling") felling = LP.count(felling, c, day); if (c.to === null && c.line === "mining") mining = LP.count(mining, c, day); }
const keptF = await lineKept("felling"), keptM = await lineKept("mining");
t.check("the story is written down as seven deeds, in my name: a tree felled, the pick taken up, a rock mined, a rock mined, a vein, things put away in the box, one taken out",
  same(told.map((d) => [d.member_id, d.what]), [[ME, "fell"], [ME, "hold"], [ME, "mine"], [ME, "mine"], [ME, "vein"], [ME, "box_put"], [ME, "box_take"]]) && told.every((d) => d.coins === 0), told.map((d) => [d.what, d.thing]));
t.check(`…each counted on its own line of work as lib/town/line-points counts it: ${felling.points} on the woodcutters', ${mining.points} on the miners', with the firsts of each`,
  felling.points > 0 && mining.points > 0 && keptF?.points === felling.points && keptM?.points === mining.points && same([...(keptF.firsts ?? [])].sort(), [...felling.firsts].sort()) && same([...(keptM.firsts ?? [])].sort(), [...mining.firsts].sort()), { keptF, felling, keptM, mining });
const ended = await purseNow();
t.check("…and no coin was made by any of it: the purse has what it began with, less the stamina, with wood and stone in the bag", ended.coins === began.coins && ended.coins === 50 && ended.stamina.left < 100
  && ended.bag.some((b) => b?.item === "log") && ended.bag.some((b) => b?.item === "stone") && (await one(`select coins::float8 as c from public.town_purses where member_id = $1`, [ME])).c === 50, ended.bag);

/* ══ once more ══ */
t.section("the file once more, over what a member has done since it was opened");
const keptNow = async () => ({ ...(await quiet()), far: (await one(`select value from public.town_knobs where key = 'far_open'`)).value, work: await rows(`select member_id, line, kept from public.town_work where line in ('felling', 'mining', 'helpers') order by 1, 2`) });
const there = await keptNow(), defsThere = await defsOf(rows);
let third = null;
try { await t.db.exec(FILE); } catch (e) { third = e.message; }
const defsAfter = await defsOf(rows);
t.check("it runs once more", third === null, third);
t.check("…opened, it stays open; the tree that is down, the cave's rows, the day's floors, every deed, every purse and every point are as they were",
  same(await keptNow(), there) && Number(there.far) === 1 && Object.keys(there.grove.down).length === 1 && there.cave.length === 2 && there.days === K.floors, [there.far, Object.keys(there.grove.down), there.cave.length]);
// (but for the test's own clock, which the file knows nothing of)
t.check("…and every function is as the run before left it", Object.keys(defsThere).every((k) => defsAfter[k] === defsThere[k]) && Object.keys(defsAfter).length === Object.keys(defsThere).length, Object.keys(defsThere).filter((k) => defsAfter[k] !== defsThere[k]));

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
