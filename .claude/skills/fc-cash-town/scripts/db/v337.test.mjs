// A dry run of supabase/v337_the_city.sql (the city behind the town switch) on a stand-in in PGlite: v295's switch, v296's
// and v315's town2 parts as they ran, the catalog as the code makes it for town2 (the live town), a pot-down function
// with the town's box as v152 wrote it, members' pots and relays in town2; the file run twice (as checked out on Windows,
// then as written); the city opened to the admins, to everybody, town2 back, the city again. Nothing of production is
// touched.
//
//   cd <the tree> && FC_REPO=<the tree> PGLITE=<a folder with node_modules/@electric-sql/pglite> node .claude/skills/fc-cash-town/scripts/db/v337.test.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const REPO = (process.env.FC_REPO ?? process.cwd()).split(String.fromCharCode(92)).join("/");
const PG = process.env.PGLITE ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(`${PG}/node_modules/@electric-sql/pglite/dist/index.js`).href);
const OLD_BOX = null;
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; if (!c || process.env.ALL) console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };

const run = (args, env) => execFileSync(process.execPath, args, { cwd: REPO, env: { ...process.env, FC_REPO: REPO, FARM_MAP: "farm2", ...env }, encoding: "utf8", maxBuffer: 1 << 28 });
const catalogOf = (map) => JSON.parse(run(["--input-type=module", "-e", `await import("./.claude/skills/fc-cash-town/scripts/db/repo-ts-town.mjs"); const { catalogOf } = await import("@/lib/town/catalog"); process.stdout.write(JSON.stringify(catalogOf()));`], { TOWN_MAP: map }));
const partsOf = (map) => JSON.parse(run([".claude/skills/fc-cash-town/scripts/db/city-parts.mjs"], { TOWN_MAP: map }));
const T2CAT = catalogOf("town2"), CITYCAT = catalogOf("city"), CITY = partsOf("city"), T2 = partsOf("town2");
const CITYOPEN = new Set(CITY.open), T2OPEN = new Set(T2.open);
const file = (f) => readFileSync(`${REPO}/supabase/${f}`, "utf8");
const V337 = file("v337_the_city.sql");

const db = new PGlite();
const J = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
const q = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const cat = async () => Object.fromEntries((await q("select key, data from public.town_catalog order by key")).map((r) => [r.key, r.data]));
const sw = async () => one("select map, catalog from public.town_map_switch");
const parts = async () => Object.fromEntries((await q("select map, parts, taken from town.map_parts order by map")).map((r) => [r.map, J([r.parts, r.taken])]));

// ── the stand-in: what v295 to v336 left that the file touches ──
const ADMIN = "00000000-0000-0000-0000-00000000000a", MEMBER = "00000000-0000-0000-0000-00000000000b";
await db.exec(`
create role anon; create role authenticated;
create schema town;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.profiles (id uuid primary key, is_admin boolean not null default false);
insert into public.profiles values ('${ADMIN}', true), ('${MEMBER}', false);
create table public.town_catalog (key text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table public.town_pots (id bigserial primary key, member_id uuid, x integer not null, y integer not null, feast boolean not null default false);
create table public.town_purses (member_id uuid primary key, doc jsonb not null);
create table public.town_shops (member_id uuid primary key, x integer, y integer, lines jsonb);
create function town.cat(k text) returns jsonb language sql stable as $$ select data from public.town_catalog where key = k $$;
create function public.town_set_chat_reach(p text) returns jsonb language sql as $$ select '{}'::jsonb $$;
-- (a pot set down in the town or on the farm, as v152 and after check it: in or out)
create function public.town_pot_down(p_x integer, p_y integer) returns text language plpgsql security definer set search_path to 'public' as $function$
declare
  ck jsonb := town.cat('cooking');
  map jsonb := ck->'map';
begin
  if p_x is null or p_y is null or not (
       ${OLD_BOX ?? "(p_x >= 0 and p_y >= 0 and p_x < (map->'town'->>0)::int and p_y < (map->'town'->>1)::int)"}
    or (p_x >= (map->'farm'->>0)::int and p_y >= (map->'farm'->>1)::int
        and p_x < (map->'farm'->>0)::int + (map->'farm'->>2)::int and p_y < (map->'farm'->>1)::int + (map->'farm'->>3)::int)) then
    return 'out';
  end if;
  return 'in';
end $function$;
grant execute on function public.town_pot_down(integer, integer) to authenticated;
`);
for (const [k, v] of Object.entries(T2CAT)) await db.query("insert into public.town_catalog (key, data) values ($1, $2)", [k, v]);
for (const f of ["v295_the_editors_town.sql", "v296_the_editors_town_as_it_stands.sql", "v315_fishing_where_the_rocks_moved.sql"]) {
  try { await db.exec(file(f)); } catch (e) { console.log(`  (${f} did not run whole on the stand-in: ${e.message.slice(0, 160)})`); try { await db.exec("rollback"); } catch { /* none */ } }
}
// the town as live: town2 for everybody, its parts the code's as they are now, the catalog the code's for town2
await db.query("select town.apply_map('town2')");
await db.query("update town.map_parts set parts = $1::jsonb, taken = 'code' where map = 'town2'", [JSON.stringify(Object.fromEntries(Object.entries(T2).filter(([k]) => k !== "boxMore" && k !== "boardSpots" && k !== "open")))]);
await db.exec("delete from public.town_catalog");
for (const [k, v] of Object.entries(T2CAT)) await db.query("insert into public.town_catalog (key, data) values ($1, $2)", [k, v]);
ok("the stand-in: town2 for everybody", J(await sw()) === J({ map: "town2", catalog: "town2" }), await sw());
// members' things in town2: a pot on a tile the city closes (town2's plaza, the city's canal), one on a tile open in both,
// a pot on the feast table, a water relay on a closed tile
const closedInCity = T2.open.map((k) => k.split(",").map(Number)).find(([x, y]) => !CITYOPEN.has(`${x},${y}`));
const openInBoth = T2.open.map((k) => k.split(",").map(Number)).find(([x, y]) => CITYOPEN.has(`${x},${y}`));
await db.query("insert into public.town_pots (member_id, x, y, feast) values ($1, $2, $3, false), ($1, $4, $5, false), ($1, 69, 50, true)", [MEMBER, closedInCity[0], closedInCity[1], openInBoth[0], openInBoth[1]]);
await db.query("insert into public.town_purses (member_id, doc) values ($1, $2)", [MEMBER, { professionRewards: { relay: { at: closedInCity } } }]);
await db.query("insert into public.town_shops (member_id, x, y, lines) values ($1, $2, $3, '[]')", [ADMIN, closedInCity[0], closedInCity[1]]);

const as = async (who, sql) => {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [who ?? ""]);
  await db.exec(`set role ${who ? "authenticated" : "anon"}`);
  try { return (await db.query(sql)).rows[0]?.r; } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};
const mapOf = (who) => as(who, "select public.town_map() r");

// ── the file, twice ──
const was = await cat(), wasParts = await parts();
const e1 = await db.exec(V337.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n")).then(() => null, (e) => e.message);
ok("the file runs (as checked out on Windows)", !e1, e1);
const first = await cat(), firstParts = await parts(), firstSw = await sw();
const e2 = await db.exec(V337).then(() => null, (e) => e.message);
ok("and runs again", !e2, e2);
ok("a second run changes no catalog row", J(await cat()) === J(first));
ok("a second run changes no town's parts", J(await parts()) === J(firstParts));
ok("a second run leaves the switch", J(await sw()) === J(firstSw));
ok("running it changes no catalog row", J(first) === J(was));
ok("the admins see the city, the catalog is town2's", J(firstSw) === J({ map: "city-admins", catalog: "town2" }), firstSw);
ok("an admin is given the city", (await mapOf(ADMIN)) === "city", await mapOf(ADMIN));
ok("a member town2", (await mapOf(MEMBER)) === "town2", await mapOf(MEMBER));
ok("somebody signed out town2", (await mapOf(null)) === "town2", await mapOf(null));
ok("town2's parts gained the town's chests and board spots", JSON.parse(firstParts.town2)[0].boxMore !== undefined && JSON.parse(firstParts.town2)[0].boardSpots?.length === 13, JSON.parse(firstParts.town2)[0].boxMore);
ok("the city's parts are the code's", J(JSON.parse(firstParts.city)[0]) === J(CITY) && JSON.parse(firstParts.city)[1] === "code");
ok("a member may not switch it", J(await as(MEMBER, "select public.town_set_map('city') r")) === J({ ok: false, why: "forbidden" }));
ok("nor somebody signed out", typeof (await as(null, "select public.town_set_map('city') r"))?.error === "string");

// ── opened to everybody ──
const opened = await as(ADMIN, "select public.town_set_map('city') r");
ok("an admin opens the city from the chat", opened?.ok === true && opened.catalog === "city", opened);
const inCity = await cat();
for (const key of Object.keys(CITYCAT)) ok(`the catalog's ${key} is the city's as the code makes it`, J(inCity[key]) === J(CITYCAT[key]), key === "fishing" ? "" : [inCity[key], CITYCAT[key]].map((v) => JSON.stringify(v).slice(0, 300)));
const pots = await q("select x, y, feast from public.town_pots order by id");
ok("a pot on a tile the city closes went to an open tile near it", CITYOPEN.has(`${pots[0].x},${pots[0].y}`) && Math.hypot(pots[0].x - closedInCity[0], pots[0].y - closedInCity[1]) < 12, [closedInCity, pots[0]]);
ok("a pot on an open tile stayed", pots[1].x === openInBoth[0] && pots[1].y === openInBoth[1], pots[1]);
ok("the feast table's pot went to the city's table", pots[2].x === CITY.feastTile[0] && pots[2].y === CITY.feastTile[1], pots[2]);
const relay = (await one("select doc from public.town_purses where member_id = $1", [MEMBER])).doc.professionRewards.relay.at;
ok("a water relay on a closed tile was moved", CITYOPEN.has(`${relay[0]},${relay[1]}`), relay);
const shop = await one("select x, y from public.town_shops");
ok("a stall on a closed tile was moved", CITYOPEN.has(`${shop.x},${shop.y}`), shop);
ok("everybody is given the city", (await mapOf(MEMBER)) === "city" && (await mapOf(null)) === "city");
for (const [x, y, want] of [[-16, 0, "in"], [-10, 134, "in"], [123, 60, "in"], [-17, 10, "out"], [124, 10, "out"], [10, 135, "out"], [130, 20, "in"]]) {
  ok(`a pot set down at ${x},${y}: ${want}`, (await one("select public.town_pot_down($1, $2) r", [x, y])).r === want);
}
const relayAt = async (x, y) => (await one("select town.reward_relay_place($1::jsonb) r", [JSON.stringify([x, y])])).r;
for (const [x, y, want] of [[-16, 134, "town"], [123, 0, "town"], [124, 0, null], [128, 0, "farm"], [-17, 0, null], [150, 120, "forest"]]) ok(`a relay at ${x},${y}: ${want}`, (await relayAt(x, y)) === want);

// (things on a tile of the city's that is none of town2's: the dock's boards, and a farm pot that is no town's)
await db.query("update public.town_pots set x = 98, y = 123 where id = (select min(id) from public.town_pots where not feast)");
await db.query("insert into public.town_pots (member_id, x, y, feast) values ($1, 150, 20, false)", [MEMBER]);
await db.query("update public.town_purses set doc = jsonb_set(doc, '{professionRewards,relay,at}', '[98,123]') where member_id = $1", [MEMBER]);
await db.query("update public.town_shops set x = 98, y = 123");
// (and seven pots crowded together on the city's own ground, east of town2's edge: Codex's case)
for (const [x, y] of [[80 - 16, 100], [80 - 16, 102], [82 - 16, 103], [81 - 16, 105], [82 - 16, 107], [82 - 16, 109], [83 - 16, 111]]) await db.query("insert into public.town_pots (member_id, x, y, feast) values ($1, $2, $3, false)", [ADMIN, x, y]);
// ── town2 again, the way back: to the letter ──
const back = await db.query("select town.apply_map('town2') r").then((r) => r.rows[0].r);
ok("back to town2", back.ok && back.catalog === "town2", back);
const inT2 = await cat();
for (const key of Object.keys(was)) ok(`the catalog's ${key} is town2's again, to the letter`, J(inT2[key]) === J(was[key]), [inT2[key], was[key]].map((v) => JSON.stringify(v).slice(0, 300)));
ok("the city's parts were kept as they were laid", JSON.parse((await parts()).city)[1] === "live");
const back2 = await q("select x, y, feast from public.town_pots order by id");
const crowd = await q("select x, y from public.town_pots where member_id = $1", [ADMIN]);
ok("seven pots crowded on the city's own ground all went to town2's ground", crowd.length === 7 && crowd.every((p) => T2OPEN.has(`${p.x},${p.y}`)) && new Set(crowd.map((p) => `${p.x},${p.y}`)).size === 7, crowd);
ok("a pot on the city's dock went to town2's ground", T2OPEN.has(`${back2[0].x},${back2[0].y}`), back2[0]);
ok("a pot on the farm stayed", back2.some((p) => p.x === 150 && p.y === 20));
const relay2 = (await one("select doc from public.town_purses where member_id = $1", [MEMBER])).doc.professionRewards.relay.at;
ok("a relay on the city's dock went to town2's ground", T2OPEN.has(`${relay2[0]},${relay2[1]}`), relay2);
const shop2 = await one("select x, y from public.town_shops");
ok("a stall on the city's dock went to town2's ground", T2OPEN.has(`${shop2.x},${shop2.y}`), shop2);
// ── and the city again ──
await db.query("select town.apply_map('city')");
const again = await cat();
for (const key of Object.keys(CITYCAT)) ok(`the city again: ${key}`, J(again[key]) === J(CITYCAT[key]));
// ── the old town still: town2-admins then classic ──
await db.query("select town.apply_map('classic')");
ok("the old town may still be laid", (await sw()).catalog === "classic");
await db.query("select town.apply_map('town2')");
const t2b = await cat();
ok("and town2 again from it is town2's to the letter", Object.keys(was).every((k) => J(t2b[k]) === J(was[k])), Object.keys(was).filter((k) => J(t2b[k]) !== J(was[k])));
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
