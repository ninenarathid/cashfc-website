-- v252: base prices reward hybrid crop space, lifetime and preparation work.
-- Run after v188 and the matching site deploy. Independent of v207-v251.
-- Safe to run twice. Changes only items.pays for 21 existing items.
-- Existing consignment lots retain their recorded base/factor; no player,
-- market history, seed prices, recipes, buffs, yields or growing rules change.
-- Nominal full-lifetime gross/cell/hour: about 1.5x the better parent crop.
-- Successful preparations and ordinary meal pots add at least 15% to inputs,
-- counting purchased bowls for every serving sold.
begin;
set local statement_timeout = '15s';
set local lock_timeout = '5s';
do $prices$
declare
  prices_ constant jsonb := '{
    "bottleGourd":[7,125],"rowBean":[6,40],"trellisBerry":[10,190],
    "blueCorn":[8,170],"teaBush":[8,45],"sunflowerPatch":[6,60],
    "redOkra":[7,42],"lotusRootBed":[9,160],
    "gourdCup":[10,145],"beanPaste":[8,70],"berryJam":[13,335],
    "blueCornFlour":[10,295],"driedTea":[12,80],"sunflowerOil":[9,105],
    "lotusStarch":[10,280],"pollenRice":[21,35],"berryTea":[24,165],
    "blueCornCake":[25,275],"lotusGardenSoup":[23,270],
    "orchardSoup":[27,210],"rootStew":[32,85]
  }'::jsonb;
  before_ jsonb;
  after_ jsonb;
  entry_ record;
  current_ numeric;
begin
  -- Serialize with other catalog edits; keep this one-row transaction short.
  select data into before_ from public.town_catalog where key = 'items' for update;
  if not found or jsonb_typeof(before_) is distinct from 'object' then
    raise exception 'Missing items catalog: run the garden, insect and forest expansions first';
  end if;
  after_ := before_;
  for entry_ in select key, value from jsonb_each(prices_) order by key loop
    if jsonb_typeof(before_->entry_.key) is distinct from 'object'
      or jsonb_typeof(before_->entry_.key->'pays') is distinct from 'number' then
      raise exception 'Missing base price for %: run v186-v188 first', entry_.key;
    end if;
    current_ := (before_->entry_.key->>'pays')::numeric;
    if current_ not in ((entry_.value->>0)::numeric, (entry_.value->>1)::numeric) then
      raise exception 'Base price changed for % (%): review v252 before applying', entry_.key, current_;
    end if;
    after_ := jsonb_set(after_, array[entry_.key, 'pays'], entry_.value->1, false);
  end loop;
  if after_ is distinct from before_ then
    update public.town_catalog set data = after_, updated_at = now() where key = 'items';
  end if;
end $prices$;
notify pgrst, 'reload schema';
commit;

-- All 21 rows should say true. These are the unmodified market's base prices.
select p.key as item, (c.data->p.key->>'pays')::numeric as base_price,
       (c.data->p.key->>'pays')::numeric = p.value::numeric as verified
from public.town_catalog c cross join lateral jsonb_each_text('{
  "bottleGourd":125,"rowBean":40,"trellisBerry":190,"blueCorn":170,
  "teaBush":45,"sunflowerPatch":60,"redOkra":42,"lotusRootBed":160,
  "gourdCup":145,"beanPaste":70,"berryJam":335,"blueCornFlour":295,
  "driedTea":80,"sunflowerOil":105,"lotusStarch":280,"pollenRice":35,
  "berryTea":165,"blueCornCake":275,"lotusGardenSoup":270,
  "orchardSoup":210,"rootStew":85
}'::jsonb) p
where c.key = 'items' order by p.key;
