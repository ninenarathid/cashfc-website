// Run beside the existing PGlite harness and snap-v175.tar in fcnext-codex-bench:
// FC_REPO=<checkout> node v176.test.mjs
import { pathToFileURL } from 'node:url';
import './repo-ts-town.mjs';
import { standIn } from './stand-in.mjs';
import { U, migration } from './pglite-harness.mjs';

const root = process.env.FC_REPO ?? 'E:/NinenineProject/fcnext';
const { BOX, boxOffer, newBox, roomyBox, upgradeBox } = await import(pathToFileURL(`${root}/lib/town/box.ts`));
const { newPurse, put } = await import(pathToFileURL(`${root}/lib/town/trade.ts`));
const { catalogOf } = await import(pathToFileURL(`${root}/lib/town/catalog.ts`));
const t = await standIn({ upTo: 175 });
const source = migration(176);
const one = async (sql, args = []) => (await t.sql(sql, args)).rows[0];
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort().map(([k, val]) => [k, canonical(val)])) : v;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const before = (await one("select data from public.town_catalog where key='box'")).data;
await t.runTwice(source, 'v176');
t.check('existing chest settings preserved', same(before, (await one("select data from public.town_catalog where key='box'")).data));
t.check('upgrade catalog matches code', same(catalogOf().box_upgrade, (await one("select data from public.town_catalog where key='box_upgrade'")).data));

const bag = n => put(Array(20).fill(null), 'log', n);
let cases = 0, bad = [];
for (const more of [0, 5, 10, 20, 30, 35]) {
  const box = roomyBox({ ...newBox(), more });
  const offer = boxOffer(box);
  for (const wood of [0, 99, 100, 200, 400, 750]) for (const coins of [0, 999, 1000, 3000, 8000, 12000]) {
    const purse = { ...newPurse(), bag: bag(wood), coins };
    const args = [JSON.stringify(purse), JSON.stringify(box), offer?.slots ?? 50, 35, 35];
    const want = upgradeBox(purse, box, args[2], [35, 35]);
    const got = (await one('select town.box_upgrade($1::jsonb,$2::jsonb,$3::int,$4::int,$5::int) r', args)).r;
    cases++;
    if (!same(got, want)) bad.push({ more, wood, coins, got, want });
  }
}
t.check(`${cases} code/SQL rule cases match`, !bad.length, bad[0]);
const seed = async (id, wood = 750, coins = 12000, things = [], more = 0) => {
  await t.sql('insert into public.town_purses(member_id,coins,doc) values($1,$2,town.fresh() || $3::jsonb) on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc', [id, coins, JSON.stringify({ bag: bag(wood) })]);
  await t.sql('delete from public.town_boxes where member_id=$1', [id]);
  if (things.length || more) await t.sql('insert into public.town_boxes(member_id,things,more) values($1,$2::jsonb,$3)', [id, JSON.stringify(things), more]);
};
const state = id => one('select town.purse_of($1::uuid,false) purse,town.box_of($1::uuid) box', [id]);
const rpc = async (id, slots, x = 35, y = 35) => {
  const r = await t.as(id, 'select public.town_box_upgrade($1::integer,$2::integer,$3::integer) r', [slots, x, y]);
  return r.error ? r : r.rows[0].r;
};
await seed(U.m1); await seed(U.m2);
const otherBefore = await state(U.m2);
for (const offer of BOX.upgrades) {
  const before = await state(U.m1);
  const did = await rpc(U.m1, offer.slots);
  const after = await state(U.m1);
  t.check(`RPC buys ${offer.slots} and persists the charge`, did.ok && did.slots === offer.slots && after.box.things.length === offer.slots && after.purse.coins === before.purse.coins - offer.coins, did);
  t.check(`RPC supplies next offer after ${offer.slots}`, same(did.boxOffer, boxOffer(after.box)));
  const repeat = await rpc(U.m1, offer.slots);
  t.check(`duplicate ${offer.slots} request never charges twice`, !repeat.ok && repeat.why === (offer.slots === 40 ? 'max' : 'changed') && same(after, await state(U.m1)), repeat);
}
t.check('other character is untouched', same(otherBefore, await state(U.m2)));
t.check('upgrade deeds record logs and money spent', same((await t.sql("select n::int n,coins::int coins,doc->>'slots' slots from public.town_deeds where member_id=$1 and what='box_upgrade' order by id",[U.m1])).rows, BOX.upgrades.map(u => ({n:u.wood,coins:-u.coins,slots:String(u.slots)}))));
t.check('tally has Thai upgrade label', (await one("select town.deed_th('box_upgrade') label")).label === 'อัปเกรดกล่องเก็บของ');

for (const [wood, coins, slots, x, y, why] of [[99,1000,20,35,35,'wood'],[100,999,20,35,35,'coins'],[100,1000,30,35,35,'changed'],[100,1000,20,0,0,'far'],[100,1000,null,35,35,'changed'],[100,1000,20,null,35,'far']]) {
  await seed(U.m2, wood, coins);
  const before = await state(U.m2), did = await rpc(U.m2, slots, x, y);
  t.check(`refusal ${why} changes no resources`, !did.ok && did.why === why && same(before, await state(U.m2)), did);
  t.check(`refusal ${why} creates no box row`, !(await one('select count(*)::int n from public.town_boxes where member_id=$1',[U.m2])).n);
}
const pot = {item:'potFull',n:1,of:{dish:'tomYum',left:2}}, axe = {item:'axe',n:1,plus:5};
await seed(U.m2, 60, 1000, [pot,{item:'log',n:50},axe,...Array(7).fill(null)]);
const did = await rpc(U.m2,20), saved = await state(U.m2);
t.check('stored logs pay the remainder; food and forging preserved', did.ok && same(saved.box.things.slice(0,3),[pot,{item:'log',n:10},axe]) && saved.purse.bag.every(s => !s), did);
const read = await t.as(U.m2, 'select public.town_box() r');
t.check('reopening reads persistent capacity and price', read.rows[0].r.box.things.length === 20 && read.rows[0].r.boxOffer.slots === 30);
const take = await t.as(U.m2,'select public.town_box_take(0,1,35,35) r');
const stash = await t.as(U.m2,'select public.town_box_put(0,1,35,35) r');
t.check('normal transfers after upgrade preserve capacity', take.rows[0].r.ok && stash.rows[0].r.ok && (await state(U.m2)).box.things.length === 20);
t.check('anonymous cannot upgrade', (await rpc('anon',20)).code === '42501');
t.check('unverified character cannot upgrade', !!(await rpc(U.unver,20)).error);
t.check('account without character cannot upgrade', !!(await rpc(U.nochar,20)).error);
const table = await t.as(U.m2,'update public.town_boxes set more=30');
t.check('members cannot directly resize boxes', table.code === '42501');
const helper = await t.as(U.m2,"select town.box_upgrade('{}','{}',40,35,35)");
t.check('members cannot call private upgrade helper', helper.code === '42501');
await t.sql("update public.town_knobs set value=0 where key='game_open'");
t.check('closed game prevents upgrades', !!(await rpc(U.m2,30)).error);
await t.sql("update public.town_knobs set value=1 where key='game_open'");
const final = await state(U.m2);
await t.db.exec(source);
t.check('reapplying migration preserves upgraded box and purse', same(final, await state(U.m2)));
t.done();
await t.db.close();
