-- v321: a giant helped whole by its helpers, and an easier cross-pairing brush (2026-11-07).
-- Run after v317 (any time after it: v318, v319 and v320 touch none of this). Safe to run twice. The site code goes with it
-- (lib/town/quality's coveredShare, lib/town/insect-house's houseCovers, lib/town/gardening's brushChoices and gardenCross,
-- lib/town/reward-garden's gardenBrush, components/town/TownGardenRewards); either may go first: until both are in, the page
-- and the database only differ on what they show of a giant's bars and of the brush's choices.
--
-- The owner, 2026-11-07: "ช่วยแก้ให้มันใช้ง่ายกว่านี้หน่อย อีกอย่างคือยังไม่มีใครเล่นผักยักษ์เลย", passing on a member: "พอเป็น
-- ผักยักษ์มันใช้แค่ผักบัพอย่างเดียวไม่ได้ มันต้องใส่ปุ๋ยด้วย ... หนูลองปลูกแค่พึ่งจากผักบัพ มันก็ได้มาแค่ครึ่งหลอด". Measured that day:
-- the five giants in the ground stood at 12 to 60, and none could be grown on (78 asked).
--
--   * town.quality_share: a helper covers a plant whole when its reach takes in ANY plot of it (was: the share of its plots
--     in reach, best helper of a role, never added, so a 2x2 giant took at most half a bar from helpers). A plant of one plot
--     is as before. town.quality_bed_gift: an insect-house room the same.
--   * Every plant on several plots now in the ground (the giants, any grown one) is settled to now with the gift it had and
--     given its new gift from now on, under its bed's lock, as town.quality_keep does at a change of the bed. Nothing is
--     credited back to before this file runs.
--   * The cross-pairing brush (thingCrossBrush, rank 8, three a day): town.brush_choices lists the children of the ordinary
--     crosses whose other parent, the brusher's own and alive, stands beside a root now, at any stage, found or not.
--     town.reward_garden's gardenBrush takes one of them when there are two or more (ripeness no longer asked); the same
--     child again is refused and costs nothing; another is a use. town.garden_cross tries the chosen pair first and, failing
--     it, crosses as it would have unbrushed (was: no cross at all once the chosen partner was gone).
begin;
set local statement_timeout = '60s';
set local lock_timeout = '5s';
do $$ begin
 if to_regprocedure('town.reward_grow(jsonb,jsonb,uuid,bigint,bigint,uuid,text)') is null then raise exception 'Run v317 before v321'; end if;
-- <guards:v321>
 if md5(replace(pg_get_functiondef('town.quality_share(jsonb,text,text,integer,jsonb)'::regprocedure),chr(13),'')) not in ('56a315faf9fd21e6d84fa04f26afb23c','ea39e1a956ae419431836526120755af') then raise exception 'Definition changed: town.quality_share(jsonb,text,text,integer,jsonb); rebuild v321'; end if;
 if md5(replace(pg_get_functiondef('town.quality_bed_gift(text,jsonb)'::regprocedure),chr(13),'')) not in ('a793d7c873a5ab65c3fdda65f0d315e9','a33f8161c6ae3110ecc153215ed369da') then raise exception 'Definition changed: town.quality_bed_gift(text,jsonb); rebuild v321'; end if;
 if md5(replace(pg_get_functiondef('town.garden_cross(text,jsonb,text,bigint)'::regprocedure),chr(13),'')) not in ('0b56d7086f0dc640b78b5bf5444eab8a','f566d22008dd4d55b31a424dadd39b08') then raise exception 'Definition changed: town.garden_cross(text,jsonb,text,bigint); rebuild v321'; end if;
 if md5(replace(pg_get_functiondef('town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid)'::regprocedure),chr(13),'')) not in ('71da7d9b43e54b3ca6cba081af1dc3eb','b9d002e0fe8fab9b18283add9f9f6559') then raise exception 'Definition changed: town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid); rebuild v321'; end if;
-- </guards:v321>
end $$;

CREATE OR REPLACE FUNCTION town.quality_share(p_mine jsonb, p_at text, p_shape text, p_rotation integer, p_theirs jsonb)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 -- v321: whole when its reach takes in any plot of the plant (lib/town/quality's coveredShare), not its share of them
 select case when exists(select 1 from jsonb_array_elements_text(p_mine) m(cell)
    where not p_theirs ? m.cell
      and exists(select 1 from town.quality_reach(p_shape,p_rotation) r
                  where split_part(p_at,',',1)::integer+r.dx=split_part(m.cell,',',1)::integer and split_part(p_at,',',2)::integer+r.dy=split_part(m.cell,',',2)::integer))
  then 1::double precision else 0::double precision end
$function$;

CREATE OR REPLACE FUNCTION town.quality_bed_gift(p_key text, p_plots jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 p jsonb:=p_plots->p_key->'plant'; qc jsonb:=town.cat('quality'); mine jsonb; o record; theirs jsonb; helper jsonb; share double precision;
 c jsonb:='{}'::jsonb; partner boolean:=false; fennel integer:=0; bed integer; gift jsonb:='{}'::jsonb; r text;
 h jsonb:='[]'::jsonb; hk record; room jsonb; role_ text; n integer; total integer;
 f jsonb:=town.cat('farming'); side integer; bx integer; by_ integer; ox integer; oy integer;
begin
 if p is null or p='null'::jsonb or (p->>'root' is not null and p->>'root'<>p_key) then return null; end if;
 mine:=coalesce(p->'footprint',jsonb_build_array(p_key));
 bed:=town.bed_of(split_part(p_key,',',1)::integer,split_part(p_key,',',2)::integer);
 -- v270: the bed's square once (town.bed_of reads the catalog at every call, and was asked of every plot)
 if bed>=0 then side:=(f->>'side')::integer; bx:=(f->'bedsAt'->bed->>0)::integer; by_:=(f->'bedsAt'->bed->>1)::integer; end if;
 for o in select e.key k, e.value->'plant' pl from jsonb_each(p_plots) e where e.key<>p_key loop
  continue when o.pl is null or o.pl='null'::jsonb or (o.pl->>'root' is not null and o.pl->>'root'<>o.k);
  if bed>=0 then
   ox:=split_part(o.k,',',1)::integer; oy:=split_part(o.k,',',2)::integer;
   continue when ox<bx or ox>=bx+side or oy<by_ or oy>=by_+side;
  else
   continue when town.bed_of(split_part(o.k,',',1)::integer,split_part(o.k,',',2)::integer)<>bed;
  end if;
  theirs:=coalesce(o.pl->'footprint',jsonb_build_array(o.k));
  helper:=qc->'companions'->(o.pl->>'crop');
  if helper is not null then
   share:=town.quality_share(mine,o.k,helper->>'shape',coalesce((o.pl->>'rotation')::integer,0),theirs);
   if share>0 and share>coalesce((c->>(helper->>'role'))::double precision,0) then c:=c || jsonb_build_object(helper->>'role',share); end if;
  end if;
  if qc->'partners'->>(p->>'crop')=o.pl->>'crop' and town.quality_touching(mine,theirs) then partner:=true; end if;
  if o.pl->>'crop'='fennel' and town.quality_touching(mine,theirs) then fennel:=fennel+(qc->>'fennel')::integer; end if;
 end loop;
 -- v265: the insect house (v321: each room whole for a plant it reaches any plot of, lib/town/insect-house's houseCovers)
 for hk in select e.key k, e.value->'house' hs from jsonb_each(p_plots) e where jsonb_typeof(e.value->'house')='object' order by e.key collate "C" loop
  select count(*) filter (where town.house_reach(hk.k,x.c))::integer, count(*)::integer into n, total from jsonb_array_elements_text(mine) x(c);
  continue when n=0;
  for room in select a.v from jsonb_array_elements(hk.hs->'rooms') with ordinality a(v,i) order by a.i loop
   continue when room is null or jsonb_typeof(room)<>'object';
   role_:=town.house_role(room->>'bug');
   continue when role_ is null;
   h:=h || jsonb_build_array(jsonb_build_object('r',role_,'from',(room->>'from')::bigint,'to',(room->>'until')::bigint,'s',1::double precision)
    || case when town.house_rare(room->>'bug') then '{"x":1}'::jsonb else '{}'::jsonb end
    -- v286: how often a hunter keeps a pest off (lib/town/insect-house's keepOf)
    || case when role_='guard' then jsonb_build_object('k',coalesce((room->>'k')::double precision,(qc->'house'->'keeps'->>(room->>'bug'))::double precision,(qc->'house'->>'keep')::double precision)) else '{}'::jsonb end);
  end loop;
 end loop;
 if c<>'{}'::jsonb then gift:=gift || jsonb_build_object('c',c); end if;
 if partner then gift:=gift || '{"p":1}'::jsonb; end if;
 if fennel>0 then gift:=gift || jsonb_build_object('f',fennel); end if;
 if jsonb_array_length(h)>0 then gift:=gift || jsonb_build_object('h',h); end if;
 return case when gift='{}'::jsonb then null else gift end;
end $function$;

CREATE OR REPLACE FUNCTION town.brush_choices(p_key text, p_plots jsonb, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 p jsonb:=p_plots->p_key->'plant'; c jsonb; other text; q record; out_ jsonb:='[]'::jsonb; mine text; theirs text; x integer; y integer; u integer; v integer; hit boolean;
begin
 -- v321: the children the cross-pairing brush may choose for a root (lib/town/gardening's brushChoices): those of the
 -- ordinary crosses whose other parent, the brusher's own and alive, stands beside it now at any stage, found or not; in
 -- the crosses' order, each once; none for a root not the brusher's, crossed already, a satellite or dead
 if p is null or jsonb_typeof(p) is distinct from 'object' or p->>'by' is distinct from p_me or coalesce((p->>'crossed')::boolean,false)
    or (p->>'root' is not null and p->>'root'<>p_key) or coalesce((town.see(p_key,p_plots->p_key,p_now)->>'dead')::boolean,false) then return out_; end if;
 for c in select e.v from jsonb_array_elements(town.cat('gardening')->'crosses') with ordinality e(v,ord) order by ord loop
  other:=case when p->>'crop'=c->>0 then c->>1 when p->>'crop'=c->>1 then c->>0 end;
  continue when other is null or out_ ? (c->>2);
  hit:=false;
  for q in select e.key,e.value from jsonb_each(p_plots) e where e.value->'plant'->>'crop'=other and e.value->'plant'->>'by'=p_me and (e.value->'plant'->>'root' is null or e.value->'plant'->>'root'=e.key) order by e.key loop
   continue when coalesce((town.see(q.key,q.value,p_now)->>'dead')::boolean,false);
   for mine in select jsonb_array_elements_text(coalesce(p->'footprint',jsonb_build_array(p_key))) loop
    x:=split_part(mine,',',1)::integer; y:=split_part(mine,',',2)::integer;
    for theirs in select jsonb_array_elements_text(coalesce(q.value->'plant'->'footprint',jsonb_build_array(q.key))) loop
     u:=split_part(theirs,',',1)::integer; v:=split_part(theirs,',',2)::integer;
     if town.bed_of(x,y)=town.bed_of(u,v) and greatest(abs(x-u),abs(y-v))=1 then hit:=true; exit; end if;
    end loop;
    exit when hit;
   end loop;
   exit when hit;
  end loop;
  if hit then out_:=out_||jsonb_build_array(c->>2); end if;
 end loop;
 return out_;
end $function$;

revoke all on function town.brush_choices(text, jsonb, text, bigint) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION town.garden_cross(p_key text, p_plots jsonb, p_me text, p_now bigint)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 p jsonb:=p_plots->p_key->'plant'; c jsonb; other text; q record; mine text; theirs text; x integer; y integer; u integer; v integer;
begin
 if p is null or p='null'::jsonb or p->>'by' is distinct from p_me or coalesce((p->>'crossed')::boolean,false) or not (town.see(p_key,p_plots->p_key,p_now)->>'ripe')::boolean then return null; end if;
 -- v321: a root the brush chose for tries that pair first, and failing it crosses as it would have unbrushed
 for c in select e.v from jsonb_array_elements(town.cat('gardening')->'crosses') with ordinality e(v,ord) order by (e.v->>2 is not distinct from p->>'crossChoice') desc, ord loop
  other:=case when p->>'crop'=c->>0 then c->>1 when p->>'crop'=c->>1 then c->>0 end;
  continue when other is null;
  for q in select e.key,e.value from jsonb_each(p_plots) e where e.value->'plant'->>'crop'=other and e.value->'plant'->>'by'=p_me and (e.value->'plant'->>'root' is null or e.value->'plant'->>'root'=e.key) order by e.key loop
   continue when not (town.see(q.key,q.value,p_now)->>'ripe')::boolean;
   for mine in select jsonb_array_elements_text(coalesce(p->'footprint',jsonb_build_array(p_key))) loop
    x:=split_part(mine,',',1)::integer; y:=split_part(mine,',',2)::integer;
    for theirs in select jsonb_array_elements_text(coalesce(q.value->'plant'->'footprint',jsonb_build_array(q.key))) loop
     u:=split_part(theirs,',',1)::integer; v:=split_part(theirs,',',2)::integer;
     if town.bed_of(x,y)=town.bed_of(u,v) and greatest(abs(x-u),abs(y-v))=1 then return c->>2; end if;
    end loop;
   end loop;
  end loop;
 end loop;
 -- v263: the helpers' crossings (lib/town/helper-items): a pollinator let go on it this bearing, whose sky decides the child
 if p->'pollenRound' is distinct from p->'picked' then return null; end if;
 for c in select e.v from jsonb_array_elements(town.cat('quality')->'crosses') with ordinality e(v,ord) order by ord loop
  other:=case when p->>'crop'=c->>0 then c->>1 when p->>'crop'=c->>1 then c->>0 end;
  continue when other is null;
  for q in select e.key,e.value from jsonb_each(p_plots) e where e.value->'plant'->>'crop'=other and e.value->'plant'->>'by'=p_me and (e.value->'plant'->>'root' is null or e.value->'plant'->>'root'=e.key) order by e.key loop
   continue when not (town.see(q.key,q.value,p_now)->>'ripe')::boolean;
   for mine in select jsonb_array_elements_text(coalesce(p->'footprint',jsonb_build_array(p_key))) loop
    x:=split_part(mine,',',1)::integer; y:=split_part(mine,',',2)::integer;
    for theirs in select jsonb_array_elements_text(coalesce(q.value->'plant'->'footprint',jsonb_build_array(q.key))) loop
     u:=split_part(theirs,',',1)::integer; v:=split_part(theirs,',',2)::integer;
     if town.bed_of(x,y)=town.bed_of(u,v) and greatest(abs(x-u),abs(y-v))=1 then return case p->>'pollenSky' when 'moon' then c->>3 when 'mist' then coalesce(c->>4,c->>2) else c->>2 end; end if;
    end loop;
   end loop;
  end loop;
 end loop;
 return null;
end $function$;

CREATE OR REPLACE FUNCTION town.reward_garden(p jsonb, c jsonb, request_ uuid, t bigint, seed_ bigint, me uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare a text:=c->>'action';x_ integer:=(c->'at'->>0)::integer;y_ integer:=(c->'at'->>1)::integer;key_ text:=x_::text||','||y_::text;bed_ integer:=town.bed_of(x_,y_);plots_ jsonb;plot_ jsonb;root_ jsonb;state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'giant';samples_ jsonb;sample_ jsonb;cells_ jsonb;crop_ text:=c->>'crop';child_ text:=c->>'child';seed_item text;used_ jsonb;after_ jsonb;updated_ jsonb:='{}'::jsonb;cell_ text;plant_ jsonb;z bigint;mark_ numeric;pass_ boolean:=true;i integer;owner_ text;keeping_ jsonb;n_ integer;item_ text;identity_ text;pair_ jsonb;adjacent_ boolean;choices_ jsonb;
begin
 if a='giantCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',null)),'giant',null);end if;
 if bed_<0 then return town.no('far');end if;
 -- Match ordinary tend/row: purse first, then one bed. No second member's purse is touched.
 perform pg_advisory_xact_lock(hashtext('town.bed'),bed_);plots_:=town.garden_plots(key_);plot_:=plots_->key_;root_:=plot_->'plant';
 select jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty) into keeping_ from public.town_beds b where b.bed=bed_;
 owner_:=town.owner_of(keeping_,exists(select 1 from public.town_plots q where q.bed=bed_ and q.plant is not null),t);
 select coalesce(jsonb_agg(s order by ord),'[]'::jsonb) into samples_ from jsonb_array_elements(coalesce(state_->'pollen','[]'::jsonb)) with ordinality q(s,ord) where (s->>'until')::bigint>t;
 -- (v317: a go at growing a ripe plant at once: town.reward_grow)
 if (a='giantBegin' and c?'grow') or (a='giantEnd' and coalesce(r?'grow',false)) then return town.reward_grow(p,c,request_,t,seed_,me,owner_);end if;
 if a in ('giantBegin','giantEnd') then
  cells_:=jsonb_build_array(key_,(x_+1)::text||','||y_::text,x_::text||','||(y_+1)::text,(x_+1)::text||','||(y_+1)::text);
  if a='giantEnd' then crop_:=r->>'crop';end if;seed_item:=town.cat('crops')->crop_->>'seed';
  if not town.gift_works(p,'thingGiantSeeds') or owner_ is distinct from me::text or crop_ is null or crop_ not in ('pumpkin','cabbage','carrot','daikon','taro') or town.held(p->'bag',seed_item)<4 or exists(select 1 from jsonb_array_elements_text(cells_) q(k) where town.bed_of(split_part(k,',',1)::integer,split_part(k,',',2)::integer)<>bed_ or plots_->k->>'soil' is distinct from 'tilled' or coalesce(plots_->k->'plant','null'::jsonb)<>'null'::jsonb) then return town.no('none');end if;
  if a='giantBegin' then
   if (r->>'until')::bigint>t or seed_ not between 0 and 4294967295 then return town.no('none');end if;if town.used_of(p,'thingGiantSeeds',t)>=coalesce((town.cat('gifts')->'uses'->'thingGiantSeeds'->>'n')::integer,0) then return town.no('spent');end if;
   r:=jsonb_build_object('id',request_,'key',key_,'crop',crop_,'seed',seed_,'began',t,'until',t+120000);return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',r)),'giant',r);
  end if;
  if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->>'key' is distinct from key_ or (r->>'until')::bigint<t or t<(r->>'began')::bigint+2400 then return town.no('far');end if;
  if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
  z:=(r->>'seed')::bigint;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;mark_:=.2+(z%61)::numeric/100;if abs(mark_-(c->'marks'->>i)::numeric)>.09 then pass_:=false;end if;end loop;
  after_:=town.spend(p,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',null));if not pass_ then return jsonb_build_object('ok',true,'purse',after_,'giant',null,'gardenPassed',false);end if;
  used_:=town.gift_use(after_,'thingGiantSeeds',t);if used_->'ok'='true'::jsonb then after_:=used_->'purse';end if;
  plant_:=jsonb_build_object('by',me,'crop',crop_,'sown',t,'boost',0,'watered',case when plot_->'damp'='true'::jsonb then t else 0 end,'fed',0,'guard',0,'cured',0,'picked',0,'pickedAt',0,'root',key_,'footprint',cells_,'giant',true)||case when plot_->'damp'='true'::jsonb then '{"moist":true}'::jsonb else '{}'::jsonb end;
  for cell_ in select jsonb_array_elements_text(cells_) loop updated_:=updated_||jsonb_build_object(cell_,jsonb_build_object('soil','tilled','plant',plant_));end loop;
  after_:=after_||jsonb_build_object('bag',town.take(after_->'bag',seed_item,4));
 elsif a='gardenBrush' then
  -- v321 (lib/town/reward-garden): at any stage of a living root, among two or more children of the parents beside it now,
  -- found or not (town.brush_choices); the same child again is refused and costs nothing, another is a use
  choices_:=town.brush_choices(key_,plots_,me::text,t);
  if not town.gift_works(p,'thingCrossBrush') or child_ is null or jsonb_array_length(choices_)<2 or not choices_?child_ or root_->>'crossChoice' is not distinct from child_ then return town.no('none');end if;
  used_:=town.gift_use(p,'thingCrossBrush',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;after_:=used_->'purse';updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossChoice}',to_jsonb(child_)));
 else
  if root_ is null or root_='null'::jsonb or root_->>'by' is distinct from me::text or (root_->>'root' is not null and root_->>'root'<>key_) or coalesce((root_->>'crossed')::boolean,false) or not (town.see(key_,plot_,t)->>'ripe')::boolean then return town.no('none');end if;
  if a='pollenCollect' then
   if not town.gift_works(p,'thingPollenSeal') or jsonb_array_length(samples_)>=3 then return town.no('none');end if;used_:=town.gift_use(p,'thingPollenSeal',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
   identity_:=key_||':'||(root_->>'by')||':'||(root_->>'crop')||':'||(root_->>'sown');sample_:=jsonb_build_object('id',request_,'key',key_,'crop',root_->'crop','cells',coalesce(root_->'footprint',jsonb_build_array(key_)),'bed',bed_,'identity',identity_,'until',t+86400000);
   after_:=used_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('pollen',samples_||jsonb_build_array(sample_)));updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossed}','true'::jsonb));
  elsif a='pollenApply' then
   select s into sample_ from jsonb_array_elements(samples_) q(s) where s->>'id'=c->>'sample';
   select v into pair_ from jsonb_array_elements(town.cat('gardening')->'crosses') q(v) where v->>2=child_ and (v->>0=root_->>'crop' and v->>1=sample_->>'crop' or v->>1=root_->>'crop' and v->>0=sample_->>'crop') limit 1;
   select exists(select 1 from jsonb_array_elements_text(sample_->'cells') a(k) cross join jsonb_array_elements_text(coalesce(root_->'footprint',jsonb_build_array(key_))) b(k) where greatest(abs(split_part(a.k,',',1)::integer-split_part(b.k,',',1)::integer),abs(split_part(a.k,',',2)::integer-split_part(b.k,',',2)::integer))=1) into adjacent_;
   if not town.gift_works(p,'thingPollenSeal') or sample_ is null or pair_ is null or not coalesce(p->'gardenBook','[]'::jsonb)?child_ or (sample_->>'bed')::integer<>bed_ or not adjacent_ or exists(select 1 from jsonb_array_elements_text(sample_->'cells') q(k) where coalesce(root_->'footprint',jsonb_build_array(key_))?k) then return town.no('none');end if;
   n_:=case when town.held(town.carried_bag(p),'graftKnife')>0 or root_->'insectCrossRound'=root_->'picked' then 2 else 1 end;item_:=town.cat('crops')->child_->>'seed';if town.room(p->'bag',item_)<n_ then return town.no('full');end if;
   after_:=p||jsonb_build_object('bag',town.put(p->'bag',item_,n_),'professionRewards',state_||jsonb_build_object('pollen',(select coalesce(jsonb_agg(s order by ord),'[]'::jsonb) from jsonb_array_elements(samples_) with ordinality q(s,ord) where s->>'id'<>sample_->>'id')));updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossed}','true'::jsonb));
  else return town.no('none');end if;
 end if;
 for cell_ in select jsonb_object_keys(updated_) loop insert into public.town_plots(x,y,bed,soil,plant,changed) values(split_part(cell_,',',1)::integer,split_part(cell_,',',2)::integer,bed_,updated_->cell_->>'soil',updated_->cell_->'plant',t) on conflict(x,y) do update set soil=excluded.soil,plant=excluded.plant,changed=excluded.changed;end loop;
 if a='giantEnd' then update public.town_beds b set tended=t,empty=0 where b.bed=bed_ and b.member_id=me;end if;
 return jsonb_build_object('ok',true,'purse',after_,'plots',updated_)||case when a='giantEnd' then jsonb_build_object('giant',null,'gardenPassed',true) when a='pollenApply' then jsonb_build_object('got',jsonb_build_array(jsonb_build_array(item_,n_))) else '{}'::jsonb end;
end $function$;

-- every plant on several plots now in the ground: its round so far with what it had, its gift from now the new one
do $$
declare
 beds_ integer[]; b integer; o record; okey text; plots_ jsonb; gift jsonb; q jsonb; kept_ jsonb; now_ bigint := town.now_ms(); n_ integer := 0;
begin
 -- every bed under its lock first, as a tend takes it, in one order: a giant set down meanwhile in any bed is then seen
 -- here (and one set down after waits for this file's functions)
 for b in select generate_series(0, jsonb_array_length(town.cat('farming')->'bedsAt') - 1) loop perform pg_advisory_xact_lock(hashtext('town.bed'), b); end loop;
 select coalesce(array_agg(distinct t.bed order by t.bed), '{}') into beds_ from public.town_plots t
  where jsonb_typeof(t.plant) = 'object' and jsonb_typeof(t.plant->'footprint') = 'array' and jsonb_array_length(t.plant->'footprint') > 1
    and t.plant->>'root' = t.x::text || ',' || t.y::text;
 foreach b in array beds_ loop
  select coalesce(jsonb_object_agg(t.x::text || ',' || t.y::text, jsonb_build_object('soil', t.soil, 'plant', t.plant)
      || case when t.house is not null then jsonb_build_object('house', t.house) else '{}'::jsonb end), '{}'::jsonb)
    into plots_ from public.town_plots t where t.bed = b;
  for o in select t.x, t.y, t.plant from public.town_plots t
     where t.bed = b and jsonb_typeof(t.plant) = 'object' and jsonb_typeof(t.plant->'footprint') = 'array' and jsonb_array_length(t.plant->'footprint') > 1
       and t.plant->>'root' = t.x::text || ',' || t.y::text
     order by t.x, t.y loop
   okey := o.x::text || ',' || o.y::text;
   gift := town.quality_bed_gift(okey, plots_);
   continue when gift is not distinct from case when jsonb_typeof(o.plant->'q'->'bed') = 'object' then o.plant->'q'->'bed' end;
   q := town.quality_settled(o.plant, now_);
   kept_ := town.house_kept(o.plant, q->'bed', gift, now_, false);
   update public.town_plots set plant = (plant - 'hg') || jsonb_build_object('q', (q - 'bed') || case when gift is null then '{}'::jsonb else jsonb_build_object('bed', gift) end)
       || case when kept_ is null then '{}'::jsonb else jsonb_build_object('hg', kept_) end,
     changed = now_
    where x = o.x and y = o.y;
   n_ := n_ + 1;
  end loop;
 end loop;
 raise notice 'v321: % plants on several plots given their helpers whole', n_;
end $$;

commit;

-- What it should say afterwards:
--   select position('v321' in pg_get_functiondef('town.quality_share(jsonb,text,text,integer,jsonb)'::regprocedure)) > 0 as share,
--          to_regprocedure('town.brush_choices(text,jsonb,text,bigint)') is not null as brush,
--          position('choices_' in pg_get_functiondef('town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid)'::regprocedure)) > 0 as reward; -- true, true, true
--   select x, y, plant->>'crop' crop, plant->'q'->'bed'->'c' helpers from public.town_plots
--    where jsonb_array_length(coalesce(plant->'footprint','[]'::jsonb)) > 1 and plant->>'root' = x::text || ',' || y::text;
--      -- each role a helper reaches: 1 (was 0.25 or 0.5)
