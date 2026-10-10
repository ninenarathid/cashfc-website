// Exact edits of the post-v175 definitions. The owner runs the proved file after the code deploy.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { standIn } from "./stand-in.mjs";
import { changed, statement } from "./build-v159.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const root = process.env.FC_REPO;
if (!root) throw new Error("FC_REPO is required");
const dir = join(root, ".claude/skills/fc-cash-town/scripts/db");
const t = await standIn({ upTo: 176 });
const defs = (await t.sql("select p.oid::regprocedure::text sig, pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='town' or (n.nspname='public' and p.proname like 'town_%')")).rows;
const edits = new Map();
const byName = (name) => { const x = defs.find((d) => d.sig.split("(")[0] === name); if (!x) throw new Error(`missing ${name}`); return x; };
const edit = (name, from, to) => {
  const { sig, def } = byName(name);
  const lines = edits.get(sig) ?? [];
  changed(changed(def, sig, lines), sig, [[from, to]]);
  lines.push([from, to]); edits.set(sig, lines);
};
const current = (name) => { const d = byName(name); return changed(d.def, d.sig, edits.get(d.sig) ?? []); };

edit("town.tool_mods", "'asleep', '[]'::jsonb, 'gems'", "'asleep', '[]'::jsonb, 'strong', null, 'gems'");
edit("town.tool_mods", "'asleep', case when away_ then drawn else '[]'::jsonb end, 'gems'", "'asleep', case when away_ then drawn else '[]'::jsonb end, 'strong', case when not away_ then carried->'opts'->1 else 'null'::jsonb end, 'gems'");
edit("town.fx_n", "coalesce((p_forge->'options'->'of'->p_opt->'n'->>p_key)::double precision, 0)", "coalesce(case when p_mods->>'strong' = p_opt then (p_forge->'options'->'of'->p_opt->'six'->'n'->>p_key)::double precision end, (p_forge->'options'->'of'->p_opt->'n'->>p_key)::double precision, 0)");
edit("town.use_power", "rule jsonb := town.power_rule(p_id);", "rule jsonb := town.power_rule(p_id, p_tool);");
edit("town.may_power", "town.power_left(p_purse, p_id, p_now)", "town.power_left(p_purse, p_id, p_now, p_tool)");

// Every call uses the actual tool, rather than the base number of the option.
for (const [name, tool] of [["town.mine_pay", "pick"], ["town.mine_swings", "p_pick"], ["town.vein_mods", "p_pick"],
  ["town.axe_chops", "p_axe"], ["town.axe_ahead", "p_axe"], ["town.fell_most", "p_axe"], ["town.fell", "axe"], ["town.can_holds", "p_stack"]]) {
  for (const line of current(name).split("\n").filter((l) => /town\.opt_n\('/.test(l))) {
    edit(name, line, line.replace(/town\.opt_n\(('[^']+'), ('[^']+')\)/g, `town.opt_n($1, $2, ${tool})`));
  }
}
edit("town.vein_mods", "      - case when p_spent", "      + case when town.tool_has(p_pick, 'pkPeek') then town.opt_n('pkPeek', 'strikes', p_pick) else 0 end\n      - case when p_spent");
edit("town.rod_fx", "'strike', case when l > 0 then (lv->'strike'->>l)::double precision / (lv->'strike'->>0)::double precision else 1::double precision end,", "'strike', (case when l > 0 then (lv->'strike'->>l)::double precision / (lv->'strike'->>0)::double precision else 1::double precision end) + town.fx_n(k, m, 'rdBait', 'strike'),");
edit("town.hoe_fx", "'band', (lv->'band'->>l)::double precision,", "'band', (lv->'band'->>l)::double precision * greatest(1::double precision, town.fx_n(k, m, 'hoLight', 'band', 1)),");
edit("town.can_fx", "+ town.fx_n(k, m, 'cnDrop', 'more'),", "+ town.fx_n(k, m, 'cnDrop', 'more') + town.fx_n(k, m, 'cnThrift', 'more'),");
edit("town.can_holds", "          + case when town.tool_has(p_stack, 'cnDrop') then town.opt_n('cnDrop', 'more', p_stack) else 0 end", "          + case when town.tool_has(p_stack, 'cnDrop') then town.opt_n('cnDrop', 'more', p_stack) else 0 end\n          + case when town.tool_has(p_stack, 'cnThrift') then town.opt_n('cnThrift', 'more', p_stack) else 0 end");
const dry = current("town.smith_dry");
edit("town.smith_dry", dry.slice(dry.indexOf("  select"), dry.lastIndexOf("$function$")), "  select greatest(1, coalesce((select max(town.opt_n('axDry', 'pieces', s))::integer from jsonb_array_elements(p_bag) s where town.tool_has(s, 'axDry')), 1))\n");
edit("town.fell_begin", "'ahead', town.axe_ahead(axe),", "'ahead', case when town.tree_elder(t) and town.tool_has(axe, 'axElder') then (town.cat('mining')->>'all')::double precision else town.axe_ahead(axe) end,");

// A twin multiplies only the validated, earned yield. A refusal leaves its right and vein intact.
edit("town.vein_end", "  stowed := town.stow_all(p_purse, got_);\n  if stowed is null then return town.no('full'); end if;\n  -- `pkTwin`, counted, of the pick now in the hand: the vein is kept, as its second go\n  pick := town.mine_pick(stowed);\n  twin := case when not twice and pick is not null then town.use_power(stowed, pick, 'pkTwin', p_now) end;\n  after_ := case when coalesce((twin->>'ok')::boolean, false) then twin->'purse' else stowed end;",
`  pick := town.mine_pick(p_purse);
  twin := case when jsonb_array_length(got_) > 0 and not twice and pick is not null then town.use_power(p_purse, pick, 'pkTwin', p_now) end;
  if coalesce((twin->>'ok')::boolean, false) then
    select jsonb_agg(jsonb_build_array(g.v->>0, (g.v->>1)::numeric * town.opt_n('pkTwin', 'times', pick)) order by g.ord) into got_
      from jsonb_array_elements(got_) with ordinality g(v, ord);
  end if;
  stowed := town.stow_all(case when coalesce((twin->>'ok')::boolean, false) then twin->'purse' else p_purse end, got_);
  if stowed is null then return town.no('full'); end if;
  after_ := stowed;`);
edit("town.vein_end", "'again', coalesce((twin->>'ok')::boolean, false), 'vein', vein_,", "'again', false, 'vein', vein_,");
edit("town.vein_end", "case when coalesce((twin->>'ok')::boolean, false) then vein_ || '{\"again\": true}'::jsonb else 'null'::jsonb end", "'null'::jsonb");
edit("town.fell_root", "  used jsonb;", "  used jsonb;\n  ids text[];");
edit("town.fell_root", "  return jsonb_build_object('ok', true, 'purse', used->'purse', 'left'", `  select array_agg(q.id) into ids from (
    select e.key id from jsonb_each(p_grove->'down') e
      join lateral (select town.tree_of(e.key::integer) as tr) r on r.tr is not null
     where not town.tree_elder(r.tr) and e.value->>'by' = p_me
       and p_now - (e.value->>'at')::numeric <= (k->'root'->>'within')::numeric * 1000
       and p_now < town.tree_until(false, (e.value->>'at')::numeric::bigint)
       and greatest(abs((r.tr->>1)::integer - (t->>1)::integer), abs((r.tr->>2)::integer - (t->>2)::integer)) <= town.opt_n('axRoot', 'reach', axe)
     order by case when e.key = p_tree::text then 0 else 1 end,
       abs((r.tr->>1)::integer - (t->>1)::integer) + abs((r.tr->>2)::integer - (t->>2)::integer), e.key::integer
     limit town.opt_n('axRoot', 'trees', axe)::integer
  ) q;
  return jsonb_build_object('ok', true, 'purse', used->'purse', 'left'`);
edit("town.fell_root", "(p_grove->'down') - (p_tree::text)", "(p_grove->'down') - coalesce(ids, array[p_tree::text])");

edit("town.grown", "town.wet_ms(p.sown, p_now)::double precision", "(case when p_plant->'moist' = 'true'::jsonb then greatest(0, p_now - p.sown)::double precision else town.wet_ms(p.sown, p_now)::double precision end)");
edit("town.sow_damp", "'watered', p_now)", "'watered', p_now, 'moist', true)");
edit("town.see", "'wet', p_now -", "'wet', p->'moist' = 'true'::jsonb or p_now -");
// COALESCE keeps the wet flag boolean on ordinary plants with no moist property.
edit("town.see", "p->'moist' = 'true'::jsonb or", "coalesce(p->'moist' = 'true'::jsonb, false) or");
edit("town.water_with", "if again then twice := town.use_power(paid, mine, 'cnTwice', p_now); end if;", "if again or not (p_seen->>'wet')::boolean then twice := town.use_power(paid, mine, 'cnTwice', p_now); end if;");
edit("town.water_with", "town.watering_of(p_purse, p_hand, p_now, fx)) || case when again then", "town.watering_of(p_purse, p_hand, p_now, fx) * case when coalesce((twice->>'ok')::boolean, false) and not again then 2::double precision else 1::double precision end) || case when again or coalesce((twice->>'ok')::boolean, false) then");
edit("town.beside", "  rains boolean;", "  rains boolean;\n  both_ boolean;");
edit("town.beside", "rains := not hoes and (fx->>'rain')::boolean and coalesce(p_owner = p_me, false);", "rains := not hoes and (fx->>'rain')::boolean and coalesce(p_owner = p_me, false) and town.may_power(p_after, tool, 'cnRain', p_now);");
edit("town.beside", "  if not chance > 0 and not rains then return nothing; end if;", "  both_ := hoes and coalesce(p_owner = p_me, false) and town.power_used(p_after, 'hoBoth', p_now) > town.power_used(p_before, 'hoBoth', p_now);\n  if not chance > 0 and not rains and not both_ then return nothing; end if;");
edit("town.beside", "where w.key_ <> p_key and town.deed_for", "where w.key_ <> p_key and (rains or split_part(w.key_, ',', 2) = split_part(p_key, ',', 2)) and town.deed_for");
edit("town.beside", "  if hoes then\n    if not struck", `  if hoes then
    if both_ then
      for k in select q.key_ from jsonb_array_elements_text(want) with ordinality q(key_, ord) order by q.ord limit greatest(0, town.opt_n('hoBoth', 'plots', tool)::integer - 1) loop
        out_ := out_ || jsonb_build_object(k, '{"soil":"tilled","plant":null}'::jsonb);
      end loop;
      return jsonb_build_object('purse', p_after, 'plots', out_);
    end if;
    if not struck`);
edit("town_tend", "where p.bed = bed_n and p.y = p_y;", "where p.bed = bed_n and (p.y = p_y or town.tool_has(town.hand_stack(purse), 'cnRain'));");
edit("town_tend", "town.beside(key, town.row_keys(p_x, p_y),", "town.beside(key, case when town.tool_has(town.hand_stack(purse), 'cnRain') then town.bed_keys(p_x, p_y) else town.row_keys(p_x, p_y) end,");

// The big pot pays for three batches, plays one board, and applies the same misses to all batches.
const more = current("town.cook_more");
const oldBig = more.match(/  if p_made and \(p_fx->>'big'\)[\s\S]*?\n  end if;/)?.[0];
if (!oldBig) throw new Error("big anchor missing");
edit("town.cook_more", oldBig, "  -- v177: paid batches are counted by town.cook, before its extras.");
edit("town.cook", "  more_ jsonb;", "  more_ jsonb;\n  batch_ integer := 1;\n  used_big jsonb;");
edit("town.cook", "  if dish is not null then\n    left_ :=", `  if dish is not null then
    if made is not null and mine_ is not null and (fx_->>'big')::double precision > 0
       and not exists (select 1 from jsonb_array_elements(alls) a(v) where town.held(p_purse->'bag', a.v->>0) < (a.v->>1)::numeric * town.opt_n('ckBig', 'batches', mine_)) then
      used_big := town.use_power(spent, mine_, 'ckBig', p_now);
      if (used_big->>'ok')::boolean then
        spent := used_big->'purse'; batch_ := town.opt_n('ckBig', 'batches', mine_)::integer;
        for x in select v from jsonb_array_elements(alls) a(v) loop bag := town.take(bag, x->>0, (x->>1)::numeric * (batch_ - 1)); end loop;
      end if;
    end if;
    left_ :=`);
edit("town.cook", "then town.helpings(dish, p_crew, p_misses, p_purse->'bag') else", "then town.helpings(dish, p_crew, p_misses, p_purse->'bag') * batch_ else");
// Helpers' points retain the current max even when the deed came from a strong +6 can.
edit("town.work_counts_of", "least(town.opt_n('cnKind', 'points')::numeric,", "least(coalesce((town.cat('forge')->'options'->'of'->'cnKind'->'six'->'n'->>'points')::numeric, town.opt_n('cnKind', 'points')::numeric),");
edit("town.cave_told_of", "reach := town.gem_by(pick, 'light', m->'pick'->'gems'->'light'->'glint');", "reach := case when town.tool_has(pick, 'pkGleam') then (m->>'all')::double precision else town.gem_by(pick, 'light', m->'pick'->'gems'->'light'->'glint') end;");
edit("town.use_power", "'n', used_ + 1))));", "'n', used_ + 1))) || case when p_id = 'ntWide' then jsonb_build_object('netSweep', jsonb_build_object('until', p_now + 10000, 'left', town.opt_n('ntWide', 'catches', p_tool))) else '{}'::jsonb end);");
for (const name of ["town.net", "town.net_mine"]) edit(name, "town.net_more_far(p_purse)", "town.net_more_far(p_purse, p_now)");
const netPurseLine = current("town.net_more").split("\n").find((l) => l.includes("'purse', town.tool_paid"));
if (!netPurseLine) throw new Error("net purse anchor");
edit("town.net_more", netPurseLine, netPurseLine.replace("'purse', ", "'purse', town.sweep_caught(").replace(/\);$/, ", p_now));"));

const helpers = `create or replace function town.opt_n(p_id text, p_key text, p_tool jsonb)
returns double precision language sql stable set search_path = '' as $$
  select coalesce(case when m->>'strong' = p_id then (f->'options'->'of'->p_id->'six'->'n'->>p_key)::double precision end,
    (f->'options'->'of'->p_id->'n'->>p_key)::double precision, 0)
    from (select town.cat('forge') f, town.tool_mods(p_tool) m) q
$$;
create or replace function town.net_more_far(p_purse jsonb, p_now bigint)
returns double precision language sql stable set search_path = '' as $$
  select (fx->>'reach')::double precision + case when (fx->>'wide')::double precision > 0 and coalesce((p_purse->'netSweep'->>'until')::numeric > p_now and (p_purse->'netSweep'->>'left')::numeric > 0, false) then (fx->>'wide')::double precision else 0 end
    from (select town.net_fx(town.hand_stack(p_purse)) fx) s
$$;
create or replace function town.sweep_caught(p_purse jsonb, p_now bigint)
returns jsonb language sql stable set search_path = '' as $$
  select case when (town.net_fx(town.hand_stack(p_purse))->>'wide')::double precision > 0 and coalesce((p_purse->'netSweep'->>'until')::numeric > p_now and (p_purse->'netSweep'->>'left')::numeric > 0, false)
    then jsonb_set(p_purse, '{netSweep,left}', to_jsonb((p_purse->'netSweep'->>'left')::numeric - 1)) else p_purse end
$$;
revoke all on function town.net_more_far(jsonb,bigint), town.sweep_caught(jsonb,bigint) from public, anon, authenticated;
create or replace function town.power_rule(p_id text, p_tool jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(case when m->>'strong' = p_id then f->'options'->'of'->p_id->'six'->'use' end,
    f->'options'->'of'->p_id->'use') from (select town.cat('forge') f, town.tool_mods(p_tool) m) q
$$;
create or replace function town.power_left(p_purse jsonb, p_id text, p_now bigint, p_tool jsonb)
returns integer language sql stable set search_path = '' as $$
  select greatest(0, coalesce((town.power_rule(p_id, p_tool)->>'n')::integer, 0) - town.power_used(p_purse, p_id, p_now))
$$;
create or replace function town.bed_keys(p_x integer, p_y integer)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce((select jsonb_agg(((b.at->>0)::int + i)::text || ',' || ((b.at->>1)::int + j)::text order by j,i)
    from (select town.cat('farming') f) c, jsonb_array_elements(c.f->'bedsAt') with ordinality b(at, ord),
      generate_series(0, (c.f->>'side')::int - 1) i, generate_series(0, (c.f->>'side')::int - 1) j
    where b.ord - 1 = town.bed_of(p_x, p_y)), '[]'::jsonb)
$$;
revoke all on function town.opt_n(text,text,jsonb), town.power_rule(text,jsonb), town.power_left(jsonb,text,bigint,jsonb), town.bed_keys(integer,integer) from public, anon, authenticated;
`;
const all = catalogOf();
const catalog = [["forge", ["options", "of"], all.forge.options.of], ["trees", ["axe", "opts"], all.trees.axe.opts], ["mining", ["pick", "opts"], all.mining.pick.opts]]
  .map(([key, path, value]) => `update public.town_catalog set data = jsonb_set(data, '{${path.join(",")}}', $town$${JSON.stringify(value)}$town$::jsonb), updated_at = now() where key = '${key}';`).join("\n");
for (const [sig] of edits) edit(sig.split("(")[0], "AS $function$", "AS $function$\n-- v177: stronger milestones and distinct powers.\n");
const transformed = [...edits].map(([sig, lines]) => ({ sig, lines, def: changed(defs.find((x) => x.sig === sig).def, sig, lines) }));
await t.db.exec(helpers);
for (const x of transformed) await t.db.exec(x.def);
const hash = (s) => createHash("md5").update(s.replace(/\r/g, "")).digest("hex");
const checks = [];
for (const x of transformed) {
  const after = (await t.sql("select pg_get_functiondef($1::regprocedure) d", [x.sig])).rows[0].d;
  checks.push(`  if md5(replace(pg_get_functiondef('${x.sig}'::regprocedure), chr(13), '')) not in ('${hash(defs.find((d) => d.sig === x.sig).def)}','${hash(after)}') then raise exception 'Definition changed: ${x.sig}; rebuild v177 on current text'; end if;`);
}
const sql = `-- v177: stronger milestones and powers worth taking back into the world.
-- Run after v176 and the matching site deploy. Safe to run twice. No inventories or coins are reset.
-- Guards ignore only Windows CR line endings. Each existing function is its own definition with marked edits.
begin;
do $guard$ begin
  if not coalesce((town.cat('forge')->'fire'->>'daily')::boolean, false) then raise exception 'Run v175 first'; end if;
${checks.join("\n")}
end $guard$;
${helpers}
${catalog}
${transformed.map((x) => `-- <${x.sig}>\n${statement(x.def)}\n-- </${x.sig}>`).join("\n\n")}
notify pgrst, 'reload schema';
commit;
-- Expected: strong milestone numbers; a top's daily counts; all other catalog entries unchanged.
select data->'options'->'of'->'pkSteady'->'six' from public.town_catalog where key = 'forge';
select data->'options'->'of'->'cnFull'->'n' from public.town_catalog where key = 'forge';
`;
writeFileSync(join(dir, "v177_draft.sql"), sql);
writeFileSync(join(dir, "v177.lines.json"), JSON.stringify(transformed.map(({ sig, lines }) => ({ sig, lines })), null, 2));
await t.runTwice(sql, "v177 draft");
t.done();
await t.db.close();
console.log(`${transformed.length} exact definitions; v177_draft.sql assembled`);
