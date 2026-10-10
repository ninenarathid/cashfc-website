import { readFileSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U } from "./pglite-harness.mjs";
await import("./repo-ts-town.mjs");
const { BASE_CRAFTS, CRAFTS, craft, baseCraftRow } = await import("@/lib/town/crafting");
const { newPurse } = await import("@/lib/town/trade");
const t = await standIn({upTo:179});
const file = process.env.MIGRATION_FILE ?? process.env.V180_SQL ?? join(process.env.FC_REPO,".claude/skills/fc-cash-town/scripts/db/v180_draft.sql");
const source = readFileSync(file,"utf8");
const one = async (sql,params=[]) => (await t.sql(sql,params)).rows[0];
const same = (a,b) => {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a-b)<1e-8;
  if (a===null || b===null || typeof a!=="object" || typeof b!=="object") return a===b;
  const keys=Object.keys(a).sort(); return JSON.stringify(keys)===JSON.stringify(Object.keys(b).sort()) && keys.every((k)=>same(a[k],b[k]));
};
const old=(await t.sql("select key,data from public.town_catalog order by key")).rows;
await t.runTwice(source,"v180");
t.check("workshop seeds its 34 foundation recipes",same((await one("select data from public.town_catalog where key='workshop'")).data,baseCraftRow()));
t.check("installation preserves all existing catalog rows",same(old,(await t.sql("select key,data from public.town_catalog where key<>'workshop' order by key")).rows));
for(const role of ['anon','authenticated']){
  const rights=await one("select has_function_privilege($1,'town.craft(jsonb,text,bigint)','EXECUTE') helper, has_table_privilege($1,'town.craft_receipts','SELECT') receipts",[role]);
  t.check("pure helper remains private in ACL",rights.helper===false,rights);
  t.check("receipts cannot be read from browser in ACL",rights.receipts===false,rights);
}
const NOW=Date.parse("2026-10-10T05:00:00Z");
const ready=(id)=>({...newPurse(),coins:10000,bag:[...CRAFTS[id].map(([item,n])=>({item,n})),...Array(12).fill(null)]});
for(const id of Object.keys(BASE_CRAFTS)){
  const p=ready(id),want=craft(p,id,NOW);
  const got=(await one("select town.craft($1::jsonb,$2::text,$3::bigint) r",[JSON.stringify(p),id,NOW])).r;
  t.check(`${id}: materials, fee, result and discovery match the site`,same(got,want),{got,want});
}
for(const p of [newPurse(),{...ready('jar'),coins:0},{...ready('jar'),bag:[{item:'clay',n:7},{item:'stone',n:3}]}]){
  t.check("refused crafting changes nothing",same((await one("select town.craft($1::jsonb,'jar',$2::bigint) r",[JSON.stringify(p),NOW])).r,craft(p,'jar',NOW)));
}
await t.sql("insert into public.town_purses(member_id,coins,doc) values($1::uuid,10000,$2::jsonb) on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc",[U.m1,JSON.stringify(ready('jar'))]);
const args=['jar','18000000-0000-4000-8000-000000000001'];
const first=await t.as(U.m1,"select public.town_craft($1::text,$2::uuid) r",args);
t.check("verified member can craft",first.rows?.[0]?.r?.ok===true,first);
const before=(await one("select coins,doc from public.town_purses where member_id=$1::uuid",[U.m1]));
const again=await t.as(U.m1,"select public.town_craft($1::text,$2::uuid) r",args);
t.check("lost response retried returns receipt",again.rows?.[0]?.r?.ok===true && again.rows[0].r.repeated===true,again);
t.check("retry spends no materials or coins twice",same(before,(await one("select coins,doc from public.town_purses where member_id=$1::uuid",[U.m1]))));
const changed=await t.as(U.m1,"select public.town_craft('wok',$1::uuid) r",[args[1]]);
t.check("receipt cannot be reused for a different result",changed.rows?.[0]?.r?.ok===false,changed);
for(const who of ['anon',U.unver,U.nochar]){
  const r=await t.as(who,"select public.town_craft($1::text,$2::uuid) r",args);
  t.check("unverified and anonymous cannot craft",!!r.error || !r.rows?.[0]?.r?.ok,r);
}
for(const who of ['anon',U.m1,U.m2]){
  const r=await t.as(who,"select * from town.craft_receipts");
  t.check("receipts cannot be read from browser",!!r.error,r);
  const helper=await t.as(who,"select town.craft('{}'::jsonb,'jar',1)");
  t.check("pure helper remains private",!!helper.error,helper);
}
t.done(); await t.db.close();
