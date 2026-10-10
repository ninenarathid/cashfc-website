-- v183: a freely removable hook slot in the bag's rod equipment.
-- Run after v179 and the matching site deploy. Safe to run twice.
-- Selection leaves the hook in the bag: no fees, stamina costs or inventory transfers.
begin;
create or replace function town.fit_hook(p_purse jsonb, p_item text)
returns jsonb language plpgsql stable set search_path = '' as $$
begin
  if p_item is not null and (
    p_item not in ('hookScale', 'hookSteel', 'hookTwin')
    or not exists (select 1 from jsonb_array_elements(p_purse->'bag') s where s->>'item' in ('rod','rodTeak','rodMaster') and (s->>'n')::numeric > 0)
    or town.held(p_purse->'bag', p_item) < 1
  ) then return town.no('none'); end if;
  return jsonb_build_object('ok',true,'purse',p_purse || jsonb_build_object('fishingHook',p_item));
end;
$$;
revoke all on function town.fit_hook(jsonb,text) from public, anon, authenticated;

create or replace function public.town_fishing_hook(p_item text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me,true);
  did jsonb;
begin
  -- The same purse lock used by other inventory deeds serializes fitting with selling and storage.
  perform 1 from public.town_purses p where p.member_id = me for update;
  purse := town.purse_of(me,true);
  did := town.fit_hook(purse,p_item);
  if coalesce((did->>'ok')::boolean,false) then perform town.keep_purse(me,did->'purse'); end if;
  return town.answer(me,did-'purse');
end;
$$;
revoke all on function public.town_fishing_hook(text) from public, anon, authenticated;
grant execute on function public.town_fishing_hook(text) to authenticated;
notify pgrst, 'reload schema';
commit;
-- Expected: member-only RPC and private helper; installation changes no purse or catalog entry.
select has_function_privilege('anon','public.town_fishing_hook(text)','EXECUTE') as anon_hook,
       has_function_privilege('authenticated','public.town_fishing_hook(text)','EXECUTE') as member_hook,
       has_function_privilege('authenticated','town.fit_hook(jsonb,text)','EXECUTE') as helper;
