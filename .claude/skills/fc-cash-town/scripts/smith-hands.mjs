// What a script does to a stand-in database by its owner's hand, for the blacksmith's checks and for a dev to play in
// (scripts/town-smith-db.mjs, scripts/town-try.mjs): asking it, setting a purse up, laying the cave's days, and
// forging a tool to a level BY THE MEMBER'S OWN FUNCTIONS (a try at a time, by the database's chance, the draws
// chosen as they are laid out), so that a forged tool a check or a tester begins with is one the rules made.
//
// A stand-in only (scripts/db/town-bench.mjs): `/bench/sql` is the SQL editor there. Nothing here knows the site's keys.
import { fileURLToPath } from "node:url";

/** A stand-in at an address: its doors. */
export function standInAt(BENCH) {
  const post = async (path, body) => (await fetch(`${BENCH}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
  const sql = async (text, params = []) => { const r = await post("/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r).slice(0, 400)} <- ${text.slice(0, 200)}`); return r.rows; };
  const one = async (text, params = []) => (await sql(text, params))[0];
  /** A function a member calls, asked as a tester (by the id the room has of them, or a name of the script's own): its answer and the status it came with. */
  const rpc = async (as, fn, args = {}) => { const r = await fetch(`${BENCH}/rest/v1/rpc/${fn}`, { method: "POST", headers: { "content-type": "application/json", "x-town-as": as }, body: JSON.stringify(args) }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const who = async (as, name = "", admin = false) => (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent(as)}&name=${encodeURIComponent(name)}${admin ? "&admin=1" : ""}`)).json()).id;
  const skip = (ms) => post("/bench/skip", { ms });
  const up = () => fetch(`${BENCH}/bench/who?as=check`).then((r) => r.ok).catch(() => false);
  return { BENCH, post, sql, one, rpc, who, skip, up };
}

/** A file of the game's own rules (lib/town), for what a page works out by them and a script has to as well. */
export async function rules(name) {
  process.env.FC_REPO ??= fileURLToPath(new URL("../../../../", import.meta.url)).replace(/\\/g, "/").replace(/\/$/, "");
  await import("./db/repo-ts-town.mjs");
  return import(`@/lib/town/${name}`);
}

/** A purse set up whole: its coins, its bag (ten slots), a full stamina, and whatever else of the purse is named. */
export const setPurse = (b, id, coins, bag, more = {}) => b.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) || $4::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [id, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), JSON.stringify(more)]);
export const kept = async (b, id) => b.one(`select coalesce(p.coins, 0)::int as coins, p.doc from public.town_purses p where p.member_id = $1`, [id]);
export const count = (bag, item) => (bag ?? []).reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);

/**
 * The cave's thirty floors of a day laid into the stand-in as the site's key lays them (insert only, through the
 * table's own guard), from the page's own generator. `ahead`: how many days after today as well.
 */
export async function layDays(b, ahead = 0) {
  const { caveLayout } = await rules("mining-row");
  const { MINING } = await rules("mining");
  const today = (await b.one(`select town.day_of(town.now_ms()) as d`)).d;
  for (let day = today; day <= today + ahead; day++) {
    for (let f = 1; f <= MINING.floors; f++) {
      const r = await b.post("/bench/sql", { sql: `set role service_role; insert into public.town_cave_days (day, floor, layout) values (${day}, ${f}, $lay$${JSON.stringify(caveLayout(f, day))}$lay$::jsonb) on conflict do nothing; reset role;` });
      if (!r.rows) throw new Error(`floor ${f} of day ${day} was not laid: ${JSON.stringify(r)}`);
    }
  }
  return { day: today, ...(await b.one(`select count(*)::int as floors, town.cave_is_laid($1) as laid from public.town_cave_days where day = $1`, [today])) };
}

/** What a try for a level takes of a kind of tool, by the stand-in's catalog (its `forge` row): the table's line, and a wooden tool's share of it. */
export async function tryTakes(b, kind, to) {
  const f = (await b.one(`select town.cat('forge') as f`)).f, t = f.tries.find((x) => x.to === to);
  if (!t) return null;
  return f.wooden.includes(kind) ? { fee: t.fee, ore: t.ore, n: Math.ceil(t.n / 2), timber: t.timber * 2 } : { fee: t.fee, ore: t.ore, n: t.n, timber: t.timber };
}

/** The village's great fire lit by the stand-in's owner's hand (both halves found a moment ago, in a name that says so), with the row as it stands. */
export const lightByHand = (b) => b.sql(`update public.town_great_fire set doc = doc || jsonb_build_object('due', 0,
  'flint', jsonb_build_object('id', '00000000-0000-4000-8000-000000000001', 'name', 'by hand', 'at', town.now_ms() - 1000),
  'tinder', jsonb_build_object('id', '00000000-0000-4000-8000-000000000001', 'name', 'by hand', 'at', town.now_ms() - 1000)) where one`);
/** The great fire as a village's first: nothing found, nobody in the row, nobody at the top, and its halves to be found at once. */
export const fireAsNew = (b) => b.sql(`update public.town_great_fire set doc = '{}'::jsonb where one`);

/**
 * A tool forged to a level by the member's own functions. The member's bag is made the tool alone for the while (what
 * it had is put back after, the tool in the slot it came from), each try is handed what the catalog says it takes,
 * and each draw is chosen as it is laid out: the first of the two, or one of `want` where one is offered; with `want`,
 * the milestone's option is drawn again (a gem and the fee handed for it) until one of them is, at most `redraws` times.
 * The top needs the great fire: with `fire: true` it is lit by hand before each such try and the member's name put in
 * its row (they then count as one who has taken the top: not for a tester who is to try for it by hand).
 * Says the tool as it is kept, how many tries it took and how each went.
 */
export async function forgeTo(b, as, id, slot, level, { want = [], redraws = 40, fire = false } = {}) {
  const was = await kept(b, id), tool = was.doc.bag[slot];
  if (!tool) throw new Error(`no tool in slot ${slot}`);
  const f = (await b.one(`select town.cat('forge') as f`)).f, top = f.forge?.top ?? 10, GEM = "gemRuby";
  const put = (item, n) => b.sql(`update public.town_purses set doc = jsonb_set(doc, '{bag}', town.put(doc->'bag', $2, $3::integer)) where member_id = $1`, [id, item, n]);
  const stack = async () => (await kept(b, id)).doc.bag[0];
  await b.sql(`update public.town_purses set doc = jsonb_set(doc, '{bag}', $2::jsonb) where member_id = $1`, [id, JSON.stringify([tool, ...Array(9).fill(null)])]);
  const went = [];
  const choose = async (at) => {
    let p = (await b.rpc(as, "town_smith_draw", { p_slot: 0 })).body;
    if (!p?.ok) throw new Error(`the draw of milestone ${at} was not laid out: ${JSON.stringify(p).slice(0, 300)}`);
    let pick = p.pending.offer.find((o) => want.includes(o)) ?? p.pending.offer[0];
    let did = (await b.rpc(as, "town_smith_choose", { p_slot: 0, p_pick: pick })).body;
    if (!did?.ok) throw new Error(`the option was not chosen: ${JSON.stringify(did).slice(0, 300)}`);
    // (one of the wanted is not among those the tool has at this milestone yet: drawn again, the old one kept each time until one is offered)
    const pool = want;
    for (let i = 0; pool.length && !want.includes(pick) && i < redraws; i++) {
      await put(GEM, 1);
      await b.sql(`update public.town_purses set coins = coins + $2 where member_id = $1`, [id, f.smith.redraw.fee]);
      p = (await b.rpc(as, "town_smith_redraw", { p_slot: 0, p_at: at, p_gem: GEM })).body;
      if (!p?.ok) { if (p?.why === "none" || p?.why === "unbuilt") break; throw new Error(`no new draw: ${JSON.stringify(p).slice(0, 300)}`); }
      const better = p.pending.offer.find((o) => want.includes(o));
      did = (await b.rpc(as, "town_smith_choose", { p_slot: 0, p_pick: better ?? p.pending.old })).body;
      if (!did?.ok) throw new Error(`the option drawn again was not chosen: ${JSON.stringify(did).slice(0, 300)}`);
      if (better) pick = better;
    }
    return pick;
  };
  for (let n = 0; n < 400; n++) {
    const s = await stack(), plus = s.plus ?? 0;
    if (plus >= level) break;
    const takes = await tryTakes(b, tool.item, plus + 1);
    await put(takes.ore, takes.n); await put("timber", takes.timber);
    await b.sql(`update public.town_purses set coins = coins + $2 where member_id = $1`, [id, takes.fee]);
    if (plus + 1 === top) {
      if (!fire) throw new Error("the top takes the great fire: ask with fire: true");
      await lightByHand(b);
      await b.rpc(as, "town_fire_join");
    }
    const did = (await b.rpc(as, "town_smith_try", { p_slot: 0 })).body;
    if (!did?.ok) throw new Error(`a try to +${plus + 1} was refused: ${JSON.stringify(did).slice(0, 300)}`);
    went.push(`${did.from}>${did.level} ${did.out}`);
    if (typeof did.owed === "number" && did.owed >= 0) await choose(did.owed);
  }
  const made = await stack();
  // (the bag as it was, with the tool as it is now in its own slot; the coins as they were)
  await b.sql(`update public.town_purses set coins = $2, doc = jsonb_set(doc, '{bag}', $3::jsonb) where member_id = $1`, [id, was.coins, JSON.stringify(was.doc.bag.map((x, i) => (i === slot ? made : x)))]);
  return { tool: made, tries: went.length, went };
}
