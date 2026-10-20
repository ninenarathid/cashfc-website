// v292, every dish twenty to a slot, dry-run: it refuses to run before v290; the file runs as checked out on Windows
// (CR at its line ends) and again as written (the second run changes nothing); the `items` row is as it was but for
// every dish's stack, which is the code's (lib/town/items' DISH_STACK); no other row is touched; and the database's own
// stowing puts forty fried minnows in two slots where it put them in eight.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v292.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { DISH_STACK } = await import("@/lib/town/items");

const FILE = "supabase/v292_every_dish_twenty_to_a_slot.sql";
// (the files that ran, as they ran: this tree writes the catalog blocks of v263 to v277 again from the code)
const BASE = "5568ab2b";
const ran = (f, at = BASE) => execFileSync("git", ["show", `${at}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
// (v276 to v290 as main had them when this was begun: this tree's v276 and v277 already say twenty)
const MAIN = "f66524c0";
const onMain = execFileSync("git", ["ls-tree", "--name-only", `${MAIN}:supabase`], { encoding: "utf8" }).split("\n").filter(Boolean);
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const db = await rewardDB(252);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const cat = async () => Object.fromEntries((await rows("select key, data, updated_at from public.town_catalog")).map((r) => [r.key, r]));
const stowed = async (id, n) => (await one("select town.stow_away(jsonb_build_object('bag', $1::jsonb), $2, $3) p", [JSON.stringify(Array(10).fill(null)), id, n])).p.bag.filter(Boolean).map((s) => s.n);
const text = readFileSync(FILE, "utf8").replaceAll("\r\n", "\n");
try {
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  for (let n = 276; n <= 289; n++) for (const f of onMain.filter((x) => x.startsWith(`v${n}_`)).sort()) {
    // (v279 needs the site's member_contacts, which is not the town's)
    try { await db.exec(ran(f, MAIN)); } catch { await db.exec("rollback"); }
  }
  // before v290: refused, and nothing changed
  const first = await cat();
  await assert.rejects(db.exec(text), /Run v290 before v292/); checks++;
  await db.exec("rollback");
  eq(await cat(), first, "nothing changed before v290");
  for (const f of onMain.filter((x) => x.startsWith("v290_"))) await db.exec(ran(f, MAIN));

  const was = await cat();
  const dishes = Object.keys(was.items.data).filter((id) => was.items.data[id].kind === "dish");
  console.log(`dishes on the bench: ${dishes.length}, by stack ${JSON.stringify(dishes.reduce((m, id) => ({ ...m, [was.items.data[id].stack]: (m[was.items.data[id].stack] ?? 0) + 1 }), {}))}`);
  assert.ok(dishes.length >= 150, "the bench has every dish"); checks++;
  eq(await stowed("friedMinnow", 40), [5, 5, 5, 5, 5, 5, 5, 5], "before: forty fried minnows in eight slots");

  // as checked out on Windows, then as written
  await db.exec(text.replaceAll("\n", "\r\n"));
  const now = await cat();
  await db.exec(text);
  eq(await cat(), now, "a second run changes nothing, not even the row's time");

  // the items row: as it was but for every dish's stack, which is the code's
  const code = catalogOf().items;
  eq(DISH_STACK, 20, "the code's dishes are twenty to a slot");
  for (const id of Object.keys(was.items.data)) {
    const before = was.items.data[id], after = now.items.data[id];
    if (before.kind === "dish") {
      eq(after, { ...before, stack: 20 }, `${id}: only its stack`);
      if (code[id]) eq(after, code[id], `${id} is the code's`);
    } else eq(after, before, `${id} untouched`);
  }
  eq(Object.keys(now.items.data).sort(), Object.keys(was.items.data).sort(), "no thing added or taken out");
  for (const key of Object.keys(was)) if (key !== "items") eq(now[key], was[key], `${key} untouched`);
  eq(await stowed("friedMinnow", 40), [20, 20], "after: forty fried minnows in two slots");
  eq(await stowed("shabu", 25), [20, 5], "a dish that was ten: twenty and five");
  eq(await stowed("bowl", 4), [3, 1], "a bowl still three to a slot");
  console.log(`v292 dry run: ${checks} checks passed`);
} finally { await db.close(); }
