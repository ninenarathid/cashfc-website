// The breaks v158.test.mjs must notice, one at a time.
// Run: node mutate.mjs <the draft> v158.test.mjs v158.mutations.mjs
//
// The file drops one form of a function, writes it again with a third word, and says who may call it: so the breaks
// are the old form left, the new one open to whoever is signed out, the slot not listened to, the first pot no
// longer what is taken with none said, a slot counted from the bag's end, and the first block gone.
const FIRST = "else select (s.ord - 1)::int into slot from jsonb_array_elements(purse->'bag') with ordinality s(v, ord) where s.v->>'item' = 'potFull' order by s.ord limit 1; end if;";
export default ({ swap, cut }) => [
  ["the function of two words is left beside the new one",
    swap("drop function if exists public.town_pot_down(integer, integer);", ""),
    ["there is one town_pot_down, of three words"]],
  ["whoever is signed out may call it",
    swap("revoke execute on function public.town_pot_down(integer, integer, integer) from public, anon;", ""),
    ["…a member's to call and nobody's who is signed out", "somebody signed out is refused"]],
  ["the slot that is said is not listened to",
    swap("if p_slot is not null then slot := p_slot;", "if false then slot := p_slot;"),
    ["the function is the one it replaces, word for word", "the pot in the slot that is said is the one set down", "a slot that is no pot's"]],
  ["with no slot said, nothing is set down",
    swap(FIRST, "end if;"),
    ["the function is the one it replaces, word for word", "with no slot said, the first pot of the bag is set down", "…and the same when the slot is said to be none"]],
  ["a slot before the bag's beginning is counted from where it is not",
    swap("did := town.set_down(purse, coalesce(slot, -1),", "did := town.set_down(purse, abs(coalesce(slot, -1)),"),
    ["the function is the one it replaces, word for word", "a slot that is no pot's"]],
  ["it is no longer security definer",
    swap("returns jsonb language plpgsql security definer set search_path = public", "returns jsonb language plpgsql set search_path = public"),
    ["…security definer with its search path set", "the function is the one it replaces, word for word"]],
  ["it does not look for v121's pot before it begins",
    cut("do $$ begin", "-- ─── The pot set down"),
    ["where the rule it stands on is not there, it stops at its first line and says why"]],
];
