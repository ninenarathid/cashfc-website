import { createHash } from 'node:crypto';
const md5 = (s) => createHash('md5').update(s.replaceAll('\r','')).digest('hex');
// Let runTwice exercise the mutated definition too; an unchanged guard must not masquerade as a caught rule.
const guarded = (mutate) => (source) => {
  let broken = mutate(source);
  const functions = /CREATE OR REPLACE FUNCTION [\s\S]*?\$function\$;/g;
  for (const match of source.matchAll(functions)) {
    const prefix = match[0].slice(0, match[0].indexOf('\n'));
    const replacement = [...broken.matchAll(functions)].find((m) => m[0].startsWith(prefix));
    if (replacement && replacement[0] !== match[0]) broken = broken.replace(md5(match[0].slice(0,-1)+'\n'), md5(replacement[0].slice(0,-1)+'\n'));
  }
  return broken;
};
export default ({swap}) => [
  ['advanced rods lose their extra line',swap("when r->>'item' = 'rod' then 1 else 2", "when r->>'item' = 'rod' then 1 else 1"),['rodTeak, gift false:'] ],
  ['gift no longer adds a line',swap("when town.gift_works(p_purse, 'thingRod') then 1", "when town.gift_works(p_purse, 'thingRod') then 0"),['rod, gift true:'] ],
  ['extra lines cost only one bait',guarded(swap('town.hook_baits(purse, p_bait, count_)','town.hook_baits(purse, p_bait, 1)')),['bait count is charged'] ],
  ['third fish never hooked',guarded(swap('for i in 0..jsonb_array_length(things) - 1 loop','for i in 0..1 loop')),['one strike hooks all three'] ],
  ['private line helper exposed',swap('revoke all on function town.line_count(jsonb) from public, anon, authenticated;','grant usage on schema town to anon, authenticated; grant execute on function town.line_count(jsonb) to public, anon, authenticated;'),['count helper ACL stays private'] ],
];
