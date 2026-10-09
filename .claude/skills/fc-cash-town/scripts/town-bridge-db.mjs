// The bridge built by hand as members will have it, tried in a real browser before anything is pushed: two windows
// of the dev test room kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the database with
// v160's draft in it (scripts/db/town-bench.mjs). Production is not touched.
//
// Built closed: the keeper is told only that the bridge is not open, the pile stands under its cloth, nothing is
// offered, and a stone asked for all the same is refused by the database with nothing written. Opened by the owner's
// one line (as the SQL editor would run it): the page that was there already has the pile uncovered when it asks
// again (it asks by itself every five minutes while the bridge is closed). A real press lifts a stone: the
// database has it in the member's hands, written down with the tile, for one stamina. This one has a pearl in it
// (the database draws that as a stone is lifted, about one in twenty-five: set here, as the draw would have): no
// page is told. Handed on by a real press to the other member: the database has it in theirs with both hands on it
// and the pearl still in it, and their page is told through the room. Laid at the foot: the bridge has one, both are
// counted a stone and a point on the helpers' line, both are of the first span's hands, the pearl is set in the
// bridge with both names, the deeds are written, **the page of the one who only lifted it, far from the foot, is
// told through the room and shows "+1 · 1/100 of this span" and the pearl**, and the sign's panel has the bar, both
// names, my own count, the span's hands and the find. The hundredth stone is a span, feasted on both pages with
// the names of its hands. With no stamina on either side the button is held and fills, there is no board on either
// page, a press let go of early hands nothing on, and the database has the stone handed on when it is held to the
// end. With a second stand-in that has not had v160 (`without`): the keeper knows of no works, and nothing of them
// is shown or fetched.
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
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText.replace(/\\s+/g, " ").trim() ?? null`);
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
/** What the stone somebody holds has in it, as the database has it; and that set to what a check needs (the database's own draw is one in twenty-five). */
const markOf = async (id) => (await sql(`select c.mark from public.town_work_carried c where c.member_id = $1`, [id]))[0]?.mark ?? null;
const mark = (id, kind) => sql(`update public.town_work_carried set mark = $2 where member_id = $1`, [id, kind]);
const lastDeed = async () => Number((await sql(`select coalesce(max(id), 0) as n from public.town_deeds`))[0].n);
const deedsSince = (from) => sql(`select d.member_id as by, d.what, d.thing, d.n::int as n, d.doc from public.town_deeds d where d.id > $1 order by d.id`, [from]);
const middle = (X, sel) => X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
/** A real press of the mouse on what a selector finds; with `ms`, held down that long before it is let go of. */
const press = async (X, sel, wait = 450, ms = 0) => {
  const at = await middle(X, sel);
  if (!at) throw new Error(`nothing to press: ${sel}`);
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: at.x, y: at.y });
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x: at.x, y: at.y, button: "left", clickCount: 1 });
  if (ms) await sleep(ms);
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: at.x, y: at.y, button: "left", clickCount: 1 });
  if (wait) await sleep(wait);
};
/** Wait until one page has somebody else standing still on a tile (a page walks the others it sees there, at their pace: it does not jump them). */
const seenAt = (Seer, id, [x, y], ms = 60000) => until("the other page has them standing there", async () => { const p = await Seer.evaluate(`${V}.at(${JSON.stringify(id)})`); return !!p && !p.moving && Math.abs(p.x - (x + 0.5)) < 0.05 && Math.abs(p.y - (y + 0.5)) < 0.05; }, ms, 200);
/** Whether a game's board is up on a page: the bridge has none, at any stamina. */
const board = (X) => X.evaluate(`(${G}?.kind ?? null) !== null || !!document.querySelector("[data-game], [data-town-game]")`);
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
  const { pile: PILE, foot: FOOT, need: NEED, hold: HOLD } = await A.evaluate(`({ pile: ${B}.pile, foot: ${B}.foot, need: ${B}.need, hold: ${B}.hold })`);
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
    await sql(`delete from public.town_work_built where true`);
    await sql(`delete from public.town_work_finds where true`);
    await sql(`update public.town_works set opened_at = null, done_at = null where id = 'bridge'`);
    await sql(`update public.town_work_needs set have = 0 where work = 'bridge' and thing = 'stone'`);
    await lay(a);
    await reread(A);
    ok("the database's own numbers are the page's: a stone is handed on within ten tiles, and tired hands hold for 1.2 seconds", same((await sql(`select town.cat('bridge')->'reach' as reach, town.cat('bridge')->'hold' as hold`))[0], { reach: await A.evaluate(`${B}.reach`), hold: HOLD }) && HOLD === 1.2);

    // ── built closed
    await warp(A, ...BY_PILE);
    await until("the works' pictures have come", () => A.evaluate(`${B}.drawn()`), 20000);
    const closed = await A.evaluate(`${B}.works()`);
    ok("built closed: the keeper is told by the database only that the bridge is not open", closed?.works.bridge.open === false && same(closed.works.bridge.needs, {}) && closed.carried === null, closed);
    ok("…the pile stands under its cloth: nothing of it to tap, nothing offered", (await A.evaluate(`${B}.boxes().pile`)) === null && (await A.evaluate(`${B}.boxes().sign`)) === null && !(await there(A, "[data-bridge-card]")));
    let from = await lastDeed();
    const refused = await A.evaluate(`${K}.stoneLift([${BY_PILE}])`);
    ok("…and a stone asked for all the same is refused by the database: closed, nothing in the hands, nothing written, no stamina gone", refused?.ok === false && refused.why === "closed" && same(await carried(), {}) && (await deedsSince(from)).length === 0 && (await staminaOf(a)) === 100, refused);
    await A.shot(`${OUT}/bridgedb-closed.png`);

    // ── opened by the owner's one line, as the SQL editor runs it
    await sql(`update public.town_works set opened_at = now() where id = 'bridge'`);
    ok("the owner's one line run, a page that was here already still has the cloth until it asks again", (await A.evaluate(`${B}.works().works.bridge.open`)) === false);
    // (it asks by itself every five minutes while the bridge is not open: TownBridge's CLOSED_AGAIN. Asked for here.)
    await A.evaluate(`${K}.worksLook().then(() => null)`);
    await until("the pile's card comes up", () => there(A, "[data-bridge-card='pile']"), 8000);
    await until("the pile is drawn uncovered", () => A.evaluate(`!!${B}.boxes().pile`), 4000).catch(() => {});
    const opened = await A.evaluate(`${B}.works().works.bridge`);
    ok("…asked again, with nothing loaded again: the bridge is open, six hundred stones to come, the pile uncovered and a button to lift", opened.open === true && same(opened.needs.stone, { need: NEED, have: 0 }) && !!(await A.evaluate(`${B}.boxes().pile`)) && (await there(A, "[data-bridge-lift]")), opened);

    // ── a stone lifted; and a pearl in it, which no page is told
    from = await lastDeed();
    await press(A, "[data-bridge-lift]");
    await until("a stone is in the hands", async () => (await held(A)) === "stone", 8000);
    let deeds = await deedsSince(from);
    ok("a press lifts a stone: the database has it in the member's hands, theirs the only hands on it, for one stamina", same(await carried(), { [a]: [a] }) && (await staminaOf(a)) === 99, await carried());
    ok("…written down with the tile stood on, and with nothing of what is in it", deeds.length === 1 && deeds[0].what === "stone_lift" && deeds[0].by === a && deeds[0].thing === "stone" && same(deeds[0].doc.tile, BY_PILE) && deeds[0].doc.work === "bridge" && !("mark" in deeds[0].doc), deeds);
    await mark(a, "pearl");
    await reread(A);
    ok("a stone with a pearl in it: its holder's page is told that it carries a stone, and nothing of the pearl", same(await A.evaluate(`${B}.works().carried`), { work: "bridge", thing: "stone" }) && !/pearl|ไข่มุก/.test(await A.evaluate(`JSON.stringify(${B}.works()) + document.body.innerText`)), await A.evaluate(`${B}.works().carried`));

    // ── handed on to the other member
    const Y = await A.window("bridgedb-B");
    await enter(Y, "Y");
    const b = await whoIs(Y);
    await lay(b);
    await reread(Y);
    await warp(Y, BY_PILE[0] - 8, BY_PILE[1] + 1);
    await until("the other is offered by name", async () => (await A.evaluate(`${B}.offered()`)).length === 1, 15000);
    const chip = await textOf(A, "[data-bridge-chip]");
    await until("the other page is told who carries a stone", async () => (await Y.evaluate(`${S}.people().find((q) => q.id === ${JSON.stringify((await me(A)).id)})?.carry`)) === "stone", 10000).catch(() => {});
    ok("the other member, standing still with empty hands eight tiles off, is offered by name: a press, with stamina on both sides; and their page is told who carries a stone", /ส่งหินต่อให้/.test(chip ?? "") && (await A.evaluate(`document.querySelector("[data-bridge-chip]")?.dataset.hold`)) === "0"
      && (await Y.evaluate(`${S}.people().find((q) => q.id === ${JSON.stringify((await me(A)).id)})?.carry`)) === "stone", chip);
    from = await lastDeed();
    await press(A, "[data-bridge-chip]");
    await until("the stone is in the other's hands, on their page", async () => (await held(Y)) === "stone", 10000);
    deeds = await deedsSince(from);
    ok("a press, and the database has the stone in the other's hands with both hands on it and the pearl still in it, for nothing; their page told through the room", same(await carried(), { [b]: [a, b] }) && (await markOf(b)) === "pearl" && (await held(A)) === null && (await staminaOf(a)) === 99 && (await staminaOf(b)) === 100
      && deeds.length === 1 && deeds[0].what === "stone_pass" && deeds[0].by === a && deeds[0].doc.to === b, { carried: await carried(), deeds });
    await until("the taker is told", () => there(Y, "[data-bridge-toast]"), 6000).catch(() => {});
    ok("…whoever took it is told so on their map, and nothing of the pearl", /มีคนส่งหินมาให้/.test((await textOf(Y, "[data-bridge-toast]")) ?? "") && !/pearl|ไข่มุก/.test(await Y.evaluate(`JSON.stringify(${B}.works()) + document.body.innerText`)), await textOf(Y, "[data-bridge-toast]"));
    await Y.shot(`${OUT}/bridgedb-taken.png`);

    // ── laid at the foot: the one who only lifted it stands by the pile, and is told what it earned
    const before = [await pointsOf(a), await pointsOf(b)];
    await warp(Y, ...BY_FOOT);
    await until("the button to lay it", () => there(Y, "[data-bridge-lay]"), 8000);
    from = await lastDeed();
    await press(Y, "[data-bridge-lay]");
    await until("the stone is laid", async () => (await Y.evaluate(`${B}.works().works.bridge.needs.stone.have`)) === 1, 8000);
    deeds = await deedsSince(from);
    const kept = (await sql(`select n.have, (select jsonb_object_agg(h.member_id, h.n) from public.town_work_hands h where h.work = 'bridge') as hands,
      (select jsonb_agg(jsonb_build_array(u.span, u.member_id) order by u.member_id::text) from public.town_work_built u where u.work = 'bridge') as built,
      (select jsonb_agg(jsonb_build_object('kind', f.kind, 'span', f.span, 'hands', f.hands)) from public.town_work_finds f where f.work = 'bridge') as finds from public.town_work_needs n where n.work = 'bridge'`))[0];
    ok("a press lays it for one stamina: the database's bridge has one, nobody holds a stone, and both whose hands it went through are counted one", kept.have === 1 && kept.hands?.[a] === 1 && kept.hands?.[b] === 1 && Object.keys(kept.hands).length === 2 && same(await carried(), {}) && (await staminaOf(b)) === 99, kept);
    ok("…both are of the first span's hands, and the pearl is set in the bridge with the hands it came by", same(kept.built, [[1, a], [1, b]].sort((p, q) => (p[1] < q[1] ? -1 : 1))) && same(kept.finds, [{ kind: "pearl", span: 1, hands: [a, b] }]), { built: kept.built, finds: kept.finds });
    ok("…written down: the laying, with how many the bridge has, through how many hands and what was found, and a line for the other it came by", deeds.length === 2 && deeds[0].what === "stone_lay" && deeds[0].by === b && deeds[0].doc.have === 1 && deeds[0].doc.hands === 2 && deeds[0].doc.find === "pearl" && same(deeds[0].doc.tile, BY_FOOT)
      && deeds[1].what === "stone_hand" && deeds[1].by === a && deeds[1].doc.by === b, deeds);
    const after = [await pointsOf(a), await pointsOf(b)];
    ok("…and each has a point more on the helpers' line, and none for the pearl", after.every((p, i) => Math.abs(p - before[i] - 1) < 1e-9), { before, after });
    await until("the lifter's page is told through the room", () => there(A, "[data-bridge-earned]"), 10000).catch(() => {});
    const earned = await textOf(A, "[data-bridge-earned]");
    ok("the page of the one who only lifted it, by the pile, is told through the room and shows what it earned: +1 stone, 1/100 of this span, a helpers' point", /\+1 ก้อน/.test(earned ?? "") && /1\/100 ของช่วงนี้/.test(earned ?? "") && /\+1 แต้มผู้ช่วย/.test(earned ?? "") && (await A.evaluate(`${B}.works().works.bridge.needs.stone.have`)) === 1, earned);
    await until("both are told of the pearl", async () => (await there(A, "[data-bridge-dug='pearl']")) && (await there(Y, "[data-bridge-dug='pearl']")), 6000).catch(() => {});
    ok("…and both whose hands it came by are told what was in it, now that it is laid", /ในหินก้อนนี้มีไข่มุกแม่น้ำ/.test((await textOf(A, "[data-bridge-dug]")) ?? "") && /ในหินก้อนนี้มีไข่มุกแม่น้ำ/.test((await textOf(Y, "[data-bridge-dug]")) ?? ""), [await textOf(A, "[data-bridge-dug]"), await textOf(Y, "[data-bridge-dug]")]);
    await A.shot(`${OUT}/bridgedb-earned.png`);

    // ── the sign's panel, on the page of the one who only lifted
    await warp(A, ...BY_FOOT);
    await A.evaluate(`${B}.panel()`);
    await until("the panel has the stone", async () => (await textOf(A, "[data-bridge-have]"))?.replace(/\s/g, "") === `1/${NEED}`, 8000).catch(() => {});
    const panel = await A.evaluate(`(() => { const p = document.querySelector("[data-bridge-panel]"); if (!p) return null;
      return { have: p.querySelector("[data-bridge-have]")?.innerText.replace(/\\s/g, ""), names: [...p.querySelectorAll("[data-bridge-names] li")].map((e) => [e.dataset.id, e.innerText.trim()]), mine: p.querySelector("[data-bridge-mine]")?.dataset.bridgeMine,
        built: [...p.querySelectorAll("[data-span-hands]")].map((e) => [e.dataset.spanHands, e.dataset.done, e.innerText.replace(/\\s+/g, " ").trim()]), finds: [...p.querySelectorAll("[data-bridge-finds] li")].map((e) => [e.dataset.find, e.innerText.replace(/\\s+/g, " ").trim()]),
        kinds: [...p.querySelectorAll("[data-kind][data-found='true']")].map((e) => e.dataset.kind), shadows: p.querySelectorAll("[data-kind][data-found='false']").length }; })()`);
    const called = Object.fromEntries((await sql(`select p.id, p.character_name as name from public.profiles p where p.id = any($1::uuid[])`, [[a, b]])).map((r) => [r.id, r.name]));
    ok("the sign's panel reads the database as it is opened: one of six hundred, both members by the name the database has of them and nothing more, and my own count", panel?.have === `1/${NEED}` && same(panel.names.map(([id]) => id).sort(), [a, b].sort())
      && panel.names.every(([id, name]) => name.length > 0 && name === called[id]) && panel.mine === "1", { panel, called });
    ok("…the span in hand with both names, and the pearl set in the bridge with both names; of the six kinds the pearl as its picture and five as shadows", panel?.built.length === 1 && panel.built[0][0] === "1" && panel.built[0][1] === "false" && Object.values(called).every((n) => panel.built[0][2].includes(n))
      && panel.finds.length === 1 && panel.finds[0][0] === "pearl" && Object.values(called).every((n) => panel.finds[0][1].includes(n)) && same(panel.kinds, ["pearl"]) && panel.shadows === 5, panel);
    await A.shot(`${OUT}/bridgedb-panel.png`);
    await A.evaluate(`${B}.panel(false)`);

    // ── the hundredth stone is a span, feasted on the other page too
    await sql(`update public.town_work_needs set have = 99 where work = 'bridge' and thing = 'stone'`);
    // (stones set from outside are told to nobody: each page reads the bridge as it is before the last of the hundred is laid)
    await A.evaluate(`${K}.worksLook().then(() => null)`); await Y.evaluate(`${K}.worksLook().then(() => null)`);
    await warp(Y, ...BY_PILE);
    await until("the button to lift", () => there(Y, "[data-bridge-lift]"), 8000);
    await press(Y, "[data-bridge-lift]");
    await until("a stone is in the hands", async () => (await held(Y)) === "stone", 8000);
    await mark(b, null);
    await warp(Y, ...BY_FOOT);
    await until("the button to lay it", () => there(Y, "[data-bridge-lay]"), 8000);
    ok("with ninety-nine laid, the map of neither page has a span", (await Y.evaluate(`${B}.spans()`)) === 0 && (await A.evaluate(`${B}.spans()`)) === 0);
    await press(Y, "[data-bridge-lay]");
    await until("the span is on both pages", async () => (await Y.evaluate(`${B}.spans()`)) === 1 && (await A.evaluate(`${B}.spans()`)) === 1, 12000).catch(() => {});
    await until("both pages feast it", async () => (await there(Y, "[data-bridge-feast='1']")) && (await there(A, "[data-bridge-feast='1']")), 8000).catch(() => {});
    const feasts = [await Y.evaluate(`${B}.feast()`), await A.evaluate(`${B}.feast()`)], feastNames = (await textOf(A, "[data-bridge-feast-names]")) ?? "";
    ok("the hundredth stone is a span: feasted on the page of whoever laid it and, told through the room, on the other's, with the names of that span's hands", (await Y.evaluate(`${B}.spans()`)) === 1 && (await A.evaluate(`${B}.spans()`)) === 1 && feasts.every((f) => f?.span === 1 && same([...f.names].sort(), [a, b].sort()))
      && /ช่วงที่ 1 จาก 6 เสร็จแล้ว/.test((await textOf(A, "[data-bridge-feast]")) ?? "") && Object.values(called).every((n) => feastNames.includes(n))
      && (await sql(`select d.doc->>'span' as span from public.town_deeds d where d.what = 'stone_lay' order by d.id desc limit 1`))[0].span === "1", { feasts, text: await textOf(A, "[data-bridge-feast]") });
    await A.shot(`${OUT}/bridgedb-feast.png`);

    // ── tired hands: the button is held, there is no board, and the database has the stone handed on
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 0)) where member_id = any($1::uuid[])`, [[a, b]]);
    await reread(A); await reread(Y);
    await until("the room is told both are tired", async () => (await Y.evaluate(`${S}.people().find((q) => q.id === ${JSON.stringify((await me(A)).id)})?.spent`)) === true && (await A.evaluate(`${S}.people().find((q) => q.id === ${JSON.stringify((await me(Y)).id)})?.spent`)) === true, 12000).catch(() => {});
    await warp(A, ...BY_PILE);
    await warp(Y, BY_PILE[0] - 3, BY_PILE[1] + 1);
    // (each page walks the other to where they went, before a stone slows them)
    await seenAt(Y, (await me(A)).id, BY_PILE);
    await seenAt(A, (await me(Y)).id, [BY_PILE[0] - 3, BY_PILE[1] + 1]);
    await until("the button to lift", () => there(A, "[data-bridge-lift]"), 8000);
    await press(A, "[data-bridge-lift]");
    await until("tired hands lift a stone", async () => (await held(A)) === "stone", 8000).catch(() => {});
    await mark(a, null);
    ok("with no stamina a stone is lifted all the same, by the database, at none", same(await carried(), { [a]: [a] }) && (await staminaOf(a)) === 0, await carried());
    await until("the tired one is offered the other, to hold", async () => (await A.evaluate(`document.querySelector("[data-bridge-chip]")?.dataset.hold`)) === String(HOLD), 15000).catch(() => {});
    ok("with no stamina on either side the chip is a button to hold, and says so", (await A.evaluate(`document.querySelector("[data-bridge-chip]")?.dataset.hold`)) === String(HOLD) && /กดค้างไว้/.test((await textOf(A, "[data-bridge-chip]")) ?? "") && /หินไม่มีวันหล่น/.test((await textOf(A, "[data-bridge-weary]")) ?? ""), await textOf(A, "[data-bridge-chip]"));
    from = await lastDeed();
    await press(A, "[data-bridge-chip]");
    ok("a press let go of at once hands nothing on: the database has the stone where it was, nothing written, and no board has come up on either page", same(await carried(), { [a]: [a] }) && (await deedsSince(from)).length === 0 && (await held(A)) === "stone" && !(await board(A)) && !(await board(Y))
      && /กดค้างไว้จนแถบเต็ม/.test((await A.evaluate(`${B}.note()`)) ?? ""), { carried: await carried(), note: await A.evaluate(`${B}.note()`) });
    await press(A, "[data-bridge-chip]", 300, HOLD * 1000 + 400);
    await until("the stone has gone over", async () => (await held(Y)) === "stone", 10000).catch(() => {});
    deeds = await deedsSince(from);
    ok("held for 1.2 seconds, the database has the stone in the other's hands, for no stamina, with no board on either page", same(await carried(), { [b]: [a, b] }) && (await held(A)) === null && deeds.length === 1 && deeds[0].what === "stone_pass" && (await staminaOf(a)) === 0 && (await staminaOf(b)) === 0
      && !(await board(A)) && !(await board(Y)), { carried: await carried(), deeds });
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
