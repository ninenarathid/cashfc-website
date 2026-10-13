-- v256: /announce is a production command for Ninenine's account only.
-- Run after v255 and deploy the matching site code. Safe to run twice.
-- Identity is the existing account UUID, not an editable name or a client admin switch.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('public.town_announcements(bigint,text)') is null then raise exception 'Run v255 before v256';end if;
 if not exists(select 1 from public.profiles where id='9c0e6904-df00-452d-b005-dac3fa6cd1d7' and is_admin) then raise exception 'Ninenine admin account is missing: review v256';end if;
end $$;

alter table public.town_announcements drop constraint if exists town_announcements_kind_check;
alter table public.town_announcements add constraint town_announcements_kind_check check(kind in ('forge','rank','legend','forest','recipe','cross','depth','bridge','lamps','admin'));
alter table public.town_announcements drop constraint if exists town_announcements_admin_text_check;
alter table public.town_announcements add constraint town_announcements_admin_text_check check(kind<>'admin' or (level=0 and char_length(btrim(subject)) between 1 and 280 and subject!~'[[:cntrl:]]'));
create index if not exists town_announcements_admin_at on public.town_announcements(member_id,at desc) where kind='admin';

-- Tabs still running v255 do not understand custom text. Keep their feed on the older event kinds.
do $$ begin
 if to_regprocedure('public.town_announcements_v256(bigint,text)') is null then
  alter function public.town_announcements(bigint,text) rename to town_announcements_v256;
 end if;
end $$;
create or replace function public.town_announcements(p_after bigint default null,p_look text default null) returns jsonb
language sql security definer set search_path='' as $$
 select p.page||jsonb_build_object('events',coalesce((select jsonb_agg(e.value order by e.ord)
  from jsonb_array_elements(p.page->'events') with ordinality e(value,ord) where e.value->>'kind'<>'admin'),'[]'::jsonb))
 from (select public.town_announcements_v256(p_after,p_look) as page) p
$$;
revoke all on function public.town_announcements(bigint,text),public.town_announcements_v256(bigint,text) from public,anon,authenticated;
grant execute on function public.town_announcements(bigint,text),public.town_announcements_v256(bigint,text) to authenticated;

create or replace function public.town_admin_announce(p_message text,p_request uuid,p_look text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();text_ text:=btrim(p_message);key_ text;id_ bigint;prior_ text;
begin
 if me is distinct from '9c0e6904-df00-452d-b005-dac3fa6cd1d7'::uuid or not exists(select 1 from public.profiles p where p.id=me and p.is_admin) then
  return jsonb_build_object('ok',false,'why','forbidden');
 end if;
 if p_request is null or text_ is null or char_length(text_) not between 1 and 280 or text_~'[[:cntrl:]]' then
  return jsonb_build_object('ok',false,'why','message');
 end if;
 perform pg_advisory_xact_lock(hashtext('town.admin_announce'),hashtext(me::text));
 key_:='admin:'||me||':'||p_request;
 select a.id,a.subject into id_,prior_ from public.town_announcements a where a.event_key=key_;
 if id_ is not null then
  if prior_<>text_ then return jsonb_build_object('ok',false,'why','message');end if;
  return jsonb_build_object('ok',true,'id',id_);
 end if;
 if exists(select 1 from public.town_announcements a where a.member_id=me and a.kind='admin' and a.at>clock_timestamp()-interval '5 seconds') then
  return jsonb_build_object('ok',false,'why','slow');
 end if;
 if p_look~'^5[0-9a-z]{7}$' then
  insert into public.town_announcement_faces(member_id,look) values(me,p_look)
  on conflict(member_id) do update set look=excluded.look where public.town_announcement_faces.look is distinct from excluded.look;
 end if;
 perform town.announce(me,'admin',text_,0,key_,false);
 select a.id into id_ from public.town_announcements a where a.event_key=key_;
 return jsonb_build_object('ok',true,'id',id_);
end $$;
revoke all on function public.town_admin_announce(text,uuid,text) from public,anon,authenticated;
grant execute on function public.town_admin_announce(text,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
-- Expected: anon=false, authenticated=true. The RPC itself permits only Ninenine's admin UUID.
select has_function_privilege('anon','public.town_admin_announce(text,uuid,text)','execute') as anon,
 has_function_privilege('authenticated','public.town_admin_announce(text,uuid,text)','execute') as authenticated;
