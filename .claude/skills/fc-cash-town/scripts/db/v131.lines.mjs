// What v131 changes in two functions it writes again, a line (or a block) at a time: each pair is the text as it
// stands and the text v131 has in its place. `town_bugs` is v125's; `town_net` is v126's (v125's with a ladybird's
// doing). build-v131.mjs writes both from them, and v131.test.mjs holds the file to the same.
export const TOWN_BUGS = [
  // what has come back is read once, with the row and the word
  [`  word text := town.word();
  took jsonb;`,
   `  word text := town.word();
  backs jsonb := town.backs_now(now_);
  took jsonb;`],
  // a haunt has its own, or one come back to it
  [`    has := town.bug_at(i, now_, ins, word);`,
   `    has := town.bug_here(i, now_, backs, ins, word);`],
  // and the page is told when to ask again: the moment the next one comes back somewhere (never where)
  [`  return jsonb_build_object('now', now_, 'bugs', out_,`,
   `  return jsonb_build_object('now', now_, 'bugs', out_,
    'bugsAgain', (select min((x->>'from')::bigint) from jsonb_array_elements(backs) x where (x->>'from')::bigint > now_),`],
];

export const TOWN_NET = [
  // what it keeps in mind
  [`  rid_plant jsonb;
begin`,
   `  rid_plant jsonb;
  backs jsonb;
  back jsonb := null;
begin`],
  // what the haunt has: its own, or one come back to it
  [`  has := town.bug_at(p_haunt, now_);`,
   `  backs := town.backs_now(now_);
  has := town.bug_here(p_haunt, now_, backs);`],
  // caught: one of the haunt's own comes back somewhere else on that map, a little later
  [`    -- the first of its kind caught in the village: written in the book, with who`,
   `    -- caught, it is gone for everybody (a haunt's insect is one member's: its kind's \`shares\`). One that was the
    -- haunt's own comes back at another haunt of that map a little later (lib/town/insects.ts's comeback); one that
    -- had come back brings nothing back, so a map gives at most twice what its haunts roll
    if not coalesce((has->>'back')::boolean, false) then
      back := town.comeback(p_haunt, now_, backs, random(), random(), random());
      if back is not null then
        insert into public.town_comebacks (haunt, turn, bug, n, from_ms, by)
          values ((back->>'haunt')::int, (back->>'turn')::bigint, back->>'bug', (back->>'n')::int, (back->>'from')::bigint, me)
          on conflict (haunt, turn) do nothing;
        -- (somebody's catch at the same moment put one there first: this one brings none)
        if not found then back := null; end if;
      end if;
    end if;
    delete from public.town_comebacks c where c.from_ms < now_ - 6 * 3600000::bigint;
    -- the first of its kind caught in the village: written in the book, with who`],
  // the deed's line says whether it was one that had come back, and where this one's comes back
  [`      || case when rid is not null then jsonb_build_object('rid', rid, 'whose', rid_plant->>'by') else '{}'::jsonb end);`,
   `      || case when rid is not null then jsonb_build_object('rid', rid, 'whose', rid_plant->>'by') else '{}'::jsonb end
      || case when coalesce((has->>'back')::boolean, false) then jsonb_build_object('back', true) else '{}'::jsonb end
      || case when back is not null then jsonb_build_object('next', (back->>'haunt')::int) else '{}'::jsonb end);`],
  // and the page is told when to ask again: the moment it comes back (never where)
  [`    || case when rid is not null then jsonb_build_object('rid', rid, 'ridPlot', jsonb_build_object('soil', rid_soil, 'plant', rid_plant)) else '{}'::jsonb end;`,
   `    || case when rid is not null then jsonb_build_object('rid', rid, 'ridPlot', jsonb_build_object('soil', rid_soil, 'plant', rid_plant)) else '{}'::jsonb end
    || case when back is not null then jsonb_build_object('bugsAgain', (back->>'from')::bigint) else '{}'::jsonb end;`],
];
