// Build v175 from the exact definitions after v174. No earlier function is pasted.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { againOf, defsOf } from "./build-v164.mjs";

const root = process.env.FC_REPO;
if (!root) throw new Error("FC_REPO is required");
const here = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
const t = await standIn();
await t.db.exec(readFileSync(join(root, "supabase/v174_the_blacksmith_his_great_fire_and_the_older_tools.sql"), "utf8"));
const run = (q) => t.sql(q).then((r) => r.rows);
const defs = await defsOf(run), AGAIN = [];
const mark = (sig, lines) => AGAIN.push([sig.slice(0, sig.indexOf("(")), sig, lines]);
const body = (sig, replacement) => {
  const old = defs[sig]?.match(/AS \$function\$([\s\S]*?)\$function\$/)?.[1];
  if (!old) throw new Error(`no body: ${sig}`);
  mark(sig, [[old, `\n-- v175: daily rights, retained only in the member's purse.\n${replacement}\n`]]);
};
body("town.fire_new()", ` SELECT '{"due":0,"flint":null,"tinder":null,"row":[],"topped":[],"used":{}}'::jsonb `);
body("town.fire_sound(jsonb)", `
declare
  k jsonb := case when jsonb_typeof(p_kept) = 'object' then p_kept else '{}'::jsonb end;
  tops_ jsonb := '[]'::jsonb;
  used_ jsonb := '{}'::jsonb;
  id_ text;
begin
  for id_ in select e.v #>> '{}' from jsonb_array_elements(case when jsonb_typeof(k->'topped') = 'array' then k->'topped' else '[]'::jsonb end) with ordinality e(v, ord)
    where jsonb_typeof(e.v) = 'string' and e.v #>> '{}' <> '' order by e.ord loop
    if not tops_ ? id_ then tops_ := tops_ || jsonb_build_array(id_); end if;
  end loop;
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into used_
    from jsonb_each(case when jsonb_typeof(k->'used') = 'object' then k->'used' else '{}'::jsonb end) e
    where length(e.key) between 1 and 100 and case when jsonb_typeof(e.value) = 'number' then
      (e.value #>> '{}')::numeric = trunc((e.value #>> '{}')::numeric) and abs((e.value #>> '{}')::numeric) <= 9007199254740991 else false end;
  return town.fire_new() || jsonb_build_object('topped', tops_, 'used', used_);
end;`);
body("town.fire_lit_at(jsonb)", ` SELECT 0::numeric `);
body("town.fire_open_to(jsonb, bigint)", ` SELECT jsonb_array_length(p_fire->'row') `);
body("town.fire_half_found(jsonb, text, text, text, bigint)", `begin return jsonb_build_object('fire', p_fire, 'found', false, 'lit', false); end;`);
body("town.fire_join(jsonb, text, text, boolean, bigint)", `begin
  if not coalesce(p_ready, false) then return town.no('level'); end if;
  if town.fire_why(p_fire, p_id, p_now) is not null then return town.no('daily'); end if;
  return jsonb_build_object('ok', true, 'fire', p_fire);
end;`);
body("town.fire_leave(jsonb, text)", ` SELECT town.no('none') `);
body("town.fire_why(jsonb, text, bigint)", `begin
  return case when jsonb_typeof(p_fire->'used'->p_id) = 'number' and (p_fire->'used'->>p_id)::numeric = town.day_of(p_now) then 'daily' end;
end;`);
body("town.fire_spent(jsonb, text, text, text, bigint, double precision)", `begin
  return p_fire || jsonb_build_object('used', coalesce(p_fire->'used', '{}'::jsonb) || jsonb_build_object(p_id, town.day_of(p_now)),
    'topped', case when p_out = 'taken' and not (p_fire->'topped' ? p_id) then p_fire->'topped' || jsonb_build_array(p_id) else p_fire->'topped' end);
end;`);
body("town.fire_told(jsonb, text, bigint)", ` SELECT jsonb_build_object('flint', null, 'tinder', null, 'lit', true, 'row', '[]'::jsonb,
  'open', case when town.fire_why(p_fire, p_me, p_now) = 'daily' then 0 else 1 end,
  'mine', case when town.fire_why(p_fire, p_me, p_now) = 'daily' then -1 else 0 end, 'topped', false,
  'daily', jsonb_build_object('day', town.day_of(p_now), 'used', coalesce(town.fire_why(p_fire, p_me, p_now) = 'daily', false),
    'resetAt', (town.day_of(p_now)::bigint + 1) * 86400000 - 7200000)) `);
body("town.fire_kept(boolean)", `begin
  return town.fire_from_purse(town.purse_of(auth.uid(), false), auth.uid()::text);
end;`);
body("town.fire_wants(text, uuid, bigint, uuid)", `begin return false; end;`);
mark("town.forge_try_fired(jsonb, jsonb, integer, double precision, text, text, bigint, double precision)", [
  ["    why_ := town.fire_why(p_fire, p_id, p_now);", "    -- v175: the locked purse owns the daily right, not the shared fire or a client.\n    why_ := town.fire_why(town.fire_from_purse(p_purse, p_id), p_id, p_now);"],
  ["  if not (did->>'ok')::boolean then return did; end if;", "  if not (did->>'ok')::boolean then return did; end if;\n  -- v175: refusals spend nothing; every accepted top attempt spends the same member's right.\n  if needs then did := did || jsonb_build_object('purse', did->'purse' || jsonb_build_object('forgeDay', town.day_of(p_now))); end if;"]
]);
mark("public.town_smith_try(integer)", [
  ["  fire_ jsonb := town.fire_kept(true);", "  -- v175: no shared fire lock or global consumption.\n  fire_ jsonb := town.fire_new();"],
  ["  if (did->>'spent')::boolean then perform town.keep_fire(did->'fire'); end if;", "  -- v175: forgeDay was saved atomically by keep_purse above."]
]);
mark("public.town_fire_join()", [
  ["  perform town.keep_fire(did->'fire');", "  -- v175: compatibility call only; there is no queue to write."],
  ["  perform town.note(me, 'fire_join', null, 1, 0, jsonb_build_object('place', jsonb_array_length(did->'fire'->'row')));", "  -- v175: no queue deed."]
]);
const helper = `create or replace function town.fire_from_purse(p_purse jsonb, p_id text)
returns jsonb language sql immutable set search_path = ''
as $$ select town.fire_new() || jsonb_build_object('used', case when p_id is not null and jsonb_typeof(p_purse->'forgeDay') = 'number'
  then jsonb_build_object(p_id, p_purse->'forgeDay') else '{}'::jsonb end) $$;
revoke all on function town.fire_from_purse(jsonb, text) from public, anon, authenticated;
`;
const catalog = `do $catalog$
declare k jsonb; i integer; takes integer[] := array[100,100,100,90,70,55,40,30,20,10]; stays integer[] := array[0,0,0,10,30,40,50,55,55,60]; downs integer[] := array[0,0,0,0,0,5,10,15,25,30];
begin
  select data into k from public.town_catalog where key = 'forge' for update;
  if k is null then raise exception 'v174 is required'; end if;
  for i in 0..jsonb_array_length(k->'tries') - 1 loop
    k := jsonb_set(k, array['tries',i::text,'take'], to_jsonb(takes[(k->'tries'->i->>'to')::integer]));
    k := jsonb_set(k, array['tries',i::text,'stay'], to_jsonb(stays[(k->'tries'->i->>'to')::integer]));
    k := jsonb_set(k, array['tries',i::text,'down'], to_jsonb(downs[(k->'tries'->i->>'to')::integer]));
  end loop;
  k := jsonb_set(k, '{fire}', '{"daily":true,"dawn":5,"tries":1}'::jsonb);
  update public.town_catalog set data = k, updated_at = now() where key = 'forge';
end $catalog$;
`;
const blocks = againOf(defs, AGAIN);
const content = helper + catalog + Object.entries(blocks).map(([name, sql]) => `-- <${name}>\n${sql}\n-- </${name}>`).join("\n\n");
const hashes = async () => Object.fromEntries((await run(`select p.oid::regprocedure::text sig, md5(pg_get_functiondef(p.oid)) hash from pg_proc p where p.oid = any(array[${AGAIN.map(([,s]) => `'${s}'::regprocedure::oid`).join(",")}])`)).map((r) => [r.sig, r.hash]));
const before = await hashes();
await t.db.exec(content);
const after = await hashes();
const guard = `do $guard$ begin
  if to_regprocedure('town.forge_try_fired(jsonb,jsonb,integer,double precision,text,text,bigint,double precision)') is null then raise exception 'Run v174 first'; end if;
${Object.keys(before).map((s) => `  if md5(pg_get_functiondef('${s}'::regprocedure)) not in ('${before[s]}','${after[s]}') then raise exception 'Definition changed: ${s}; rebuild v175 on its current text'; end if;`).join("\n")}
end $guard$;\n`;
const sql = `-- v175: daily great fire and the harder forging table. Site code goes out first.
-- Run after v174, while smith_open remains 0. Safe to run twice.
-- +10: 10% taken, 60% stays, 30% down. One accepted top attempt/member/game day.
-- All tools share the right. Resets 05:00 Bangkok; prior +10 does not bar another tool.
-- The purse's existing transaction lock prevents simultaneous requests spending twice.
-- No member's coins, tools, or historical forge data are reset by this file.
begin;
${guard}${content}
commit;
-- Read-only verification: ten rows, each total 100; daily=true; dawn=5; tries=1.
select x->>'to' level, x->>'take' taken, x->>'stay' stays, x->>'down' down from public.town_catalog, lateral jsonb_array_elements(data->'tries') x where key = 'forge';
select data->'fire' from public.town_catalog where key = 'forge';
`;
await t.db.exec(sql);
await t.db.exec(sql);
writeFileSync(here("v175_draft.sql"), sql);
writeFileSync(here("v175.lines.json"), JSON.stringify(AGAIN, null, 2));
console.log(`v175 built from ${AGAIN.length} exact definitions; applied twice. Draft: ${here("v175_draft.sql")}`);
await t.db.close();
