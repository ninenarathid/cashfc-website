// The bridge built by hand as members will have it, tried in a real browser before anything is pushed: two windows
// of the dev test room kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the database with
// v160's draft in it (scripts/db/town-bench.mjs). Production is not touched.
//
// Built closed: the keeper is told only that the bridge is not open, the pile stands under its cloth, nothing is
// offered, and a stone asked for all the same is refused by the database with nothing written. Opened by the owner's
// one line (as the SQL editor would run it): the page that was there already has the pile uncovered when it asks
// again (it asks by itself every five minutes while the bridge is closed). A real press lifts a stone: the
// database has it in the member's hands, written down with the tile, for one stamina. Handed on by a real press to
// the other member: the database has it in theirs with both hands on it, and their page is told through the room.
// Laid at the foot: the bridge has one, both are counted a stone and a point on the helpers' line, the two deeds are
// written, and the sign's panel has the bar, both names and my own count. The hundredth stone is a span on the other
// page too, told through the room. With no stamina on either side the handing game's board hands it on, and the
// database has it so. With a second stand-in that has not had v160 (`without`): the keeper knows of no works, and
// nothing of them is shown or fetched.
//
//   BENCH_EXTRA=<v160's draft, plain line ends> node town-bench.mjs 3191     (in the scratch folder of the dry runs: leave it running)
//   node town-bridge-db.mjs <base> <outdir> [bench]
//   node town-bridge-db.mjs <base> <outdir> <a bench that has not had v160> without
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3191", MODE = ""] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const K = "window.__townKeeper", V = "window.__townView", B = "window.__townBridge", S = "window.__cashTown", G = "window.__townGame";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const post = async (path, body) => (await fetch(`${BENCH}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = []) => { const r = await post("/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(900); };
const held = (X) => X.evaluate(`${B}.held()`);
const me = (X) => X.evaluate(`${S}.me()`);
const whoIs = async (X) => (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await me(X)).id)}`)).json()).id;
const reread = async (X) => { await X.evaluate(`${K}.hold(-1).then(() => null)`); await X.evaluate(`${K}.worksLook().then(() => null)`); await sleep(300); };
/** A member's purse laid anew: an empty bag, nothing in the hand, so much stamina today. */
const lay = (id, left = 100) => sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $2::int)))
  on conflict (member_id) do update set doc = town.fresh() || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $2::int))`, [id, left]);
const staminaOf = async (id) => Number((await sql(`select town.stamina_of(town.purse_kept($1, false), town.now_ms()) as n`, [id]))[0].n);
const pointsOf = async (id) => Number((await sql(`select coalesce((select (w.kept->>'points')::float8 from public.town_work w where w.member_id = $1 and w.line = 'helpers'), 0) as p`, [id]))[0].p);
const carried = async () => Object.fromEntries((await sql(`select c.member_id as id, c.work, c.thing, c.hands from public.town_work_carried c`)).map((r) => [r.id, r.hands]));
const lastDeed = async () => Number((await sql(`select coalesce(max(id), 0) as n from public.town_deeds`))[0].n);
const deedsSince = (mark) => sql(`select d.member_id as by, d.what, d.thing, d.n::int as n, d.doc from public.town_deeds d where d.id > $1 order by d.id`, [mark]);
/** A real press of the mouse on what a selector finds. */
const press = async (X, sel, wait = 450) => {
  const at = await X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (!at) throw new Error(`nothing to press: ${sel}`);
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: at.x, y: at.y });
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x: at.x, y: at.y, button: "left", clickCount: 1 });
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: at.x, y: at.y, button: "left", clickCount: 1 });
  if (wait) await sleep(wait);
};
/** Wait until one page has somebody else standing still on a tile (a page walks the others it sees there, at their pace: it does not jump them). */
const seenAt = (Seer, id, [x, y], ms = 60000) => until("the other page has them standing there", async () => { const p = await Seer.evaluate(`${V}.at(${JSON.stringify(id)})`); return !!p && !p.moving && Math.abs(p.x - (x + 0.5)) < 0.05 && Math.abs(p.y - (y + 0.5)) < 0.05; }, ms, 200);
const board = (X) => X.evaluate(`${G}?.kind === "handing" ? { ...${G}.state(), thing: document.querySelector('[data-look="handing"]')?.dataset.thing ?? null } : null`);
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=bridgedb&townHour=10&townWeather=cloudy&townDb=${encodeURIComponent(BENCH)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
  await until("the bridge's own code has come", () => X.evaluate(`!!${B}`), 60000);
}

const A = await browser("bridgedb", { width: 1280, height: 860 });
try {
  await enter(A, "X");
  const a = await whoIs(A);
  ok("the game is the database's here: no trial in the page", (await A.evaluate(`${K}.trial === null`)) === true);
  const { pile: PILE, foot: FOOT, need: NEED } = await A.evaluate(`({ pile: ${B}.pile, foot: ${B}.foot, need: ${B}.need })`);
  const BY_PILE = [PILE.x - 1, PILE.y + 1], BY_FOOT = [FOOT.x + 1, FOOT.y + 1];

  if (MODE === "without") {
    // ── a database that has not had the file
    ok("the stand-in has no works: the file has not run there", (await sql(`select to_regprocedure('public.town_works_read()') is null as none`))[0].none === true);
    await warp(A, ...BY_PILE);
    await sleep(1500);
    ok("asking a database with no works, the keeper knows of none: nothing is drawn, nothing fetched, nothing offered",
      (await A.evaluate(`${B}.works()`)) === null && (await A.evaluate(`${B}.drawn()`)) === false && (await A.evaluate(`${B}.boxes().pile`)) === null && !(await there(A, "[data-bridge-card]"))
        && (await A.evaluate(`performance.getEntriesByType("resource").some((r) => /\\/town\\/works/.test(r.name))`)) === false, await A.evaluate(`${B}.works()`));
    const none = await A.evaluate(`${K}.stoneLift([${BY_PILE}])`);
    ok("…and a stone asked for all the same could not be reached", none?.ok === false && none.why === "away", none);
    await A.shot(`${OUT}/bridgedb-without.png`);
    ok("no page errors", A.errors().length === 0, A.errors().slice(0, 4));
  } else {
    await sql(`delete from public.town_work_carried where true`);
    await sql(`delete from public.town_work_hands where true`);
    await sql(`update public.town_works set opened_at = null, done_at = null where id = 'bridge'`);
    await sql(`update public.town_work_needs set have = 0 where work = 'bridge' and thing = 'stone'`);
    await lay(a);
    await reread(A);

    // ── built closed
    await warp(A, ...BY_PILE);
    await until("the works' pictures have come", () => A.evaluate(`${B}.drawn()`), 20000);
    const closed = await A.evaluate(`${B}.works()`);
    ok("built closed: the keeper is told by the database only that the bridge is not open", closed?.works.bridge.open === false && same(closed.works.bridge.needs, {}) && closed.carried === null, closed);
    ok("…the pile stands under its cloth: nothing of it to tap, nothing offered", (await A.evaluate(`${B}.boxes().pile`)) === null && (await A.evaluate(`${B}.boxes().sign`)) === null && !(await there(A, "[data-bridge-card]")));
    let mark = await lastDeed();
    const refused = await A.evaluate(`${K}.stoneLift([${BY_PILE}])`);
    ok("…and a stone asked for all the same is refused by the database: closed, nothing in the hands, nothing written, no stamina gone", refused?.ok === false && refused.why === "closed" && same(await carried(), {}) && (await deedsSince(mark)).length === 0 && (await staminaOf(a)) === 100, refused);
    await A.shot(`${OUT}/bridgedb-closed.png`);

    // ── opened by the owner's one line, as the SQL editor runs it
    await sql(`update public.town_works set opened_at = now() where id = 'bridge'`);
    ok("the owner's one line run, a page that was here already still has the cloth until it asks again", (await A.evaluate(`${B}.works().works.bridge.open`)) === false);
    // (it asks by itself every five minutes while the bridge is not open: TownBridge's CLOSED_AGAIN. Asked for here.)
    await A.evaluate(`${K}.worksLook().then(() => null)`);
    await until("the pile's card comes up", () => there(A, "[data-bridge-card='pile']"), 8000);
    const opened = await A.evaluate(`${B}.works().works.bridge`);
    ok("…asked again, with nothing loaded again: the bridge is open, six hundred stones to come, the pile uncovered and a button to lift", opened.open === true && same(opened.needs.stone, { need: NEED, have: 0 }) && !!(await A.evaluate(`${B}.boxes().pile`)) && (await there(A, "[data-bridge-lift]")), opened);

    // ── a stone lifted
    mark = await lastDeed();
    await press(A, "[data-bridge-lift]");
    await until("a stone is in the hands", async () => (await held(A)) === "stone", 8000);
    let deeds = await deedsSince(mark);
    ok("a press lifts a stone: the database has it in the member's hands, theirs the only hands on it, for one stamina", same(await carried(), { [a]: [a] }) && (await staminaOf(a)) === 99, await carried());
    ok("…written down with the tile stood on", deeds.length === 1 && deeds[0].what === "stone_lift" && deeds[0].by === a && deeds[0].thing === "stone" && same(deeds[0].doc.tile, BY_PILE) && deeds[0].doc.work === "bridge", deeds);

    // ── handed on to the other member
    const Y = await A.window("bridgedb-B");
    await enter(Y, "Y");
    const b = await whoIs(Y);
    await lay(b);
    await reread(Y);
    await warp(Y, BY_PILE[0] - 3, BY_PILE[1] + 1);
    await until("the other is offered by name", async () => (await A.evaluate(`${B}.offered()`)).length === 1, 15000);
    const chip = await textOf(A, "[data-bridge-chip]");
    await until("the other page is told who carries a stone", async () => (await Y.evaluate(`${S}.people().find((q) => q.id === ${JSON.stringify((await me(A)).id)})?.carry`)) === "stone", 10000).catch(() => {});
    ok("the other member, standing still with empty hands, is offered by name; and their page is told who carries a stone", /ส่งหินต่อให้/.test(chip ?? "") && (await Y.evaluate(`${S}.people().find((q) => q.id === ${JSON.stringify((await me(A)).id)})?.carry`)) === "stone", chip);
    mark = await lastDeed();
    await press(A, "[data-bridge-chip]");
    await until("the stone is in the other's hands, on their page", async () => (await held(Y)) === "stone", 10000);
    deeds = await deedsSince(mark);
    ok("a press, and the database has the stone in the other's hands with both hands on it, for nothing; their page told through the room", same(await carried(), { [b]: [a, b] }) && (await held(A)) === null && (await staminaOf(a)) === 99 && (await staminaOf(b)) === 100
      && deeds.length === 1 && deeds[0].what === "stone_pass" && deeds[0].by === a && deeds[0].doc.to === b, { carried: await carried(), deeds });
    await until("the taker is told", () => there(Y, "[data-bridge-toast]"), 6000).catch(() => {});
    ok("…and whoever took it is told so on their map", /มีคนส่งหินมาให้/.test((await textOf(Y, "[data-bridge-toast]")) ?? ""), await textOf(Y, "[data-bridge-toast]"));
    await Y.shot(`${OUT}/bridgedb-taken.png`);

    // ── laid at the foot
    const before = [await pointsOf(a), await pointsOf(b)];
    await warp(Y, ...BY_FOOT);
    await until("the button to lay it", () => there(Y, "[data-bridge-lay]"), 8000);
    mark = await lastDeed();
    await press(Y, "[data-bridge-lay]");
    await until("the stone is laid", async () => (await Y.evaluate(`${B}.works().works.bridge.needs.stone.have`)) === 1, 8000);
    deeds = await deedsSince(mark);
    const kept = (await sql(`select n.have, (select jsonb_object_agg(h.member_id, h.n) from public.town_work_hands h where h.work = 'bridge') as hands from public.town_work_needs n where n.work = 'bridge'`))[0];
    ok("a press lays it for one stamina: the database's bridge has one, nobody holds a stone, and both whose hands it went through are counted one", kept.have === 1 && kept.hands?.[a] === 1 && kept.hands?.[b] === 1 && Object.keys(kept.hands).length === 2 && same(await carried(), {}) && (await staminaOf(b)) === 99, kept);
    ok("…written down: the laying, with how many the bridge has and through how many hands, and a line for the other it came by", deeds.length === 2 && deeds[0].what === "stone_lay" && deeds[0].by === b && deeds[0].doc.have === 1 && deeds[0].doc.hands === 2 && same(deeds[0].doc.tile, BY_FOOT)
      && deeds[1].what === "stone_hand" && deeds[1].by === a && deeds[1].doc.by === b, deeds);
    const after = [await pointsOf(a), await pointsOf(b)];
    ok("…and each has a point more on the helpers' line", after.every((p, i) => Math.abs(p - before[i] - 1) < 1e-9), { before, after });

    // ── the sign's panel, on the page of the one who only lifted
    ok("the page of the one who lifted has not asked since: its bar is as it was", (await A.evaluate(`${B}.works().works.bridge.needs.stone.have`)) === 0);
    await warp(A, ...BY_FOOT);
    await A.evaluate(`${B}.panel()`);
    await until("the panel has the stone", async () => (await textOf(A, "[data-bridge-have]"))?.replace(/\s/g, "") === `1/${NEED}`, 8000).catch(() => {});
    const panel = await A.evaluate(`(() => { const p = document.querySelector("[data-bridge-panel]"); if (!p) return null;
      return { have: p.querySelector("[data-bridge-have]")?.innerText.replace(/\\s/g, ""), names: [...p.querySelectorAll("[data-bridge-names] li")].map((e) => [e.dataset.id, e.innerText.trim()]), mine: p.querySelector("[data-bridge-mine]")?.dataset.bridgeMine }; })()`);
    const called = Object.fromEntries((await sql(`select p.id, p.character_name as name from public.profiles p where p.id = any($1::uuid[])`, [[a, b]])).map((r) => [r.id, r.name]));
    ok("the sign's panel reads the database as it is opened: one of six hundred, both members by the name the database has of them and nothing more, and my own count", panel?.have === `1/${NEED}` && same(panel.names.map(([id]) => id).sort(), [a, b].sort())
      && panel.names.every(([id, name]) => name.length > 0 && name === called[id]) && panel.mine === "1", { panel, called });
    await A.shot(`${OUT}/bridgedb-panel.png`);
    await A.evaluate(`${B}.panel(false)`);

    // ── the hundredth stone is a span, on the other page too
    await sql(`update public.town_work_needs set have = 99 where work = 'bridge' and thing = 'stone'`);
    await warp(Y, ...BY_PILE);
    await until("the button to lift", () => there(Y, "[data-bridge-lift]"), 8000);
    await press(Y, "[data-bridge-lift]");
    await until("a stone is in the hands", async () => (await held(Y)) === "stone", 8000);
    await warp(Y, ...BY_FOOT);
    await until("the button to lay it", () => there(Y, "[data-bridge-lay]"), 8000);
    ok("with ninety-nine laid, the map of neither page has a span", (await Y.evaluate(`${B}.spans()`)) === 0 && (await A.evaluate(`${B}.spans()`)) === 0);
    await press(Y, "[data-bridge-lay]");
    await until("the span is on both pages", async () => (await Y.evaluate(`${B}.spans()`)) === 1 && (await A.evaluate(`${B}.spans()`)) === 1, 12000).catch(() => {});
    ok("the hundredth stone is a span: said aloud to whoever laid it, and the other page has it too, told through the room", (await Y.evaluate(`${B}.spans()`)) === 1 && (await A.evaluate(`${B}.spans()`)) === 1 && /ต่อสะพานได้อีกช่วง/.test((await textOf(Y, "[data-bridge-toast]")) ?? "")
      && (await sql(`select d.doc->>'span' as span from public.town_deeds d where d.what = 'stone_lay' order by d.id desc limit 1`))[0].span === "1", await textOf(Y, "[data-bridge-toast]"));

    // ── tired hands: the handing game's board, and the database has the stone handed on
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 0)) where member_id = any($1::uuid[])`, [[a, b]]);
    await reread(A); await reread(Y);
    await until("the room is told both are tired", async () => (await Y.evaluate(`${S}.people().find((q) => q.id === ${JSON.stringify((await me(A)).id)})?.spent`)) === true && (await A.evaluate(`${S}.people().find((q) => q.id === ${JSON.stringify((await me(Y)).id)})?.spent`)) === true, 12000).catch(() => {});
    await warp(A, ...BY_PILE);
    await warp(Y, BY_PILE[0] - 3, BY_PILE[1] + 1);
    // (each page walks the other to where they went, before a stone slows them: whoever is asked holds the asker to where its own page has them)
    await seenAt(Y, (await me(A)).id, BY_PILE);
    await seenAt(A, (await me(Y)).id, [BY_PILE[0] - 3, BY_PILE[1] + 1]);
    await until("the button to lift", () => there(A, "[data-bridge-lift]"), 8000);
    await press(A, "[data-bridge-lift]");
    await until("tired hands lift a stone", async () => (await held(A)) === "stone", 8000).catch(() => {});
    ok("with no stamina a stone is lifted all the same, by the database, at none", same(await carried(), { [a]: [a] }) && (await staminaOf(a)) === 0, await carried());
    await until("the tired one is offered the other", async () => (await A.evaluate(`${B}.offered()`)).length === 1, 15000);
    mark = await lastDeed();
    await press(A, "[data-bridge-chip]");
    await until("a board is up on both pages", async () => (await board(A))?.phase === "wait" && !!(await board(Y)), 8000, 40).catch(() => {});
    ok("with no stamina on either side the press puts the handing game's board up on both pages, of a stone; and nothing is handed on yet", (await board(A))?.thing === "stone" && (await board(Y))?.thing === "stone" && same(await carried(), { [a]: [a] }) && (await deedsSince(mark)).length === 0, { a: await board(A), y: await board(Y), note: await A.evaluate(`${B}.note()`) });
    await press(Y, "[data-handing-ready]", 0);
    await until("whoever throws is told they are ready", async () => (await board(A))?.ready === true, 6000, 30);
    // (the arrow of tired hands is up for less than half a second: steady hands take it, as town-handing.mjs plays them)
    await Y.evaluate(`${G}.auto(true)`);
    await until("the button to toss is lit", () => there(A, '[data-handing-throw="lit"]'), 6000, 6);
    await press(A, "[data-handing-throw]", 0);
    await until("the stone has gone over", async () => (await held(Y)) === "stone", 10000).catch(() => {});
    deeds = await deedsSince(mark);
    ok("Ready, Toss, the side the arrow shows: caught, and the database has the stone in the other's hands, for no stamina", same(await carried(), { [b]: [a, b] }) && (await held(A)) === null && deeds.length === 1 && deeds[0].what === "stone_pass" && (await staminaOf(a)) === 0 && (await staminaOf(b)) === 0, { carried: await carried(), deeds });
    ok("no page errors on either page", A.errors().length === 0 && Y.errors().length === 0, [...A.errors(), ...Y.errors()].slice(0, 4));
  }
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await A.shot(`${OUT}/bridgedb-stopped.png`).catch(() => {});
} finally {
  await A.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
