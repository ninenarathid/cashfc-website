// keeper.test.mjs: every new deed of the gifts of ranks 1 to 6 is asked once through the database's keeper, to see that
// it reaches a function that is there with the arguments it takes. Run from the worktree's root; run again to write the
// section anew when more lines are in (LINES below says which are tried).
const fs = require("fs");
const f = ".claude/skills/fc-cash-town/scripts/db/keeper.test.mjs";
let s = fs.readFileSync(f, "utf8"); const crlf = s.includes("\r\n"); s = s.replace(/\r\n/g, "\n");
const OPEN = "        // ── v153: the gifts of ranks 1 to 6, each new deed's way to the database ──\n", CLOSE = "        // ── (v153's deeds end) ──\n";
const section = `${OPEN}        if ((await sql(\`select to_regprocedure('town.harder_at(integer)') is not null as there\`))[0].there) {
          // What is tried is the wiring: that each deed reaches a function that is there, with the arguments it takes, and
          // that its answer is a rule's (done, or refused for a reason) and not "the town could not be reached". The rules
          // themselves are the dry run's. Every gift is put into the purse, the familiar changed as each deed needs.
          const every = Object.keys((await sql(\`select town.cat('gifts')->'gifts' as g\`))[0].g);
          const withGifts = async (familiar) => { await sql(\`update public.town_purses set doc = jsonb_set(doc, '{gifts}', $2::jsonb) where member_id = $1\`,
            [a, JSON.stringify({ had: every, charms: ["charmHoe", "charmSickle"], owed: 0, familiar, used: {} })]); await settled(A); };
          const reached = (r) => !!r && (r.ok === true || (typeof r.why === "string" && r.why !== "away"));
          const tried = [];
          const ask = async (name, fn) => { let r; try { r = await fn(); } catch (e) { r = { threw: String(e?.message ?? e) }; } tried.push([name, r]); return r; };
          await withGifts("famGnome");
          ok("the keeper offers every gift the database's catalog has", every.length >= 39 && every.every((id) => A.gives(id)), every.filter((id) => !A.gives(id)));
          const here = [plot[0], plot[1]];
          // the kitchen
          await ask("basketPut", () => A.basketPut(0, 1));
          await ask("basketTake", () => A.basketTake("riceBox", 1));
          await ask("basketEat", () => A.basketEat("riceBox", true));
          await ask("spoonAsk", () => A.spoonAsk([["rice", 1]]));
          await ask("spiceEat (a slot)", () => A.spiceEat({ slot: 0 }, true));
          await ask("spiceEat (the basket)", () => A.spiceEat({ dish: "riceBox" }, true));
          // the farm
          await ask("rowDo", () => A.rowDo(key, "Tester A", { [key]: true }));
          await ask("gnomeDo", () => A.gnomeDo(key));
          await ask("glassDo", () => A.glassDo(key));
          // the well
          await ask("drinkOffer", () => A.drinkOffer(b, here));
          await ask("drinkTake", () => B.drinkTake(a, here));
          await ask("drinkOffer (taken back)", () => A.drinkOffer(null, here));
          await withGifts("famFrog");
          await ask("rainFill", () => A.rainFill());
          await ask("moonKeep", () => A.moonKeep());
          await ask("moonPour", () => A.moonPour(1, here));
          // the forest
          await ask("mapUse", () => A.mapUse());
          await ask("mapDig", () => A.mapDig([190, 150]));
          // the insects
          await ask("nectarDrop", () => A.nectarDrop([30, 30]));
          await ask("netMine (lured)", () => A.netMine("lured", [30, 30], { misses: 0 }, "Tester A"));
          await ask("netMine (pair)", () => A.netMine("pair", [30, 30], { misses: 0 }, "Tester A"));
/*MORE*/
          const lost = tried.filter(([, r]) => !reached(r));
          ok(\`each new deed of the gifts reaches the database and is answered by its rule (\${tried.length} deeds)\`, lost.length === 0, lost);
          const done = tried.filter(([, r]) => r?.ok === true).map(([n]) => n);
          ok("…and some of them are done outright, the purse kept at once", done.length >= 3 && A.purse().gifts.had.length === every.length, { done, why: tried.filter(([, r]) => r?.ok !== true).map(([n, r]) => \`\${n}: \${r?.why ?? JSON.stringify(r)}\`) });
          await sql(\`update public.town_purses set doc = jsonb_set(doc, '{gifts}', '{"had":["charmHoe","famGnome"],"charms":["charmHoe"],"owed":0,"familiar":"famGnome","used":{}}'::jsonb) where member_id = $1\`, [a]);
          await settled(A);
        }
${CLOSE}`;
const MORE = fs.existsSync(".claude/skills/fc-cash-town/scripts/db/v153.wiring.txt") ? fs.readFileSync(".claude/skills/fc-cash-town/scripts/db/v153.wiring.txt", "utf8").replace(/\r\n/g, "\n").trimEnd() + "\n" : "";
const text = section.replace("/*MORE*/\n", MORE);
if (s.includes(OPEN)) s = s.slice(0, s.indexOf(OPEN)) + text + s.slice(s.indexOf(CLOSE) + CLOSE.length);
else {
  const at = `        const rest = await A.familiarWear(null);\n`;
  if (!s.includes(at)) throw new Error("no place for the section");
  s = s.replace(at, () => text + at);
}
fs.writeFileSync(f, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("the wiring section is written");
