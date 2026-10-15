-- v268: graded things on stalls, the notice board and the well's jar (the farm's Quality).
-- Run after v267 and with the matching site code. Safe to run twice.
--
-- Since v260 produce has a grade at the pick (silver, gold, excellent; v261 a dish's and a preparation's too), and a
-- graded stack is no plain thing (town.plain, town.take_plain pass it over), so stalls and the notice board refused
-- every graded thing; and the jar took one in but lost its grade. After launch most of a harvest is graded, so these
-- places would be nearly useless for produce. Now a listing carries a grade (lib/town/shop, notices, jar):
--   * "Tomato ★★" is a thing of its own on a stall line, a notice, and in the jar. A line and a notice name their grade
--     (none for normal); selling or bringing takes only stacks of exactly that grade that hold and carry nothing else
--     (town.plain_g, town.take_plain_g), and whoever buys or fetches has them at it (town.put_g, town.room_g). A wanted
--     notice or a stall's buy line names the grade it wants and only that grade fills it; a grade is only of a thing
--     that can carry one (town.may_grade). Normal (no grade) is as it was, to the digit.
--   * A stall names a thing once at a grade; the RPCs that buy from and sell to a line name it by kind, thing and grade
--     (public.town_shop_buy and town_shop_sell gain p_grade, 0 when left out; their old signatures are dropped).
--   * The most a graded thing may be asked or offered for is the plain most times town.grade_pays (raw produce
--     ×1.25 / ×1.75 / ×2.5, anything else ×1), floored to a whole coin; a gem keeps its own.
--   * A wanted notice is still only of a thing somebody has found, whatever its grade (the owner: "การรับซื้อห้าม show
--     ไอเทม ที่ยังไม่มีคนพบเด็ดขาด").
--   * The board's sales keep their grade and are told apart from the normal thing's ("tomato:2"), so a price chart for
--     tomatoes is not lifted by excellent ones (town_notices.grade, town_notice_sales.grade; public.town_notice_post
--     gains p_grade).
--   * The jar keeps [thing, n] or [thing, n, grade], merged only at the same grade; its shares and what is taken carry
--     the grade. Rows already in the jar (pairs) are normal and keep working.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.garden_now(integer,bigint,jsonb)') is null then raise exception 'Run v267 before v268'; end if;
-- <guards:v268>
 if md5(replace(pg_get_functiondef('town.jar_add(jsonb,text,integer)'::regprocedure),chr(13),'')) not in ('c9ab490eebde49ca59145c900c01a677','1a32edf3dd163285f04db50a7eb2b5a6') then raise exception 'Definition changed: town.jar_add(jsonb,text,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('town.jar_drop(jsonb,jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('cf99d0debbb72095279c12115347e5d9','84365b89a1bd4c4d7659c800a2e93c2e') then raise exception 'Definition changed: town.jar_drop(jsonb,jsonb,jsonb); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('town.jar_settle(jsonb,jsonb,jsonb,integer)'::regprocedure),chr(13),'')) not in ('19853947e41e2152e7cc68dd5284737a','48db4547cbc264c0d461eb983be4fb4a') then raise exception 'Definition changed: town.jar_settle(jsonb,jsonb,jsonb,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('town.jar_collect(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('caa637802fa55ea555fdb95af75557a8','eedbb8a3f6ecc57140dd3cabd45c788b') then raise exception 'Definition changed: town.jar_collect(jsonb,jsonb); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('public.town_jar_drop(integer,integer,integer)'::regprocedure),chr(13),'')) not in ('4be9a799c9b7977f706460c0dfe4353a','363eb06df03cb328a267b248d768cdbd') then raise exception 'Definition changed: public.town_jar_drop(integer,integer,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('town.shop_open(jsonb,text,jsonb,integer,integer,bigint,jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('61cce251e967051f619715b67eed7f38','ec13930987cad48bfd513a42fe9c596b') then raise exception 'Definition changed: town.shop_open(jsonb,text,jsonb,integer,integer,bigint,jsonb,jsonb); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('town.shop_can(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('14500b2db29eda3db6276b95f8b25710','f6072a232593119247c6b42381a3b1f3') then raise exception 'Definition changed: town.shop_can(jsonb,jsonb); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('town.shop_told_of(jsonb,jsonb,bigint,jsonb)'::regprocedure),chr(13),'')) not in ('f2240d97bb90b28f85b3a495a6c28dd7','3bb493a82e1dd44573b0dd04c819d4b5') then raise exception 'Definition changed: town.shop_told_of(jsonb,jsonb,bigint,jsonb); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('town.notice_told(public.town_notices,uuid)'::regprocedure),chr(13),'')) not in ('e4db8daedbbd80c4e53ccdbe4829b447','a5102db0756b40bc8e7470c5f054c5a6') then raise exception 'Definition changed: town.notice_told(public.town_notices,uuid); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('town.notices_told(uuid)'::regprocedure),chr(13),'')) not in ('b538a0a3c0982dcdfce1f919f707edde','755c17bceecdc83bee7308018dbf74da') then raise exception 'Definition changed: town.notices_told(uuid); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('public.town_notice_buy(bigint,integer)'::regprocedure),chr(13),'')) not in ('2dda086016c5e9fd05ffbf47621d9b41','2ea938a8db6c3fea3d592a44a36d1b43') then raise exception 'Definition changed: public.town_notice_buy(bigint,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('public.town_notice_fill(bigint,integer)'::regprocedure),chr(13),'')) not in ('8bcef535463a553d899bc4947b0df393','0c2b32895dc13a9eebefd608a6d470b1') then raise exception 'Definition changed: public.town_notice_fill(bigint,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('public.town_notice_fetch(bigint)'::regprocedure),chr(13),'')) not in ('de23a1ca337667311b026d3cf8f1645c','97ed09817c91434e391f707ba461cb4b') then raise exception 'Definition changed: public.town_notice_fetch(bigint); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef('public.town_notice_down(bigint)'::regprocedure),chr(13),'')) not in ('ec9f840f26d6050f6f8df4cd7028839f','2565a723ad513df7e5b6986ef73597ab') then raise exception 'Definition changed: public.town_notice_down(bigint); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.shop_line(jsonb,text,text,text,integer,integer,integer,bigint,jsonb)')),chr(13),'')) <> '161b68bd05e402b3f5dc99c881423ad9' then raise exception 'Definition changed: town.shop_line(jsonb,text,text,text,integer,integer,integer,bigint,jsonb); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.shop_buy(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb)')),chr(13),'')) <> 'fd997746bce5239cec5740c349c9e132' then raise exception 'Definition changed: town.shop_buy(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.shop_sell(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb)')),chr(13),'')) <> '50d4911cb2848d7b28df47ce6393615e' then raise exception 'Definition changed: town.shop_sell(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.shop_deal(uuid,uuid,text,text,integer,integer,integer)')),chr(13),'')) <> 'e8ed10cf4a1091ba67688a6087763096' then raise exception 'Definition changed: town.shop_deal(uuid,uuid,text,text,integer,integer,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('public.town_shop_buy(uuid,text,integer,integer,integer)')),chr(13),'')) <> 'dc8415a18dcd28c60965b3b59ce21b11' then raise exception 'Definition changed: public.town_shop_buy(uuid,text,integer,integer,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('public.town_shop_sell(uuid,text,integer,integer,integer)')),chr(13),'')) <> '6404771cf569c11963d17d455696b7f0' then raise exception 'Definition changed: public.town_shop_sell(uuid,text,integer,integer,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('public.town_notice_post(text,text,integer,integer)')),chr(13),'')) <> '5d0d95dc89524c5e14a41f502de2db10' then raise exception 'Definition changed: public.town_notice_post(text,text,integer,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.grade_arg(jsonb)')),chr(13),'')) <> 'fa9129859fbad09337bb078680b43152' then raise exception 'Definition changed: town.grade_arg(jsonb); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.may_grade(text)')),chr(13),'')) <> '866f3bb7ad491320d53c30db6fb6b85f' then raise exception 'Definition changed: town.may_grade(text); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.plain_g(jsonb,text,integer)')),chr(13),'')) <> '2b68e69eac2b4fa826def2457f99eb66' then raise exception 'Definition changed: town.plain_g(jsonb,text,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.take_plain_g(jsonb,text,integer,integer)')),chr(13),'')) <> 'fd40dc0e234143f3162dabe1feb27903' then raise exception 'Definition changed: town.take_plain_g(jsonb,text,integer,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.jar_add_g(jsonb,text,integer,integer)')),chr(13),'')) <> '519555f1367d1a7350a1ecc6dba7cf43' then raise exception 'Definition changed: town.jar_add_g(jsonb,text,integer,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.shop_line(jsonb,text,text,text,integer,integer,integer,bigint,jsonb,integer)')),chr(13),'')) <> '491dc5f88617e76850ea6df65ac69a06' then raise exception 'Definition changed: town.shop_line(jsonb,text,text,text,integer,integer,integer,bigint,jsonb,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.shop_buy(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb,integer)')),chr(13),'')) <> 'cce4efa7abcf444739a07d45fde8129b' then raise exception 'Definition changed: town.shop_buy(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.shop_sell(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb,integer)')),chr(13),'')) <> '497a6c2205a92bebd672ad737885938d' then raise exception 'Definition changed: town.shop_sell(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('town.shop_deal(uuid,uuid,text,text,integer,integer,integer,integer)')),chr(13),'')) <> '1c6ae237fc9962eca1c0b69e2b23eec2' then raise exception 'Definition changed: town.shop_deal(uuid,uuid,text,text,integer,integer,integer,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('public.town_shop_buy(uuid,text,integer,integer,integer,integer)')),chr(13),'')) <> 'd2686cf94857826cbfce79da030af301' then raise exception 'Definition changed: public.town_shop_buy(uuid,text,integer,integer,integer,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('public.town_shop_sell(uuid,text,integer,integer,integer,integer)')),chr(13),'')) <> '255fe07de34d43d9bd27ee34e827a1c1' then raise exception 'Definition changed: public.town_shop_sell(uuid,text,integer,integer,integer,integer); rebuild v268'; end if;
 if md5(replace(pg_get_functiondef(to_regprocedure('public.town_notice_post(text,text,integer,integer,integer)')),chr(13),'')) <> '6fde756f7d7394dbe892d02f2975a495' then raise exception 'Definition changed: public.town_notice_post(text,text,integer,integer,integer); rebuild v268'; end if;
-- </guards:v268>
end $$;

-- ── what a notice and a sale over the board are of ──
alter table public.town_notices add column if not exists grade smallint not null default 0 constraint town_notices_grade_check check (grade between 0 and 3);
alter table public.town_notice_sales add column if not exists grade smallint not null default 0 constraint town_notice_sales_grade_check check (grade between 0 and 3);

-- ── helpers (lib/town/trade's gradeArg, mayGrade, plainAt; notices' plain and takePlain at a grade) ──

-- A grade as a listing names it: left out (or null, or 0) for normal, 1 to 3; -1 for anything else.
create or replace function town.grade_arg(p jsonb)
returns integer language sql immutable set search_path='' as $$
 select case when p is null or p = 'null'::jsonb then 0
             when jsonb_typeof(p) = 'number' and p::text::numeric in (0, 1, 2, 3) then p::text::numeric::integer
             else -1 end
$$;

-- Whether a thing can ever carry a grade: what carries a grade into a dish (v261's town.carries_grade), and a dish.
create or replace function town.may_grade(p_id text)
returns boolean language sql stable set search_path='' as $$
 select town.carries_grade(p_id) or coalesce(town.cat('items')->p_id->>'kind' = 'dish', false)
$$;

-- How many of a thing are in a bag as plain things of one grade (town.plain is the normal grade's).
create or replace function town.plain_g(p_bag jsonb, p_id text, p_grade integer)
returns integer language sql immutable set search_path='' as $$
 select coalesce(sum((s->>'n')::int), 0)::integer from jsonb_array_elements(p_bag) s
  where s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0
    and not town.forged(s) and town.grade_in(s) = coalesce(p_grade, 0)
$$;

-- A bag with so many plain ones of a thing of one grade out of it, from its last stacks first (town.take_plain is the
-- normal grade's).
create or replace function town.take_plain_g(p_bag jsonb, p_id text, p_n integer, p_grade integer)
returns jsonb language plpgsql immutable set search_path='' as $$
declare
  bag jsonb := p_bag;
  s jsonb;
  more integer := p_n;
  less integer;
  i integer;
begin
  for i in reverse jsonb_array_length(bag) - 1..0 loop
    exit when more <= 0;
    s := bag->i;
    continue when town.forged(s) or town.grade_in(s) <> coalesce(p_grade, 0);
    if s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0 then
      less := least(more, (s->>'n')::int);
      more := more - less;
      bag := jsonb_set(bag, array[i::text],
        case when (s->>'n')::int = less then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - less) end);
    end if;
  end loop;
  return bag;
end $$;

-- So many more of a thing at a grade in the jar's things (or in what waits at it): onto its own entry, or a new one at
-- the end; a normal thing is a pair, a graded one has its grade third.
create or replace function town.jar_add_g(p_things jsonb, p_id text, p_n integer, p_grade integer)
returns jsonb language sql immutable set search_path='' as $$
  select case when exists (select 1 from jsonb_array_elements(p_things) e where e->>0 = p_id and coalesce((e->>2)::integer, 0) = coalesce(p_grade, 0))
    then (select jsonb_agg(case when e.one->>0 = p_id and coalesce((e.one->>2)::integer, 0) = coalesce(p_grade, 0)
                             then jsonb_build_array(p_id, (e.one->>1)::integer + p_n) || case when coalesce(p_grade, 0) > 0 then jsonb_build_array(p_grade) else '[]'::jsonb end
                             else e.one end order by e.at)
            from jsonb_array_elements(p_things) with ordinality as e(one, at))
    else p_things || jsonb_build_array(jsonb_build_array(p_id, p_n) || case when coalesce(p_grade, 0) > 0 then jsonb_build_array(p_grade) else '[]'::jsonb end) end
$$;

-- ── the jar ──

-- (the normal grade's, as it was: its callers are the grade's now)
CREATE OR REPLACE FUNCTION town.jar_add(p_things jsonb, p_id text, p_n integer)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select town.jar_add_g(p_things, p_id, p_n, 0)
$function$;

CREATE OR REPLACE FUNCTION town.jar_drop(p_purse jsonb, p_jar jsonb, p_what jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  v_coins numeric;
  v_slot integer;
  v_n numeric;
  s jsonb;
begin
  if p_what ? 'coins' then
    v_coins := (p_what->>'coins')::numeric;
    if v_coins is null or v_coins <> floor(v_coins) or v_coins <= 0 then return town.no('amount'); end if;
    if v_coins > (p_purse->>'coins')::numeric then return town.no('coins'); end if;
    return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::integer - v_coins::integer),
      'jar', p_jar || jsonb_build_object('coins', (p_jar->>'coins')::integer + v_coins::integer));
  end if;
  v_slot := (p_what->>'slot')::integer;
  v_n := (p_what->>'n')::numeric;
  s := case when v_slot >= 0 then p_purse->'bag'->v_slot end;
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  -- ── v164: what carries something of its own is no plain thing ──
  if town.forged(s) then return town.no('unwanted'); end if;
  if not (town.cat('jar')->'kinds' ? (town.cat('items')->(s->>'item')->>'kind')) or s ? 'of' or coalesce((s->>'water')::numeric, 0) > 0 then return town.no('unwanted'); end if;
  if v_n is null or v_n <> floor(v_n) or v_n <= 0 or v_n > (s->>'n')::numeric then return town.no('amount'); end if;
  return jsonb_build_object('ok', true,
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[v_slot::text],
      case when (s->>'n')::integer = v_n::integer then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::integer - v_n::integer) end)),
    -- ── v268: a graded thing goes in at its grade ──
    'jar', p_jar || jsonb_build_object('things', town.jar_add_g(p_jar->'things', s->>'item', v_n::integer, town.grade_in(s))));
end;
$function$;

CREATE OR REPLACE FUNCTION town.jar_settle(p_jar jsonb, p_owed jsonb, p_work jsonb, p_round integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  v_owed jsonb := coalesce(p_owed, '{}'::jsonb);
  s jsonb;
  thing jsonb;
  mine jsonb;
begin
  if jsonb_array_length(p_work) = 0 or ((p_jar->>'coins')::integer = 0 and jsonb_array_length(p_jar->'things') = 0) then
    return jsonb_build_object('jar', p_jar || jsonb_build_object('round', p_round), 'owed', v_owed, 'shared', false);
  end if;
  for s in select * from jsonb_array_elements(town.jar_shares((p_jar->>'coins')::integer, p_work)) loop
    mine := coalesce(v_owed->(s->>0), '{"coins": 0, "things": []}'::jsonb);
    v_owed := v_owed || jsonb_build_object(s->>0, mine || jsonb_build_object('coins', (mine->>'coins')::integer + (s->>1)::integer));
  end loop;
  for thing in select * from jsonb_array_elements(p_jar->'things') loop
    for s in select * from jsonb_array_elements(town.jar_shares((thing->>1)::integer, p_work)) loop
      mine := coalesce(v_owed->(s->>0), '{"coins": 0, "things": []}'::jsonb);
      -- ── v268: each share at the thing's grade ──
      v_owed := v_owed || jsonb_build_object(s->>0, mine || jsonb_build_object('things', town.jar_add_g(mine->'things', thing->>0, (s->>1)::integer, coalesce((thing->>2)::integer, 0))));
    end loop;
  end loop;
  return jsonb_build_object('jar', jsonb_build_object('round', p_round, 'coins', 0, 'things', '[]'::jsonb), 'owed', v_owed, 'shared', true);
end;
$function$;

CREATE OR REPLACE FUNCTION town.jar_collect(p_purse jsonb, p_mine jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  bag jsonb := p_purse->'bag';
  v_coins integer := coalesce((p_mine->>'coins')::integer, 0);
  v_took jsonb := '[]'::jsonb;
  v_rest jsonb := '[]'::jsonb;
  thing jsonb;
  v_fits integer;
  v_g integer;
begin
  if p_mine is null or p_mine = 'null'::jsonb or (v_coins = 0 and jsonb_array_length(p_mine->'things') = 0) then return town.no('nothing'); end if;
  for thing in select * from jsonb_array_elements(p_mine->'things') loop
    -- ── v268: each thing at its grade ──
    v_g := coalesce((thing->>2)::integer, 0);
    v_fits := least((thing->>1)::integer, town.room_g(bag, thing->>0, v_g));
    if v_fits > 0 then
      bag := town.put_g(bag, thing->>0, v_fits, v_g);
      v_took := v_took || jsonb_build_array(jsonb_build_array(thing->>0, v_fits) || case when v_g > 0 then jsonb_build_array(v_g) else '[]'::jsonb end);
    end if;
    if v_fits < (thing->>1)::integer then
      v_rest := v_rest || jsonb_build_array(jsonb_build_array(thing->>0, (thing->>1)::integer - v_fits) || case when v_g > 0 then jsonb_build_array(v_g) else '[]'::jsonb end);
    end if;
  end loop;
  if v_coins = 0 and jsonb_array_length(v_took) = 0 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'coins', v_coins, 'things', v_took,
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::integer + v_coins, 'bag', bag),
    'mine', case when jsonb_array_length(v_rest) > 0 then jsonb_build_object('coins', 0, 'things', v_rest) end);
end;
$function$;

CREATE OR REPLACE FUNCTION public.town_jar_drop(p_slot integer DEFAULT NULL::integer, p_n integer DEFAULT NULL::integer, p_coins integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  jar jsonb := town.jar_now(now_);
  purse jsonb := town.purse_of(me, true);
  did jsonb;
  -- ── v268: the grade of what is dropped, written down with it ──
  g_ integer := case when p_coins is null then town.grade_in(purse->'bag'->p_slot) else 0 end;
begin
  did := town.jar_drop(purse, jar, case when p_coins is not null then jsonb_build_object('coins', p_coins) else jsonb_build_object('slot', p_slot, 'n', p_n) end);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    update public.town_jar j set coins = (did->'jar'->>'coins')::integer, things = did->'jar'->'things' where j.one;
    insert into public.town_jar_log (member_id, at, round, what, coins, things)
      values (me, to_timestamp(now_ / 1000.0), (jar->>'round')::integer, 'drop', coalesce(p_coins, 0),
              case when p_coins is null then jsonb_build_array(jsonb_build_array(purse->'bag'->p_slot->>'item', p_n) || case when g_ > 0 then jsonb_build_array(g_) else '[]'::jsonb end) else '[]'::jsonb end);
    perform town.note(me, 'jar_drop', case when p_coins is null then purse->'bag'->p_slot->>'item' end, coalesce(p_n, 1), -coalesce(p_coins, 0),
      case when g_ > 0 then jsonb_build_object('grade', g_) else '{}'::jsonb end);
  end if;
  return town.answer(me, did - 'jar') || jsonb_build_object('jar', town.jar_told(me, now_));
end;
$function$;

-- ── stalls ──

CREATE OR REPLACE FUNCTION town.shop_open(p_purse jsonb, p_me text, p_ask jsonb, p_x integer, p_y integer, p_now bigint, p_seen jsonb, p_k jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  l jsonb;
  item_ text;
  owed numeric := 0;
  lines_ jsonb := '[]'::jsonb;
  n_ numeric;
  price_ numeric;
  g_ integer;
begin
  if p_ask is null or jsonb_typeof(p_ask) <> 'array' or jsonb_array_length(p_ask) < 1 or jsonb_array_length(p_ask) > (p_k->>'lines')::int then return town.no('lines'); end if;
  -- ── v268: a thing named twice is the same thing at the same grade ──
  if (select count(distinct coalesce(e->>'item', '') || '|' || town.grade_arg(e->'grade')::text) from jsonb_array_elements(p_ask) e) <> jsonb_array_length(p_ask) then return town.no('lines'); end if;
  if p_x is null or p_y is null then return town.no('none'); end if;
  for l in select e from jsonb_array_elements(p_ask) e loop
    item_ := l->>'item';
    if item_ is null or not (town.cat('items') ? item_) or coalesce(l->>'kind', '') not in ('sell', 'buy') then return town.no('none'); end if;
    -- ── v268: a grade only of a thing that can carry one ──
    g_ := town.grade_arg(l->'grade');
    if g_ < 0 or (g_ > 0 and not town.may_grade(item_)) then return town.no('none'); end if;
    if jsonb_typeof(l->'n') is distinct from 'number' or jsonb_typeof(l->'price') is distinct from 'number' then return town.no('amount'); end if;
    n_ := (l->>'n')::numeric;
    price_ := (l->>'price')::numeric;
    if n_ <= 0 or n_ <> trunc(n_) or price_ <= 0 or price_ <> trunc(price_) or n_ > (p_k->>'most')::numeric then return town.no('amount'); end if;
    -- ── v268: a graded thing's most is the plain most times what the relatives pay for its grade, in whole coins ──
    if price_ > floor(town.shop_cap(item_, p_k) * town.grade_pays(item_, g_)) then return town.no('dear'); end if;
    if l->>'kind' = 'sell' and town.plain_g(p_purse->'bag', item_, g_) < n_ then return town.no('none'); end if;
    if l->>'kind' = 'buy' and not (p_seen ? item_) then return town.no('none'); end if;
    if l->>'kind' = 'buy' then owed := owed + n_ * price_; end if;
    lines_ := lines_ || jsonb_build_array(jsonb_build_object('kind', l->>'kind', 'item', item_, 'n', n_::int, 'left', n_::int, 'price', price_::int)
      || case when g_ > 0 then jsonb_build_object('grade', g_) else '{}'::jsonb end);
  end loop;
  if owed > (p_purse->>'coins')::numeric then return town.no('coins'); end if;
  return jsonb_build_object('ok', true, 'shop', jsonb_build_object(
    'by', p_me, 'at', jsonb_build_array(p_x, p_y), 'lines', lines_, 'since', p_now, 'beat', p_now, 'took', 0, 'paid', 0));
end;
$function$;

CREATE OR REPLACE FUNCTION town.shop_can(p_line jsonb, p_keeper jsonb)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  -- (v268: of the line's grade)
  select greatest(0, case when p_line->>'kind' = 'sell'
    then least((p_line->>'left')::int, town.plain_g(p_keeper->'bag', p_line->>'item', town.grade_in(p_line)))
    else least((p_line->>'left')::int, floor((p_keeper->>'coins')::numeric / (p_line->>'price')::numeric)::int, town.room_g(p_keeper->'bag', p_line->>'item', town.grade_in(p_line))) end)
$function$;

CREATE OR REPLACE FUNCTION town.shop_told_of(p_shop jsonb, p_keeper jsonb, p_now bigint, p_k jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case when not town.shop_alive(p_shop, p_now, p_k) then null else jsonb_build_object(
    'by', p_shop->'by', 'at', p_shop->'at',
    'lines', coalesce((select jsonb_agg(jsonb_build_object('kind', t.e->'kind', 'item', t.e->'item', 'price', t.e->'price', 'can', town.shop_can(t.e, p_keeper))
                                          -- (v268: a graded line says its grade)
                                          || case when town.grade_in(t.e) > 0 then jsonb_build_object('grade', town.grade_in(t.e)) else '{}'::jsonb end order by t.n)
                         from jsonb_array_elements(p_shop->'lines') with ordinality t(e, n) where town.shop_can(t.e, p_keeper) > 0), '[]'::jsonb)) end
$function$;

-- A line is named by its kind, its thing and its grade: the old signatures go, so that no call is ambiguous.
drop function if exists town.shop_line(jsonb,text,text,text,integer,integer,integer,bigint,jsonb);
drop function if exists town.shop_buy(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb);
drop function if exists town.shop_sell(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb);
drop function if exists town.shop_deal(uuid,uuid,text,text,integer,integer,integer);
drop function if exists public.town_shop_buy(uuid,text,integer,integer,integer);
drop function if exists public.town_shop_sell(uuid,text,integer,integer,integer);

CREATE OR REPLACE FUNCTION town.shop_line(p_shop jsonb, p_kind text, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb, p_grade integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  i integer;
begin
  if p_n is null or p_n <= 0 then return town.no('amount'); end if;
  if not town.shop_alive(p_shop, p_now, p_k) then return town.no('shut'); end if;
  if p_shop->>'by' = p_me then return town.no('own'); end if;
  if p_x is null or p_y is null
     or greatest(abs(p_x - (p_shop->'at'->>0)::int), abs(p_y - (p_shop->'at'->>1)::int)) > (p_k->>'reach')::int then return town.no('far'); end if;
  select (t.n - 1)::int into i from jsonb_array_elements(p_shop->'lines') with ordinality t(e, n)
   where t.e->>'kind' = p_kind and t.e->>'item' = p_item and town.grade_in(t.e) = coalesce(p_grade, 0) order by t.n limit 1;
  if i is null or (p_shop->'lines'->i->>'left')::int < p_n then return town.no('gone'); end if;
  return jsonb_build_object('ok', true, 'i', i);
end;
$function$;

CREATE OR REPLACE FUNCTION town.shop_buy(p_mine jsonb, p_theirs jsonb, p_shop jsonb, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb, p_grade integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  g_ integer := coalesce(p_grade, 0);
  found jsonb := town.shop_line(p_shop, 'sell', p_me, p_item, p_n, p_x, p_y, p_now, p_k, g_);
  i integer;
  coins numeric;
begin
  if not (found->>'ok')::boolean then return found; end if;
  i := (found->>'i')::int;
  coins := p_n * (p_shop->'lines'->i->>'price')::numeric;
  if town.plain_g(p_theirs->'bag', p_item, g_) < p_n then return town.no('gone'); end if;
  if (p_mine->>'coins')::numeric < coins then return town.no('coins'); end if;
  if town.room_g(p_mine->'bag', p_item, g_) < p_n then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'coins', coins, 'shop', town.shop_spent(p_shop, i, p_n, coins),
    'mine', p_mine || jsonb_build_object('coins', (p_mine->>'coins')::numeric - coins, 'bag', town.put_g(p_mine->'bag', p_item, p_n, g_)),
    'theirs', p_theirs || jsonb_build_object('coins', (p_theirs->>'coins')::numeric + coins, 'bag', town.take_plain_g(p_theirs->'bag', p_item, p_n, g_)));
end;
$function$;

CREATE OR REPLACE FUNCTION town.shop_sell(p_mine jsonb, p_theirs jsonb, p_shop jsonb, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb, p_grade integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  g_ integer := coalesce(p_grade, 0);
  found jsonb := town.shop_line(p_shop, 'buy', p_me, p_item, p_n, p_x, p_y, p_now, p_k, g_);
  i integer;
  coins numeric;
begin
  if not (found->>'ok')::boolean then return found; end if;
  i := (found->>'i')::int;
  coins := p_n * (p_shop->'lines'->i->>'price')::numeric;
  if town.plain_g(p_mine->'bag', p_item, g_) < p_n then return town.no('none'); end if;
  if (p_theirs->>'coins')::numeric < coins then return town.no('short'); end if;
  if town.room_g(p_theirs->'bag', p_item, g_) < p_n then return town.no('packed'); end if;
  return jsonb_build_object('ok', true, 'coins', coins, 'shop', town.shop_spent(p_shop, i, p_n, coins),
    'mine', p_mine || jsonb_build_object('coins', (p_mine->>'coins')::numeric + coins, 'bag', town.take_plain_g(p_mine->'bag', p_item, p_n, g_)),
    'theirs', p_theirs || jsonb_build_object('coins', (p_theirs->>'coins')::numeric - coins, 'bag', town.put_g(p_theirs->'bag', p_item, p_n, g_)));
end;
$function$;

CREATE OR REPLACE FUNCTION town.shop_deal(p_me uuid, p_who uuid, p_kind text, p_item text, p_n integer, p_x integer, p_y integer, p_grade integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  now_ bigint := town.now_ms();
  k jsonb := town.shop_knobs();
  g_ integer := coalesce(p_grade, 0);
  graded jsonb := case when coalesce(p_grade, 0) > 0 then jsonb_build_object('grade', p_grade) else '{}'::jsonb end;
  mine jsonb;
  theirs jsonb;
  shop jsonb;
  did jsonb;
  price_ numeric;
begin
  if p_who is null or not town.is_member(p_who) then
    return town.answer(p_me, town.no('shut')) || jsonb_build_object('shopWho', p_who, 'shopTold', null);
  end if;
  if p_me <= p_who then mine := town.purse_of(p_me, true); theirs := town.purse_of(p_who, true);
  else theirs := town.purse_of(p_who, true); mine := town.purse_of(p_me, true); end if;
  shop := town.shop_of(p_who, true);
  did := case when p_kind = 'sell' then town.shop_buy(mine, theirs, shop, p_me::text, p_item, p_n, p_x, p_y, now_, k, g_)
              else town.shop_sell(mine, theirs, shop, p_me::text, p_item, p_n, p_x, p_y, now_, k, g_) end;
  if (did->>'ok')::boolean then
    perform town.keep_purse(p_me, did->'mine');
    perform town.keep_purse(p_who, did->'theirs');
    update public.town_shops s set lines = did->'shop'->'lines', took = (did->'shop'->>'took')::numeric::bigint, paid = (did->'shop'->>'paid')::numeric::bigint
     where s.member_id = p_who;
    price_ := (did->>'coins')::numeric / p_n;
    if p_kind = 'sell' then
      perform town.note(p_me, 'shop_buy', p_item, p_n, -(did->>'coins')::numeric, jsonb_build_object('from', p_who, 'price', price_, 'tile', jsonb_build_array(p_x, p_y)) || graded);
      perform town.note(p_who, 'shop_sold', p_item, p_n, (did->>'coins')::numeric, jsonb_build_object('to', p_me, 'price', price_) || graded);
    else
      perform town.note(p_me, 'shop_sell', p_item, p_n, (did->>'coins')::numeric, jsonb_build_object('to', p_who, 'price', price_, 'tile', jsonb_build_array(p_x, p_y)) || graded);
      perform town.note(p_who, 'shop_bought', p_item, p_n, -(did->>'coins')::numeric, jsonb_build_object('from', p_me, 'price', price_) || graded);
    end if;
  end if;
  shop := town.shop_of(p_who, false);
  return town.answer(p_me, did - 'mine' - 'theirs' - 'shop') || jsonb_build_object('shopWho', p_who,
    'shopTold', case when shop is null then null else town.shop_told_of(shop, town.purse_of(p_who, false), now_, k) end);
end;
$function$;

-- (p_grade left out is the normal thing: a page from before v268 asks as it always did)
CREATE OR REPLACE FUNCTION public.town_shop_buy(p_who uuid, p_item text, p_n integer, p_x integer, p_y integer, p_grade integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return town.shop_deal(me, p_who, 'sell', p_item, p_n, p_x, p_y, coalesce(p_grade, 0));
end;
$function$;

CREATE OR REPLACE FUNCTION public.town_shop_sell(p_who uuid, p_item text, p_n integer, p_x integer, p_y integer, p_grade integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return town.shop_deal(me, p_who, 'buy', p_item, p_n, p_x, p_y, coalesce(p_grade, 0));
end;
$function$;

-- ── the notice board ──

CREATE OR REPLACE FUNCTION town.notice_told(p_notice public.town_notices, p_me uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'id', p_notice.id, 'kind', p_notice.kind, 'item', p_notice.item, 'n', p_notice.n, 'left', p_notice.rest, 'price', p_notice.price,
    'held', case when p_notice.member_id = p_me then p_notice.held else 0 end,
    'by', coalesce((select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = p_notice.member_id), ''),
    'mine', p_notice.member_id = p_me,
    'until', p_notice.until)
    -- (v268: a graded notice says its grade)
    || case when p_notice.grade > 0 then jsonb_build_object('grade', p_notice.grade) else '{}'::jsonb end
$function$;

CREATE OR REPLACE FUNCTION town.notices_told(p_me uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  now_ bigint := town.now_ms();
  today integer := town.day_of(town.now_ms());
  k jsonb := town.notice_knobs();
  due_ bigint;
  had integer;
  seen jsonb;
begin
  select b.due, b.more into due_, had from public.town_notice_books b where b.member_id = p_me;
  had := coalesce(had, 0);
  select coalesce(jsonb_agg(x.id order by x.id), '[]'::jsonb) into seen
    from (select jsonb_object_keys(town.seen_now()) as id
          union
          select jsonb_array_elements_text(town.shelf_of((town.thing('village', false)->>'unlocked')::int))) x
   where town.cat('items') ? x.id;
  return jsonb_build_object(
    'notices', coalesce((select jsonb_agg(town.notice_told(up, p_me) order by up.id desc)
                           from (select * from public.town_notices x where now_ < x.until and x.rest > 0 order by x.id desc limit (k->>'shown')::int) up), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(town.notice_told(x, p_me) order by x.id desc) from public.town_notices x where x.member_id = p_me), '[]'::jsonb),
    'due', (coalesce(due_, 0) / 100)::int,
    'slots', (k->>'slots')::int + least((k->>'more')::int, had),
    'more', case when had >= (k->>'more')::int then null else (k->>'slot_price')::int * (2 ^ had)::int end,
    'fee', (k->>'fee')::int, 'hours', (k->>'hours')::int, 'cap', (k->>'cap')::int, 'capless', (k->>'capless')::int, 'most', (k->>'most')::int,
    'seen', seen,
    -- ── v268: a graded thing's sales apart from the normal thing's, by "thing:grade" (lib/town/notices' saleKey) ──
    'sales', coalesce((select jsonb_object_agg(d.key, d.days)
                         from (select s.key, jsonb_agg(jsonb_build_array(s.day, s.n, s.coins) order by s.day) as days
                                 from (select case when x.grade > 0 then x.item || ':' || x.grade::text else x.item end as key, town.day_of(x.at) as day,
                                              sum(x.n)::int as n, sum(x.n::bigint * x.price)::int as coins
                                         from public.town_notice_sales x
                                        where town.day_of(x.at) > today - (k->>'days')::int and town.day_of(x.at) <= today
                                        group by 1, 2) s
                                group by s.key) d), '{}'::jsonb));
end;
$function$;

drop function if exists public.town_notice_post(text,text,integer,integer);
-- (p_grade left out is the normal thing: a page from before v268 asks as it always did)
CREATE OR REPLACE FUNCTION public.town_notice_post(p_kind text, p_item text, p_n integer, p_price integer, p_grade integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  k jsonb := town.notice_knobs();
  g_ integer := coalesce(p_grade, 0);
  had integer;
  up integer;
  pinned bigint;
begin
  if p_item is null or not town.cat('items') ? p_item or p_kind is null or p_kind not in ('sell', 'want') then return town.noticed(me, town.no('none')); end if;
  -- ── v268: a grade only of a thing that can carry one ──
  if g_ not in (0, 1, 2, 3) or (g_ > 0 and not town.may_grade(p_item)) then return town.noticed(me, town.no('none')); end if;
  if p_n is null or p_n <= 0 or p_price is null or p_price <= 0 or p_n > (k->>'most')::int then return town.noticed(me, town.no('amount')); end if;
  if p_kind = 'want' and not town.seen_has(p_item) then return town.noticed(me, town.no('none')); end if;
  if p_kind = 'sell' and town.plain_g(purse->'bag', p_item, g_) < p_n then return town.noticed(me, town.no('none')); end if;
  if p_price > floor(town.notice_cap(p_item, k) * town.grade_pays(p_item, g_)) then return town.noticed(me, town.no('dear')); end if;
  if p_kind = 'want' and (purse->>'coins')::numeric < p_n::bigint * p_price then return town.noticed(me, town.no('coins')); end if;
  select b.more into had from public.town_notice_books b where b.member_id = me;
  select count(*) into up from public.town_notices x where x.member_id = me;
  if up >= (k->>'slots')::int + least((k->>'more')::int, coalesce(had, 0)) then return town.noticed(me, town.no('slots')); end if;
  insert into public.town_notices (member_id, kind, item, n, rest, price, at, until, grade)
    values (me, p_kind, p_item, p_n, p_n, p_price, now_, now_ + (k->>'hours')::bigint * 3600000, g_)
    returning id into pinned;
  perform town.keep_purse(me, case when p_kind = 'sell'
    then purse || jsonb_build_object('bag', town.take_plain_g(purse->'bag', p_item, p_n, g_))
    else purse || jsonb_build_object('coins', (purse->>'coins')::numeric - p_n::bigint * p_price) end);
  perform town.note(me, 'notice_post', p_item, p_n, case when p_kind = 'want' then -(p_n::bigint * p_price) else 0 end,
    jsonb_build_object('kind', p_kind, 'price', p_price, 'notice', pinned) || case when g_ > 0 then jsonb_build_object('grade', g_) else '{}'::jsonb end);
  return town.noticed(me, jsonb_build_object('ok', true, 'id', pinned));
end;
$function$;

CREATE OR REPLACE FUNCTION public.town_notice_buy(p_id bigint, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  k jsonb := town.notice_knobs();
  pinned public.town_notices;
  coins bigint;
begin
  if p_n is null or p_n <= 0 then return town.noticed(me, town.no('amount')); end if;
  select * into pinned from public.town_notices x where x.id = p_id for update;
  if pinned.id is null or pinned.kind <> 'sell' or now_ >= pinned.until or pinned.rest <= 0 or pinned.rest < p_n then return town.noticed(me, town.no('gone')); end if;
  if pinned.member_id = me then return town.noticed(me, town.no('own')); end if;
  coins := p_n::bigint * pinned.price;
  if (purse->>'coins')::numeric < coins then return town.noticed(me, town.no('coins')); end if;
  -- ── v268: had at the notice's grade ──
  if town.room_g(purse->'bag', pinned.item, pinned.grade) < p_n then return town.noticed(me, town.no('full')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric - coins, 'bag', town.put_g(purse->'bag', pinned.item, p_n, pinned.grade)));
  if pinned.rest = p_n then delete from public.town_notices x where x.id = pinned.id;
  else update public.town_notices x set rest = x.rest - p_n where x.id = pinned.id; end if;
  insert into public.town_notice_books (member_id, due) values (pinned.member_id, coins * (100 - (k->>'fee')::int))
    on conflict (member_id) do update set due = public.town_notice_books.due + excluded.due;
  insert into public.town_notice_sales (at, item, n, price, kind, seller, buyer, notice, grade)
    values (now_, pinned.item, p_n, pinned.price, 'sell', pinned.member_id, me, pinned.id, pinned.grade);
  perform town.note(me, 'notice_buy', pinned.item, p_n, -coins, jsonb_build_object('notice', pinned.id, 'price', pinned.price, 'from', pinned.member_id)
    || case when pinned.grade > 0 then jsonb_build_object('grade', pinned.grade) else '{}'::jsonb end);
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'coins', coins));
end;
$function$;

CREATE OR REPLACE FUNCTION public.town_notice_fill(p_id bigint, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  k jsonb := town.notice_knobs();
  pinned public.town_notices;
  coins bigint;
begin
  if p_n is null or p_n <= 0 then return town.noticed(me, town.no('amount')); end if;
  select * into pinned from public.town_notices x where x.id = p_id for update;
  if pinned.id is null or pinned.kind <> 'want' or now_ >= pinned.until or pinned.rest <= 0 or pinned.rest < p_n then return town.noticed(me, town.no('gone')); end if;
  if pinned.member_id = me then return town.noticed(me, town.no('own')); end if;
  -- ── v268: only the notice's grade fills it ──
  if town.plain_g(purse->'bag', pinned.item, pinned.grade) < p_n then return town.noticed(me, town.no('none')); end if;
  coins := p_n::bigint * pinned.price;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', town.take_plain_g(purse->'bag', pinned.item, p_n, pinned.grade)));
  update public.town_notices x set rest = x.rest - p_n, held = x.held + p_n where x.id = pinned.id;
  insert into public.town_notice_books (member_id, due) values (me, coins * (100 - (k->>'fee')::int))
    on conflict (member_id) do update set due = public.town_notice_books.due + excluded.due;
  insert into public.town_notice_sales (at, item, n, price, kind, seller, buyer, notice, grade)
    values (now_, pinned.item, p_n, pinned.price, 'want', me, pinned.member_id, pinned.id, pinned.grade);
  perform town.note(me, 'notice_fill', pinned.item, p_n, 0, jsonb_build_object('notice', pinned.id, 'price', pinned.price, 'to', pinned.member_id)
    || case when pinned.grade > 0 then jsonb_build_object('grade', pinned.grade) else '{}'::jsonb end);
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'coins', coins));
end;
$function$;

CREATE OR REPLACE FUNCTION public.town_notice_fetch(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pinned public.town_notices;
  got integer;
begin
  select * into pinned from public.town_notices x where x.id = p_id and x.member_id = me for update;
  if pinned.id is null or pinned.kind <> 'want' or pinned.held <= 0 then return town.noticed(me, town.no('none')); end if;
  -- ── v268: taken at the notice's grade ──
  got := least(pinned.held, town.room_g(purse->'bag', pinned.item, pinned.grade));
  if got <= 0 then return town.noticed(me, town.no('full')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', town.put_g(purse->'bag', pinned.item, got, pinned.grade)));
  if pinned.rest = 0 and pinned.held = got then delete from public.town_notices x where x.id = pinned.id;
  else update public.town_notices x set held = x.held - got where x.id = pinned.id; end if;
  perform town.note(me, 'notice_fetch', pinned.item, got, 0, jsonb_build_object('notice', pinned.id)
    || case when pinned.grade > 0 then jsonb_build_object('grade', pinned.grade) else '{}'::jsonb end);
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'got', got));
end;
$function$;

CREATE OR REPLACE FUNCTION public.town_notice_down(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pinned public.town_notices;
  things integer;
  coins bigint;
begin
  select * into pinned from public.town_notices x where x.id = p_id and x.member_id = me for update;
  if pinned.id is null then return town.noticed(me, town.no('none')); end if;
  things := case when pinned.kind = 'sell' then pinned.rest else pinned.held end;
  coins := case when pinned.kind = 'want' then pinned.rest::bigint * pinned.price else 0 end;
  -- ── v268: given back at the notice's grade ──
  if town.room_g(purse->'bag', pinned.item, pinned.grade) < things then return town.noticed(me, town.no('full')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric + coins,
    'bag', case when things > 0 then town.put_g(purse->'bag', pinned.item, things, pinned.grade) else purse->'bag' end));
  delete from public.town_notices x where x.id = pinned.id;
  perform town.note(me, 'notice_down', pinned.item, things, coins, jsonb_build_object('notice', pinned.id, 'kind', pinned.kind)
    || case when pinned.grade > 0 then jsonb_build_object('grade', pinned.grade) else '{}'::jsonb end);
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'things', things, 'coins', coins));
end;
$function$;

-- ── who may call what ──
revoke all on function town.grade_arg(jsonb), town.may_grade(text), town.plain_g(jsonb,text,integer), town.take_plain_g(jsonb,text,integer,integer),
 town.jar_add_g(jsonb,text,integer,integer), town.shop_line(jsonb,text,text,text,integer,integer,integer,bigint,jsonb,integer),
 town.shop_buy(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb,integer), town.shop_sell(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb,integer),
 town.shop_deal(uuid,uuid,text,text,integer,integer,integer,integer) from public, anon, authenticated;
revoke all on function public.town_shop_buy(uuid,text,integer,integer,integer,integer), public.town_shop_sell(uuid,text,integer,integer,integer,integer),
 public.town_notice_post(text,text,integer,integer,integer) from public, anon;
grant execute on function public.town_shop_buy(uuid,text,integer,integer,integer,integer), public.town_shop_sell(uuid,text,integer,integer,integer,integer),
 public.town_notice_post(text,text,integer,integer,integer) to authenticated;
-- (the functions written over keep the grants they had)

commit;
notify pgrst, 'reload schema';

-- What it should say afterwards:
--   select town.plain_g('[{"item":"tomato","n":3,"grade":2},{"item":"tomato","n":4}]'::jsonb, 'tomato', 2), town.may_grade('tomato'), town.may_grade('minnow'),
--          floor(town.notice_cap('tomato', town.notice_knobs()) * town.grade_pays('tomato', 3)),
--          (select count(*) from pg_proc where proname in ('town_shop_buy','town_shop_sell','town_notice_post'));
--   -- 3, true, false, 200, 3
