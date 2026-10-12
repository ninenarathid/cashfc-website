-- v234: a real pollinator, one choice per root per bearing.
-- Run after v233 with matching site. Growth OR crossing; original pollenRound, ownership and dead/ripe gates.
-- Crossing still requires the original ripe-neighbour pair. Graft knife and visitor share two hybrid seeds.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('town.insect_care(text,jsonb,jsonb,integer,text,text,bigint)'::regprocedure),chr(13),'')) not in ('e31cfb29f79bd51f6eb84331fd232622','9f4903c825e2b347bc7ffd110ac2b5e5') then raise exception 'Definition moved: rebuild v234';end if;
if md5(replace(pg_get_functiondef('town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('ede21eb0eaa02449de5de71bb49a132e','2cea6d67a8a6c99cb0427d94d8b50f54') then raise exception 'Definition moved: rebuild v234';end if;
end $guard$;update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'{"charmPollenGuardian":{"kind":"charm","line":"insects","rank":9,"by":1}}'::jsonb) where key='gifts';
CREATE OR REPLACE FUNCTION town.insect_care(p_key text, p_plot jsonb, p_purse jsonb, p_slot integer, p_mode text, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
 k jsonb:=town.cat('insect_garden'); s jsonb; p jsonb:=p_plot->'plant'; seen jsonb;
 plant_ jsonb; book jsonb:=coalesce(p_purse->'insectGardenBook','[]'::jsonb); entry text; allowed jsonb;
begin
 if p_slot is null or p_slot<0 or p_slot>=jsonb_array_length(p_purse->'bag') or p_mode is null or p_mode not in ('pollinate','guard','grow','cross') then return town.no('none'); end if;
 if p_mode in ('grow','cross') and not town.gift_works(p_purse,'charmPollenGuardian') then return town.no('none');end if;
 s:=p_purse->'bag'->p_slot;
 allowed:=case when p_mode<>'guard' then k->'pollinators' else k->'predators' end;
 if not coalesce(allowed ? (s->>'item') and (s->>'n')::numeric>=1,false) then return town.no('none'); end if;
 if p is null or p='null'::jsonb or (p->>'root' is not null and p->>'root'<>p_key) then return town.no('soil'); end if;
 seen:=town.see(p_key,p_plot,p_now);
 if (seen->>'dead')::boolean then return town.no('soil'); end if;
 if p_mode<>'guard' and p->>'by' is distinct from p_me then return town.no('theirs'); end if;
 if p_mode<>'guard' and ((seen->>'ripe')::boolean or p->'pollenRound'=p->'picked') then return town.no('wet'); end if;
 if p_mode='guard' and not (seen->>'pest')::boolean then return town.no('soil'); end if;
 if p_mode<>'guard' then
  plant_:=p || jsonb_build_object('pollenRound',p->'picked','pollenUntil',p_now+60000*case when town.held(town.carried_bag(p_purse),'releaseCage')>0 then (k->>'cageMinutes')::bigint else (k->>'pollenMinutes')::bigint end,
    'boost',(p->>'boost')::numeric+case when p_mode='cross' then 0 when p_mode='grow' then 3600000 when town.held(town.carried_bag(p_purse),'pollenFan')>0 then (k->>'fanBoost')::numeric else (k->>'boost')::numeric end);
  if p_mode='cross' then plant_:=plant_||jsonb_build_object('insectCrossRound',p->'picked');end if;
 else
  plant_:=p || jsonb_build_object('cured',p_now,'guard',greatest((p->>'guard')::bigint,case when town.held(town.carried_bag(p_purse),'pestWhistle')>0 then p_now+(k->>'guardMinutes')::bigint*60000 else 0 end));
 end if;
 entry:=(s->>'item')||':'||(p->>'crop')||':'||p_mode;
 if not book ? entry then book:=book || to_jsonb(entry); end if;
 return jsonb_build_object('ok',true,'mode',p_mode,'plot',p_plot || jsonb_build_object('plant',plant_),
   'purse',p_purse || jsonb_build_object('bag',town.take(p_purse->'bag',s->>'item',1),'insectGardenBook',book));
end $function$
;
CREATE OR REPLACE FUNCTION town.garden_harvest(p_key text, p_before jsonb, p_plot jsonb, p_plots jsonb, p_done jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
 p jsonb:=p_plot->'plant'; after_ jsonb:=p_done->'purse'; updated jsonb:=p_done->'plot'; extras jsonb:='[]'::jsonb;
 child text:=town.garden_cross(p_key,p_plots,p->>'by',p_now); book jsonb; stowed jsonb;
begin
 if p is null or p='null'::jsonb or (p->>'root' is not null and p->>'root'<>p_key) then return p_done; end if;
 if p->>'root' is not null and town.held(town.carried_bag(p_before),'gardenTwine')>0 then extras:=extras || jsonb_build_array(jsonb_build_array(p->>'crop',(town.cat('gardening')->>'extra')::integer)); end if;
 if updated->'plant'='null'::jsonb and p->>'root' is not null and town.held(town.carried_bag(p_before),'seedTray')>0 then extras:=extras || jsonb_build_array(jsonb_build_array(town.cat('crops')->(p->>'crop')->>'seed',1)); end if;
 if child is not null then extras:=extras || jsonb_build_array(jsonb_build_array(town.cat('crops')->child->>'seed',case when town.held(town.carried_bag(p_before),'graftKnife')>0 or p->'insectCrossRound'=p->'picked' then 2 else 1 end)); end if;
 stowed:=town.stow_all(after_,extras);
 if stowed is null then return town.no('full'); end if;
 after_:=stowed;
 if child is not null then
  book:=coalesce(after_->'gardenBook','[]'::jsonb);
  if not book ? child then book:=book || to_jsonb(child); end if;
  after_:=after_ || jsonb_build_object('gardenBook',book);
  if updated->'plant'<>'null'::jsonb then updated:=jsonb_set(updated,'{plant,crossed}','true'::jsonb); end if;
 end if;
 return p_done || jsonb_build_object('purse',after_,'plot',updated,'got',p_done->'got' || extras) || case when child is not null then jsonb_build_object('cross',child) else '{}'::jsonb end;
end $function$
;
notify pgrst,'reload schema';commit;