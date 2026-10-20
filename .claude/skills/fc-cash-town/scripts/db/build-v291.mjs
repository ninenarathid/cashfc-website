// Writes supabase/v291_a_farm_of_animals.sql: the pasture (docs/plans/animals/README.md). The new tables and functions are
// v291.core.sql and v291.act.sql beside this file; the functions it changes elsewhere are changed in their live text,
// each replacement exactly so many times (PATCHES); the catalog is the new row `animals` and, merged entry by entry into
// the rows they belong to, the line's things, dishes, makes, scrolls, gifts and the farm's new shape (nothing else of
// those rows is written over).
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v291.mjs
import { readFileSync, writeFileSync } from "node:fs";
await import("./repo-ts-town.mjs");
const { catalogOf, seedFor } = await import("@/lib/town/catalog");
const { ANIMAL_ITEMS, ANIMAL_DISHES, ANIMAL_MAKES, ANIMAL_SCROLL_ITEMS, ANIMAL_SCROLLS, BREED_SCROLL_ITEMS } = await import("@/lib/town/animal-items");
const { ANIMAL_GIFTS } = await import("@/lib/town/animal-act");
const here = (f) => new URL(`./${f}`, import.meta.url);
const FILE = "supabase/v291_a_farm_of_animals.sql";

const all = catalogOf();
const pick = (row, ids) => Object.fromEntries(ids.filter((id) => id in row).map((id) => [id, row[id]]));
const itemIds = [...Object.keys(ANIMAL_ITEMS), ...Object.keys(ANIMAL_SCROLL_ITEMS), ...Object.keys(BREED_SCROLL_ITEMS)];
const dishIds = Object.keys(ANIMAL_DISHES), makeIds = Object.keys(ANIMAL_MAKES), scrollIds = Object.keys(ANIMAL_SCROLLS);
const giftIds = Object.values(ANIMAL_GIFTS);
const recipeIds = all.cooking.recipes.filter((id) => dishIds.includes(id) || makeIds.includes(id));
const newWare = all.cooking.cookware.filter((w) => ["churn", "cheesePress", "spindle", "knittingNeedles"].includes(w));
const json = (v) => `$j$${JSON.stringify(v)}$j$::jsonb`;
// (the gifts row: every part keyed by a gift's id takes the line's ten)
const giftsParts = Object.fromEntries(Object.entries(all.gifts).filter(([, v]) => v && typeof v === "object" && !Array.isArray(v) && giftIds.some((g) => g in v))
  .map(([k, v]) => [k, pick(v, giftIds)]));
// (the work row: wherever the later lines are named, the pasture too)
const work = all.work;
const workIds = Object.entries(work).filter(([, v]) => Array.isArray(v) && v.includes("animals")).map(([k]) => k);
const workKeyed = Object.fromEntries(Object.entries(work).filter(([, v]) => v && typeof v === "object" && !Array.isArray(v) && "animals" in v).map(([k, v]) => [k, v.animals]));
// (the farm's shape where the database keeps a copy of it: as it is today, and as the page now has it)
const FARM_WAS = [128, 0, 60, 86];
const farmNow = all.cooking.map.farm;
const groundFarm = all.ground.maps.find((m) => m[0] === 128);
const nectarFarm = all.insects.nectar.maps.find((m) => m[0] === "farm");
const nurseryFarm = all.rewards?.nurseryBoxes?.find?.((m) => m[0] === 128) ?? null;
// (the farm's lamps: as they are today, its first fifty-two posts and two braziers; and with the animal farm's, after them)
const lampsNow = all.lamps.maps.farm, LAMPS_WAS = { posts: lampsNow.posts.slice(0, 52), fires: lampsNow.fires.slice(0, 2) };
const [farmX, farmY, farmW, farmH] = farmNow, farmX2 = farmX + farmW - 1, farmY2 = farmY + farmH - 1;

/** [function, [old text, new text, how many times it stands there]...]: applied to the live text, a run again skipping what is made. */
export const PATCHES = [
  ["town.work_counts_of(jsonb,text)", [[
    "begin\n  if p_done->>'from' = 'play' then",
    "begin\n  -- v291: the pasture's deeds carry their own points, written by public.town_animals alone (animals: the line's; helpers: friend care, 30 a day)\n  if what like 'animal\\_%' and doc ? 'line' and doc ? 'pts' and doc->>'line' in ('animals', 'helpers') then\n    return jsonb_build_array(jsonb_build_object('to', null, 'line', doc->>'line', 'raw', least(200, greatest(0, (doc->>'pts')::double precision))));\n  end if;\n  if p_done->>'from' = 'play' then", 1]]],
  ["town.market_things(jsonb)", [[
    "case when t.kind in ('dish', 'goods', 'staple') then (p_k->>'made')::int",
    "case when t.kind in ('dish', 'goods', 'staple') and not coalesce(town.cat('animals')->'graded' ? t.id, false) then (p_k->>'made')::int", 1]]],
  ["town.reward_relay_place(jsonb)", [[
    "(at_->>0)::integer between 128 and 187 and (at_->>1)::integer between 0 and 85 then 'farm'",
    `(at_->>0)::integer between ${farmX} and ${farmX2} and (at_->>1)::integer between ${farmY} and ${farmY2} then 'farm'`, 1]]],
];
const lit = (s) => s.replace(/'/g, "''");
const core = readFileSync(here("v291.core.sql"), "utf8").replace(/\r\n/g, "\n");
const act = readFileSync(here("v291.act.sql"), "utf8").replace(/\r\n/g, "\n");
const seed = seedFor("v291");

const sql = `-- v291 — a farm of animals (ฟาร์มสัตว์)
-- Run once in the Supabase SQL editor, after v290. Running it again is safe. Its page goes up first or after: before it
-- has run the page's pasture asks town_animals and is refused ('none'), and nothing happens; before the page, nothing
-- calls it.
--
-- The owner, 2026-10-19: "ช่วยวางแผน ระบบเลี้ยงสัตว์ ... เริ่มแรกสามารถเลี้ยงสัตว์ได้คนละ 2 ตัว ... ไก่ วัว แกะ เป็ด ... ทุกวัน
-- เจ้าของต้องนำอาหารมาให้ ที่รางให้อาหาร ... ยิ่งสนิทสนมมาก จะยิ่งให้ผลผลิตดีขึ้น ... ลุง popoto ขายสัตว์ ...", and over five rounds
-- after it ("ขยายฟาร์มออกไปทางนั้นจริงๆ", "การเก็บผลผลิตต้องเป็นเจ้าของสัตว์ถึงจะเก็บได้", "มีระบบผสมพันธุ์ ... พันธุ์แปลกๆ แฟนตาซีๆ",
-- "ให้ลุงรับซื้อไปเถอะ", "ตอนที่ซื้อมาเป็นแค่สัตว์ขั้นแรก ... ค่อยๆ โตขึ้นตามวันเวลา จะไม่มีของที่ทำให้โตทันที", "คนอื่นสามารถดูแลสัตว์
-- ของเพื่อนได้ (ได้แต้มผู้ช่วยเหลือ)", "เริ่มได้เลย เอาจนจบตาม requirment"), and during the build (2026-10-20): a barn bought of Uncle
-- Popoto first, 24 of them on the farm's east side, one a member, never two members' ("เลือกซ้ำกับเพื่อนไม่ได้"); four animals in
-- a barn, eight in his pen; sexes, chosen when bought and at random when born, a cross one of each; three stats a child
-- takes from its parents, raised only by real care ("ผู้เล่นต้องเอาใจใส่ดูแลสัตว์มาเป็นอย่างดีจริงๆ"); any animal handed on at
-- Uncle Popoto; a friend asked for their animal for a cross. The whole design is docs/plans/animals/README.md; the
-- rules are lib/town/animals.ts and lib/town/animal-act.ts, which this is, step for step.
--
-- * Kept: public.town_animals (an animal a row, its state as the page keeps it), public.town_herds (a member's barn, its
--   door, its front, when its owner last cared, and who may care for their animals; one barn a member, a unique index),
--   public.town_pasture (who first bred each breed, the gifts' hours that others share, the hay wagon's runs, offers to
--   hand an animal on and asks for a cross) and public.town_animal_asks (a call's answer, for a retry).
--   No grants and no policies: nothing reaches them but public.town_animals, security definer, for a proved member.
-- * public.town_animals(p_input, p_request): one step (a barn, buy a baby, the shop, a barn front, sell, name, to the
--   pen and back, the barn door, offer, take, ask, answer, feed, pet, treat, collect with a game's play, pick an egg laid
--   out, breed, the cradle, care, coming
--   onto the farm, the gifts' spring wind, harp and hay wagon, ride, the meadow's forage), answering through town.answer.
-- * Elsewhere, in their live text: a pasture deed counts its own points into the line "animals" or the helpers'
--   (town.work_counts_of); an animal's produce falls when oversold, as a crop does (town.market_things); the farm's new
--   east side (x ${farmX2 - 51}..${farmX2}) is the farm's for a reward's relay (town.reward_relay_place). Written whole:
--   town.carries_grade and town.grade_pays take an animal's produce (the kitchen counts its grade, the relatives pay by
--   it); town.made_of reads a pot as it is and then as its families (any breed's egg an egg, any milk milk, any wool wool).
-- * The catalog: the row \`animals\`, and merged into their rows entry by entry: ${itemIds.length} things, ${dishIds.length} dishes and their
--   scrolls, ${makeIds.length} makings, ${giftIds.length} gifts, the line's place in \`work\`, four new pieces of cookware, and the farm's
--   new shape where a row keeps one (cooking.map.farm, ground.maps, insects.nectar.maps, rewards.nurseryBoxes).
begin;
set local statement_timeout = '120s';
set local lock_timeout = '10s';
do $$ begin
  if town.reward_relay_place('[60,79]'::jsonb) is distinct from 'town' then raise exception 'Run v290 before v291'; end if;
end $$;

${core}
${act}

-- ── 5. The kitchen, the relatives and the grade: written whole (small, and theirs since v260 and v261) ────────────────
create or replace function town.carries_grade(p_id text)
returns boolean language sql stable set search_path='' as $$
 select coalesce(town.cat('items')->p_id->>'kind' = 'crop', false)
     or p_id = any(array['curryPaste','coconutMilk','dicedRoot','brownedOnion','driedZest','brightSauce','thickBroth','sweetGlaze','spicePaste',
                         'beanPaste','berryJam','blueCornFlour','driedTea','sunflowerOil','lotusStarch','nectarSyrup'])
     -- v291: what an animal gives, and what is made of it for the kitchen (lib/town/animal-items' ANIMAL_GRADED)
     or coalesce(town.cat('animals')->'graded' ? p_id, false)
$$;
create or replace function town.grade_pays(p_item text, p_grade integer)
returns numeric language sql stable set search_path='' as $$
 select case when town.cat('items')->p_item->>'kind' = 'crop' or coalesce(town.cat('animals')->'graded' ? p_item, false)
   then (array[1, 1.25, 1.75, 2.5]::numeric[])[coalesce(p_grade, 0) + 1] else 1 end
$$;
-- (town.made_of: its live text kept as town.made_of_exact, once; made_of reads a pot as it is, then as its families)
do $$
declare d text := replace(pg_get_functiondef('town.made_of(jsonb)'::regprocedure), chr(13), '');
begin
  if position('v291' in d) = 0 then
    execute replace(d, 'town.made_of(p_things jsonb)', 'town.made_of_exact(p_things jsonb)');
  end if;
end $$;
create or replace function town.made_of(p_things jsonb)
returns text language plpgsql stable set search_path = '' as $$
-- v291 (lib/town/cooking's madeOf and readings): as it is; else each thing read as itself, its family (any breed's egg an
-- egg, any milk milk) or, for the pasture's makings, any breed's milk as farm milk (never the uncle's own milk): the
-- fewest stand-ins first, and among as few the first in reading order (the first thing's choices the slowest)
declare k jsonb := town.cat('animals'); opts jsonb := '[]'::jsonb; o jsonb; v jsonb; total integer := 1; c integer; r integer;
  i integer; d integer; len integer; pot jsonb; subs integer; m text; best text; best_subs integer;
begin
  m := town.made_of_exact(p_things);
  if m is not null or not exists (select 1 from jsonb_array_elements(p_things) x where k->'family' ? (x->>0)) then return m; end if;
  for o in select x from jsonb_array_elements(p_things) x loop
    v := jsonb_build_array(o->>0);
    if k->'family'->>(o->>0) is not null and not v ? (k->'family'->>(o->>0)) then v := v || to_jsonb(k->'family'->>(o->>0)); end if;
    if k->'farmFamily'->>(o->>0) is not null and not v ? (k->'farmFamily'->>(o->>0)) then v := v || to_jsonb(k->'farmFamily'->>(o->>0)); end if;
    opts := opts || jsonb_build_array(v); total := total * jsonb_array_length(v);
  end loop;
  len := jsonb_array_length(opts);
  for c in 0..total - 1 loop
    r := c; subs := 0; pot := '[]'::jsonb;
    for i in reverse len - 1..0 loop
      d := r % jsonb_array_length(opts->i); r := r / jsonb_array_length(opts->i);
      if d > 0 then subs := subs + 1; end if;
      pot := jsonb_build_array(jsonb_build_array(opts->i->>d, p_things->i->1)) || pot;
    end loop;
    if best is null or subs < best_subs then
      m := town.made_of_exact(pot);
      if m is not null then best := m; best_subs := subs; end if;
    end if;
  end loop;
  return best;
end $$;
revoke all on function town.carries_grade(text), town.grade_pays(text, integer), town.made_of(jsonb), town.made_of_exact(jsonb) from public, anon, authenticated;

-- ── 6. The functions that count, price and place: their live text, but for these ─────────────────────────────────────
do $$
declare c text[]; d text; n integer; o text; nw text;
begin
  foreach c slice 1 in array array[
${PATCHES.flatMap(([sig, list]) => list.map(([a, b, k]) => `    ['${sig}', '${lit(a)}', '${lit(b)}', '${k}']`)).join(",\n")}] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (the file may come with CR at its line ends: the texts compared without them)
    o := replace(c[2], chr(13), ''); nw := replace(c[3], chr(13), '');
    continue when position(nw in d) > 0;
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n = c[4]::integer then execute replace(d, o, nw);
    else raise exception 'v291: % has % of [%], not %: rebuild v291', c[1], n, left(c[2], 60), c[4]; end if;
  end loop;
end $$;

-- ── 7. The catalog ─────────────────────────────────────────────────────────────────────────────────────────────────────
${seed}
-- (merged, entry by entry: what is the pasture's, into the rows it belongs to)
update public.town_catalog set data = data || ${json(pick(all.items, itemIds))}, updated_at = now() where key = 'items';
update public.town_catalog set data = data || ${json(pick(all.dishes, dishIds))}, updated_at = now() where key = 'dishes';
update public.town_catalog set data = data || ${json(pick(all.scrolls, scrollIds))}, updated_at = now() where key = 'scrolls';
update public.town_catalog set data = data || ${json(pick(all.makes, makeIds))}, updated_at = now() where key = 'makes';
${Object.entries(giftsParts).map(([k, v]) => `update public.town_catalog set data = jsonb_set(data, '{${k}}', coalesce(data->'${k}', '{}'::jsonb) || ${json(v)}), updated_at = now() where key = 'gifts';`).join("\n")}
${workIds.map((k) => `update public.town_catalog set data = jsonb_set(data, '{${k}}', (data->'${k}') || '["animals"]'::jsonb), updated_at = now() where key = 'work' and not (data->'${k}') ? 'animals';`).join("\n")}
${Object.entries(workKeyed).map(([k, v]) => `update public.town_catalog set data = jsonb_set(data, '{${k},animals}', ${json(v)}), updated_at = now() where key = 'work';`).join("\n")}
update public.town_catalog set data = jsonb_set(jsonb_set(jsonb_set(data,
    '{recipes}', (data->'recipes') || (select coalesce(jsonb_agg(r), '[]'::jsonb) from jsonb_array_elements_text(${json(recipeIds)}) r where not (data->'recipes') ? r)),
    '{needs}', (data->'needs') || ${json(pick(all.cooking.needs, recipeIds))}),
    '{cookware}', (data->'cookware') || (select coalesce(jsonb_agg(w), '[]'::jsonb) from jsonb_array_elements_text(${json(newWare)}) w where not (data->'cookware') ? w)),
  updated_at = now() where key = 'cooking';
-- (the farm's shape: each entry that is the farm as it was, ${JSON.stringify(FARM_WAS)}, made the farm as it is now; an entry is matched whole, never by \`@>\`)
update public.town_catalog set data = jsonb_set(data, '{map,farm}', ${json(farmNow)}), updated_at = now() where key = 'cooking' and data->'map'->'farm' = ${json(FARM_WAS)};
${groundFarm ? `update public.town_catalog set data = jsonb_set(data, '{maps}', (select jsonb_agg(case when m = ${json(FARM_WAS)} then ${json(groundFarm)} else m end order by o) from jsonb_array_elements(data->'maps') with ordinality x(m, o))), updated_at = now() where key = 'ground';` : ""}
${nectarFarm ? `update public.town_catalog set data = jsonb_set(data, '{nectar,maps}', (select jsonb_agg(case when m = ${json(["farm", ...FARM_WAS])} then ${json(nectarFarm)} else m end order by o) from jsonb_array_elements(data->'nectar'->'maps') with ordinality x(m, o))), updated_at = now() where key = 'insects';` : ""}
${nurseryFarm ? `update public.town_catalog set data = jsonb_set(data, '{nurseryBoxes}', (select jsonb_agg(case when m = ${json(FARM_WAS)} then ${json(nurseryFarm)} else m end order by o) from jsonb_array_elements(data->'nurseryBoxes') with ordinality x(m, o))), updated_at = now() where key = 'rewards' and data ? 'nurseryBoxes';` : ""}

-- (no eggs in the forest's nooks: the owner, 2026-10-20, "เลิกทำให้ไข่ไก่ ดรอปในป่าด้วย เดี๋ยวจะซ้ำซ้อน"; eggs are the hens' and the uncle's)
update public.town_catalog set data = jsonb_set(data, '{kinds,nook,finds}', (select coalesce(jsonb_agg(f order by o), '[]'::jsonb)
    from jsonb_array_elements(data->'kinds'->'nook'->'finds') with ordinality x(f, o) where f->>'item' <> 'egg')), updated_at = now()
 where key = 'forest' and exists (select 1 from jsonb_array_elements(data->'kinds'->'nook'->'finds') f where f->>'item' = 'egg');

-- (the animal farm's lamps, the owner, 2026-10-20: "ช่วยเพิ่ม จุดโคมไฟในฟาร์มสัตว์ด้วย": two braziers and forty posts after the
-- farm's fifty-two, whose numbers stay: a lamp lit is kept by its number. Only where the farm's are as v284 left them.)
update public.town_catalog set data = jsonb_set(jsonb_set(data, '{maps,farm,posts}', ${json(lampsNow.posts)}), '{maps,farm,fires}', ${json(lampsNow.fires)}), updated_at = now()
 where key = 'lamps' and data->'maps'->'farm'->'posts' = ${json(LAMPS_WAS.posts)} and data->'maps'->'farm'->'fires' = ${json(LAMPS_WAS.fires)};

-- ── 8. Each as it is meant to be, or nothing of this stays ──────────────────────────────────────────────────────────────
do $$ begin
  if town.cat('animals') is null or town.cat('animals')->'species'->'cow' is null then raise exception 'v291: the catalog has no animals'; end if;
  if town.made_of('[["farmEgg", 2], ["oil", 1]]'::jsonb) is distinct from 'omelette' then raise exception 'v291: a farm egg is no egg in the kitchen'; end if;
  if town.grade_pays('farmEgg', 3) <> 2.5 or town.grade_pays('butter', 3) <> 2.5 or not town.carries_grade('farmMilk') then raise exception 'v291: the grade of what an animal gives'; end if;
  if town.made_of('[["milk", 2]]'::jsonb) is not null or town.made_of('[["jerseyMilk", 2]]'::jsonb) is distinct from 'cream' then raise exception 'v291: cream of farm milk alone'; end if;
  if town.made_of('[["lanternEgg", 2], ["farmMilk", 1], ["sugar", 1]]'::jsonb) is distinct from 'lanternCustard' then raise exception 'v291: a breed''s own egg read as its own'; end if;
  if exists (select 1 from jsonb_array_elements(town.cat('forest')->'kinds'->'nook'->'finds') f where f->>'item' = 'egg') then raise exception 'v291: an egg in the forest'; end if;
  if jsonb_array_length(town.cat('lamps')->'maps'->'farm'->'posts') <> ${lampsNow.posts.length} or jsonb_array_length(town.cat('lamps')->'maps'->'farm'->'fires') <> ${lampsNow.fires.length} then
    raise exception 'v291: the animal farm''s lamps'; end if;
  if town.reward_relay_place('[${farmX2},${farmY2}]'::jsonb) is distinct from 'farm' then raise exception 'v291: the animal farm east of the garden'; end if;
  if not (town.cat('work')->'ids' ? 'animals') then raise exception 'v291: the line is not in work'; end if;
end $$;
commit;
notify pgrst, 'reload schema';

-- After it has run, in the SQL editor (each answers as said):
--   select to_regprocedure('public.town_animals(jsonb,text)') is not null;                           -- true
--   select town.made_of('[["blueEgg", 1], ["duckEgg", 1], ["oil", 1]]'::jsonb);                      -- omelette
--   select data->'species'->'cow'->>'price' from public.town_catalog where key = 'animals';           -- 4000
--   select town.reward_relay_place('[${farmX2},${farmY2}]'::jsonb), town.reward_relay_place('[${farmX2 + 1},${farmY2}]'::jsonb);   -- farm, null
`;
writeFileSync(FILE, sql);
console.log("written", FILE, sql.length, "farm now", JSON.stringify(farmNow), "work ids", workIds, "keyed", Object.keys(workKeyed));
