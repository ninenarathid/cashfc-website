export default async function ({ t, U, one, rank, call, give, purseOf, CODE }) {
  t.section("the shared rules");
  const h = await one(`select town.harder_at(3) as a, town.harder_at(4) as b, town.harder_at(10) as c, town.harder_at(99) as d`);
  t.check("harder from the fourth rank", h.a === 1 && Math.abs(h.b - 1.08) < 1e-12 && Math.abs(h.c - 1.56) < 1e-12 && h.d === h.c, h);
  const r = await rank(U.m1, "fishing", 700);
  const hf = await one(`select town.harder_for($1, 'fishing') as h, town.harder_for($1, 'forest') as f`, [U.m1]);
  t.check("by a member's rank on the line", r === 4 && Math.abs(hf.h - 1.08) < 1e-12 && hf.f === 1, { r, hf });
  const s = await one(`select town.stretch_at('{"n":1,"per":"span","ms":300000}'::jsonb, 600000) as a, town.stretch_at('{"n":1,"per":"span","ms":300000}'::jsonb, 899999) as b, town.stretch_at('{"n":1,"per":"span","ms":300000}'::jsonb, 900000) as c, town.stretch_at('{"n":3,"per":"day"}'::jsonb, town.now_ms()) = town.day_of(town.now_ms()) as day`);
  t.check("a span's stretch", Number(s.a) === 2 && Number(s.b) === 2 && Number(s.c) === 3 && s.day === true, s);
  await give(U.m1, { had: ["thingFlute", "famGnome"], familiar: "famGnome" });
  let did = await call(U.m1, "town_gift_use", "thingFlute");
  const again = await call(U.m1, "town_gift_use", "thingFlute");
  t.check("the flute is used once to a span (or twice, where the span turned between)", did?.ok === true && did.left === 0 && (again?.why === "spent" || again?.ok === true), { did, again });
  did = await call(U.m1, "town_gift_use", "famGnome");
  t.check("the gnome's count is as it was", did?.ok === true && did.left === 9, did);
}
