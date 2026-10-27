// The breaks v306.test.mjs must notice, one rule at a time (each named check must fail, by the start of its words).
//   V306_BENCH=<scratch>/after-v296.tar FC_REPO=<tree> node mutate.mjs <tree>/supabase/v306_one_machine_a_player_from_any_tab.sql <tree>/.claude/skills/fc-cash-town/scripts/db/v306.test.mjs <tree>/.claude/skills/fc-cash-town/scripts/db/v306.mutations.mjs
// (that two tabs take turns is the database's locking, which one connection cannot show: the table's own rule stands for it)
export default ({ swap }) => [
  ["old double seats kept", swap("delete from public.casino_live_seats x using public.casino_live_seats y\n  where x.user_id = y.user_id and (x.at, x.machine) < (y.at, y.machine);\n", ""), ["the file runs"]],
  ["no rule of one a player", swap("create unique index if not exists casino_live_seats_one_a_player on public.casino_live_seats (user_id);\n", ""), ["the table refuses a second seat for a player"]],
  ["the old seat kept on sitting elsewhere", swap("  delete from public.casino_live_seats where user_id = me and machine <> p_machine;\n  insert into public.casino_live_seats", "  insert into public.casino_live_seats"), ["sitting down moves the one seat"]],
  ["no own row to hold", swap("  insert into public.casino_live_accounts (user_id) values (me) on conflict do nothing;\n  perform 1 from public.casino_live_accounts where user_id = me for update;\n", ""), ["a player's own row is there to hold"]],
];
