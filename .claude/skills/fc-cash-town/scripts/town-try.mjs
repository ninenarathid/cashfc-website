// A dev to play in BY HAND, with the SQL of a draft real under the page: it stands a stand-in for the database on a
// port (scripts/db/town-bench.mjs: every file that has run, then the draft), opens the gates, lays the cave's floors
// for today and tomorrow, and seeds two testers, A (an admin) and B (a member), each with a bag that lets them try
// everything of the blacksmith's and a forged tool in each older game without asking for anything. Then it says the
// addresses to open and ends; the stand-in goes on running by itself until it is stopped. Production is not touched,
// and nothing here knows the site's keys.
//
//   node town-try.mjs --bench <the scratch folder of the dry runs> [--draft <file>] [--port 3199] [--page http://localhost:3200]
//   node town-try.mjs --bench <the same> [--port 3199] --stop
//
// - `--bench`: a folder with PGlite in its node_modules (scripts/db/README.md says how one is made); town-bench.mjs and
//   the harness are copied into it from the repo each time, so that it runs the repo's own. Its log and the number of its
//   process are written there (`town-try-<port>.log`, `town-try-<port>.pid`). TOWN_BENCH names it as well.
// - `--draft`: the file that has not run yet (v174's draft by default); `--draft none` for the database as it is live.
// - the page is `next dev --webpack -p <port>` in this worktree (not started here: it wants the site's .env.local).
//
// A tester of the dev test room has a new id in every tab (`test-A-xxxxxx`): the stand-in is told that every tester of a
// letter is one member (`/bench/alias`), so whichever tab or browser opens `?townTest=A` has the seeded purse, and has
// it again after the page is loaded anew. THE STAND-IN KEEPS ITS STATE ONLY WHILE ITS PROCESS LIVES: run this again and
// everything is as seeded.
//
// What each tester is given, and where (the bag has ten slots, so the rest is where the rules have room for it):
// - coins 100,000 and a full stamina;
// - forged ALREADY, each by the tester's own functions (a try at a time by the database's chance, each draw's first
//   option taken: nothing is made up; scripts/smith-hands.mjs): a pick at +9 (one under the top: the great fire's try
//   can be tried), an axe at +6, a rod at +7, a can at +4 (full), a pot at +6. In the bag, with a hoe, two kinds of gem
//   and bait;
// - in the miner's sack and the woodcutter's bundle (the two pouches, which the tester is given as one who has their
//   gifts: the smith takes what is in them as he takes what is in the bag): pieces of iron and silver, fragments of
//   copper and iron, copper pieces; fine timber, 150;
// - in the storage box (the chest in the plaza), which is given thirty slots beyond its ten (`town_boxes.more`, the
//   rules' own number for a bigger box, which nothing in the game gives yet): a pick, an axe, a rod, a can, a net, a
//   pot, a pan and a grill as they were bought; fragments of silver; chips and a cut gem of every element; seeds,
//   bowls, a meal's things, torches.
// The great fire is as a village's first (its halves are found by the next tree felled and the next plain rock broken).
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { fireAsNew, forgeTo, layDays, setPurse, standInAt } from "./smith-hands.mjs";

const arg = (name, or = null) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? or : process.argv[i + 1] ?? or; };
const ROOT = fileURLToPath(new URL("../../../../", import.meta.url)).replace(/\\/g, "/").replace(/\/$/, "");
const BENCH_DIR = (arg("bench") ?? process.env.TOWN_BENCH ?? "").replace(/\\/g, "/"), PORT = Number(arg("port", "3199")), PAGE = arg("page", "http://localhost:3200");
const DRAFT = arg("draft", `${ROOT}/.claude/skills/fc-cash-town/scripts/db/v174_draft.sql`);
if (!BENCH_DIR || !existsSync(join(BENCH_DIR, "node_modules"))) {
  console.log("node town-try.mjs --bench <the scratch folder of the dry runs: PGlite in its node_modules (scripts/db/README.md)> [--draft <file> | none] [--port 3199] [--page http://localhost:3200] [--stop]");
  process.exit(2);
}
const PID = join(BENCH_DIR, `town-try-${PORT}.pid`), LOG = join(BENCH_DIR, `town-try-${PORT}.log`), BENCH = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** The stand-in this script started on that port, ended (its whole tree on Windows). Says whether there was one. */
function stop() {
  if (!existsSync(PID)) return false;
  const pid = Number(readFileSync(PID, "utf8"));
  try { if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" }); else process.kill(pid); } catch { /* gone already */ }
  rmSync(PID, { force: true });
  return true;
}
if (process.argv.includes("--stop")) { console.log(stop() ? `the stand-in on ${PORT} is stopped` : `no stand-in of this script's on ${PORT} (no ${PID})`); process.exit(0); }

const b = standInAt(BENCH);
if (await b.up()) {
  if (!stop()) { console.log(`something answers on ${PORT} already and it is not this script's (no ${PID}): stop it, or take another --port`); process.exit(2); }
  for (let i = 0; i < 40 && (await b.up()); i++) await sleep(250);
}
if (DRAFT !== "none" && !existsSync(DRAFT)) { console.log(`no draft at ${DRAFT} (--draft none: the database as it is live)`); process.exit(2); }

/* ── the stand-in, started and left running ── */
for (const [from, name] of [[`${ROOT}/.claude/skills/fc-cash-town/scripts/db/town-bench.mjs`, "town-bench.mjs"], [`${ROOT}/.claude/skills/fc-cash-town/scripts/db/kudos-stub.mjs`, "kudos-stub.mjs"], [`${ROOT}/.claude/skills/fc-migration/scripts/pglite-harness.mjs`, "pglite-harness.mjs"]]) {
  if (existsSync(from)) copyFileSync(from, join(BENCH_DIR, name));
}
const out = openSync(LOG, "w");
const child = spawn(process.execPath, ["town-bench.mjs", String(PORT)], { cwd: BENCH_DIR, env: { ...process.env, FC_REPO: ROOT, BENCH_EXTRA: DRAFT === "none" ? "" : DRAFT }, detached: true, stdio: ["ignore", out, out], windowsHide: true });
child.unref();
writeFileSync(PID, String(child.pid));
console.log(`the stand-in is starting on ${PORT} (process ${child.pid}; its log: ${LOG})${DRAFT === "none" ? "" : `, with ${DRAFT.split("/").pop()}`}`);
let ready = false;
for (let i = 0; i < 480 && !ready; i++) { await sleep(500); ready = await b.up(); if (child.exitCode !== null) break; }
if (!ready) { console.log(`it did not come up: see ${LOG}`); stop(); process.exit(1); }
const smith = (await b.one(`select to_regprocedure('public.town_smith_open()') is not null as there`)).there;

/* ── the gates, the bridge, the cave's days ── */
await b.sql(`update public.town_knobs set value = 1 where key in ('game_open', 'far_open', 'smith_open')`);
await b.sql(`update public.town_works set opened_at = coalesce(opened_at, now()), done_at = coalesce(done_at, now()) where id = 'bridge'`);
await b.sql(`update public.town_work_needs set have = need where work = 'bridge'`);
const laid = await layDays(b, 1);
console.log(`the gates are open (${(await b.sql(`select key, value from public.town_knobs where key in ('game_open', 'far_open', 'smith_open') order by key`)).map((k) => `${k.key} ${k.value}`).join(", ")}), the bridge is whole, and the cave is laid for today and tomorrow (day ${laid.day}: ${laid.floors} floors)`);

/* ── the two testers ── */
const ITEMS = new Set(Object.keys((await b.one(`select town.cat('items') as i`)).i));
const things = (list) => list.filter((s) => { if (ITEMS.has(s.item)) return true; console.log(`   (no such thing in this database's catalog, left out: ${s.item})`); return false; });
const FORGED = [["pick", 9], ["axe", 6], ["rod", 7], ["can", 4], ["pot", 6]];
const seeded = {};
for (const [letter, admin] of [["A", true], ["B", false]]) {
  const as = `try-${letter}`, id = await b.who(as, `ทดสอบ ${letter}`, admin);
  await b.post("/bench/alias", { like: `^test-${letter}-`, as });
  const made = {};
  if (smith) for (const [item, level] of FORGED) {
    await setPurse(b, id, 0, [{ item, n: 1 }]);
    const did = await forgeTo(b, as, id, 0, level);
    made[item] = did.tool;
    console.log(`   ${letter}: a ${item} forged to +${did.tool.plus} in ${did.tries} tries (${did.went.filter((w) => !w.endsWith("taken")).length} of them not taken), its options ${JSON.stringify(did.tool.opts ?? [])}`);
  }
  const tool = (item) => made[item] ?? { item, n: 1 };
  const f = smith ? (await b.one(`select town.cat('forge') as f`)).f : null, gems = f ? Object.entries(f.smelts.of).filter(([gem]) => gem.startsWith("gem")).map(([gem, s]) => ({ gem, chip: s.of })) : [];
  const full = (await b.one(`select coalesce(to_regprocedure('town.can_holds(jsonb)')::text, '') as fn`)).fn ? Number((await b.one(`select town.can_holds($1::jsonb) as n`, [JSON.stringify(tool("can"))])).n) : 10;
  const bag = things([tool("pick"), tool("axe"), tool("rod"), { ...tool("can"), water: full }, tool("pot"), { item: "hoe", n: 1 }, ...gems.slice(0, 2).map((g) => ({ item: g.gem, n: 5 })), { item: "worm", n: 30 }]);
  const sack = things([{ item: "oreSilver", n: 99 }, { item: "oreIron", n: 99 }, { item: "shardCopper", n: 99 }, { item: "shardIron", n: 99 }, { item: "oreCopper", n: 30 }]);
  const bundle = things([{ item: "timber", n: 50 }, { item: "timber", n: 50 }, { item: "timber", n: 50 }]);
  const box = things([
    ...["pick", "axe", "rod", "can", "bugNet", "pot", "pan", "grill"].map((item) => ({ item, n: 1 })),
    { item: "shardSilver", n: 99 }, ...gems.map((g) => ({ item: g.chip, n: 40 })), ...gems.slice(2).map((g) => ({ item: g.gem, n: 5 })),
    { item: "seedKangkong", n: 20 }, { item: "bowl", n: 5 }, { item: "minnow", n: 9 }, { item: "salt", n: 5 }, { item: "friedMinnow", n: 3 }, { item: "torch", n: 5 }, { item: "worm", n: 30 },
  ]);
  const more = Math.max(0, box.length + 4 - 10);
  await setPurse(b, id, 100000, bag, smith ? { gifts: { had: ["thingSack", "thingBundle"] }, pouches: { thingSack: sack, thingBundle: bundle } } : {});
  await b.sql(`insert into public.town_boxes (member_id, things, more) values ($1, $2::jsonb, $3) on conflict (member_id) do update set things = excluded.things, more = excluded.more`, [id, JSON.stringify([...box, ...Array(10 + more - box.length).fill(null)]), more]);
  if (smith) await b.sql(`delete from public.town_smiths where member_id = $1`, [id]);
  // (read back as the member reads it: what a page will be told)
  const me = (await b.rpc(as, "town_me")).body, theirs = (await b.rpc(as, "town_box")).body;
  seeded[letter] = { id, as, coins: me?.purse?.coins, bag: (me?.purse?.bag ?? []).filter(Boolean).length, sack: (me?.purse?.pouches?.thingSack ?? []).filter(Boolean).length, bundle: (me?.purse?.pouches?.thingBundle ?? []).filter(Boolean).length,
    box: `${(theirs?.box?.things ?? []).filter(Boolean).length} of ${(theirs?.box?.things ?? []).length}`, stamina: me?.purse?.stamina?.left };
}
if (smith) await fireAsNew(b);
// (the smith's first screen for an admin and for a member, asked as a page asks)
const open = { A: (await b.rpc("test-A-check", smith ? "town_smith_open" : "town_is_open")).body, B: (await b.rpc("test-B-check", smith ? "town_smith_open" : "town_is_open")).body };

const url = (letter) => `${PAGE}/town?townTest=${letter}&townDb=${BENCH}&townAt=smith`;
console.log(`
seeded (each read back as the member reads it): ${JSON.stringify(seeded, null, 1)}
${smith ? "the smith is open to" : "the game is open to"}: A ${open.A}, B ${open.B}

OPEN (the page: \`npx next dev --webpack -p ${PAGE.split(":").pop()}\` in ${ROOT}, with the site's .env.local in it):
  A, an admin:  ${url("A")}
  B, a member:  ${url("B")}
  (two windows for two testers; \`&townAt=smith\` puts the tester by the forge; any tab that opens ?townTest=A is the same member A)

THE CLOCK put on (a piece smelts 5 to 11 minutes; a turn at the great fire is 24 hours; the cave is laid for today and tomorrow, no further):
  curl -X POST ${BENCH}/bench/skip -H "content-type: application/json" -d "{\\"ms\\": 600000}"
  PowerShell:  Invoke-RestMethod -Method Post -Uri ${BENCH}/bench/skip -ContentType application/json -Body '{"ms":600000}'
  (then do anything on the page: it reads the clock with every answer)

MORE of a thing, as the SQL editor would hand it (A is ${seeded.A.id}, B is ${seeded.B.id}; then load the page again, or do anything on it):
  curl -X POST ${BENCH}/bench/sql -H "content-type: application/json" -d "{\\"sql\\": \\"update public.town_purses set coins = coins + 50000, doc = jsonb_set(doc, '{bag}', town.put(doc->'bag', 'oreSilver', 50)) where member_id = '${seeded.A.id}'\\"}"
  the great fire lit at once, with nobody in its row:
  curl -X POST ${BENCH}/bench/sql -H "content-type: application/json" -d "{\\"sql\\": \\"update public.town_great_fire set doc = jsonb_build_object('due', 0, 'row', '[]'::jsonb, 'topped', '[]'::jsonb, 'flint', jsonb_build_object('id', '${seeded.B.id}', 'name', 'B', 'at', town.now_ms()), 'tinder', jsonb_build_object('id', '${seeded.B.id}', 'name', 'B', 'at', town.now_ms())) where one\\"}"

STOP it:   node ${fileURLToPath(import.meta.url).replace(/\\/g, "/")} --bench ${BENCH_DIR} --port ${PORT} --stop
AGAIN (everything as seeded: the stand-in keeps its state only while its process lives):
           node ${fileURLToPath(import.meta.url).replace(/\\/g, "/")} --bench ${BENCH_DIR} --port ${PORT}`);
process.exit(0);
