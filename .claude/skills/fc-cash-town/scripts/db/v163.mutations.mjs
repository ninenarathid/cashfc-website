// The breaks v163.test.mjs must notice, one at a time.
// Run: STORIES=few node mutate.mjs <the draft> v163.test.mjs v163.mutations.mjs      (FROM=<n> TO=<m> runs a slice of them)
//      node check-anchors.mjs <the draft> v163.mutations.mjs <a log of the dry run>   first: every anchor, every check's name
//
// By what the file does: what is kept, each rule's refusals and numbers (the night, who stands where, a flame taken,
// handed on, a post lit), what a page is told, what each function a member calls does beside its rule, the helpers'
// line and the tally's words (v160's block among them), and who may.
// (None of them has been run one by one by the session that wrote them: their anchors and the checks they name are
// held by check-anchors.mjs, and the assembly runs them.)

/** The n-th place a line is at in the file (from 1): several functions have the same line, and one of them is meant. */
const nth = (from, to, n) => (s) => {
  let at = -1;
  for (let i = 0; i < n; i++) { at = s.indexOf(from, at + 1); if (at < 0) throw new Error(`mutation anchor missing (${i + 1} of ${n}): ${from}`); }
  return s.slice(0, at) + to + s.slice(at + from.length);
};
const CASES = {
  night: "which night a moment is in:", by: "who stands by a fire and by a post:", take: "a flame taken:", pass: "a flame handed on:", light: "a post lit:", counts: "what a deed of the lamps' counts for on the lines:",
};
const END = "…and at each end what is kept", LINE = "…and where each stands on the helpers' line";
const DAYTIME = "  if town.lamp_night(p_now) is null then return town.no('day'); end if;\n";
const GONE = "    delete from public.town_lamp_flames f where f.member_id = me;\n";
const LIVES = "'until', p_now + round((l->>'life')::numeric * 1000)::bigint, ";
const TIRED = "case when town.stamina_of(p_purse, p_now) <= 0 then (l->>'hold')::double precision else 0 end";
const THREE = "all three whose hands it went through have three points", WRITTEN = "every deed is written down", TAKEN = "taken at the fire with empty hands", HANDED = "handed on to somebody with empty hands", LIT = "a post lit from a tile by it", KEPT = "…kept for the night with who lit it";
const COUNTS = "town.work_counts_of is the one it replaces", WORDS = "town.deed_th is the one it replaces";

export default ({ swap, cut }) => {
  const all = [
    // ── what is kept
    ["the nights' table is left open to its rows", cut("alter table public.town_lamp_nights enable row level security;\n", "alter table public.town_lamps_lit enable"), ["…each closed: row security on"]],
    ["the posts lit are left open to their rows", cut("alter table public.town_lamps_lit enable row level security;\n", "alter table public.town_lamp_flames enable"), ["…each closed: row security on"]],
    ["the flames are left granted to a browser",
      swap("revoke all on public.town_lamp_nights, public.town_lamps_lit, public.town_lamp_flames from anon, authenticated;", "revoke all on public.town_lamp_nights, public.town_lamps_lit from anon, authenticated;"),
      ["…each closed: row security on", "the three tables are nobody's to read from a browser", "…nor to write"]],
    ["run again, the file writes over a number an admin changed", swap("  on conflict (key) do nothing;", "  on conflict (key) do update set data = excluded.data;"), ["run again, it leaves a number an admin changed"]],
    ["the catalog is seeded with a flame of six seconds", swap('    "life": 5,', '    "life": 6,'), ["the catalog's row `lamps` is the code's"]],
    // ── the rules: the night, and who stands where
    ["the night begins an hour early", swap("((l.k->>'from')::bigint - (l.k->>'until')::bigint) * 60000 then", "((l.k->>'from')::bigint - 60 - (l.k->>'until')::bigint) * 60000 then"), [CASES.night]],
    ["the night goes by the clock of another country", swap("p_now + 7 * 3600000 - (l.k->>'until')::bigint * 60000 as t", "p_now - (l.k->>'until')::bigint * 60000 as t"), [CASES.night]],
    ["a night is numbered by the day it ends on", swap("then (x.t / 86400000)::integer end", "then (x.t / 86400000)::integer + 1 end"), [CASES.night]],
    ["near is a tile further", swap("<= (l.k->>'near')::integer, false)", "<= (l.k->>'near')::integer + 1, false)"), [CASES.by, CASES.take, CASES.light]],
    ["a post with a number below none is counted from the last", swap("when p_post >= 0 then l.k->'maps'->p_map->'posts'->p_post end as tile", "else l.k->'maps'->p_map->'posts'->p_post end as tile"), [CASES.by]],
    ["a flame is alive at the very moment of its time", swap("and p_now < (p_flame->>'until')::bigint", "and p_now <= (p_flame->>'until')::bigint"), [CASES.take, CASES.pass]],
    ["there is no second of grace", swap("round(((town.cat('lamps')->>'grace')::numeric + coalesce(p_more, 0)::numeric) * 1000)::bigint", "round((coalesce(p_more, 0)::numeric) * 1000)::bigint"), [CASES.pass, CASES.light, "a handing on asked for a second after the flame's time still counts"]],
    ["the second of grace is a moment short", swap("select p_now <= (p_flame->>'until')::bigint + round", "select p_now < (p_flame->>'until')::bigint + round"), [CASES.pass, "a handing on asked for a second after the flame's time still counts"]],
    // ── a flame taken
    ["a flame is given by day", nth(DAYTIME, "", 1), [CASES.take, "by day nothing is given"]],
    ["a flame is given though every lamp of the map is lit", swap("  if coalesce(p_lit, 0) >= jsonb_array_length(posts) then return town.no('whole'); end if;\n", ""), [CASES.take, "with every lamp of a map lit its fire gives no flame"]],
    ["a second flame is taken while one is alive", swap("  if town.flame_alive(p_flame, p_now) then return town.no('held'); end if;\n", ""), [CASES.take, "a second flame is not taken while one is alive"]],
    ["a flame is taken with a thing in the hand", swap("  if town.hand_of(p_purse) is not null then return town.no('hand'); end if;\n", ""), [CASES.take, "…and only with nothing in the hand"]],
    ["a flame is taken with a stone in the hands", swap("  if coalesce(p_stone, false) then return town.no('stone'); end if;\n", ""), [CASES.take, "…and not with a stone of the bridge's in the hands"]],
    ["a flame is taken anywhere on the map", swap("  if not town.lamp_by(p_map, null, p_x, p_y) then return town.no('far'); end if;\n", ""), [CASES.take, "a flame is taken only at a fire"]],
    ["a flame taken lives a second longer", nth(LIVES, "'until', p_now + 1000 + round((l->>'life')::numeric * 1000)::bigint, ", 1), [CASES.take, TAKEN]],
    ["a flame taken has nobody's hands on it", swap("'hands', jsonb_build_array(p_me)));", "'hands', '[]'::jsonb));"), [CASES.take]],
    // ── a flame handed on
    ["a flame that has gone out is handed on", swap("  if not town.flame_good(p_flame, p_now, 0) then return town.no('out'); end if;\n", ""), [CASES.pass, "…and a moment later it does not: the flame has gone out"]],
    ["a flame is handed to somebody who bears one", swap("  if town.flame_alive(p_their_flame, p_now) then return town.no('held'); end if;\n", ""), [CASES.pass, "…nor to somebody who bears a live flame"]],
    ["a flame is handed to somebody with a thing in the hand", swap("  if town.hand_of(p_theirs) is not null then return town.no('hand'); end if;\n", ""), [CASES.pass, "a flame is not handed to somebody with a thing in the hand"]],
    ["a flame is handed to somebody who carries a stone", swap("  if coalesce(p_their_stone, false) then return town.no('stone'); end if;\n", ""), [CASES.pass, "a flame is not handed to somebody who carries a stone"]],
    ["a flame handed on is not fresh again", nth(LIVES, "'until', p_flame->'until', ", 2), [CASES.pass, HANDED]],
    ["somebody a flame comes back to is two of its hands", swap("with ordinality x(id, ord) where x.id <> p_to;", "with ordinality x(id, ord);"), [CASES.pass]],
    ["one hand more is remembered", swap("  if jsonb_array_length(hands) > most then", "  if jsonb_array_length(hands) > most + 1 then"), [CASES.pass]],
    // ── a post lit
    ["a post is lit by day", nth(DAYTIME, "", 2), [CASES.light, "…a flame taken before five lights nothing after it"]],
    ["tired hands have no longer", swap(TIRED, "0"), [CASES.light, "with no stamina the post is lit all the same"]],
    ["everybody has the hold's time, tired or not", swap(TIRED, "(l->>'hold')::double precision"), [CASES.light, "…and a moment later it does not, with stamina left"]],
    ["a post is lit from anywhere", swap("  if p_post is null or not town.lamp_by(p_map, p_post, p_x, p_y) then return town.no('far'); end if;\n", ""), [CASES.light, "a post is lit only from a tile by it"]],
    ["a post that is lit is lit again", swap("  if lit @> to_jsonb(p_post) then return town.no('lit'); end if;\n", ""), [CASES.light, "a post that is lit is not lit again"]],
    ["lighting costs nothing", swap("'purse', town.spend(p_purse, (l->>'cost')::double precision, p_now),", "'purse', p_purse,"), [CASES.light, LIT]],
    ["the last lamp is not seen to be the last", swap("'full', n >= of_);", "'full', n > of_);"), [CASES.light, "the twelfth post lit says so"]],
    ["the posts lit are counted one too few", swap("  n := jsonb_array_length(lit) + 1;", "  n := jsonb_array_length(lit);"), [CASES.light, LIT]],
    // ── what is kept, read; and what a page is told
    ["last night's lamps are tonight's to the rules", swap("from public.town_lamps_lit l where l.night = p_night and l.map = p_map", "from public.town_lamps_lit l where l.map = p_map"), ["the next evening no lamp is lit"]],
    ["a page is told last night's lamps", swap("            from public.town_lamps_lit l where l.night = n.night and l.map = m.map), '[]'::jsonb),", "            from public.town_lamps_lit l where l.map = m.map), '[]'::jsonb),"), ["at five it is day", "the next evening no lamp is lit"]],
    ["the lighters are told by their ids, not as they came", swap("order by q.first_at, q.first_post, q.first_ord)", "order by q.id)"), ["the night's lighters are everybody whose hands"]],
    ["somebody's flame is told to everybody", swap("from public.town_lamp_flames f where f.member_id = p_member and p_now < f.until_ms))", "from public.town_lamp_flames f where p_now < f.until_ms limit 1))"), ["…and its bearer is told it, and nobody else is"]],
    ["a flame that has gone out is told as borne", swap("where f.member_id = p_member and p_now < f.until_ms))", "where f.member_id = p_member))"), ["…and a moment later it does not: the flame has gone out"]],
    ["every night somebody came is told as whole", swap("where f.map = m.map and f.full_at is not null)))", "where f.map = m.map)))"), ["a night on which a lamp was only tried for"]],
    ["the hands of a post are not told", swap("from unnest(l.hands) with ordinality x(id, ord) join public.profiles pr on pr.id = x.id), '[]'::jsonb))\n                   order by l.post)", "from unnest(l.hands) with ordinality x(id, ord) join public.profiles pr on pr.id = x.id where false), '[]'::jsonb))\n                   order by l.post)"), ["a page is told the night, and each map's posts lit"]],
    // ── what a member calls: a flame taken
    ["a flame taken is not kept", cut("    insert into public.town_lamp_flames (member_id, map, hands, until_ms, at)\n      values (me, p_map, array[me],", "    perform town.note(me, 'flame_take',"), [TAKEN]],
    ["a taking is not written down", cut("    perform town.note(me, 'flame_take',", "  end if;\n  return town.answer(me, (did - 'flame')"), [WRITTEN]],
    ["a flame of mine that went out stands in the way of the next", swap("      values (me, p_map, array[me], (did->'flame'->>'until')::bigint, to_timestamp(now_ / 1000.0))\n      on conflict (member_id) do update set map = excluded.map, hands = excluded.hands, until_ms = excluded.until_ms, at = excluded.at;", "      values (me, p_map, array[me], (did->'flame'->>'until')::bigint, to_timestamp(now_ / 1000.0))\n      on conflict (member_id) do nothing;"), ["a flame that has gone out is no flame"]],
    ["the taking does not ask whether a stone is in the hands", swap("town.lamps_flame(me), town.works_carried(me) is not null,", "town.lamps_flame(me), false,"), ["…and not with a stone of the bridge's in the hands"]],
    ["the taking counts no lamp lit", swap("jsonb_array_length(town.lamps_lit(p_map, town.lamp_night(now_))), p_map, p_x, p_y, me::text, now_);", "0, p_map, p_x, p_y, me::text, now_);"), ["with every lamp of a map lit its fire gives no flame"]],
    // ── a flame handed on
    ["whoever hands a flame on keeps it too", nth(GONE, "", 1), [HANDED]],
    ["handing on is not written down", cut("    perform town.note(me, 'flame_pass',", "  end if;\n  return town.answer(me, (did - 'flame')"), [WRITTEN]],
    ["a flame is handed to anybody with a purse", swap("        where pp.member_id = p_to and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)) then", "        where pp.member_id = p_to) then"), ["…nor to oneself, to nobody, to a character never proved"]],
    ["a flame is handed to oneself", swap("  if p_to is null or p_to = me or not exists (", "  if p_to is null or not exists ("), ["…nor to oneself, to nobody, to a character never proved"]],
    ["the handing does not ask whether they carry a stone", swap("town.lamps_flame(p_to), town.works_carried(p_to) is not null, now_);", "town.lamps_flame(p_to), false, now_);"), ["a flame is not handed to somebody who carries a stone"]],
    ["the handing says nothing of when the flame dies", nth("jsonb_strip_nulls(jsonb_build_object('until', did->'flame'->'until'))", "'{}'::jsonb", 2), [HANDED]],
    // ── a post lit
    ["the lighter's stamina is not kept", swap("    perform town.keep_purse(me, did->'purse');\n", ""), [LIT]],
    ["a flame that lit a post is still borne", nth(GONE, "", 2), [LIT]],
    ["a post lit is not kept", cut("    insert into public.town_lamps_lit (night, map, post, member_id, hands, lit_at)\n", "    if (did->>'full')::boolean then"), [KEPT]],
    ["who lit a post is not kept", swap("      values (night_, p_map, p_post, me, hands, to_timestamp(now_ / 1000.0));", "      values (night_, p_map, p_post, null, hands, to_timestamp(now_ / 1000.0));"), [KEPT]],
    ["a night every lamp was lit is not kept", cut("    if (did->>'full')::boolean then\n      update public.town_lamp_nights", "    perform town.note(me, 'lamp_light',"), ["…the night is kept as one on which every lamp of that map was lit"]],
    ["a night is counted whole again at every last lamp", swap(" where n.night = night_ and n.map = p_map and n.full_at is null;", " where n.night = night_ and n.map = p_map;"), ["a night is counted whole once"]],
    ["a lighting is not written down", cut("    perform town.note(me, 'lamp_light',", "    -- (a line of the deeds for each of the others the flame came by"), [WRITTEN, THREE]],
    ["the last lamp's deed does not say it was the last", swap("        || case when (did->>'full')::boolean then jsonb_build_object('full', true) else '{}'::jsonb end);", ");"), ["…and the deed says it was the last"]],
    ["the others the flame came by have no line of the deeds", cut("    insert into public.town_deeds (member_id, at, what, thing, n, doc)\n", "  end if;\n  return town.answer(me, (did - 'purse' - 'hands')"), [THREE, WRITTEN]],
    ["whoever lit it has a line as one of the others too", swap("       where h.id <> me\n       order by h.ord;", "       order by h.ord;"), [THREE, WRITTEN]],
    ["the lighting tells whose hands the flame came by", swap("(did - 'purse' - 'hands') || jsonb_build_object('lamps', town.lamps_told(me, now_))", "(did - 'purse') || jsonb_build_object('lamps', town.lamps_told(me, now_))"), ["…and its answer says nothing of whose hands the flame came by"]],
    // ── the helpers' line, and the tally's words
    ["a post lit counts one point", swap("'raw', town.cat('lamps')->'point'));", "'raw', 1));"), [CASES.counts, COUNTS, THREE, LINE]],
    ["only whoever lit the post is counted", swap("  if what in ('lamp_light', 'lamp_hand') then", "  if what in ('lamp_light') then"), [CASES.counts, COUNTS, THREE, LINE]],
    ["the bridge's block is dropped from the lines' rule", cut("  -- ── the bridge built by hand (v160): a stone laid is a point", "  -- ── the lamp relay at dusk (v163): a post lit is three points"), [COUNTS, "…and v160's block for a stone laid is still in it", "…and a stone laid for the bridge counts as it did"]],
    ["a deed of the lamps' has no word", swap("when 'lamp_light' then 'จุดโคม' ", ""), [WORDS, "each deed of the lamps' has its word in Thai"]],
    ["the bridge's words are dropped from the tally", cut("    -- ── the bridge built by hand (v160), and the village's works ──\n", "    -- ── the lamp relay at dusk (v163) ──\n"), [WORDS, "each deed of the lamps' has its word in Thai"]],
    // ── who may
    ["the rules are left for anybody to call", swap("revoke execute on all functions in schema town from public, anon, authenticated;", ""), ["the ten rules are no browser's to call", "the rules are not to be asked from outside"]],
    ["a flame is left for the signed-out to take", swap("revoke execute on function public.town_flame_take(text, integer, integer) from public, anon;\n", ""), ["the four a browser calls are a member's to call", "somebody signed out is refused all four"]],
    ["lighting is left for the signed-out", swap("revoke execute on function public.town_lamp_light(text, integer, integer, integer) from public, anon;\n", ""), ["the four a browser calls are a member's to call", "somebody signed out is refused all four"]],
    ["the reading is not a member's to call", swap("grant execute on function public.town_lamps_read() to authenticated;\n", ""), ["the four a browser calls are a member's to call"]],
    ["the lighting runs as whoever calls it", swap("create or replace function public.town_lamp_light(p_map text, p_post integer, p_x integer, p_y integer)\nreturns jsonb language plpgsql security definer set search_path = public", "create or replace function public.town_lamp_light(p_map text, p_post integer, p_x integer, p_y integer)\nreturns jsonb language plpgsql set search_path = public"), ["…each security definer with its search path set"]],
  ];
  const from = Number(process.env.FROM ?? 0), to = Number(process.env.TO ?? all.length);
  return all.slice(from, to);
};
// (END is named by no break of its own: every break that changes what is kept is caught sooner by a plain check)
void END;
