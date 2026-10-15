-- v262: compost and the pollen brush (the farm's Quality, third part).
-- Run after v260 and with the matching site code. Safe to run twice.
--
-- The farm's own care for a plant's Quality, as lib/town/farm's deedFor and care have it: compost in the hand on one's
-- own plant in one's own bed puts compost on it, once a planting (one compost from the bag, 1 stamina; half the soil
-- bar for the rest of the planting), and the pollen brush in the hand brushes it, once a round before it is ripe (the
-- brush is kept, 2 stamina; half the pollen bar to ripeness and the round's floor raised by 10). Both are deeds of the
-- farm as watering is: the same button, tired hands steady themselves for them, and they are written in the town's
-- deeds by their names. v259's trigger settles the plant's round before the change, as for any other.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.quality_harvest(text,jsonb,integer,bigint,text,integer)') is null then raise exception 'Run v260 before v262'; end if;
-- <guards:v262>
 if md5(replace(pg_get_functiondef('town.deed_for(text,jsonb,text,text,bigint,text)'::regprocedure),chr(13),'')) not in ('12140060f29db649ad2e1126d5fbcef7','9f7b4d2f441089a10cda0dc529187bdc') then raise exception 'Definition changed: town.deed_for(text,jsonb,text,text,bigint,text); rebuild v262'; end if;
 if md5(replace(pg_get_functiondef('town.tend(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean)'::regprocedure),chr(13),'')) not in ('487c398312868222e2b766ce5b09d6ed','2d1a8af13baf561f6e0a1fbb530b67ce') then raise exception 'Definition changed: town.tend(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean); rebuild v262'; end if;
-- </guards:v262>
end $$;

-- The care itself (lib/town/farm's care): what the plant and the purse are after it, and the bed kept as tended.
create or replace function town.quality_care(p_deed text, p_plot jsonb, p_bed jsonb, p_owner text, p_purse jsonb, p_me text, p_now bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare p jsonb:=coalesce(p_plot->'plant','null'::jsonb); purse_ jsonb; bed_ jsonb:=p_bed;
begin
 if p='null'::jsonb then return town.no('soil'); end if;
 if p_deed='compost' and town.held(p_purse->'bag','compost')<1 then return town.no('none'); end if;
 purse_:=town.spend(p_purse,(town.cat('quality')->'hand'->'costs'->>p_deed)::double precision,p_now);
 if p_deed='compost' then purse_:=purse_ || jsonb_build_object('bag',town.take(purse_->'bag','compost',1)); end if;
 -- (the bed of its owner who tends it is tended now, and has a plant in it)
 if bed_ is not null and p_owner=p_me then bed_:=bed_ || jsonb_build_object('tended',p_now,'empty',0); end if;
 return jsonb_build_object('ok',true,'deed',p_deed,'purse',purse_,
  'plot',p_plot || jsonb_build_object('plant',p || jsonb_build_object(case when p_deed='compost' then 'compost' else 'brushed' end,p_now)),
  'bed',coalesce(bed_,'null'::jsonb),'got','[]'::jsonb);
end $$;

CREATE OR REPLACE FUNCTION town.deed_for(p_key text, p_plot jsonb, p_hand text, p_me text, p_now bigint, p_owner text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  seen jsonb := town.see(p_key, p_plot, p_now);
  kind text := coalesce(town.tool_of(p_hand), '');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  mine boolean := p_owner is null or p_owner = p_me;
  dead boolean := (seen->>'dead')::boolean;
  ripe boolean := (seen->>'ripe')::boolean;
begin
  if p->>'root' is not null and p->>'root' <> p_key then return null; end if;
  if kind = 'hoe' then
    return case when p <> 'null'::jsonb then case when not mine then null when dead then 'pull' else 'uproot' end
                when p_plot->>'soil' = 'wild' then 'clear' when p_plot->>'soil' = 'cleared' then 'till' end;
  end if;
  if kind = 'seed' then return case when mine and p_plot->>'soil' = 'tilled' and p = 'null'::jsonb then 'sow' end; end if;
  if p <> 'null'::jsonb and not dead then
    -- ── v262: the farm's own care, on one's own plant in one's own bed: compost once a planting, the brush once a round before it is ripe ──
    if p_hand = 'compost' and mine and p->>'by' = p_me and jsonb_typeof(p->'compost') is distinct from 'number' then return 'compost'; end if;
    if p_hand = 'pollenBrush' and mine and p->>'by' = p_me and not ripe
       and not coalesce(jsonb_typeof(p->'brushed') = 'number' and (p->>'brushed')::bigint >= town.quality_round_start(p), false) then return 'brush'; end if;
    if kind = 'cure' and (seen->>'pest')::boolean then return 'cure'; end if;
    if kind = 'can' and not (seen->>'wet')::boolean and not (town.growing(p, p_now)->>'spent')::boolean
       and not (ripe and town.cat('crops')->(p->>'crop')->>'again' is null) then return 'water'; end if;
    if kind = 'feed' and (p->>'fed')::bigint = 0 then return 'feed'; end if;
    if kind = 'guard' and (p->>'guard')::bigint <= p_now
       and (not (seen->>'pest')::boolean or town.cat('farming')->'rids'->>p_hand is not null) then return 'feed'; end if;
    if ripe and mine then return 'pick'; end if;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION town.tend(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare did jsonb;bond_ jsonb;bed_ jsonb:=case when p_bed is null or p_bed='null'::jsonb then null else p_bed end;owner_ text;deed_ text;begin
 -- ── v262: the farm's own care (compost, the pollen brush) is done here, before the older chain ──
 owner_:=town.owner_of(bed_,p_others>0 or coalesce(p_plot->'plant','null'::jsonb)<>'null'::jsonb,p_now);
 deed_:=town.deed_for(p_key,p_plot,town.hand_of(p_purse),p_me,p_now,owner_);
 if deed_ in ('compost','brush') then return town.quality_care(deed_,p_plot,bed_,owner_,p_purse,p_me,p_now); end if;
 did:=town.tend_v205(p_key,p_plot,p_bed,p_others,p_holds,p_purse,p_me,p_now,p_sure);
 if did->'ok'='true'::jsonb and did->>'deed' in ('clear','till','water') then did:=jsonb_set(did,'{purse}',town.train_element(p_purse,did->'purse',town.hand_stack(p_purse)));end if;
 if did->'ok'='true'::jsonb and did->>'deed'='sow' then bond_:=town.combo_seed(did->'purse',did->'plot',p_key,p_now);did:=did||bond_;end if;return did;end;
$function$;

revoke all on function town.quality_care(text,jsonb,jsonb,text,jsonb,text,bigint) from public, anon, authenticated;
-- (the functions written over keep the grants they had)

commit;
notify pgrst, 'reload schema';

-- What it should say afterwards:
--   select pg_get_functiondef('town.deed_for(text,jsonb,text,text,bigint,text)'::regprocedure) like '%pollenBrush%';   -- true
--   select has_function_privilege('authenticated','town.quality_care(text,jsonb,jsonb,text,jsonb,text,bigint)','EXECUTE'); -- false
