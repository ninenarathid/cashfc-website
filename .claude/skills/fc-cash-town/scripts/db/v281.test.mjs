// v281, every line spares its bait and tells its fish, dry-run: the file runs as checked out on Windows (CR at its line
// ends) and again as written (the second run changes nothing); each function is its live text but for the lines meant,
// word for word; a fish of a cast of several lines landed with a rod that spares the bait gives it back (and says so),
// and with one that does not, does not; a cast of three lines with the whispering float tells all three fish, a cast of
// two tells two; the functions keep their grants.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v281.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardAuditDB } from "./reward-audit-db.mjs";
await import("./repo-ts-town.mjs");
const { newPurse } = await import("@/lib/town/trade");
const { dayOf } = await import("@/lib/town/stamina");

const db = await rewardAuditDB(), t = Date.parse("2026-10-18T12:00:00+07:00");
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
const json = JSON.stringify;
const LAND = "town.land_one(uuid,jsonb,jsonb,text,jsonb,bigint)", CAST = "public.town_cast(text,integer,integer,boolean,text,text)";
const def = async (sig) => (await one("select replace(pg_get_functiondef($1::regprocedure), chr(13), '') d", [sig])).d;
try {
  for (const n of [258, 259, 260, 261, 262, 263, 264]) {
    const f = (await import("node:fs")).readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort();
    for (const x of f) await db.exec(readFileSync(`supabase/${x}`, "utf8"));
  }
  const landBefore = await def(LAND), castBefore = await def(CAST);
  const sql = readFileSync("supabase/v281_every_line_spares_its_bait_and_tells_its_fish.sql", "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  const landAfter = await def(LAND), castAfter = await def(CAST);
  await db.exec(sql);
  eq(await def(LAND), landAfter, "a second run leaves town.land_one as the first made it");
  eq(await def(CAST), castAfter, "a second run leaves public.town_cast as the first made it");

  // word for word but for the lines meant: the file's own pairs, taken out of it, make the one from the other
  const pairs = (fn) => {
    const block = sql.slice(sql.indexOf(fn === "land" ? "── 1." : "── 2."), fn === "land" ? sql.indexOf("── 2.") : sql.length);
    const take = (tag) => [...block.matchAll(new RegExp(`\\$${tag}(\\d)\\$([\\s\\S]*?)\\$${tag}\\1\\$`, "g"))].map((m) => m[2]);
    const o = take("o"), n = take("n");
    assert.equal(o.length, n.length); return o.map((x, i) => [x, n[i]]);
  };
  const made = (before, ps) => ps.reduce((d, [o, n]) => { assert.equal(d.split(o).length, 2, `once: ${o.slice(0, 40)}`); return d.replace(o, n); }, before);
  eq(landAfter, made(landBefore, pairs("land")), "town.land_one is v229's but for its three lines");
  eq(castAfter, made(castBefore, pairs("cast")), "public.town_cast is v264's but for its one line");
  eq(pairs("land").length, 3, "three lines of town.land_one"); eq(pairs("cast").length, 1, "one line of public.town_cast");

  // ── a fish of a cast of several lines, landed ──
  const me = (await one("select id from public.profiles where is_admin limit 1")).id;
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [me]);
  await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$select ${t}::bigint$$;`);
  // (the rod's chance to spare the bait, set from here: the gem's own numbers are town.rod_fx's, which this file does not touch)
  await db.exec("alter function town.rod_fx(jsonb) rename to rod_fx_v281test; alter function town.rod_held(jsonb) rename to rod_held_v281test;");
  const spare = async (k) => db.exec(`create or replace function town.rod_fx(p jsonb) returns jsonb language sql as $$ select jsonb_build_object('keeps', ${k}) $$;
    create or replace function town.rod_held(p jsonb) returns jsonb language sql as $$ select '{"item":"rod","n":1}'::jsonb $$;`);
  const p = { ...newPurse(), bag: [{ item: "rod", n: 1 }, { item: "worm", n: 4 }, ...Array(14).fill(null)], hand: "rod", handAt: 0, stamina: { day: dayOf(t), left: 100 } };
  const line = { what: "catfish", size: 30, cast_at: t - 20000, struck_at: t - 15000, bait: "worm", deep: true, spent: false, hour: 12, rain: false, reaction: 0, nibbles: [], wait: 1, x: 169, y: 134, others: [{ what: "barb", size: 5 }, { what: "barb", size: 6 }] };
  // (a bait may be kept in a pouch as well as in the bag: every stack of worms in the purse, wherever it is)
  const worms = (x) => !x || typeof x !== "object" ? 0 : Array.isArray(x) ? x.reduce((a, v) => a + worms(v), 0)
    : (x.item === "worm" && typeof x.n === "number" ? x.n : 0) + Object.values(x).reduce((a, v) => a + worms(v), 0);
  const land = async (k) => {
    await spare(k);
    await db.query("select town.keep_purse($1,$2::jsonb)", [me, json(p)]);
    await db.query("insert into public.town_lines(member_id,doc) values($1,$2::jsonb) on conflict(member_id) do update set doc=excluded.doc", [me, json(line)]);
    const purse = (await one("select town.purse_of($1,true) p", [me])).p;
    const got = (await one(`select town.land_one($1,$2::jsonb,$3::jsonb,'landed','{"which":1}'::jsonb,$4) r`, [me, json(purse), json(line), t])).r;
    return { got, before: worms(purse), after: (await one("select town.purse_of($1,true) p", [me])).p };
  };
  const kept = await land(1);
  eq([kept.got.ok, kept.got.how, kept.got.what, kept.got.more, kept.got.back], [true, "landed", "barb", true, true], "a rod that always spares: landed, and the bait back");
  eq(worms(kept.after), kept.before + 1, "the bait is back in the bag");
  eq(kept.after.bag.filter(Boolean).some((s) => s.item === "barb"), true, "and the fish with it");
  const lost = await land(0);
  eq([lost.got.how, lost.got.back], ["landed", false], "a rod that never spares: landed, no bait back");
  eq(worms(lost.after), lost.before, "the bag's baits as they were");
  eq((await one("select doc from public.town_lines where member_id=$1", [me])).doc.what, "catfish", "the line is out still with the other fish");
  await db.exec("drop function town.rod_fx(jsonb); drop function town.rod_held(jsonb); alter function town.rod_fx_v281test(jsonb) rename to rod_fx; alter function town.rod_held_v281test(jsonb) rename to rod_held;");

  // ── a cast of three lines, and one of two, with the whispering float worn ──
  await db.query("delete from public.town_lines where member_id=$1", [me]);
  const fisher = (rod) => ({ ...p, bag: [{ item: rod, n: 1 }, { item: "lure", n: 20 }, ...Array(14).fill(null)], hand: rod, handAt: 0, gifts: { had: ["thingRod", "charmFloat"], charms: ["charmFloat"], familiar: null } });
  const cast = async (rod) => {
    await db.query("delete from public.town_lines where member_id=$1", [me]);
    await db.query("select town.keep_purse($1,$2::jsonb)", [me, json(fisher(rod))]);
    return (await one("select public.town_cast('lure',12,39,false,'pair','eddy') r")).r;
  };
  const three = await cast("rodTeak");
  eq(three.ok, true, `a cast of three lines: ${json(three).slice(0, 200)}`);
  const out = (await one("select doc from public.town_lines where member_id=$1", [me])).doc;
  eq([three.line.lines, three.line.coming, three.line.coming2, three.line.coming3], [3, out.what, out.others[0].what, out.others[1].what], "three lines: each fish told, in the lines' order");
  const two = await cast("rod");
  eq([two.ok, two.line.lines, typeof two.line.coming2, "coming3" in two.line], [true, 2, "string", false], "two lines: two fish told, no third");

  // grants as they were
  eq((await one("select has_function_privilege('authenticated',$1,'EXECUTE') a", [LAND])).a, false, "town.land_one nobody's to call");
  eq((await one("select has_function_privilege('authenticated',$1,'EXECUTE') a", [CAST])).a, true, "public.town_cast a member's");
  eq((await one("select has_function_privilege('anon',$1,'EXECUTE') a", [CAST])).a, false, "and nobody signed out's");
  console.log(`v281: ${checks} checks passed.`);
} catch (e) {
  console.error(e.stack); if (e.actual !== undefined) console.error(JSON.stringify({ actual: e.actual, expected: e.expected }).slice(0, 2000)); process.exitCode = 1;
} finally { await db.close(); }
