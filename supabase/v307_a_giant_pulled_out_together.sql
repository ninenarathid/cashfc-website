-- v307 — a giant pulled out together
-- Run this once in the Supabase SQL editor, after v306. Running it again is safe.
--
-- The owner, 2026-10-27, on hearing that a rank-7 giant (the giant seeds, v238/v301) is picked by its grower alone
-- with one plain tap: "ทำให้มีมินิเกมเล่นหลายคน ช่วยกันดึงผัก ... ทำ UI gameplay ออกมาดีๆได้เลย". Of a giant pulled by
-- many he had said before that the grower keeps it, "คนมาช่วยได้ reward นิดๆหน่อยๆ", "แต้มกับชื่อก็พอ".
--
-- What changes (lib/town/giant-pull is the page's twin, word for word in its numbers):
--   * public.town_giant_pull(p_action, p_x, p_y, p_hits): at a ripe giant's root, whoever may pick in that bed calls
--     (`open`); up to three others join (`join`) or leave (`leave`) while the call stands (three minutes); the caller
--     starts (`go`). The giant then rocks on the database's clock: after a count-in of 3 s, a half-swing every 1.3 s,
--     45 of them. Each of the crew reports the half-swings they pulled well (`hits`, judged on their page at the
--     press, the trust the giant's planting game already has); a half-swing pulled well by one is worth 1, by two or
--     more 3; at 24 the giant is out. Each of the crew spends one stamina in a go, at their first report (none left:
--     never refused). `look` answers the plot as it stands.
--   * Once out, the grower picks it as ever, with one fruit more for each helper who pulled well three times (three at
--     the most), and each of those helpers has five points on the helpers' line (the deed `giant_help`, written in
--     their name and counted by the deeds' trigger through town.work_counts_of, as the lamp relay's `lamp_hand`).
--   * Until it is out a giant is picked by nobody: town.deed_for offers no pick for it (so the plain tap and the
--     crescent sickle's row pass it by), and town.pick refuses it as unripe.
-- The call and its go are kept on the giant's root plant (`plant.pull`), so every page reads them with the farm's
-- plots as it reads the rest; the four functions it touches are changed by their live text, as v287 and v291 did.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

do $guard$ begin
  if to_regprocedure('public.town_farm(bigint)') is null or to_regprocedure('town.pick(text,jsonb,jsonb,boolean,text,bigint,text)') is null
     or to_regprocedure('town.deed_for(text,jsonb,text,text,bigint,text)') is null or to_regprocedure('town.work_counts_of(jsonb,text)') is null
     or to_regprocedure('town.deed_th(text)') is null or to_regprocedure('town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid)') is null
    then raise exception 'v307: run the farm''s migrations and v301 first'; end if;
end $guard$;

-- ── 1. The pick, the deed a plot offers, the helpers' points and the deeds' words: their live text, but for these ──
do $$
declare c text[]; d text; n integer; o text; nw text;
begin
  foreach c slice 1 in array array[
    ['town.deed_for(text,jsonb,text,text,bigint,text)', '    if ripe and mine then return ''pick''; end if;',
     '    -- (v307: a giant is picked once it has been pulled out together, public.town_giant_pull)
    if ripe and mine and (p->''giant'' is distinct from ''true''::jsonb or coalesce((p->''pull''->>''out'')::bigint, 0) > 0) then return ''pick''; end if;', '1'],
    ['town.pick(text,jsonb,jsonb,boolean,text,bigint,text)', '  if p->''giant''=''true''::jsonb then n:=n+5*town.yield_of(p_key,p,null);end if;',
     '  -- (v307: a giant comes out of the ground only by its pulling, and gives a fruit more for each helper who pulled well)
  if p->''giant''=''true''::jsonb and coalesce((p->''pull''->>''out'')::bigint,0)=0 then return town.no(''unripe''); end if;
  if p->''giant''=''true''::jsonb then n:=n+5*town.yield_of(p_key,p,null)+greatest(0,least(3,coalesce((p->''pull''->>''bonus'')::integer,0)));end if;', '1'],
    ['town.work_counts_of(jsonb,text)', '  if what in (''lamp_light'', ''lamp_hand'') then',
     '  -- ── v307: a giant pulled out together, five to each helper who pulled it well ──
  if what = ''giant_help'' then
    return jsonb_build_array(jsonb_build_object(''to'', null, ''line'', ''helpers'', ''raw'', 5));
  end if;
  if what in (''lamp_light'', ''lamp_hand'') then', '1'],
    ['town.deed_th(text)', 'when ''flame_take'' then', 'when ''giant_help'' then ''ช่วยเพื่อนดึงผักยักษ์'' when ''flame_take'' then', '1']] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (the file may come with CR at its line ends: the texts compared without them)
    o := replace(c[2], chr(13), ''); nw := replace(c[3], chr(13), '');
    -- (made already, on a run before)
    continue when position(nw in d) > 0;
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n = c[4]::integer then execute replace(d, o, nw);
    else raise exception 'v307: % has % of [%], not %: rebuild v307', c[1], n, left(c[2], 60), c[4]; end if;
  end loop;
end $$;

-- ── 2. The game ──
-- (its numbers are lib/town/giant-pull's PULL: crew 4, call 180 s, count-in 3 s, half-swing 1.3 s, 45 half-swings,
-- window 0.22 s, grip 24, worth 1 alone and 3 together, a helper's 3 good pulls, 5 points, 5 s of grace, 1.5 s ahead)
create or replace function public.town_giant_pull(p_action text, p_x integer, p_y integer, p_hits jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  key_ text := p_x::text || ',' || p_y::text;
  bed_n integer;
  purse_ jsonb;
  plot_ jsonb;
  keeping_ jsonb;
  seen_ jsonb;
  p_ jsonb;
  pull_ jsonb;
  crew_ jsonb;
  hits_ jsonb;
  mine_ jsonb;
  helped_ jsonb;
  owner_ text;
  go_ bigint;
  ends_ bigint;
  done_ integer;
  calling_ boolean;
  pulling_ boolean;
  ripe_ boolean;
  may_ boolean;
  e jsonb;
begin
  if p_action is null or p_action not in ('open', 'join', 'leave', 'go', 'hits', 'look') or p_x is null or p_y is null then
    return town.answer(me, town.no('none'));
  end if;
  bed_n := town.bed_of(p_x, p_y);
  if bed_n is null or bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- (my purse held first, then the bed, as a tend holds them)
  purse_ := town.purse_of(me, true);
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select jsonb_build_object('soil', q.soil, 'plant', coalesce(q.plant, 'null'::jsonb)) || case when q.damp then '{"damp": true}'::jsonb else '{}'::jsonb end
    into plot_ from public.town_plots q where q.x = p_x and q.y = p_y for update;
  p_ := coalesce(plot_->'plant', 'null'::jsonb);
  if plot_ is null or jsonb_typeof(p_) is distinct from 'object' or p_->'giant' is distinct from 'true'::jsonb or coalesce(p_->>'root', key_) <> key_ then
    return town.answer(me, town.no('none'));
  end if;
  if p_action = 'look' then return town.answer(me, jsonb_build_object('ok', true, 'plots', jsonb_build_object(key_, plot_))); end if;
  pull_ := case when jsonb_typeof(p_->'pull') = 'object' then p_->'pull' end;
  if coalesce((pull_->>'out')::bigint, 0) > 0 then return town.answer(me, town.no('done') || jsonb_build_object('plots', jsonb_build_object(key_, plot_))); end if;
  go_ := coalesce((pull_->>'go')::bigint, 0);
  ends_ := go_ + 3000 + 44 * 1300 + 650 + 220;
  calling_ := pull_ is not null and go_ = 0 and coalesce((pull_->>'at')::bigint, 0) + 180000 > now_;
  pulling_ := pull_ is not null and go_ > 0 and now_ <= ends_ + 5000;
  crew_ := case when jsonb_typeof(pull_->'crew') = 'array' then pull_->'crew' else '[]'::jsonb end;
  seen_ := town.see(key_, plot_, now_);
  ripe_ := coalesce((seen_->>'ripe')::boolean, false) and not coalesce((seen_->>'dead')::boolean, false);
  if p_action in ('open', 'go') then
    select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping_ from public.town_beds b where b.bed = bed_n;
    owner_ := town.owner_of(keeping_, true, now_);
    may_ := owner_ is null or owner_ = me::text;
  end if;

  if p_action = 'open' then
    if not may_ then return town.answer(me, town.no('theirs')); end if;
    if not ripe_ then return town.answer(me, town.no('none')); end if;
    if calling_ or pulling_ then return town.answer(me, town.no('busy') || jsonb_build_object('plots', jsonb_build_object(key_, plot_))); end if;
    -- (called again after a go that did not take: the crew is kept, they are still standing there)
    pull_ := jsonb_build_object('by', me::text, 'at', now_,
      'crew', case when pull_ is not null and go_ > 0 and pull_->>'by' = me::text and now_ <= ends_ + 180000 then crew_ else jsonb_build_array(me::text) end,
      'go', 0, 'hits', '{}'::jsonb, 'paid', '[]'::jsonb, 'out', 0, 'bonus', 0, 'helped', '[]'::jsonb);
  elsif p_action = 'join' then
    if not calling_ then return town.answer(me, town.no('shut')); end if;
    if crew_ ? me::text then return town.answer(me, town.no('in')); end if;
    if jsonb_array_length(crew_) >= 4 then return town.answer(me, town.no('full')); end if;
    pull_ := pull_ || jsonb_build_object('crew', crew_ || to_jsonb(me::text));
  elsif p_action = 'leave' then
    if not calling_ or not crew_ ? me::text then return town.answer(me, town.no('shut')); end if;
    pull_ := case when pull_->>'by' = me::text then null else pull_ || jsonb_build_object('crew', crew_ - me::text) end;
  elsif p_action = 'go' then
    if not calling_ then return town.answer(me, town.no('shut')); end if;
    if pull_->>'by' is distinct from me::text or not may_ then return town.answer(me, town.no('theirs')); end if;
    if not ripe_ then return town.answer(me, town.no('none')); end if;
    pull_ := pull_ || jsonb_build_object('go', now_);
  else
    -- hits: the half-swings I pulled well so far
    if pull_ is null or go_ = 0 then return town.answer(me, town.no('shut')); end if;
    if not crew_ ? me::text then return town.answer(me, town.no('crew')); end if;
    if now_ > ends_ + 5000 then return town.answer(me, town.no('late')); end if;
    if jsonb_typeof(p_hits) is distinct from 'array' or jsonb_array_length(p_hits) > 45 then return town.answer(me, town.no('none')); end if;
    for e in select x from jsonb_array_elements(p_hits) as t(x) loop
      if jsonb_typeof(e) <> 'number' or (e #>> '{}')::numeric <> floor((e #>> '{}')::numeric)
         or (e #>> '{}')::numeric < 0 or (e #>> '{}')::numeric > 44
         or go_ + 3000 + (e #>> '{}')::bigint * 1300 + 650 - 220 > now_ + 1500 then
        return town.answer(me, town.no('none'));
      end if;
    end loop;
    select coalesce(jsonb_agg(s.k order by s.k), '[]'::jsonb) into mine_
      from (select distinct (x #>> '{}')::integer as k
              from jsonb_array_elements(coalesce(pull_->'hits'->(me::text), '[]'::jsonb) || p_hits) as t(x)) s;
    hits_ := coalesce(pull_->'hits', '{}'::jsonb) || jsonb_build_object(me::text, mine_);
    if not coalesce(pull_->'paid', '[]'::jsonb) ? me::text then
      perform town.keep_purse(me, town.spend(purse_, 1::double precision, now_));
      pull_ := pull_ || jsonb_build_object('paid', coalesce(pull_->'paid', '[]'::jsonb) || to_jsonb(me::text));
    end if;
    select coalesce(sum(case when s.n >= 2 then 3 else s.n end), 0)::integer into done_
      from (select (v #>> '{}')::integer as k, count(*) as n from jsonb_each(hits_) m, jsonb_array_elements(m.value) v group by 1) s;
    pull_ := pull_ || jsonb_build_object('hits', hits_);
    if done_ >= 24 then
      select coalesce(jsonb_agg(to_jsonb(c.id) order by c.o), '[]'::jsonb) into helped_
        from jsonb_array_elements_text(crew_) with ordinality c(id, o)
       where c.id <> pull_->>'by' and jsonb_array_length(coalesce(hits_->c.id, '[]'::jsonb)) >= 3;
      pull_ := pull_ || jsonb_build_object('out', now_, 'bonus', jsonb_array_length(helped_), 'helped', helped_);
      -- (a line of the deeds for each helper who pulled it well, in their name: only members who are still members)
      insert into public.town_deeds (member_id, at, what, thing, n, doc)
        select h.id::uuid, to_timestamp(now_ / 1000.0), 'giant_help', p_->>'crop', 1,
               jsonb_build_object('by', pull_->>'by', 'tile', jsonb_build_array(p_x, p_y))
          from jsonb_array_elements_text(helped_) with ordinality h(id, o) join public.profiles pr on pr.id = h.id::uuid
         order by h.o;
    end if;
  end if;

  plot_ := plot_ || jsonb_build_object('plant', case when pull_ is null then p_ - 'pull' else p_ || jsonb_build_object('pull', pull_) end);
  update public.town_plots q set plant = plot_->'plant', changed = now_ where q.x = p_x and q.y = p_y;
  return town.answer(me, jsonb_build_object('ok', true, 'plots', jsonb_build_object(key_, plot_)));
end $$;
revoke all on function public.town_giant_pull(text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.town_giant_pull(text, integer, integer, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards (read only):
--   select position('giant_help' in pg_get_functiondef('town.work_counts_of(jsonb,text)'::regprocedure)) > 0 as counted,
--          position('pull''->>''out' in pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint,text)'::regprocedure)) > 0 as gated,
--          position('pull''->>''out' in pg_get_functiondef('town.deed_for(text,jsonb,text,text,bigint,text)'::regprocedure)) > 0 as offered,
--          has_function_privilege('anon', 'public.town_giant_pull(text,integer,integer,jsonb)', 'EXECUTE') as anon_may;
--   → true, true, true, false
--   select town.deed_th('giant_help');                     → ช่วยเพื่อนดึงผักยักษ์
--   (a day on) select d.what, count(*) from public.town_deeds d where d.what = 'giant_help' group by 1;
