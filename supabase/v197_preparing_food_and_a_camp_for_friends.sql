-- v197: preparation decisions, 25 kitchen items, 25 helper items and finite shared camps.
-- Run after v196 and the matching site. v194/v195 are independent.
-- Safe to run twice. Existing inventories, coins, meals, gifts and camp scenery are preserved.
begin;
do $guard$ begin
 if town.cat('stream_work') is null then raise exception 'Run v196 first';end if;
 if md5(replace(pg_get_functiondef('town.work_counts_of(jsonb,text)'::regprocedure),chr(13),'')) not in ('151e1206ec15cf3d4e8c414962f9e6d5','db20b680ffd5aa49cc512ccac747cb23') then raise exception 'Definition changed: town.work_counts_of(jsonb,text); rebuild v197 on current text';end if;
end $guard$;
update public.town_catalog set data=data||$field${"dicedRoot":{"kind":"staple","tier":2,"stack":20,"pays":8},"emberRice":{"kind":"staple","tier":2,"stack":20,"pays":9},"brownedOnion":{"kind":"staple","tier":2,"stack":20,"pays":10},"driedZest":{"kind":"staple","tier":2,"stack":20,"pays":10},"crushedHerb":{"kind":"staple","tier":2,"stack":20,"pays":10},"fishStock":{"kind":"staple","tier":2,"stack":20,"pays":13},"roastedSeed":{"kind":"staple","tier":2,"stack":20,"pays":12},"whiskedEgg":{"kind":"staple","tier":2,"stack":20,"pays":12},"fragrantOil":{"kind":"staple","tier":2,"stack":20,"pays":18},"smokedSalt":{"kind":"staple","tier":2,"stack":20,"pays":17},"fermentStarter":{"kind":"staple","tier":3,"stack":20,"pays":20},"brightSauce":{"kind":"staple","tier":3,"stack":20,"pays":22},"thickBroth":{"kind":"staple","tier":3,"stack":20,"pays":22},"sweetGlaze":{"kind":"staple","tier":3,"stack":20,"pays":23},"spicePaste":{"kind":"staple","tier":3,"stack":20,"pays":24},"prepBoard":{"kind":"tool","tier":2,"stack":1,"pays":31},"tastingSpoon":{"kind":"tool","tier":2,"stack":1,"pays":32},"scentLid":{"kind":"tool","tier":2,"stack":1,"pays":34},"heatBell":{"kind":"tool","tier":2,"stack":1,"pays":35},"fermentCrock":{"kind":"tool","tier":3,"stack":1,"pays":38},"cookTimer":{"kind":"tool","tier":3,"stack":1,"pays":36},"layeredRootPot":{"kind":"dish","tier":3,"stack":20,"pays":33},"crispRiceSkillet":{"kind":"dish","tier":3,"stack":20,"pays":34},"slowFishBroth":{"kind":"dish","tier":3,"stack":20,"pays":36},"glazedForestBowl":{"kind":"dish","tier":3,"stack":20,"pays":37},"trailRation":{"kind":"goods","tier":2,"stack":20,"pays":18},"mintPoultice":{"kind":"goods","tier":2,"stack":20,"pays":19},"repairBundle":{"kind":"goods","tier":2,"stack":20,"pays":20},"seedPacket":{"kind":"goods","tier":2,"stack":20,"pays":18},"waterPack":{"kind":"goods","tier":2,"stack":20,"pays":20},"dryTinder":{"kind":"goods","tier":2,"stack":20,"pays":16},"campCanvas":{"kind":"goods","tier":2,"stack":20,"pays":22},"signalCord":{"kind":"goods","tier":2,"stack":20,"pays":18},"warmBlanket":{"kind":"goods","tier":3,"stack":20,"pays":27},"fieldBandage":{"kind":"goods","tier":3,"stack":20,"pays":25},"travelBiscuit":{"kind":"goods","tier":3,"stack":20,"pays":24},"sharedTea":{"kind":"goods","tier":3,"stack":20,"pays":25},"soilCarePack":{"kind":"goods","tier":3,"stack":20,"pays":26},"toolCareOil":{"kind":"goods","tier":3,"stack":20,"pays":26},"trailMarker":{"kind":"goods","tier":3,"stack":20,"pays":27},"campKit":{"kind":"tool","tier":2,"stack":1,"pays":40},"provisionChest":{"kind":"tool","tier":2,"stack":1,"pays":38},"fieldKettle":{"kind":"tool","tier":2,"stack":1,"pays":36},"campLantern":{"kind":"tool","tier":3,"stack":1,"pays":39},"weatherAwning":{"kind":"tool","tier":3,"stack":1,"pays":43},"signalPennant":{"kind":"tool","tier":3,"stack":1,"pays":41},"sharePorridge":{"kind":"dish","tier":3,"stack":20,"pays":31},"travelerSoup":{"kind":"dish","tier":3,"stack":20,"pays":33},"friendRice":{"kind":"dish","tier":3,"stack":20,"pays":35},"restTea":{"kind":"dish","tier":3,"stack":20,"pays":34},"scrollLayeredRootPot":{"kind":"scroll","tier":3,"stack":20,"pays":12},"scrollCrispRiceSkillet":{"kind":"scroll","tier":3,"stack":20,"pays":12},"scrollSlowFishBroth":{"kind":"scroll","tier":3,"stack":20,"pays":12},"scrollGlazedForestBowl":{"kind":"scroll","tier":3,"stack":20,"pays":12},"scrollSharePorridge":{"kind":"scroll","tier":3,"stack":20,"pays":12},"scrollTravelerSoup":{"kind":"scroll","tier":3,"stack":20,"pays":12},"scrollFriendRice":{"kind":"scroll","tier":3,"stack":20,"pays":12},"scrollRestTea":{"kind":"scroll","tier":3,"stack":20,"pays":12}}$field$::jsonb,updated_at=now() where key='items';
update public.town_catalog set data=data||$field${"dicedRoot":{"needs":[["carrot",2],["daikon",1]],"in":["cleaver"],"gives":2},"emberRice":{"needs":[["rice",2],["pineNut",1]],"in":["pan"],"gives":2},"brownedOnion":{"needs":[["scallion",2]],"in":["pan"],"gives":2},"driedZest":{"needs":[["lime",2]],"in":["pan"],"gives":2},"crushedHerb":{"needs":[["waterMint",2]],"in":["mortar"],"gives":2},"fishStock":{"needs":[["minnow",2],["clearSpring",1]],"in":["pot"],"gives":2},"roastedSeed":{"needs":[["berryPip",2]],"in":["pan"],"gives":2},"whiskedEgg":{"needs":[["egg",2]],"in":["jar"],"gives":2},"fragrantOil":{"needs":[["crushedHerb",2],["berrySeedOil",1]],"in":["pot"],"gives":2},"smokedSalt":{"needs":[["springSalt",2],["charcoal",1]],"in":["pan"],"gives":2},"fermentStarter":{"needs":[["sporeCulture",1],["rice",2]],"in":["fermentCrock"],"gives":2},"brightSauce":{"needs":[["driedZest",1],["wildStrawberry",2],["sugar",1]],"in":["pot"],"gives":2},"thickBroth":{"needs":[["fishStock",2],["brownedOnion",1]],"in":["pot"],"gives":2},"sweetGlaze":{"needs":[["brightSauce",1],["sugar",2]],"in":["pot"],"gives":2},"spicePaste":{"needs":[["crushedHerb",1],["chili",2],["fragrantOil",1]],"in":["mortar"],"gives":2}}$field$::jsonb,updated_at=now() where key='makes';
update public.town_catalog set data=data||$field${"layeredRootPot":{"stamina":35,"buff":"seasoning","recipe":{"needs":[["dicedRoot",2],["thickBroth",1],["spicePaste",1]],"in":["pot"],"serves":3,"cooks":1}},"crispRiceSkillet":{"stamina":36,"buff":"seasoning","recipe":{"needs":[["emberRice",2],["whiskedEgg",1],["smokedSalt",1],["roastedSeed",1]],"in":["pan"],"serves":3,"cooks":1}},"slowFishBroth":{"stamina":38,"buff":"seasoning","recipe":{"needs":[["thickBroth",2],["fragrantOil",1],["fermentStarter",1]],"in":["pot"],"serves":3,"cooks":1}},"glazedForestBowl":{"stamina":40,"buff":"seasoning","recipe":{"needs":[["emberRice",2],["shiitake",2],["sweetGlaze",1]],"in":["pan"],"serves":3,"cooks":1}},"sharePorridge":{"stamina":32,"buff":"campPreparation","recipe":{"needs":[["emberRice",2],["herbalWater",1],["dicedRoot",1]],"in":["pot"],"serves":4,"cooks":1}},"travelerSoup":{"stamina":35,"buff":"campPreparation","recipe":{"needs":[["thickBroth",1],["dicedRoot",2],["smokedSalt",1]],"in":["pot"],"serves":4,"cooks":1}},"friendRice":{"stamina":36,"buff":"campPreparation","recipe":{"needs":[["emberRice",2],["dicedRoot",1],["fragrantOil",1]],"in":["pan"],"serves":4,"cooks":1}},"restTea":{"stamina":34,"buff":"campPreparation","recipe":{"needs":[["herbalWater",2],["driedZest",1],["sweetGlaze",1]],"in":["fieldKettle"],"serves":4,"cooks":1}}}$field$::jsonb,updated_at=now() where key='dishes';
update public.town_catalog set data=data||$field${"scrollLayeredRootPot":"layeredRootPot","scrollCrispRiceSkillet":"crispRiceSkillet","scrollSlowFishBroth":"slowFishBroth","scrollGlazedForestBowl":"glazedForestBowl","scrollSharePorridge":"sharePorridge","scrollTravelerSoup":"travelerSoup","scrollFriendRice":"friendRice","scrollRestTea":"restTea"}$field$::jsonb,updated_at=now() where key='scrolls';
update public.town_catalog set data=jsonb_set(data,'{buffs}',coalesce(data#>'{buffs}','{}'::jsonb)||$field${"seasoning":1,"campPreparation":1.5}$field$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{steps}',coalesce(data#>'{steps}','{}'::jsonb)||$field${"seasoning":[1,1,1,1],"campPreparation":[1.5,1.75,2,2]}$field$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data#>'{recipes}','[]'::jsonb)||coalesce((select jsonb_agg(x.v order by x.ord) from jsonb_array_elements($field$["dicedRoot","emberRice","brownedOnion","driedZest","crushedHerb","fishStock","roastedSeed","whiskedEgg","fragrantOil","smokedSalt","fermentStarter","brightSauce","thickBroth","sweetGlaze","spicePaste","layeredRootPot","crispRiceSkillet","slowFishBroth","glazedForestBowl","sharePorridge","travelerSoup","friendRice","restTea"]$field$::jsonb) with ordinality x(v,ord) where not coalesce(data#>'{recipes}','[]'::jsonb)@>jsonb_build_array(x.v)),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{cookware}',coalesce(data#>'{cookware}','[]'::jsonb)||coalesce((select jsonb_agg(x.v order by x.ord) from jsonb_array_elements($field$["fermentCrock","fieldKettle"]$field$::jsonb) with ordinality x(v,ord) where not coalesce(data#>'{cookware}','[]'::jsonb)@>jsonb_build_array(x.v)),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{needs}',coalesce(data#>'{needs}','{}'::jsonb)||$field${"dicedRoot":{"carrot":2,"daikon":1},"emberRice":{"pineNut":1,"rice":2},"brownedOnion":{"scallion":2},"driedZest":{"lime":2},"crushedHerb":{"waterMint":2},"fishStock":{"clearSpring":1,"minnow":2},"roastedSeed":{"berryPip":2},"whiskedEgg":{"egg":2},"fragrantOil":{"berrySeedOil":1,"crushedHerb":2},"smokedSalt":{"charcoal":1,"springSalt":2},"fermentStarter":{"rice":2,"sporeCulture":1},"brightSauce":{"driedZest":1,"sugar":1,"wildStrawberry":2},"thickBroth":{"brownedOnion":1,"fishStock":2},"sweetGlaze":{"brightSauce":1,"sugar":2},"spicePaste":{"chili":2,"crushedHerb":1,"fragrantOil":1},"layeredRootPot":{"dicedRoot":2,"spicePaste":1,"thickBroth":1},"crispRiceSkillet":{"emberRice":2,"roastedSeed":1,"smokedSalt":1,"whiskedEgg":1},"slowFishBroth":{"fermentStarter":1,"fragrantOil":1,"thickBroth":2},"glazedForestBowl":{"emberRice":2,"shiitake":2,"sweetGlaze":1},"sharePorridge":{"dicedRoot":1,"emberRice":2,"herbalWater":1},"travelerSoup":{"dicedRoot":2,"smokedSalt":1,"thickBroth":1},"friendRice":{"dicedRoot":1,"emberRice":2,"fragrantOil":1},"restTea":{"driedZest":1,"herbalWater":2,"sweetGlaze":1}}$field$::jsonb),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{bowled}',coalesce(data#>'{bowled}','[]'::jsonb)||coalesce((select jsonb_agg(x.v order by x.ord) from jsonb_array_elements($field$["layeredRootPot","crispRiceSkillet","slowFishBroth","glazedForestBowl","sharePorridge","travelerSoup","friendRice","restTea"]$field$::jsonb) with ordinality x(v,ord) where not coalesce(data#>'{bowled}','[]'::jsonb)@>jsonb_build_array(x.v)),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{putIn,also}',coalesce(data#>'{putIn,also}','[]'::jsonb)||coalesce((select jsonb_agg(x.v order by x.ord) from jsonb_array_elements($field$["charcoal"]$field$::jsonb) with ordinality x(v,ord) where not coalesce(data#>'{putIn,also}','[]'::jsonb)@>jsonb_build_array(x.v)),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{ids}',coalesce(data#>'{ids}','[]'::jsonb)||coalesce((select jsonb_agg(x.v order by x.ord) from jsonb_array_elements($field$[["dicedRoot",5],["emberRice",0],["brownedOnion",0],["driedZest",28],["crushedHerb",0],["fishStock",0],["roastedSeed",0],["whiskedEgg",0],["fragrantOil",0],["smokedSalt",0],["layeredRootPot",5],["crispRiceSkillet",0],["slowFishBroth",0],["glazedForestBowl",28],["sharePorridge",5],["travelerSoup",5],["friendRice",5],["restTea",28],["fermentStarter",0],["brightSauce",28],["thickBroth",0],["sweetGlaze",28],["spicePaste",0]]$field$::jsonb) with ordinality x(v,ord) where not coalesce(data#>'{ids}','[]'::jsonb)@>jsonb_build_array(x.v)),'[]'::jsonb)),updated_at=now() where key='hints';
update public.town_catalog set data=jsonb_set(data,'{kitchen,pot}',coalesce(data#>'{kitchen,pot}','{}'::jsonb)||$field${"dicedRoot":1,"emberRice":1,"brownedOnion":1,"driedZest":1,"crushedHerb":1,"fishStock":1,"roastedSeed":1,"whiskedEgg":1,"fragrantOil":1,"smokedSalt":1,"fermentStarter":1,"brightSauce":1,"thickBroth":1,"sweetGlaze":1,"spicePaste":1,"layeredRootPot":3,"crispRiceSkillet":3,"slowFishBroth":3,"glazedForestBowl":3,"sharePorridge":4,"travelerSoup":4,"friendRice":4,"restTea":4}$field$::jsonb),updated_at=now() where key='work';
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data#>'{recipes}','{}'::jsonb)||$field${"prepBoard":{"needs":[["splitPlank",2],["oreIron",1]],"fee":31},"tastingSpoon":{"needs":[["heartwood",1],["petalDye",1]],"fee":32},"scentLid":{"needs":[["oreCopper",3],["resin",1]],"fee":34},"heatBell":{"needs":[["oreCopper",2],["oreSilver",1],["reedPith",1]],"fee":35},"fermentCrock":{"needs":[["wetClay",5],["sporeCulture",1],["silkenCord",1]],"fee":38},"cookTimer":{"needs":[["splitPlank",2],["oreCopper",2],["crystalLens",1]],"fee":36},"trailRation":{"needs":[["emberRice",2],["driedFern",1]],"fee":18},"mintPoultice":{"needs":[["waterMint",2],["silkCocoon",1]],"fee":19},"repairBundle":{"needs":[["splitPlank",1],["rootTwine",1]],"fee":20},"seedPacket":{"needs":[["berryPip",2],["bambooSheath",1]],"fee":18},"waterPack":{"needs":[["clearSpring",2],["reedPith",1]],"fee":20},"dryTinder":{"needs":[["pineBark",2],["resin",1]],"fee":16},"campCanvas":{"needs":[["silkCocoon",3],["silkenCord",1]],"fee":22},"signalCord":{"needs":[["rootTwine",2],["petalDye",1]],"fee":18},"warmBlanket":{"needs":[["campCanvas",2],["mossFilter",1]],"fee":27},"fieldBandage":{"needs":[["mintPoultice",1],["campCanvas",1]],"fee":25},"travelBiscuit":{"needs":[["bulbPowder",1],["sweetGlaze",1]],"fee":24},"sharedTea":{"needs":[["herbalWater",2],["waterMint",1]],"fee":25},"soilCarePack":{"needs":[["seedPacket",1],["compost",2]],"fee":26},"toolCareOil":{"needs":[["berrySeedOil",1],["rootExtract",1]],"fee":26},"trailMarker":{"needs":[["splitPlank",1],["signalCord",1]],"fee":27},"campKit":{"needs":[["campCanvas",2],["splitPlank",2],["signalCord",1]],"fee":40},"provisionChest":{"needs":[["splitPlank",4],["oreIron",1]],"fee":38},"fieldKettle":{"needs":[["oreCopper",3],["heartwood",1]],"fee":36},"campLantern":{"needs":[["oreCopper",2],["beeswax",2],["crystalLens",1]],"fee":39},"weatherAwning":{"needs":[["campCanvas",3],["splitPlank",2]],"fee":43},"signalPennant":{"needs":[["splitPlank",1],["signalCord",2],["petalDye",1]],"fee":41}}$field$::jsonb),updated_at=now() where key='workshop';
insert into public.town_catalog(key,data) values('preparation',$field${"cost":4,"minMs":2000,"minutes":3,"stations":[[43,41],[44,41],[45,41],[44,42],[45,42],[46,42],[41,43],[44,43],[47,43],[42,44],[43,44],[46,44],[40,45],[41,45],[42,45],[43,45],[44,45],[45,45],[38,46],[41,46],[42,46],[45,46],[39,47],[40,47],[46,47],[37,48],[39,48],[42,48],[43,48],[45,48],[46,48],[38,49],[39,49],[40,49],[41,49],[44,49],[45,49],[193,159]],"reach":1,"farStations":[[193,159]],"recipes":{"dicedRoot":{"needs":[["carrot",2],["daikon",1]],"in":["cleaver"],"gives":2},"emberRice":{"needs":[["rice",2],["pineNut",1]],"in":["pan"],"gives":2},"brownedOnion":{"needs":[["scallion",2]],"in":["pan"],"gives":2},"driedZest":{"needs":[["lime",2]],"in":["pan"],"gives":2},"crushedHerb":{"needs":[["waterMint",2]],"in":["mortar"],"gives":2},"fishStock":{"needs":[["minnow",2],["clearSpring",1]],"in":["pot"],"gives":2},"roastedSeed":{"needs":[["berryPip",2]],"in":["pan"],"gives":2},"whiskedEgg":{"needs":[["egg",2]],"in":["jar"],"gives":2},"fragrantOil":{"needs":[["crushedHerb",2],["berrySeedOil",1]],"in":["pot"],"gives":2},"smokedSalt":{"needs":[["springSalt",2],["charcoal",1]],"in":["pan"],"gives":2},"fermentStarter":{"needs":[["sporeCulture",1],["rice",2]],"in":["fermentCrock"],"gives":2},"brightSauce":{"needs":[["driedZest",1],["wildStrawberry",2],["sugar",1]],"in":["pot"],"gives":2},"thickBroth":{"needs":[["fishStock",2],["brownedOnion",1]],"in":["pot"],"gives":2},"sweetGlaze":{"needs":[["brightSauce",1],["sugar",2]],"in":["pot"],"gives":2},"spicePaste":{"needs":[["crushedHerb",1],["chili",2],["fragrantOil",1]],"in":["mortar"],"gives":2}},"methods":{"dicedRoot":0,"emberRice":2,"brownedOnion":0,"driedZest":0,"crushedHerb":1,"fishStock":2,"roastedSeed":2,"whiskedEgg":2,"fragrantOil":1,"smokedSalt":1,"fermentStarter":2,"brightSauce":1,"thickBroth":2,"sweetGlaze":2,"spicePaste":1},"heat":{"dicedRoot":0,"emberRice":2,"brownedOnion":2,"driedZest":1,"crushedHerb":0,"fishStock":1,"roastedSeed":2,"whiskedEgg":0,"fragrantOil":1,"smokedSalt":1,"fermentStarter":0,"brightSauce":1,"thickBroth":1,"sweetGlaze":1,"spicePaste":0},"finish":{"dicedRoot":0,"emberRice":1,"brownedOnion":1,"driedZest":0,"crushedHerb":0,"fishStock":2,"roastedSeed":1,"whiskedEgg":0,"fragrantOil":2,"smokedSalt":1,"fermentStarter":0,"brightSauce":2,"thickBroth":2,"sweetGlaze":2,"spicePaste":0}}$field$::jsonb) on conflict(key) do update set data=excluded.data,updated_at=now();
insert into public.town_catalog(key,data) values('camps',$field${"sites":[[190,162],[196,162],[11,216],[34,238],[58,230]],"reach":2,"cost":4,"minutes":30,"awningMinutes":45,"charges":3,"chestCharges":5,"benefitMinutes":10,"daily":3,"supplies":{"trailRation":"calm","mintPoultice":"scent","repairBundle":"layers","seedPacket":"pollen","waterPack":"waterProperty","dryTinder":"grain","campCanvas":"calm","signalCord":"traces","warmBlanket":"hearty","fieldBandage":"green","travelBiscuit":"keen","sharedTea":"calm","soilCarePack":"pollen","toolCareOil":"grain","trailMarker":"traces"}}$field$::jsonb) on conflict(key) do update set data=excluded.data,updated_at=now();
create table if not exists public.town_preparation_run(member_id uuid primary key references public.profiles(id) on delete cascade,run jsonb not null);
create table if not exists public.town_field_camps(site integer primary key,camp jsonb not null);
create table if not exists public.town_field_receipts(member_id uuid not null references public.profiles(id) on delete cascade,request_id uuid not null,kind text not null,at_ms bigint not null,primary key(member_id,request_id));
create index if not exists town_field_receipts_member_time on public.town_field_receipts(member_id,at_ms);
alter table public.town_preparation_run enable row level security;
alter table public.town_field_camps enable row level security;
alter table public.town_field_receipts enable row level security;
revoke all on public.town_preparation_run,public.town_field_camps,public.town_field_receipts from public,anon,authenticated;

create or replace function town.preparation_ready(p_purse jsonb,p_recipe text,p_x integer,p_y integer)
returns text language plpgsql stable set search_path='' as $$
declare k jsonb:=town.cat('preparation');r jsonb:=k->'recipes'->p_recipe;n jsonb;
begin
 if p_x is null or p_y is null or not exists(select 1 from jsonb_array_elements(k->'stations') s(v) where greatest(abs((s.v->>0)::numeric-p_x),abs((s.v->>1)::numeric-p_y))<=(k->>'reach')::numeric) then return 'far';end if;
 if r is null then return 'none';end if;
 if town.held(p_purse->'bag','prepBoard')<1 then return 'tool';end if;
 for n in select v from jsonb_array_elements(r->'in') a(v) loop if town.held(p_purse->'bag',n#>>'{}')<1 then return 'tool';end if;end loop;
 for n in select v from jsonb_array_elements(r->'needs') a(v) loop if town.held(p_purse->'bag',n->>0)<(n->>1)::numeric then return 'none';end if;end loop;
 return null;
end $$;
create or replace function town.prepare(p_purse jsonb,p_run jsonb,p_id uuid,p_answers jsonb,p_x integer,p_y integer,p_now bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare k jsonb:=town.cat('preparation');id_ text:=p_run->>'recipe';r jsonb:=k->'recipes'->id_;refused text;mistakes integer:=0;key_ text;n jsonb;bag jsonb:=p_purse->'bag';item_ text;count_ integer;out_ jsonb;can_adjust boolean;book jsonb;made_ jsonb;
begin
 if p_run is null or p_run->>'id' is distinct from p_id::text or p_now<(p_run->>'at')::bigint+(k->>'minMs')::bigint or p_now>(p_run->>'until')::bigint then return town.no('none');end if;
 if p_x is null or p_y is null or (p_run->'tile'->>0)::integer<>p_x or (p_run->'tile'->>1)::integer<>p_y then return town.no('far');end if;
 refused:=town.preparation_ready(p_purse,id_,p_x,p_y);if refused is not null then return town.no(refused);end if;
 if jsonb_typeof(p_answers) is distinct from 'object' then return town.no('none');end if;
 if p_answers ? 'correction' and jsonb_typeof(p_answers->'correction')<>'boolean' then return town.no('none');end if;
 foreach key_ in array array['method','heat','finish'] loop
   if jsonb_typeof(p_answers->key_) is distinct from 'number' then return town.no('none');end if;
   if (p_answers->>key_)::numeric<>floor((p_answers->>key_)::numeric) or (p_answers->>key_)::numeric not between 0 and 2 then return town.no('none');end if;
   if (p_answers->>key_)::integer<>(k->case when key_='method' then 'methods' else key_ end->>id_)::integer then mistakes:=mistakes+1;end if;
 end loop;
 can_adjust:=greatest(case when town.held(bag,'tastingSpoon')>0 then 1 else 0 end,town.buff_by(p_purse,p_now,'seasoning'))>0;
 if p_answers->'correction'='true'::jsonb then if not can_adjust then return town.no('tool');end if;mistakes:=greatest(0,mistakes-1);end if;
 for n in select v from jsonb_array_elements(r->'needs') a(v) loop bag:=town.take(bag,n->>0,(n->>1)::integer);end loop;
 item_:=case when mistakes=0 then id_ else 'compost' end;count_:=case when mistakes=0 then (r->>'gives')::integer else 1 end;
 if town.room(bag,item_)<count_ then return town.no('full');end if;
 book:=coalesce(p_purse->'prepBook','[]'::jsonb);made_:=coalesce(p_purse->'made','[]'::jsonb);
 if mistakes=0 then if not book ? id_ then book:=book||jsonb_build_array(id_);end if;if not made_ ? id_ then made_:=made_||jsonb_build_array(id_);end if;end if;
 out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(bag,item_,count_),'prepBook',book,'made',made_);
 return jsonb_build_object('ok',true,'made',item_,'n',count_,'mistakes',mistakes,'purse',out_);
end $$;

create or replace function town.camp_work(p_purse jsonb,p_action text,p_site integer,p_supply text,p_x integer,p_y integer,p_old jsonb,p_me text,p_now bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare k jsonb:=town.cat('camps');spot jsonb:=k->'sites'->p_site;bag jsonb:=p_purse->'bag';n integer;day_ integer:=town.day_of(p_now);used_ integer;effect text;out_ jsonb;camp_ jsonb;buffs jsonb;had jsonb;until_ numeric;book jsonb;
begin
 if p_site is null or p_site<0 or spot is null or p_x is null or p_y is null or greatest(abs((spot->>0)::numeric-p_x),abs((spot->>1)::numeric-p_y))>(k->>'reach')::numeric then return town.no('far');end if;
 if p_action='place' then
   if town.held(bag,'campKit')<1 then return town.no('tool');end if;
   if (p_old->>'until')::numeric>p_now then return town.no('spent');end if;
   n:=case when town.held(bag,'provisionChest')>0 then (k->>'chestCharges')::integer else (k->>'charges')::integer end;
   if town.held(bag,'campCanvas')<1 or town.held(bag,'dryTinder')<1 or town.held(bag,'trailRation')<n then return town.no('none');end if;
   bag:=town.take(town.take(town.take(bag,'campCanvas',1),'dryTinder',1),'trailRation',n);
   camp_:=jsonb_build_object('site',p_site,'x',spot->0,'y',spot->1,'by',p_me,'until',p_now+case when town.held(p_purse->'bag','weatherAwning')>0 then (k->>'awningMinutes')::bigint else (k->>'minutes')::bigint end*60000,'left',n,'wide',town.held(p_purse->'bag','signalPennant')>0,'lit',town.held(p_purse->'bag','campLantern')>0);
   out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',bag);
   return jsonb_build_object('ok',true,'camp',camp_,'purse',out_);
 end if;
 if p_action<>'benefit' or p_action is null then return town.no('none');end if;
 if p_old is null or (p_old->>'until')::numeric<=p_now or (p_old->>'left')::numeric<=0 then return town.no('none');end if;
 effect:=k->'supplies'->>p_supply;if effect is null then return town.no('none');end if;
 used_:=case when (p_purse->'campUses'->>'day')::integer=day_ then (p_purse->'campUses'->>'n')::integer else 0 end;
 if used_>=(k->>'daily')::integer then return town.no('spent');end if;
 if town.held(bag,p_supply)<1 then return town.no('none');end if;
 if p_supply='sharedTea' and town.held(bag,'fieldKettle')<1 then return town.no('tool');end if;
 until_:=p_now+(k->>'benefitMinutes')::numeric*60000*greatest(1,town.buff_by(p_purse,p_now,'campPreparation'));
 buffs:=coalesce((select jsonb_agg(b.v order by b.ord) from jsonb_array_elements(coalesce(p_purse->'buffs',case when p_purse->'buff' is not null and p_purse->'buff'<>'null'::jsonb then jsonb_build_array(p_purse->'buff'||jsonb_build_object('level',1)) else '[]'::jsonb end)) with ordinality b(v,ord) where (b.v->>'until')::numeric>p_now),'[]'::jsonb);
 select b.v into had from jsonb_array_elements(buffs) b(v) where b.v->>'id'=effect limit 1;
 if had is null then buffs:=buffs||jsonb_build_array(jsonb_build_object('id',effect,'level',1,'until',until_));
 else select jsonb_agg(case when b.v->>'id'=effect then b.v||jsonb_build_object('until',greatest((b.v->>'until')::numeric,until_)) else b.v end order by b.ord) into buffs from jsonb_array_elements(buffs) with ordinality b(v,ord);end if;
 book:=coalesce(p_purse->'campBook','[]'::jsonb);if not book ? p_supply then book:=book||jsonb_build_array(p_supply);end if;
 out_:=town.spend(p_purse,1,p_now)||jsonb_build_object('bag',town.take(bag,p_supply,1),'buffs',buffs,'campUses',jsonb_build_object('day',day_,'n',coalesce(used_,0)+1),'campBook',book);
 return jsonb_build_object('ok',true,'effect',effect,'camp',p_old||jsonb_build_object('left',(p_old->>'left')::integer-1),'purse',out_);
end $$;

create or replace function public.town_preparation(p_action text,p_recipe text default null,p_x integer default null,p_y integer default null,p_request uuid default null,p_answers jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=town.member();now_ bigint:=town.now_ms();purse jsonb;run_ jsonb;did jsonb;why_ text;
begin
 perform 1 from public.town_purses p where p.member_id=me for update;purse:=town.purse_of(me,true);
 if p_request is null then return town.answer(me,town.no('none'));end if;
 if p_x is not null and p_y is not null and exists(select 1 from jsonb_array_elements(town.cat('preparation')->'farStations') s(v) where greatest(abs((s.v->>0)::numeric-p_x),abs((s.v->>1)::numeric-p_y))<=(town.cat('preparation')->>'reach')::numeric) then perform town.far_member();end if;
 if p_action='begin' then
   delete from public.town_field_receipts r where r.member_id=me and r.at_ms<now_-604800000;
   if exists(select 1 from public.town_field_receipts r where r.member_id=me and r.request_id=p_request) then return town.answer(me,town.no('had'));end if;
   if (select count(*) from public.town_field_receipts r where r.member_id=me)>=1000 then return town.answer(me,town.no('spent'));end if;
   why_:=town.preparation_ready(purse,p_recipe,p_x,p_y);if why_ is not null then return town.answer(me,town.no(why_));end if;
   run_:=jsonb_build_object('id',p_request,'recipe',p_recipe,'seed',mod(now_,2147483647),'at',now_,'until',now_+(town.cat('preparation')->>'minutes')::bigint*60000,'tile',jsonb_build_array(p_x,p_y));
   insert into public.town_preparation_run(member_id,run) values(me,run_) on conflict(member_id) do update set run=excluded.run;
   insert into public.town_field_receipts(member_id,request_id,kind,at_ms) values(me,p_request,'prep-begin',now_);
   return town.answer(me,jsonb_build_object('ok',true,'run',run_));
 end if;
 if p_action<>'end' or p_action is null then return town.answer(me,town.no('none'));end if;
 if exists(select 1 from public.town_field_receipts r where r.member_id=me and r.request_id=p_request and r.kind='prep-end') then return town.answer(me,town.no('had'));end if;
 select r.run into run_ from public.town_preparation_run r where r.member_id=me;
 did:=town.prepare(purse,run_,p_request,p_answers,p_x,p_y,now_);if not coalesce((did->>'ok')::boolean,false) then return town.answer(me,did);end if;
 perform town.keep_purse(me,did->'purse');delete from public.town_preparation_run r where r.member_id=me;
 update public.town_field_receipts r set kind='prep-end' where r.member_id=me and r.request_id=p_request;
 if (did->>'mistakes')::integer=0 then perform town.note(me,'prepare',did->>'made',(did->>'n')::integer);end if;
 return town.answer(me,did-'purse');
end $$;
create or replace function public.town_camp(p_action text default 'look',p_site integer default null,p_supply text default null,p_x integer default null,p_y integer default null,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=town.far_member();now_ bigint:=town.now_ms();purse jsonb;old_ jsonb;did jsonb;camps_ jsonb;
begin
 if p_action='look' then
   select coalesce(jsonb_agg(c.camp order by c.site),'[]'::jsonb) into camps_ from public.town_field_camps c where (c.camp->>'until')::numeric>now_;
   return town.answer(me,jsonb_build_object('ok',true,'camps',camps_));
 end if;
 perform 1 from public.town_purses p where p.member_id=me for update;purse:=town.purse_of(me,true);
 if p_request is null then return town.answer(me,town.no('none'));end if;
 delete from public.town_field_receipts r where r.member_id=me and r.at_ms<now_-604800000;
 if exists(select 1 from public.town_field_receipts r where r.member_id=me and r.request_id=p_request) then return town.answer(me,town.no('had'));end if;
 if (select count(*) from public.town_field_receipts r where r.member_id=me)>=1000 then return town.answer(me,town.no('spent'));end if;
 if p_site is null or p_site<0 or p_site>=jsonb_array_length(town.cat('camps')->'sites') then return town.answer(me,town.no('far'));end if;
 perform pg_advisory_xact_lock(hashtext('town.camp'),p_site);
 select c.camp into old_ from public.town_field_camps c where c.site=p_site;
 did:=town.camp_work(purse,p_action,p_site,p_supply,p_x,p_y,old_,me::text,now_);if not coalesce((did->>'ok')::boolean,false) then return town.answer(me,did);end if;
 insert into public.town_field_camps(site,camp) values(p_site,did->'camp') on conflict(site) do update set camp=excluded.camp;
 perform town.keep_purse(me,did->'purse');
 insert into public.town_field_receipts(member_id,request_id,kind,at_ms) values(me,p_request,p_action,now_);
 if p_action='benefit' then perform town.note(me,'camp_prepare',p_supply,1,0,jsonb_build_object('owner',old_->>'by'));end if;
 select coalesce(jsonb_agg(c.camp order by c.site),'[]'::jsonb) into camps_ from public.town_field_camps c where (c.camp->>'until')::numeric>now_;
 return town.answer(me,(did-'purse'-'camp')||jsonb_build_object('camps',camps_));
end $$;
CREATE OR REPLACE FUNCTION town.work_counts_of(p_done jsonb, p_doer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  l jsonb := town.cat('work');
  what text := p_done->>'what';
  thing text := coalesce(p_done->>'thing', '');
  doc jsonb := coalesce(p_done->'doc', '{}'::jsonb);
  other text := coalesce(doc->>'whose', doc->>'owner');
  raw double precision;
begin
  if p_done->>'from' = 'play' then
    if not coalesce((p_done->>'won')::boolean, false) then return '[]'::jsonb; end if;
    if what = 'fishing' and l->'fishing' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'fishing', 'raw', l->'fishing'->thing, 'first', 'fishing:' || thing));
    end if;
    if what = 'cooking' and l->'kitchen'->'pot' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'kitchen', 'raw', l->'kitchen'->'pot'->thing, 'first', 'kitchen:' || thing,
        'held', jsonb_build_object('key', 'pot:' || thing, 'most', l->'kitchen'->'pots')));
    end if;
    return '[]'::jsonb;
  end if;
  -- v197: an experiment counts like a cooked preparation; a camp only credits help to another member.
  if what = 'prepare' and l->'kitchen'->'pot' ? thing then
    return jsonb_build_array(jsonb_build_object('to',null,'line','kitchen','raw',l->'kitchen'->'pot'->thing,'first','kitchen:'||thing,'held',jsonb_build_object('key','pot:'||thing,'most',l->'kitchen'->'pots')));
  end if;
  if what = 'camp_prepare' then
    if jsonb_typeof(doc->'owner')='string' and doc->>'owner'<>p_doer then
      return jsonb_build_array(jsonb_build_object('to',doc->>'owner','line','helpers','raw',l->'helpers'->'water','held',jsonb_build_object('key','camp:'||p_doer,'most',3)));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'ladle' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', doc->>'whose', 'line', 'kitchen', 'raw', l->'kitchen'->'ladled',
        'held', jsonb_build_object('key', 'ladle:' || p_doer, 'most', l->'kitchen'->'ladling')));
    end if;
    return '[]'::jsonb;
  end if;
  if what in ('water', 'clear', 'till', 'feed', 'cure', 'dust') then
    if other is not null and other <> '' and other <> p_doer then
      -- ── the older tools (v174): what a watering's deed says of a forged can, never more than the option's own number ──
      if what = 'water' and jsonb_typeof(doc->'kind') = 'number' and (doc->>'kind')::numeric > 0 then
        return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw',
          (l->'helpers'->>what)::numeric + least(coalesce((town.cat('forge')->'options'->'of'->'cnKind'->'six'->'n'->>'points')::numeric, town.opt_n('cnKind', 'points')::numeric), floor((doc->>'kind')::numeric))));
      end if;
      -- ── the older tools (v174): its end ──
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'bell' then
    if coalesce((p_done->>'n')::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', (l->'helpers'->>'water')::double precision * floor((p_done->>'n')::double precision)));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'thank' then
    return coalesce((select jsonb_agg(jsonb_build_object('to', t.id #>> '{}', 'line', 'helpers', 'raw', l->'helpers'->'thanked') order by t.ord)
      from jsonb_array_elements(case when jsonb_typeof(doc->'to') = 'array' then doc->'to' else '[]'::jsonb end) with ordinality as t(id, ord)
     where jsonb_typeof(t.id) = 'string' and t.id #>> '{}' <> p_doer), '[]'::jsonb);
  end if;
  if what = 'gather' then
    if l->'forest'->'how' ? coalesce(doc->>'how', '') then
      raw := (l->'forest'->'how'->>(doc->>'how'))::double precision + case when l->'forest'->'rares' ? thing then (l->'forest'->>'rare')::double precision else 0 end;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'forest', 'raw', raw, 'first', 'forest:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): a tree felled, by its kind; and a point of the helpers' to whoever braced its trunk ──
  if what = 'fell' then
    if coalesce((l->'felling'->>thing)::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'felling', 'raw', l->'felling'->thing, 'first', 'felling:' || thing))
        || case when jsonb_typeof(doc->'braced') = 'string' and doc->>'braced' <> '' and doc->>'braced' <> p_doer
             then jsonb_build_array(jsonb_build_object('to', doc->>'braced', 'line', 'helpers', 'raw', l->'braced')) else '[]'::jsonb end;
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): its end ──
  -- ── the mountain's rocks (v164): a rock broken, a vein played out, a way down found, the day's crystal rock, and a hand lent to somebody else's rock ──
  if what = 'mine' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining',
        'raw', (l->'mining'->>'rock')::double precision * greatest(1::double precision, floor(coalesce((p_done->>'n')::double precision, 1))))
      || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end);
  end if;
  if what = 'vein' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', case when town.mine_yes(doc->'again') then '0'::jsonb else l->'mining'->'vein' end)
        || case when thing <> '' then jsonb_build_object('first', 'mining:' || thing) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  if what = 'delve' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'way'));
  end if;
  if what = 'hew' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'lent'), jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'mining'->'lending'));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'crystal' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'crystal')
        || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  -- ── the mountain's rocks (v164): its end ──
  -- ── the blacksmith (v174): the bellows worked at the smith for somebody else's piece ──
  if what = 'bellows' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->'bellows'));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the blacksmith (v174): its end ──
  if what = 'net' then
    if l->'insects' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'insects', 'raw', l->'insects'->thing, 'first', 'insects:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'pick' then
    if l->'farming' ? thing and (other is null or other = '') then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', l->'farming'->thing, 'first', 'farming:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the bridge built by hand (v160): a stone laid is a point on the helpers' line to whoever laid it and to each of the others it came by ──
  if what in ('stone_lay', 'stone_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('bridge')->'point'));
  end if;
  -- ── the bridge built by hand (v160): its end ──
  -- ── the lamp relay at dusk (v163): a post lit is three points on the helpers' line to whoever lit it and to each of the others its flame came by ──
  if what in ('lamp_light', 'lamp_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('lamps')->'point'));
  end if;
  -- ── the lamp relay at dusk (v163): its end ──
  return '[]'::jsonb;
end;
$function$
;
revoke all on function town.preparation_ready(jsonb,text,integer,integer),town.prepare(jsonb,jsonb,uuid,jsonb,integer,integer,bigint),town.camp_work(jsonb,text,integer,text,integer,integer,jsonb,text,bigint) from public,anon,authenticated;
revoke all on function public.town_preparation(text,text,integer,integer,uuid,jsonb),public.town_camp(text,integer,text,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.town_preparation(text,text,integer,integer,uuid,jsonb),public.town_camp(text,integer,text,integer,integer,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
-- Expected: private state, member-only actions, 50 new usable items; counters only credit real successful work.
select relname,relrowsecurity from pg_class where oid in ('public.town_preparation_run'::regclass,'public.town_field_camps'::regclass,'public.town_field_receipts'::regclass);
select has_function_privilege('anon','public.town_camp(text,integer,text,integer,integer,uuid)','EXECUTE') as anon_camp;
