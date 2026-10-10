export default ({swap}) => [
  ['accept hooks not owned',swap("or town.held(p_purse->'bag', p_item) < 1","or false"),['missing or unowned hook is refused']],
  ['charge coins for fitting',swap("p_purse || jsonb_build_object('fishingHook',p_item)","p_purse || jsonb_build_object('fishingHook',p_item,'coins',(p_purse->>'coins')::numeric-1)"),['fitting, removal and invalid items match site rules','RPC preserves every item']],
  ['consume hook on fitting',swap("p_purse || jsonb_build_object('fishingHook',p_item)","p_purse || jsonb_build_object('fishingHook',p_item,'bag',town.take(p_purse->'bag',p_item,1))"),['fitting, removal and invalid items match site rules','RPC preserves every item']],
  ['expose private helper',swap('revoke all on function town.fit_hook(jsonb,text) from public, anon, authenticated;','grant usage on schema town to anon, authenticated; grant execute on function town.fit_hook(jsonb,text) to public, anon, authenticated;'),['helper has no browser execute privilege']],
];
