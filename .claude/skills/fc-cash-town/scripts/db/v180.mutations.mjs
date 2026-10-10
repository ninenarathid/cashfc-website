export default ({swap}) => [
  ["skip material consumption", swap("bag := town.take(bag, part->>0, (part->>1)::integer);", "bag := bag;"), ["jar: materials"]],
  ["skip coin fee", swap("(p_purse->>'coins')::numeric-fee", "(p_purse->>'coins')::numeric"), ["jar: materials"]],
  ["mint two tools", swap("town.put(bag,p_item,1)", "town.put(bag,p_item,2)"), ["jar: materials"]],
  ["allow anonymous helper", swap("revoke all on function town.craft(jsonb,text,bigint) from public, anon, authenticated;", "grant usage on schema town to anon, authenticated; grant execute on function town.craft(jsonb,text,bigint) to public, anon, authenticated;"), ["pure helper remains private"]],
  ["expose all craft receipts", swap("revoke all on town.craft_receipts from public, anon, authenticated;", "grant usage on schema town to authenticated; grant select on table town.craft_receipts to authenticated; drop policy if exists leak on town.craft_receipts; create policy leak on town.craft_receipts for select to authenticated using (true);"), ["receipts cannot be read from browser"]],
  ["ignore request/result mismatch", swap("if receipt.item is distinct from p_item then return town.answer(me,town.no('none')); end if;", "null;"), ["receipt cannot be reused"]],
  ["omit authenticated RPC grant", swap("grant execute on function public.town_craft(text,uuid) to authenticated;", ""), ["verified member can craft"]],
];
