-- v180: a workshop for the tools beyond the first tier.
-- Deploy the matching site first. Safe to run twice; no existing inventory is rewritten.
-- The receipt makes a lost response safe to retry. Every result is made from materials,
-- so an older tool's forging, gems and makers never disappear in an upgrade.
begin;

create table if not exists town.craft_receipts (
  member_id uuid not null references public.profiles(id) on delete cascade,
  request uuid not null,
  item text not null,
  fee integer not null check (fee >= 0),
  at bigint not null,
  primary key (member_id, request)
);
alter table town.craft_receipts enable row level security;
revoke all on town.craft_receipts from public, anon, authenticated;

-- <workshop-catalog>
-- <catalog:v180> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('workshop', $town${
    "cost": 4,
    "recipes": {"jar":{"needs":[["clay",6],["stone",2]],"fee":45},"wok":{"needs":[["oreIron",3],["timber",1]],"fee":80},"apron":{"needs":[["silkCocoon",4],["vine",2]],"fee":40},"mortar":{"needs":[["stone",8],["timber",1]],"fee":55},"sickle":{"needs":[["oreIron",2],["timber",1]],"fee":50},"cleaver":{"needs":[["oreIron",3],["timber",1],["resin",1]],"fee":55},"hoeIron":{"needs":[["oreIron",4],["timber",2]],"fee":75},"rodTeak":{"needs":[["timber",3],["silkCocoon",3],["oreIron",1]],"fee":90},"steamer":{"needs":[["bambooCane",4],["vine",2]],"fee":70},"netSmall":{"needs":[["bambooCane",2],["silkCocoon",4]],"fee":45},"sushiMat":{"needs":[["bambooCane",3],["vine",3]],"fee":50},"canCopper":{"needs":[["oreCopper",4],["resin",1]],"fee":60},"hookSteel":{"needs":[["oreIron",2],["charcoal",1]],"fee":40},"lineBraid":{"needs":[["silkCocoon",4],["vine",2]],"fee":40},"stoneBowl":{"needs":[["stone",6],["clay",2]],"fee":70},"bucketIron":{"needs":[["oreIron",4],["timber",1]],"fee":30},"floatQuill":{"needs":[["feather",4],["bambooCane",1],["resin",1]],"fee":40},"rollingPin":{"needs":[["timber",2],["resin",1]],"fee":45},"tok":{"needs":[["bambooCane",6],["rope",2]],"fee":60},"oven":{"needs":[["clay",12],["stone",8],["oreIron",2]],"fee":240},"ladle":{"needs":[["timber",2],["oreCopper",1]],"fee":20},"hotpot":{"needs":[["oreCopper",6],["oreIron",3],["charcoal",2]],"fee":200},"shears":{"needs":[["oreIron",4],["charcoal",2],["timber",1]],"fee":110},"netLong":{"needs":[["bambooCane",4],["silkCocoon",8],["rope",2]],"fee":100},"canBrass":{"needs":[["oreCopper",6],["oreSilver",2],["resin",2]],"fee":140},"hoeSteel":{"needs":[["oreIron",6],["charcoal",3],["timber",3]],"fee":160},"hookTwin":{"needs":[["oreIron",4],["oreSilver",1],["charcoal",2]],"fee":90},"lineSilk":{"needs":[["silkCocoon",8],["resin",2],["vine",2]],"fee":90},"panBrass":{"needs":[["oreCopper",6],["oreSilver",2],["timber",2]],"fee":170},"potBrass":{"needs":[["oreCopper",8],["oreSilver",2]],"fee":180},"stoveBig":{"needs":[["clay",10],["oreIron",5],["stone",4]],"fee":150},"floatBell":{"needs":[["oreCopper",2],["oreSilver",1],["bambooCane",2]],"fee":90},"rodMaster":{"needs":[["timber",6],["silkCocoon",6],["oreSilver",2]],"fee":220},"steamerBamboo":{"needs":[["bambooCane",8],["rope",2],["timber",2]],"fee":130}}
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v180>
-- </workshop-catalog>

create or replace function town.craft(p_purse jsonb, p_item text, p_now bigint)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  rules jsonb := town.cat('workshop');
  recipe jsonb := rules->'recipes'->p_item;
  bag jsonb := p_purse->'bag';
  part jsonb;
  fee integer := (recipe->>'fee')::integer;
  made jsonb;
begin
  if recipe is null then return town.no('none'); end if;
  if (p_purse->>'coins')::numeric < fee then return town.no('coins'); end if;
  for part in select x.v from jsonb_array_elements(recipe->'needs') x(v) loop
    if town.held(bag, part->>0) < (part->>1)::numeric then return town.no('none'); end if;
  end loop;
  for part in select x.v from jsonb_array_elements(recipe->'needs') x(v) loop
    bag := town.take(bag, part->>0, (part->>1)::integer);
  end loop;
  if town.room(bag, p_item) < 1 then return town.no('full'); end if;
  made := coalesce(p_purse->'crafted', '[]'::jsonb);
  if not made ? p_item then made := made || to_jsonb(p_item); end if;
  return jsonb_build_object('ok',true,'item',p_item,'n',1,'fee',fee,
    'purse',town.spend(p_purse,(rules->>'cost')::double precision,p_now)
      || jsonb_build_object('coins',(p_purse->>'coins')::numeric-fee,'bag',town.put(bag,p_item,1),'crafted',made));
end;
$$;
revoke all on function town.craft(jsonb,text,bigint) from public, anon, authenticated;

create or replace function public.town_craft(p_item text, p_request uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  purse jsonb;
  receipt town.craft_receipts%rowtype;
  did jsonb;
begin
  if p_item is null or char_length(p_item) > 80 or p_request is null then return town.answer(me,town.no('none')); end if;
  -- purse_of creates a new member's purse when necessary; lock its row before reading materials.
  perform town.purse_of(me,true);
  perform 1 from public.town_purses p where p.member_id=me for update;
  purse := town.purse_of(me,true);
  select * into receipt from town.craft_receipts r where r.member_id=me and r.request=p_request;
  if found then
    if receipt.item is distinct from p_item then return town.answer(me,town.no('none')); end if;
    return town.answer(me,jsonb_build_object('ok',true,'item',receipt.item,'n',1,'fee',receipt.fee,'repeated',true));
  end if;
  did := town.craft(purse,p_item,now_);
  if coalesce((did->>'ok')::boolean,false) then
    perform town.keep_purse(me,did->'purse');
    insert into town.craft_receipts(member_id,request,item,fee,at) values(me,p_request,p_item,(did->>'fee')::integer,now_);
    perform town.note(me,'craft',p_item,1,0,jsonb_build_object('fee',did->'fee'));
  end if;
  return town.answer(me,did-'purse');
end;
$$;
revoke all on function public.town_craft(text,uuid) from public, anon, authenticated;
grant execute on function public.town_craft(text,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
-- Expected: 34 recipes; existing tools, coins and inventories are untouched by installation.
select count(*) from public.town_catalog c, jsonb_object_keys(c.data->'recipes') r where c.key='workshop';
