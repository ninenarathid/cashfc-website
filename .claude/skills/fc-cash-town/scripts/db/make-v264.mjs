// Writes v264's functions from the definitions the chain through v263 has (pg_get_functiondef), each changed at
// marked places only, so the file says exactly what it changes. Run once to draft the file; then build-v264.mjs
// writes its guards and TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts its catalog.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/make-v264.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
const FILE = "supabase/v264_species_of_the_time_bands.sql";
const CHAIN = ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades", "v255_important_town_announcements", "v258_finite_profession_rewards", "v259_a_crop_counts_its_good_care", "v260_produce_keeps_its_grade", "v261_a_dish_as_good_as_what_went_in", "v262_compost_and_the_pollen_brush", "v263_helper_plants_and_their_crossings"];
const once = (text, from, to, what) => { const n = text.split(from).length - 1; if (n !== 1) throw new Error(`${what}: ${n} matches for ${from.slice(0, 90)}`); return text.replace(from, () => to); };
const db = await rewardDB(252);
let defs;
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const def = async (sig) => (await db.query(`select pg_get_functiondef('${sig}'::regprocedure) d`)).rows[0].d.replace(/\r/g, "").trimEnd();
  defs = {
    bugAt: await def("town.bug_at(integer,bigint,jsonb,text)"),
    comeback: await def("town.comeback(integer,bigint,jsonb,double precision,double precision,double precision,jsonb,text)"),
    wild: await def("town.wild_holds(integer,bigint,jsonb,text)"),
    stream: await def("town.stream_work(jsonb,text,text,integer,integer,jsonb,text,bigint)"),
    minePay: await def("town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)"),
    cast: await def("public.town_cast(text,integer,integer,boolean,text,text)"),
  };
} finally { await db.close(); }

// ── an insect: the newcomers' haunts have nothing so often beside them, and a newcomer outside its peak band weighs half ──
let bugAt = defs.bugAt;
bugAt = once(bugAt, `  w double precision;
begin`, `  w double precision;
  -- v264: what a newcomers' haunt has of nothing beside them (its kind's \`none\`; none at the old ones), and the hour
  none_ double precision := coalesce((kind->>'none')::double precision, 0);
  h_ double precision;
begin`, "bug_at declare");
bugAt = once(bugAt, `  at_ := turn * every - phase;
  if town.roll(word || ':bug', p_haunt, turn)`, `  at_ := turn * every - phase;
  h_ := town.hour_at(at_);
  if town.roll(word || ':bug', p_haunt, turn)`, "bug_at hour");
bugAt = once(bugAt, `    if fits[i + 1] then total := total + (bug->>'weight')::double precision; end if;
  end loop;
  left_ := town.roll(word || ':which', p_haunt, turn) * total;`, `    if fits[i + 1] then total := total + town.bug_weight(bug, h_, ins); end if;
  end loop;
  left_ := town.roll(word || ':which', p_haunt, turn) * (total + none_);`, "bug_at total");
bugAt = once(bugAt, `      left_ := left_ - (ins->'bugs'->pick->>'weight')::double precision;
      exit when left_ < 0;`, `      left_ := left_ - town.bug_weight(ins->'bugs'->pick, h_, ins);
      exit when left_ < 0;`, "bug_at pick");
bugAt = once(bugAt, `  if pick is null then return null; end if;`, `  if pick is null or (none_ > 0 and left_ >= 0) then return null; end if;`, "bug_at none");
bugAt = once(bugAt, `  w := (ins->'bugs'->pick->>'weight')::double precision;`, `  w := town.bug_weight(ins->'bugs'->pick, h_, ins);`, "bug_at w");

// ── a comeback: none from a newcomers' haunt, none to one ──
let comeback = defs.comeback;
comeback = once(comeback, `  if p_haunt is null or p_haunt < 0 or whence is null then return null; end if;`, `  if p_haunt is null or p_haunt < 0 or whence is null then return null; end if;
  -- v264: a newcomers' haunt of the time bands neither sends one back nor takes one (lib/town/insects' comeback)
  if coalesce((ins->'kinds'->(whence->>0)->>'alone')::boolean, false) then return null; end if;`, "comeback from");
comeback = once(comeback, `    continue when i = p_haunt or h->>1 <> whence->>1;
    kind := ins->'kinds'->(h->>0);`, `    continue when i = p_haunt or h->>1 <> whence->>1;
    kind := ins->'kinds'->(h->>0);
    continue when coalesce((kind->>'alone')::boolean, false);`, "comeback to");

// ── a place of the forest: the time bands' rare finds only in a quiet turn ──
let wild = defs.wild;
wild = once(wild, `  hi integer;
begin`, `  hi integer;
  -- v264: the time bands' rare finds (\`quiet\`): only in a turn that had nothing of the place's other finds
  quiet_ boolean[] := '{}';
  qtotal double precision := 0;
begin`, "wild declare");
wild = once(wild, `  if town.roll(word || ':has', p_spot, turn) >= (kind->>'chance')::double precision then return null; end if;
  finds := kind->'finds';
  for i in 0..jsonb_array_length(finds) - 1 loop
    fits := fits || town.wild_fits(finds->i, finds->i->>'item', 'forest', spot->>3, at_, word);
    if fits[i + 1] then total := total + (finds->i->>'weight')::double precision; end if;
  end loop;
  left_ := town.roll(word || ':what', p_spot, turn) * total;`, `  finds := kind->'finds';
  for i in 0..jsonb_array_length(finds) - 1 loop
    quiet_ := quiet_ || coalesce((finds->i->>'quiet')::boolean, false);
    fits := fits || (not quiet_[i + 1] and town.wild_fits(finds->i, finds->i->>'item', 'forest', spot->>3, at_, word));
    if fits[i + 1] then total := total + (finds->i->>'weight')::double precision; end if;
  end loop;
  if town.roll(word || ':has', p_spot, turn) >= (kind->>'chance')::double precision or not (true = any(fits)) then
    -- a quiet turn: one of the time bands' rare finds by its weight against nothing (lib/town/forest's holds)
    for i in 0..jsonb_array_length(finds) - 1 loop
      fits[i + 1] := quiet_[i + 1] and town.wild_fits(finds->i, finds->i->>'item', 'forest', spot->>3, at_, word);
      if fits[i + 1] then qtotal := qtotal + (finds->i->>'weight')::double precision; end if;
    end loop;
    if qtotal <= 0 then return null; end if;
    left_ := town.roll(word || ':quiet', p_spot, turn) * (qtotal + coalesce((f->'quiet'->>'none')::double precision, 0));
    for i in 0..jsonb_array_length(finds) - 1 loop
      if fits[i + 1] then
        left_ := left_ - (finds->i->>'weight')::double precision;
        if left_ < 0 then pick := finds->i; exit; end if;
      end if;
    end loop;
    if pick is null then return null; end if;
    lo := (pick->'n'->>0)::int;
    hi := (pick->'n'->>1)::int;
    return jsonb_build_object('turn', turn, 'item', pick->>'item', 'n', lo + floor(town.roll(word || ':n', p_spot, turn) * (hi - lo + 1))::int,
      'until', (turn + 1) * every - phase);
  end if;
  left_ := town.roll(word || ':what', p_spot, turn) * total;`, "wild draw");

// ── the stream's banks: a sample with hours of its own only in them (the dew) ──
let stream = defs.stream;
stream = once(stream, `   if p_choice is null or not (site->'items' ? p_choice) then return town.no('none');end if;`, `   if p_choice is null or not (site->'items' ? p_choice) then return town.no('none');end if;
   -- v264: the dew, a bank's sample in the early morning only (lib/town/stream-work's sampleOut)
   if k->'hours' ? p_choice and not exists(select 1 from jsonb_array_elements(k->'hours'->p_choice) r where town.hour_at(p_now)>=(r->>0)::double precision and town.hour_at(p_now)<(r->>1)::double precision) then return town.no('none');end if;`, "stream hours");

// ── the cave: bat guano with a rock broken in its hour ──
let minePay = defs.minePay;
minePay = once(minePay, `
  return did;end $function$`, `
  -- v264: the bat guano a rock of the cave lets fall in its hour (lib/town/mining's guanoOf)
  did:=town.guano_of(did,p_go,p_word);
  return did;end $function$`, "mine_pay guano");

// ── a cast: the newcomer fish, last of all ──
let cast = defs.cast;
cast = once(cast, `  did := did || jsonb_build_object('purse',school_->'purse');
  line := town.cast_from(odds,`, `  did := did || jsonb_build_object('purse',school_->'purse');
  -- ── v264: the time bands' newcomer fish, last of all: only in what is no fish's place (lib/town/fishing's freshOdds) ──
  if not star then
    odds := town.fresh_odds(odds, p_bait, (under->>'hour')::integer, habitat, not deep::boolean,
      case when pair then array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never')) else '{}'::text[] end
      || case when town.is_wary(purse, now_) then array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers')) else '{}'::text[] end);
  end if;
  line := town.cast_from(odds,`, "cast fresh");

const helpers = `-- What an insect weighs at an hour: its weight, or (a newcomer of the time bands outside its peak band) the catalog's
-- insects.quiet.offPeak of it (lib/town/insects' weightAt).
CREATE OR REPLACE FUNCTION town.bug_weight(p_bug jsonb, p_hour double precision, p_ins jsonb)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select (p_bug->>'weight')::double precision * case when p_bug ? 'peak' and not exists (select 1 from jsonb_array_elements(p_bug->'peak') r
    where p_hour >= (r->>0)::double precision and p_hour < (r->>1)::double precision) then coalesce((p_ins->'quiet'->>'offPeak')::double precision, 1) else 1::double precision end
$function$;

-- The time bands' newcomer fish on a cast (lib/town/fishing's freshOdds): every fish keeps its chance; each newcomer that
-- takes this bait in this water at this hour has its own share of the cast (half outside its peak band), all of them
-- never more than \`take\` of what is no fish but a pearl or a chest, which comes up that much less often.
CREATE OR REPLACE FUNCTION town.fresh_odds(p_odds jsonb, p_bait text, p_hour integer, p_habitat text, p_shallow boolean, p_never text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  fr jsonb := town.cat('fishing')->'fresh';
  fish jsonb := town.cat('fish');
  h integer := ((p_hour % 24) + 24) % 24;
  ids text[] := '{}';
  ss double precision[] := '{}';
  id text;
  f jsonb;
  o jsonb;
  junk double precision := 0;
  want double precision := 0;
  scale double precision;
  taken double precision;
  out_ jsonb := '[]'::jsonb;
  i integer;
begin
  if fr is null or p_odds is null then return p_odds; end if;
  for id in select jsonb_array_elements_text(fr->'ids') loop
    f := fish->id;
    continue when f is null or coalesce((f->'baits'->>p_bait)::double precision, 0) <= 0;
    continue when not (coalesce(f->'habitat', '["town"]'::jsonb) ? p_habitat);
    continue when not exists (select 1 from jsonb_array_elements(f->'hours') x where h >= (x->>0)::int and h < (x->>1)::int);
    continue when f->>'tier' = any(coalesce(p_never, '{}'::text[]));
    continue when p_shallow and f->>'tier' <> 'common';
    ids := ids || id;
    ss := ss || ((f->>'fresh')::double precision * case when f ? 'peak' and not exists (select 1 from jsonb_array_elements(f->'peak') x where h >= (x->>0)::int and h < (x->>1)::int)
      then (fr->>'offPeak')::double precision else 1::double precision end);
  end loop;
  for o in select x from jsonb_array_elements(p_odds) with ordinality a(x, ord) order by ord loop
    if fr->'junk' ? (o->>'what') then junk := junk + (o->>'p')::double precision; end if;
  end loop;
  if coalesce(array_length(ids, 1), 0) = 0 or not (junk > 0) then return p_odds; end if;
  for i in 1..array_length(ss, 1) loop want := want + ss[i]; end loop;
  scale := least(1::double precision, (junk * (fr->>'take')::double precision) / want);
  taken := want * scale;
  for o in select x from jsonb_array_elements(p_odds) with ordinality a(x, ord) order by ord loop
    out_ := out_ || jsonb_build_array(case when fr->'junk' ? (o->>'what') then jsonb_build_object('what', o->>'what', 'p', (o->>'p')::double precision * (1 - taken / junk)) else o end);
  end loop;
  for i in 1..array_length(ids, 1) loop out_ := out_ || jsonb_build_array(jsonb_build_object('what', ids[i], 'p', ss[i] * scale)); end loop;
  return out_;
end
$function$;
`;

const guano = `-- The bat guano (lib/town/mining's guanoOf): each plain rock of the cave a go broke in the guano's hour lets some fall
-- by its own chance, rolled after everything the rock held; into the bag (or a pouch) only where there is room.
CREATE OR REPLACE FUNCTION town.guano_of(p_did jsonb, p_go jsonb, p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  g jsonb := town.cat('band_species')->'guano';
  floor_ integer := (p_go->>'floor')::integer;
  h double precision;
  turn_ bigint;
  n integer := 0;
  e jsonb;
  stowed jsonb;
begin
  if p_did->'ok' <> 'true'::jsonb or p_did->'done' <> 'true'::jsonb or g is null or coalesce(floor_, 0) <= 0 then return p_did; end if;
  h := town.hour_at((p_go->>'now')::bigint);
  if not exists (select 1 from jsonb_array_elements(g->'hours') r where h >= (r->>0)::double precision and h < (r->>1)::double precision) then return p_did; end if;
  turn_ := town.mine_turn((p_go->>'now')::bigint);
  for e in select x from jsonb_array_elements(coalesce(p_did->'each', '[]'::jsonb)) with ordinality a(x, ord) order by ord loop
    if e->>'kind' = 'stone' and town.roll(p_word || ':guano', floor_, (e->>'rock')::integer, turn_) < (g->>'chance')::double precision then n := n + (g->>'n')::integer; end if;
  end loop;
  if n <= 0 then return p_did; end if;
  stowed := town.stow_all(p_did->'purse', jsonb_build_array(jsonb_build_array(g->>'item', n)));
  if stowed is null then return p_did; end if;
  return p_did || jsonb_build_object('purse', stowed, 'got', town.mine_add(p_did->'got', g->>'item', n));
end
$function$;
`;
const header = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
const open = header.indexOf("-- <functions:v264>"), close = header.indexOf("-- </functions:v264>");
if (open < 0 || close < open) throw new Error("the file has no marked lines for its functions");
const body = [helpers, guano, `${bugAt};\n`, `${comeback};\n`, `${wild};\n`, `${stream};\n`, `${minePay};\n`, `${cast};\n`,
  `revoke all on function town.bug_weight(jsonb,double precision,jsonb) from public, anon, authenticated;`,
  `revoke all on function town.fresh_odds(jsonb,text,integer,text,boolean,text[]) from public, anon, authenticated;`,
  `revoke all on function town.guano_of(jsonb,jsonb,text) from public, anon, authenticated;`,
  `-- (the functions written over keep the grants they had)`].join("\n");
writeFileSync(FILE, header.slice(0, open) + "-- <functions:v264>\n" + body + "\n" + header.slice(close));
console.log("v264's functions written");
