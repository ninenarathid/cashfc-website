import { readFileSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const { fitHook, HOOK_IDS } = await import("@/lib/town/rod-hook");
const { newPurse } = await import("@/lib/town/trade");
const t = await standIn({ upTo: 179 });
const one = async (sql, params = []) => (await t.sql(sql,params)).rows[0];
const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])) : x;
const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const source = readFileSync(process.env.MIGRATION_FILE ?? join(process.env.FC_REPO,'.claude/skills/fc-cash-town/scripts/db/v183_hook_draft.sql'),'utf8');
const catalogs = (await t.sql('select key,data from public.town_catalog order by key')).rows;
const p = { ...newPurse(), coins: 71, bag: [{item:'rod',n:1}, ...HOOK_IDS.map(item=>({item,n:1})), {item:'worm',n:20}, ...Array.from({length:5},()=>({item:'rice',n:20}))] };
await t.sql('insert into public.town_purses(member_id,coins,doc) values($1::uuid,$2,$3::jsonb) on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc',[U.m1,p.coins,JSON.stringify(p)]);
const stored = async who => await one('select coins,doc from public.town_purses where member_id=$1::uuid',[who]);
// Set up the canonical stored document, whose coins and profile counts live outside doc.
await t.sql('select town.keep_purse($1::uuid,town.purse_of($1::uuid,true))',[U.m1]);
const before = await stored(U.m1);
await t.runTwice(source,'v183');
t.check('installation preserves inventories and coins',same(before,await stored(U.m1)));
t.check('installation preserves all catalog entries',same(catalogs,(await t.sql('select key,data from public.town_catalog order by key')).rows));
for (const id of [...HOOK_IDS,null,'worm','toString','__proto__','x'.repeat(400)]) {
  const r = (await one('select town.fit_hook($1::jsonb,$2::text) r',[JSON.stringify(p),id])).r;
  t.check('fitting, removal and invalid items match site rules',same(r,fitHook(p,id)),{id,r});
}
for(const bag of [[],[{item:'rod',n:1}],[{item:'hookScale',n:1}],[{item:'rod',n:1},{item:'hookScale',n:0}]]) {
  const purse = {...p,bag};
  t.check('missing or unowned hook is refused',same((await one('select town.fit_hook($1::jsonb,\'hookScale\') r',[JSON.stringify(purse)])).r,fitHook(purse,'hookScale')));
}
for(const id of [...HOOK_IDS,null,'hookScale','hookScale',null]) {
  const result = await t.as(U.m1,'select public.town_fishing_hook($1::text) r',[id]);
  t.check('verified member can freely fit and remove with a full bag',result.rows?.[0]?.r?.ok===true,result);
  const after=await stored(U.m1), { fishingHook, ...doc } = after.doc;
  t.check('RPC preserves every item, coin and stamina field',after.coins===before.coins && same(doc,before.doc) && fishingHook===id,after);
}
await t.sql('insert into public.town_purses(member_id,coins,doc) values($1::uuid,$2,$3::jsonb) on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc',[U.m2,p.coins,JSON.stringify(p)]);
const other=await stored(U.m2);
await t.as(U.m1,'select public.town_fishing_hook(\'hookScale\')');
t.check('another member inventory is untouched',same(other,await stored(U.m2)));
for(const who of ['anon',U.unver,U.nochar]) {
  const r=await t.as(who,'select public.town_fishing_hook(\'hookScale\')');
  t.check('anonymous and unverified accounts cannot fit hooks',!!r.error || r.rows?.[0]?.r?.ok!==true,r);
}
for(const who of ['anon',U.m1,U.m2]) {
  const r=await t.as(who,'select town.fit_hook($1::jsonb,null)',[JSON.stringify(p)]);
  t.check('private helper denied through browser roles',!!r.error,r);
}
t.check('helper has no browser execute privilege',!(await one("select has_function_privilege('authenticated','town.fit_hook(jsonb,text)','EXECUTE') ok")).ok);
t.check('no function writes to a table without WHERE',(await bareWrites(q=>t.sql(q).then(r=>r.rows))).length===0);
t.done(); await t.db.close();
