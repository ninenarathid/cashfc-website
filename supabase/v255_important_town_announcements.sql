-- v255: trusted town announcements, with character portraits and a shared history.
-- Run after v254. +7, +8 and +9 successes announce EVERY time; +6/+10 and failures do not.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if not coalesce(town.cat('gifts')->'gifts'?'thingCreel',false) then raise exception 'Run v254 before v255';end if;
end $$;
create table if not exists public.town_announcement_faces (
 member_id uuid primary key references public.profiles(id) on delete cascade,
 look text not null check(look ~ '^5[0-9a-z]{7}$')
);
create table if not exists public.town_announcement_firsts (
 event_key text primary key,
 at timestamptz not null default now()
);
create table if not exists public.town_announcements (
 id bigint generated always as identity primary key,
 event_key text not null unique,
 member_id uuid references public.profiles(id) on delete set null,
 kind text not null check(kind in ('forge','rank','legend','forest','recipe','cross','depth','bridge','lamps')),
 subject text not null default '', level integer not null default 0,
 name text not null, portrait jsonb not null,
 at timestamptz not null default now()
);
create index if not exists town_announcements_at on public.town_announcements(at desc);
alter table public.town_announcement_faces enable row level security;
alter table public.town_announcement_firsts enable row level security;
alter table public.town_announcements enable row level security;
revoke all on public.town_announcement_faces,public.town_announcement_firsts,public.town_announcements from public,anon,authenticated;
revoke all on sequence public.town_announcements_id_seq from public,anon,authenticated;

create or replace function town.announce(p_member uuid,p_kind text,p_subject text,p_level integer,p_key text,p_first boolean default false)
returns void language plpgsql set search_path='' as $$
declare name_ text;look_ text;claimed integer;purse_ jsonb;
begin
 if p_first then
  insert into public.town_announcement_firsts(event_key) values(p_key) on conflict do nothing;
  get diagnostics claimed=row_count;
  if claimed=0 then return;end if;
 end if;
 select coalesce(nullif(p.character_name,''),nullif(p.display_name,''),nullif(p.discord_username,''),'ผู้เล่น') into name_ from public.profiles p where p.id=p_member;
 select f.look into look_ from public.town_announcement_faces f where f.member_id=p_member;
 select p.doc into purse_ from public.town_purses p where p.member_id=p_member;
 insert into public.town_announcements(event_key,member_id,kind,subject,level,name,portrait)
 values(p_key,p_member,p_kind,coalesce(p_subject,''),p_level,coalesce(name_,'เมือง'),jsonb_build_object('look',look_,'expression','neutral','held',case when town.hand_of(purse_) is not null then town.hand_stack(purse_) end,'wet',exists(select 1 from jsonb_array_elements(coalesce(purse_->'bag','[]'::jsonb)) b where b->>'item'=town.hand_of(purse_) and coalesce((b->>'water')::numeric,0)>0))) on conflict(event_key) do nothing;
end $$;

create or replace function town.announce_deed() returns trigger language plpgsql set search_path='' as $$
declare subject_ text;level_ integer;
begin
 if new.what='forge' and new.doc->>'out'='taken' and new.doc->'level' in ('7'::jsonb,'8'::jsonb,'9'::jsonb) then
  perform town.announce(new.member_id,'forge',new.thing,(new.doc->>'level')::integer,'forge:deed:'||new.id,false);
 elsif new.what='gather' and new.n>0 and town.cat('work')->'forest'->'rares'?new.thing then
  perform town.announce(new.member_id,'forest',new.thing,0,'forest:'||new.thing,true);
 elsif new.what in ('mine','crystal','vein') and new.n>0 then
  subject_:=coalesce(new.doc->>'got',new.thing);
  if subject_ in ('gemDiamond','wholeGeode','oreSilver') then perform town.announce(new.member_id,'forest',subject_,0,'mineral:'||subject_,true);end if;
 elsif new.what='delve' and new.doc->'floor'='29'::jsonb then
  perform town.announce(new.member_id,'depth','mining',30,'depth:30',true);
 elsif new.what='lamp_light' and new.doc->'full'='true'::jsonb then
  perform town.announce(new.member_id,'lamps',new.doc->>'map',0,'lamps:'||town.day_of((extract(epoch from new.at)*1000)::bigint)||':'||(new.doc->>'map'),true);
 elsif new.what='stone_lay' and new.doc->>'work'='bridge' and new.doc->'have'=town.cat('bridge')->'need' then
  perform town.announce(new.member_id,'bridge','bridge',0,'bridge:complete',true);
 end if;
 return new;
end $$;
create or replace function town.announce_garden_book() returns trigger language plpgsql set search_path='' as $$
declare child_ text;before_ jsonb:=case when tg_op='INSERT' then '[]'::jsonb else coalesce(old.doc->'gardenBook','[]'::jsonb) end;
begin
 if coalesce(new.doc->'gardenBook','[]'::jsonb)=before_ then return new;end if;
 for child_ in select c.v from jsonb_array_elements_text(coalesce(new.doc->'gardenBook','[]'::jsonb)) c(v)
  where not before_?c.v and exists(select 1 from jsonb_array_elements(town.cat('gardening')->'crosses') q(v) where q.v->>2=c.v)
 loop perform town.announce(new.member_id,'cross',child_,0,'cross:'||child_,true);end loop;
 return new;
end $$;
create or replace function town.announce_play() returns trigger language plpgsql set search_path='' as $$
declare subject_ text:=new.doc->>'what';
begin
 if not new.won then return new;end if;
 if new.game='fishing' and new.doc->'kept'='true'::jsonb and town.cat('fish')->subject_->>'tier'='legend' then
  perform town.announce(new.member_id,'legend',subject_,0,'legend:'||subject_,true);
 elsif new.game='cooking' and town.cat('cooking')->'recipes'?subject_ then
  perform town.announce(new.member_id,'recipe',subject_,0,'recipe:'||subject_,true);
 end if;
 return new;
end $$;
create or replace function town.announce_rank() returns trigger language plpgsql set search_path='' as $$
declare level_ integer;mark_ numeric;old_ numeric:=case when tg_op='INSERT' then 0 else coalesce((old.kept->>'points')::numeric,0) end;
begin
 foreach level_ in array array[5,10] loop
  mark_:=(town.cat('work')->'marks'->new.line->>(level_-1))::numeric;
  if old_<mark_ and (new.kept->>'points')::numeric>=mark_ then
   perform town.announce(new.member_id,'rank',new.line,level_,'rank:'||new.member_id||':'||new.line||':'||level_,true);
  end if;
 end loop;
 return new;
end $$;

-- Capture older city-first discoveries without replaying them as new notices.
-- These locks close the gap between the initial snapshot and installing the triggers.
lock table public.town_deeds,public.town_plays,public.town_work,public.town_purses in share row exclusive mode;
do $$ begin
 if not exists(select 1 from public.town_announcement_firsts where event_key='installed:v255') then
  insert into public.town_announcement_firsts(event_key)
  select distinct 'forest:'||d.thing from public.town_deeds d where d.what='gather' and d.n>0 and town.cat('work')->'forest'->'rares'?d.thing
  union select distinct 'legend:'||(p.doc->>'what') from public.town_plays p where p.game='fishing' and p.won and p.doc->'kept'='true'::jsonb and town.cat('fish')->(p.doc->>'what')->>'tier'='legend'
  union select distinct 'recipe:'||(p.doc->>'what') from public.town_plays p where p.game='cooking' and p.won and town.cat('cooking')->'recipes'?(p.doc->>'what')
  union select 'recipe:'||f.key from jsonb_each(coalesce(town.thing('finders',false),'{}'::jsonb)) f where town.cat('cooking')->'recipes'?f.key
  union select 'rank:'||w.member_id||':'||w.line||':'||r.level from public.town_work w cross join (values(5),(10)) r(level) where (w.kept->>'points')::numeric>=(town.cat('work')->'marks'->w.line->>(r.level-1))::numeric
  union select 'cross:'||c.v from public.town_purses p cross join lateral jsonb_array_elements_text(coalesce(p.doc->'gardenBook','[]'::jsonb)) c(v)
  union select 'depth:30' from public.town_deeds d where d.what='delve' and d.doc->'floor'='29'::jsonb
  union select 'bridge:complete' from public.town_deeds d where d.what='stone_lay' and d.doc->>'work'='bridge' and d.doc->'have'=town.cat('bridge')->'need'
  union select 'mineral:'||coalesce(d.doc->>'got',d.thing) from public.town_deeds d where d.what in ('mine','crystal','vein') and d.n>0 and coalesce(d.doc->>'got',d.thing) in ('gemDiamond','wholeGeode','oreSilver')
  on conflict do nothing;
  insert into public.town_announcement_firsts(event_key) values('installed:v255');
 end if;
end $$;
drop trigger if exists town_announce_deed on public.town_deeds;
create trigger town_announce_deed after insert on public.town_deeds for each row execute function town.announce_deed();
drop trigger if exists town_announce_play on public.town_plays;
create trigger town_announce_play after insert on public.town_plays for each row execute function town.announce_play();
drop trigger if exists town_announce_rank on public.town_work;
create trigger town_announce_rank after insert or update of kept on public.town_work for each row execute function town.announce_rank();
drop trigger if exists town_announce_garden_book on public.town_purses;
create trigger town_announce_garden_book after insert or update of doc on public.town_purses for each row execute function town.announce_garden_book();

create or replace function public.town_announcements(p_after bigint default null,p_look text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=town.member();cursor_ bigint;events_ jsonb;
begin
 if p_look ~ '^5[0-9a-z]{7}$' then
  insert into public.town_announcement_faces(member_id,look) values(me,p_look)
  on conflict(member_id) do update set look=excluded.look where public.town_announcement_faces.look is distinct from excluded.look;
 end if;
 select coalesce(max(id),0) into cursor_ from public.town_announcements;
 -- Re-read a short overlap: a slower action may commit an earlier identity after a newer one.
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'at',(extract(epoch from a.at)*1000)::bigint,'member',coalesce(a.member_id::text,'town'),'name',a.name,'kind',a.kind,'subject',a.subject,'level',a.level,'portrait',a.portrait) order by a.id),'[]'::jsonb) into events_
 from (select * from public.town_announcements where id<=cursor_ and (p_after is null or id>p_after or at>now()-interval '2 minutes') and at>now()-interval '24 hours' order by id desc limit case when p_after is null then 30 else 300 end) a;
 return jsonb_build_object('cursor',cursor_,'events',events_);
end $$;
revoke all on function town.announce(uuid,text,text,integer,text,boolean),town.announce_deed(),town.announce_play(),town.announce_rank(),town.announce_garden_book() from public,anon,authenticated;
revoke all on function public.town_announcements(bigint,text) from public,anon;
grant execute on function public.town_announcements(bigint,text) to authenticated;
notify pgrst,'reload schema';
commit;
