// The breaks v160.test.mjs must notice, one at a time.
// Run: STORIES=few node mutate.mjs <the draft> v160.test.mjs v160.mutations.mjs      (FROM=<n> TO=<m> runs a slice of them)
//      node check-anchors.mjs <the draft> v160.mutations.mjs <a log of the dry run>   first: every anchor, every check's name
//
// By what the file does: what is kept and how it is seeded, each rule's refusals and numbers, what is counted and
// marked, what a page is told, the helpers' line and the tally's words, and what each function a member calls does
// beside its rule; and who may.

/** The n-th place a line is at in the file (from 1): several functions have the same line, and one of them is meant. */
const nth = (from, to, n) => (s) => {
  let at = -1;
  for (let i = 0; i < n; i++) { at = s.indexOf(from, at + 1); if (at < 0) throw new Error(`mutation anchor missing (${i + 1} of ${n}): ${from}`); }
  return s.slice(0, at) + to + s.slice(at + from.length);
};
const CASES = {
  lift: "a stone lifted:", pass: "a stone handed on:", lay: "a stone laid:", drop: "a stone let go of:", give: "a thing given to a work out of the bag:", wants: "whether a work still wants a thing:",
  spans: "how many spans so many stones make:", near: "who stands by the pile and by the foot:", counts: "what a deed of the bridge's counts for on the lines:",
};
const END = "…and at each end what is kept", LINE = "…and where each stands on the helpers' line";
const KEEP = "    perform town.keep_purse(me, did->'purse');\n", GONE = "    delete from public.town_work_carried c where c.member_id = me;\n";
const SHUT = "  if not coalesce((p_work->>'open')::boolean, false) then return town.no('closed'); end if;\n";
const COUNTED = "on conflict (work, member_id, thing) do update set n = public.town_work_hands.n + excluded.n;";
const LAID = "perform town.works_counted(work_, carried->>'thing', hands, 1, 1, now_);";

export default ({ swap, cut }) => {
  const all = [
    // ── what is kept, and how it is seeded
    ["the works' table is left open to its rows", cut("alter table public.town_works enable row level security;\n", "alter table public.town_work_needs enable"), ["…each closed: row security on"]],
    ["what is carried is left granted to a browser",
      swap("revoke all on public.town_works, public.town_work_needs, public.town_work_hands, public.town_work_carried from anon, authenticated;", "revoke all on public.town_works, public.town_work_needs, public.town_work_hands from anon, authenticated;"),
      ["…each closed: row security on", "the four tables are nobody's to read from a browser", "…nor to write"]],
    ["the bridge is seeded open", swap("insert into public.town_works (id) select town.cat('bridge')->>'work' on conflict (id) do nothing;", "insert into public.town_works (id, opened_at) select town.cat('bridge')->>'work', now() on conflict (id) do nothing;"),
      ["one work, the bridge: closed"]],
    ["run again, the file writes over what the bridge needs and has", swap("  on conflict (work, thing) do nothing;", "  on conflict (work, thing) do update set need = excluded.need, have = 0;"), ["run again, it leaves what the bridge needs and has"]],
    ["the bridge is seeded needing a stone more", swap("b.k->>'thing', (b.k->>'need')::integer from", "b.k->>'thing', (b.k->>'need')::integer + 1 from"), ["one work, the bridge: closed"]],
    // ── the rules
    ["a work that has all it needs still wants more",
      swap("(p_work->'needs'->p_thing->>'have')::integer < (p_work->'needs'->p_thing->>'need')::integer", "(p_work->'needs'->p_thing->>'have')::integer <= (p_work->'needs'->p_thing->>'need')::integer"), [CASES.wants, CASES.lift]],
    ["a work that is not open wants",
      swap("select coalesce((p_work->>'open')::boolean, false) and coalesce(jsonb_typeof(p_work->'needs'->p_thing) = 'object', false)", "select coalesce(jsonb_typeof(p_work->'needs'->p_thing) = 'object', false)"), [CASES.wants]],
    ["half a tile is near", cut("p_x is not null and p_y is not null\n     and ", "coalesce(greatest(abs(p_x"), [CASES.near]],
    ["near is a tile less", swap("<= (b.k->>'near')::integer, false)", "< (b.k->>'near')::integer, false)"), [CASES.near, CASES.lift, CASES.lay]],
    ["near is by one way only",
      swap("coalesce(greatest(abs(p_x - (b.k->p_which->>0)::integer), abs(p_y - (b.k->p_which->>1)::integer))", "coalesce(greatest(abs(p_x - (b.k->p_which->>0)::integer), 0)"), [CASES.near]],
    ["the spans are counted by whole shares of a bridge of any size",
      swap("(p_have * (town.cat('bridge')->>'spans')::integer) / p_need))", "p_have / greatest(1, p_need / (town.cat('bridge')->>'spans')::integer)))"), [CASES.spans]],
    ["more spans than the bridge has", swap("greatest(0, least((town.cat('bridge')->>'spans')::integer, ", "greatest(0, least(1000, "), [CASES.spans]],
    ["a stone is lifted for a bridge that is not open",
      cut("  if not coalesce((p_work->>'open')::boolean, false) or not coalesce(jsonb_typeof(p_work->'needs'->thing) = 'object', false) then return town.no('closed'); end if;\n", "  if not town.works_wants"), [CASES.lift]],
    ["a stone is lifted for a bridge that is whole",
      cut("  if not town.works_wants(p_work, thing) then return town.no('whole'); end if;\n", "  if coalesce(jsonb_typeof(p_carried), '') = 'object' then return town.no('held')"), [CASES.lift]],
    ["a stone is lifted with a thing in the hand", nth("  if town.hand_of(p_purse) is not null then return town.no('hand'); end if;\n", "", 1), [CASES.lift, "…and only with nothing in the hand: hand"]],
    ["a stone is lifted from anywhere",
      cut("  if not town.stone_near(p_x, p_y, 'pile') then return town.no('far'); end if;\n", "  return jsonb_build_object('ok', true,\n    'purse', town.spend(p_purse, (b->'costs'->>'lift')"), [CASES.lift, "a stone is lifted only from a tile by the pile: far"]],
    ["a stone is lifted at the foot", swap("town.stone_near(p_x, p_y, 'pile')", "town.stone_near(p_x, p_y, 'foot')"), [CASES.lift, "lifted at the pile with empty hands"]],
    ["lifting costs nothing", swap("town.spend(p_purse, (b->'costs'->>'lift')::double precision, p_now)", "town.spend(p_purse, 0::double precision, p_now)"), [CASES.lift, "lifted at the pile with empty hands"]],
    ["a stone lifted begins with nobody's hands on it", swap("'hands', jsonb_build_array(p_me)));", "'hands', '[]'::jsonb));"), [CASES.lift]],
    ["a stone is handed on in a work that is not open", nth(SHUT, "", 1), [CASES.pass]],
    ["a stone is handed to somebody who holds one",
      cut("  if coalesce(jsonb_typeof(p_their_carried), '') = 'object' then return town.no('held'); end if;\n", "  if town.hand_of(p_theirs)"), [CASES.pass]],
    ["a stone is handed to somebody with a thing in the hand",
      cut("  if town.hand_of(p_theirs) is not null then return town.no('hand'); end if;\n", "  select coalesce(jsonb_agg(x.id order by x.ord)"), [CASES.pass, "a stone is not handed to somebody with a thing in the hand: hand"]],
    ["somebody a stone comes back to is two of its hands", swap("with ordinality x(id, ord) where x.id <> p_to;", "with ordinality x(id, ord);"), [CASES.pass]],
    ["every hand a stone came by is remembered", swap("  if jsonb_array_length(hands) > most then", "  if false then"), [CASES.pass]],
    ["the first hands are remembered, not the last", swap("where x.ord > jsonb_array_length(hands) - most;", "where x.ord <= most;"), [CASES.pass]],
    ["a stone is laid on a bridge that is whole",
      cut("  if need is not null and have >= need then return town.no('whole'); end if;\n", "  if not town.stone_near(p_x, p_y, 'foot')"), [CASES.lay, "…then nothing more is laid or lifted: whole"]],
    ["a stone is laid from anywhere", cut("  if not town.stone_near(p_x, p_y, 'foot') then return town.no('far'); end if;\n", "  have := have + 1;"), [CASES.lay, "a stone is laid only from a tile by the foot"]],
    ["laying costs nothing", swap("town.spend(p_purse, (b->'costs'->>'lay')::double precision, p_now)", "town.spend(p_purse, 0::double precision, p_now)"), [CASES.lay, "laid at the foot: one stamina"]],
    ["a stone laid is two", swap("  have := have + 1;\n", "  have := have + 2;\n"), [CASES.lay]],
    ["no stone finishes a span", swap("'span', town.stone_spans(have, need) > town.stone_spans(have - 1, need),", "'span', false,"), [CASES.lay, "the ninety-ninth is no span, the hundredth is the first"]],
    ["a bridge that takes any amount is whole at once", swap("    'whole', need is not null and have >= need);", "    'whole', need is null or have >= need);"), [CASES.lay]],
    ["empty hands let go of a stone",
      cut("              when coalesce(jsonb_typeof(p_carried), '') <> 'object' then town.no('none')\n", "              else jsonb_build_object('ok', true) end"), [CASES.drop, "with no stone there is nothing to hand on, to lay or to let go of: none"]],
    ["a work takes more than it needs",
      cut("  if need is not null and have + p_n > need then return town.no('over'); end if;\n", "  return jsonb_build_object('ok', true, 'purse', p_purse ||"), [CASES.give, "what would pass what the work needs is refused whole: over"]],
    ["a work takes what the bag has not", swap("  if town.held(p_purse->'bag', p_thing) < p_n then return town.no('short'); end if;\n", ""), [CASES.give, "more than the bag has is short"]],
    ["what is given stays in the bag",
      swap("'purse', p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', p_thing, p_n)), 'have', have + p_n);", "'purse', p_purse, 'have', have + p_n);"), [CASES.give, "so many given leave the bag"]],
    ["a work that is not open is given to", nth(SHUT, "", 3), [CASES.give, "a work that is not open, and one there is none of, take nothing: closed"]],
    // ── what is counted and marked
    ["a second stone is not counted to whoever has one", swap(COUNTED, "on conflict (work, member_id, thing) do nothing;"), [END, "my own count is told to me alone"]],
    ["when somebody first came moves with every stone",
      swap(COUNTED, "on conflict (work, member_id, thing) do update set n = public.town_work_hands.n + excluded.n, first_at = excluded.first_at;"), [END, "the sign's names are everybody who has helped in the order they first came"]],
    ["a stone laid is not added to what the bridge has",
      cut("  update public.town_work_needs n set have = n.have + p_add where n.work = p_work and n.thing = p_thing;\n", "  update public.town_works w set done_at"), [END, "laid at the foot: one stamina"]],
    ["a work that has all it needs is not marked",
      swap("   where w.id = p_work and w.done_at is null\n", "   where false and w.done_at is null\n"), [END, "the six-hundredth stone makes the bridge whole", "the last it needs makes it whole"]],
    ["a work that takes any amount is marked whole", swap("where n.work = w.id and (n.need is null or n.have < n.need));", "where n.work = w.id and n.have < n.need);"), ["…and a work with a need that has no number is not marked whole"]],
    // ── what a page is told
    ["a page is told a closed work's numbers",
      swap("select jsonb_object_agg(w.id, case when w.opened_at is null\n", "select jsonb_object_agg(w.id, case when false\n"), ["a page is told only that the bridge is not open", "…and each tells the page again that it is not open"]],
    ["a stone is told of while the bridge is closed",
      swap("                 where c.member_id = p_member and w.opened_at is not null))", "                 where c.member_id = p_member))"), ["a page is told only that the bridge is not open", "closed again, whoever held a stone is told of none"]],
    ["everybody's count is told to everybody",
      swap("from public.town_work_hands h where h.work = w.id and h.member_id = p_member), '{}'::jsonb)) end)", "from public.town_work_hands h where h.work = w.id), '{}'::jsonb)) end)"), ["my own count is told to me alone"]],
    ["the names are in the order of their ids", swap("order by q.first_at, q.id_text)", "order by q.id_text)"), ["…and the names stay on the sign in the order they came"]],
    ["the names are told with when each came",
      swap("select jsonb_agg(jsonb_build_object('id', q.member_id, 'name', q.name) order by", "select jsonb_agg(jsonb_build_object('id', q.member_id, 'name', q.name, 'n', q.first_at) order by"), ["…and nobody's count but mine is in what I am told"]],
    // ── the helpers' line, and the tally's words
    ["a stone laid counts on no line",
      cut("-- `town.work_counts_of` as it stands, with one branch more", "-- `town.deed_th` as it stands, with six"), ["town.work_counts_of is the one it replaces", CASES.counts, LINE, "…and each has a point on the helpers' line"]],
    ["only whoever lays a stone has a point",
      swap("E'  if what in (''stone_lay'', ''stone_hand'') then\\n'", "E'  if what in (''stone_lay'') then\\n'"), ["town.work_counts_of is the one it replaces", CASES.counts, LINE, "…and each has a point on the helpers' line"]],
    ["a stone is two points", swap("''raw'', town.cat(''bridge'')->''point''));\\n'", "''raw'', to_jsonb(2)));\\n'"), ["town.work_counts_of is the one it replaces", CASES.counts, LINE]],
    ["a stone lifted is a point too",
      swap("E'  if what in (''stone_lay'', ''stone_hand'') then\\n'", "E'  if what in (''stone_lay'', ''stone_hand'', ''stone_lift'') then\\n'"), ["town.work_counts_of is the one it replaces", CASES.counts, LINE]],
    ["letting go has no word", swap("when ''stone_drop'' then ''ปล่อยหินทิ้ง'' ", ""), ["town.deed_th is the one it replaces", "each deed of the bridge's and the works' has its word in Thai"]],
    // ── what a member calls
    ["the rules are left to a browser",
      cut("revoke execute on all functions in schema town from public, anon, authenticated;\n", "/* ── what a browser calls"), ["the twelve rules are no browser's to call"]],
    // (asked from outside they are refused all the same: the schema itself is no browser's to use, as the dry run's last check holds)
    ["the works are read by somebody signed out",
      cut("revoke execute on function public.town_works_read() from public, anon;\n", "revoke execute on function public.town_stone_lift"), ["the six a browser calls are a member's to call", "somebody signed out is refused all six"]],
    ["a stone is laid by somebody signed out",
      cut("revoke execute on function public.town_stone_lay(integer, integer) from public, anon;\n", "revoke execute on function public.town_stone_drop"), ["the six a browser calls are a member's to call", "somebody signed out is refused all six"]],
    ["the works are read by whoever is signed in", nth("  me uuid := town.member();\n", "  me uuid := auth.uid();\n", 1), ["a character never proved is refused all six", "while the town's game is shut a member is refused"]],
    ["lifting does not keep the purse", nth(KEEP, "", 1), ["lifted at the pile with empty hands"]],
    ["lifting is not written down", cut("    perform town.note(me, 'stone_lift',", "  end if;\n  return town.answer(me, (did - 'purse' - 'carried')"), ["every deed is written down"]],
    ["the lifter's answer tells whose hands the stone has been through",
      swap("  return town.answer(me, (did - 'purse' - 'carried') || jsonb_build_object('works', town.works_told(me)));", "  return town.answer(me, (did - 'purse') || jsonb_build_object('works', town.works_told(me)));"),
      ["…and its answer says nothing of whose hands the stone came by"]],
    ["a stone handed on is in both pairs of hands", nth(GONE, "", 1), ["handed on to somebody with empty hands"]],
    ["a stone is handed to oneself", swap("  if p_to is null or p_to = me or not exists (", "  if p_to is null or not exists ("), ["…nor to oneself, to nobody, to a character never proved"]],
    ["a stone is handed to a character never proved",
      swap("        where pp.member_id = p_to and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)) then", "        where pp.member_id = p_to) then"),
      ["…nor to oneself, to nobody, to a character never proved"]],
    ["handing on is not written down", cut("    perform town.note(me, 'stone_pass',", "  end if;\n  return town.answer(me, (did - 'carried')"), ["every deed is written down"]],
    ["a stone laid stays in the hands", nth(GONE, "", 2), ["laid at the foot: one stamina"]],
    ["laying does not keep the purse", nth(KEEP, "", 2), ["laid at the foot: one stamina"]],
    ["only whoever lays a stone is counted it", swap(LAID, "perform town.works_counted(work_, carried->>'thing', array[me], 1, 1, now_);"), [END, "all three whose hands it went through are counted one stone"]],
    ["everybody a stone came by is counted two", swap(LAID, "perform town.works_counted(work_, carried->>'thing', hands, 2, 1, now_);"), [END, "all three whose hands it went through are counted one stone"]],
    ["the others a stone came by have no line of the deeds",
      cut("    -- (a line of the deeds for each of the others it came by", "  end if;\n  return town.answer(me, (did - 'purse' - 'hands')"), [LINE, "…and each has a point on the helpers' line", "every deed is written down"]],
    ["whoever lays a stone has a second line of the deeds", swap("       where h.id <> me\n", ""), [LINE, "…and each has a point on the helpers' line", "every deed is written down"]],
    ["laying is not written down", cut("    perform town.note(me, 'stone_lay',", "    -- (a line of the deeds for each of the others it came by"), [LINE, "every deed is written down"]],
    ["the laying tells whose hands the stone came by",
      swap("(did - 'purse' - 'hands') || jsonb_build_object('works', town.works_told(me))", "(did - 'purse') || jsonb_build_object('works', town.works_told(me))"), ["…and its answer says nothing of whose hands the stone came by"]],
    ["a stone let go of stays in the hands", nth(GONE, "", 3), ["let go of anywhere, it is gone"]],
    ["letting go is not written down", cut("    perform town.note(me, 'stone_drop',", "  end if;\n  return town.answer(me, did || jsonb_build_object"), ["let go of anywhere, it is gone"]],
    ["a giving is counted one whatever was given",
      swap("perform town.works_counted(p_work, p_thing, array[me], p_n, p_n, now_);", "perform town.works_counted(p_work, p_thing, array[me], 1, p_n, now_);"), ["so many given leave the bag"]],
    ["a giving does not keep the purse", nth(KEEP, "", 3), ["so many given leave the bag"]],
    ["a giving is not written down", cut("    perform town.note(me, 'work_give',", "  end if;\n  return town.answer(me, (did - 'purse') || jsonb_build_object"), ["…written down as a deed with its word"]],
  ];
  const from = Number(process.env.FROM ?? 0), to = Number(process.env.TO ?? all.length);
  return all.slice(from, to);
};
