# Cash Town: the animal line (ฟาร์มสัตว์) — design as settled, and the build's handoff

Read this first when picking the build up. Everything below was settled with the owner on 2026-10-19 over five rounds,
each designed by Claude and Codex separately and then compared. The owner's words are quoted; whatever is not quoted is
ours and was shown to him. His go, 2026-10-19: **"เริ่มได้เลย เอาจนจบตาม requirment"**.

Worktree `E:/NinenineProject/fcnext-wt-animals`, branch `animals`. Migration **v291** (claimed with the peers
fcnext-c3 and fcnext-43; take v292+ only after telling them). Nothing is pushed without his word; the owner sees desktop
and phone screenshots first (AGENTS.md "Cash Town UI review").

## Round 6 (2026-10-20): his asks during the build and his final answers — THIS SUPERSEDES what follows

Where a section below says otherwise (the north-east rows, producing / nursery / keeping places, keeping packs bought
of logs, the village gate, lending by the owner's choice), this section is what holds. The rules are built
(`ad2a057f`) and so is v291 (`085a157f`): lib/town/animals.ts, animal-act.ts and the SQL are the truth.

- **The farm moves EAST**, his last word on the layout: "ย้ายฟาร์มเลี้ยงสัตว์ มาเป็นอันใหญ่อันเดียวฝั่งนี้ดีกว่า 24 โรงเลี้ยง
  อยู่ตรงนี้เลย และใช้ ลุง popoto คนเดียว" (he circled the farm's east edge: global x > 187, beside rows 0..85, the dark
  beyond it). One big animal farm there, 24 barns, Uncle Popoto alone (no relative). The north-east rows (y -32..-1)
  go: the farm's rows start at 0 again. "มีประตู 2 ประตู สำหรับ แปลงฝั่งเหนือ และ ใต้": two gates in the garden's east
  rim, where the farm's two east-west roads meet it (rows 21-22 and 63-64), the roads carried on east into the animal
  farm; "ประตูทุ่ง ขอกว้างกว่านี้ ลบต้นไม้แถวๆประตูออกให้หมดด้วย"; "ทำทางเดินในแมพ ให้เชื่อมไปที่ ฟาร์มเลี้ยงสัตว์ด้วย".
- **Barns**: "การทำฟาร์มต้องซื้อ ฟาร์มกับ ลุง popoto เลี้ยงสัตว์ก่อน ราคาแพง แต่คุ้มการลงทุน"; "ตอนซื้อโรงเลี้ยงสัตว์ มี UI ให้
  ผู้เล่น click ด้วยว่า จะเลือกโรงไหน เลือกซ้ำกับเพื่อนไม่ได้"; one barn a member ("พอ"); price "ตาม codex": 6,000 coins +
  60 logs + 20 stone tiles (see "Open" below); 4 animals a barn (`herd.room`; members enlarge later). No barn, no
  animals. Each barn has its own DOOR (the owner opens it: his animals go out to the meadow and the garden lanes, eating
  half as fast); the village gate's state is gone. "ช่วยทำข้างใน โรงเลี้ยงสัตว์ด้วย ทำเหมือน โรงอาหาร ที่เดินเข้าไปแล้วจะ
  ค่อยมองเห็นด้านใน": the barn is walked into, its inside revealed as the kitchen hall's is.
- **Untended** ("ตาม codex"): no care by its owner 14 and 21 days: warned; 28: taken back, but only by one who waits
  for a barn when none stands free; its animals go to its owner's pen; what they paid is kept as credit.
- **Uncle Popoto's pen** ("คอกฝาก โอเค"): 8 animals a member, frozen there (they neither eat, grow nor give). A child or a
  buy past the barn's room goes there. "สัตว์ทุกตัวสามารถโอนให้คนอื่นได้หมด โดยจัดการได้ที่ ลุงเลี้ยงสัตว์": any animal is
  OFFERED to a member (it stands a day); the receiver says yes, and it goes into their pen with its hearts and stats.
- **Sexes**: "ตอนซื้อเลือกเพศได้ แต่ตอนผสมพันธุ์ หรือ ออกจากไข่ เป็นสุ่มเพศ"; a cross is one of each sex of one species
  ("ตามที่พวกคุณเสนอ": sheep of both sexes give wool; roosters, drakes and bulls give no eggs or milk).
- **Friends' crosses**: "ไปขอสัตว์เพื่อนมาช่วยผสมพันธุ์ได้ คนที่เป็น Host เจ้าของ request จะได้สัตว์ตัวนั้นไป": the host ASKS for
  a friend's animal for a cross with one of theirs; the friend says yes; it is lent an hour for that cross; the child is
  the host's (the rank-7 twin cradle gives the friend one too).
- **Stats** ("ค่าพันธุกรรม 3 ค่า: เห็นด้วย แต่ช่วยทำให้ การทำให้เกิด ค่าพันธุกรรมดีๆ ผู้เล่นต้องเอาใจใส่ดูแลสัตว์มาเป็นอย่างดีจริงๆ"):
  thrift (eats 2% less a point above 1), gentleness (a pet or treat 3% more to heart a point above 1), vigour (+0.03
  growth speed a point above 1, inside x3). 1..10; bought 2..4. A child: the parents' average, then by their CARE
  (hearts 60%, days fed through in a row 40%): well cared for, often +1, now and then +2, never down; neglected, seldom
  up, often down (`childStats`); the nest shows the likely range (`childRange`). The cradle: its parent with itself.
- **The barn's inside** (2026-10-20): "ในคอกสัตว์ไม่ต้องมี รั้วแยกแต่ละสัตว์ ให้เดินรวมๆกันไปเลย แค่ต้องมีช่องใส่อาหารให้พอ / ทำ
  ช่องใส่อาหารอันเดียว ยาวทั้งแถบโรงเลี้ยงไปเลย แต่วางอาหารได้หลาย…" (the last word garbled; read as many portions): no stall
  per animal, they wander together; one long trough along the barn, a portion a place (each animal's own `food`, its
  feed's colour), "fill every portion" from the bag at the trough. Rules unchanged.
- **Outfit at rank 3** ("ชุดประจำสาย โอเค"): patched denim overalls, a red neckerchief, a straw hat with a feather, rubber
  boots (Doll 2; the art round).
- **Shorn sheep**: "แกะช่วย gen รูปตอนตัดขนแล้วด้วย" (the art round; the page shows it after a shearing until it regrows).
- **Money**: no ceiling now; measure a week ("ตาม claude").
- **Open, asked 2026-10-20** ("ไอเทมใหม่ๆ ที่ได้จากสัตว์ ราคาขาย สมเหตุสมผลไหม คุ้มค่ากับการลงทุนไหม"): both AIs offered a staged
  barn (2 places for 2,000 + 20 logs + 8 tiles, then 4 for 4,000 + 40 + 12), bredBack 0, and one shared market for all
  animal goods (1,500 base coins a round for the village, floor 10%). His answer decides; the page reads `herd.room`.

## His asks, in his words

- The first ask: "ช่วยวางแผน ระบบเลี้ยงสัตว์ ... เริ่มแรกสามารถเลี้ยงสัตว์ได้คนละ 2 ตัว สัตว์ phase แรกจะมีแค่ ไก่ วัว แกะ เป็ด
  แต่ละตัวให้ผลผลิตต่างกัน ใช้เวลาต่างกัน ทุกวัน เจ้าของต้องนำอาหารมาให้ ที่รางให้อาหาร สัตว์จะกิน 1 ชม ครั้ง สามารถทำอะไรซักอย่าง
  เพื่อเพิ่มความสนิทสนมได้ ถ้ายิ่งสนิทสนมมาก จะยิ่งให้ผลผลิตดีขึ้น สายเลี้ยงสัตว์มีเครื่องราง เหมือนสายอื่น เลเวล 6 เป็น สัตว์ขี่
  เหมือน กวาง ความเร็วน้อยกว่ากวาง ซัก 150% ก็ได้ แต่นั่งได้สองคน การซื้อสัตว์มาเลี้ยงจะมี NPC ตัวใหม่ชื่อ ลุง popoto ขายสัตว์
  สัตว์ 1 ตัวราคาค่อนข้างแพง ยิ่งแพงยิ่งให้ผลผลิตแพง มี minigame รีดนมวัว (ใช้เครื่องรีดนมวัว ซื้อที่ npc ขายสัตว์) เก็บไข่ไก่ เป็ด
  ตัดขนแกะ ช่วยทำให้ สายนี้ไป cross กับอาชีพอื่นได้ด้วย แมพสัตว์จะอยู่ข้างๆฟาร์ม ที่ผมวงในรูป ... จะเห็นสัตว์เดินไปเดินมาในฟาร์ม
  ตอนเช้า สามารถเปิดประตูให้ออกมากินหญ้า เดินเล่นที่สวนปลูกผักได้ ... ช่วยคิดเพิ่มให้ระบบลึกขึ้น แต่ยังเล่น ง่าย เล่นสนุก
  ดีไซน์สัตว์ น่ารัก หน่อย". (He circled the farm's north-east rim, local y = 0..2, and the dark beyond it.)
- Round 2: "ข ขยายฟาร์มออกไปทางนั้นจริงๆ"; "การเก็บผลผลิตต้องเป็นเจ้าของสัตว์ถึงจะเก็บได้"; ranks "ออกแบบใหม่ยกเว้น 1 5 6";
  "มีระบบผสมพันธุ์ได้ มีสูตรได้พันธุ์แปลกๆ แฟนตาซีๆ ได้ด้วย"; "ให้ลุงรับซื้อไปเถอะ"; the rest agreed.
- Round 3: "ราคา ผลผลิต เอาตาม claude"; "เปลี่ยน 3 เป็นเร่งโตแทน"; "2 8 9 10 ยังใช้ยาก ช่วยทำให้ value แต่ใช้ง่าย และ
  อย่าไปโฟกัสแต่เรื่องผสมพันธุ์ ช่วยทำให้หลากหลาย"; "อยากให้ตอนที่ซื้อมาเป็น แค่สัตว์ขั้นแรก ลูกไก่ ลูกวัว แล้วค่อยๆ โตขึ้น
  ตามวันเวลา จะไม่มีของที่ทำให้โตทันที แต่มีของเร่งโตได้".
- Round 4: "ตู้ฟักไข่ของยาย เปลี่ยนเป็นไอเทมที่ใช้งานกับสัตว์อื่นๆได้ด้วยทั้งหมด (อนาคตจะเพิ่มสัตว์อื่นๆอีก)"; "ขั้น 9 เอา 1 ชม";
  "ขั้น 10 อนาคตจะมีแมพใหม่ เพิ่มเติม อันนี้จะยังทำงานได้ดีเหมือนเดิมไหม"; "ช่วยออกแบบให้ คนอื่นสามารถดูแลสัตว์ของเพื่อนได้
  (ได้แต้มผู้ช่วยเหลือ)".
- Round 5: "ขั้น 9 ขอคุ้มกว่านี้"; "ขั้น 5 โอเคแล้ว"; friend care "สูงสุดวันละ 30". PixelLab may draw the animals' facings
  and frames ("คุณสามารถใช้ Pixellab ในการช่วยทำ ภาพได้แล้วนะครับ", and agreed as a fifth PixelLab job).

Standing rules that bind this line (AGENTS.md and the notes): time of day limits only what is gathered, never actions
on one's own things nor Quality maths; new things in bulk, one rule a family, every thing has a use; a rank's gift is
nearly OP and felt at once, removes a tedious part whole, no power takes failing away, reach 1-3 oneself, 4-6 oneself
with a count a day, 7-8 pair or group, 9 everybody on the map, 10 the village; buffs at most x3; the town must not
inflate; universal, not Thai, content (Thai words on screen); each mini-game unique in play and look; premium pixel art,
nothing pasted on; new features go up closed to testers first.

## Three rules a player learns

1. **Food is the clock.** Each animal has a trough of fed hours (at most 24). It eats one portion an hour by itself.
   Growth and production run only on fed hours; an empty trough pauses them. Nothing dies, falls ill or runs away.
2. **Closeness is the grade.** Hearts 0-10 set the ceiling of the produce's Quality range, as a crop's bars do.
3. **The game is the amount.** Milking, shearing and collecting eggs decide how much; failing gives less, never none.

## The map: the farm grows north-east

- New rows at **negative local y, -32..-1**, the full width 0..59 (global x 128..187). The farm's bounds become
  (128, -32, 60, 118); the garden's origin stays (128, 0), so no bed, plot, well, lamp, prop or insect haunt moves.
  Every bounds check must accept signed y; `findPath`'s `k % 256` key decoding is wrong for negative values (Codex).
  The database's copies of the farm's shape widen (cooking.map.farm, ground.maps, insects.nectar.maps,
  rewards.nurseryBoxes if it has the farm, town.reward_relay_place's farm rows, any other farm rectangle).
- About 1,920 tiles: barn (cows, sheep) and coop (chickens, ducks) with the nursery ~420, pond ~160, Uncle Popoto's stall
  and the processing table ~100, lanes ~300, meadow ~940. Places ("pens") are logical stalls inside the shared
  buildings, not land per member. The old rim's trees keep their places; a gap in them is the pasture's gate.
- The village gate between pasture and garden: anybody opens or closes it at any hour. Morning is only atmosphere (the
  rooster, animals trotting out); at night animals lie down where they are.

## Animals, prices, produce (the owner: "ตาม claude")

| | baby price | baby / young (fed h) | adult cycle | produce a go | the uncle pays | feed sack a day |
|---|---|---|---|---|---|---|
| chicken | 400 | 24 / 24 | egg every 6 h | eggs banked, collected | farm egg 5 | 4 |
| duck | 1,000 | 24 / 48 | egg every 8 h | eggs banked, collected | duck egg 10 | 6 |
| sheep | 2,500 | 48 / 72 | fleece full in 24 h | 3-5 tufts by the game | wool 12 a tuft | 8 |
| cow | 4,000 | 72 / 96 | milk full every 12 h | 2-5 bottles by the game | farm milk 10 a bottle | 10 |

- Grades as crops: x1.25 silver, x1.75 gold, x2.5 excellent. Fantasy breeds' produce x1.5, legend x2. The uncle buys
  under the moving price, every animal good on ONE shared counter (processed ones included).
- **Farm egg and farm milk are their own items**, not the staples the uncle sells (egg 6, milk 9): otherwise buy 9, sell
  10. They stand in for egg and milk in recipes (a family), and carry a grade, so a dish can reach gold or excellent.
- Production banks at most three rounds; a full bank pauses the clock.
- Every adult leaves one manure (the existing item ปุ๋ยคอก) a day at its first collection.
- Tools from Uncle Popoto: milking machine 180, shears 60, egg basket 24. Feed sacks, speed-up feed 10/15/25/40.
- Places: 2 producing + 2 nursery free; keeping places +2 for 500, +4 for 2,000, +8 for 6,000 (they keep, never produce).
  Barn façades 5,000 / 15,000 / 40,000 (cosmetic).
- The uncle buys animals back: one he sold at 25% of its price; a bred one at 20 / 30 / 40 / 50 whatever its breed.
- Processing at the table: 2 milk -> cream (fee 2); 2 cream -> butter (2); 3 milk -> cheese (4); wool -> yarn (spinning).
- Payback after adulthood with bought feed (normal / gold / excellent): chicken 25 / 13 / 9 days; duck 42 / 22 / 15;
  sheep 63 / 33 / 22; cow 67 / 36 / 24. Offered, not taken: wool 15 and milk 12 to bring gold to ~4 weeks.
- Coins: live read 2026-10-19: 70 purses, 399,661 coins (median 181, q75 5,988, q90 14,005). The line's faucet ~5,000-7,000
  a day at full use against ~150,000 of first purchases; the town already grows ~30,000 a day (a separate problem).

## Growth (the owner: bought as a baby, grows over time, nothing instant)

- Baby -> young -> adult on fed hours (table above): chick 2 days, duckling 3, lamb 5, calf 7. Only adults produce.
- Hearts grow from the first day; caring for babies earns line points (so early ranks never wait on an adult).
- Speed-ups ADD and cap at x3: speed-up feed +1 for 24 h (the dew-clover one for 48 h); rank 3 +1 always; rank 9 sets x3
  for its hour. Bonuses settle elapsed growth before they change; none is retroactive; none grants growth at once.
  Shortest childhood at x3: 16 / 24 / 40 / 56 h.

## Closeness (hearts)

- Sources, each once a day: a pet, a favourite treat, going out to graze, a fully fed day. About 20 days of full care
  to 10. No decay. Perks: 3 follows you in the pasture, 5 comes to a call, 7 sometimes brings a find, 10 its own ribbon
  and bell. Animals are named by their owner.
- The produce's Quality: ceiling from hearts (0 -> 30, 10 -> 100, linear), floor = ceiling - 30, graded feed eaten in
  the cycle raises the floor (narrowing capped at 20, as crops), one roll per unit on the server at collection, never
  rerolled. Hour of day never enters it.

## Mini-games (each its own play and its own drawn scene)

- **Milking**: the milking machine has two pump handles; alternate them to the cow's chewing beat; a pressure needle
  rises if too fast and the cow shifts. Failing spills part of the pail. 4 stamina.
- **Eggs in the coop**: slide a padded basket under eggs rolling out of the nest boxes, choosing the order. A crack loses
  that egg. 2 stamina.
- **Eggs outside**: a hen or duck out grazing lays some eggs where it wanders (in grass, under a bush, in a bed). Anybody
  sees "ไข่ของ X"; only the owner picks it up (the herd bell shows them).
- **Shearing**: trace the fleece's swirl with the shears; off the line nicks the fleece (less wool); traced whole gives
  "a whole fleece" worth more. The sheep is never hurt. 3 stamina.
- Tired play is harder (narrower windows), never refused.

## The garden visit

Animals out may wander into the vegetable garden and only do good: a manure on a bed's soil (a half soil bar for the
bed's owner), ducks eat slugs (guard), hens scratch weeds. They never eat a crop. A bed's owner may close their bed to
animals. Effects share the existing caps.

## Breeding (the owner: recipes, strange fantasy breeds)

- **One rule: two adults of one species + one offering in the nest -> one child.** No sexes. Both parents 3+ hearts.
  Own parents, or a friend's parent lent with their consent (the child is the one who bred it).
- Birds: a fertile egg, 12 h to hatch. Mammals: 24 h carrying. The child is a baby and grows as any. Parents rest 48 h.
  A nursery place is reserved before the fee is taken. Fees: real 80, fantasy 220, legend 600.
- Odds of the recipe's breed: real 60%, fantasy 30%, legend 10%; a rare 03-07 offering adds 10 points (cap 70%) and is
  never required. A miss gives a parent's breed and a clue in the book. Rolled once when committed.
- **One graph for every species** (A starter; B-D real; E-G fantasy; H legend):
  A+A+seed -> B; A+A+mineral -> C; B+C+flower -> D; B+D+seed -> E; C+D+mineral -> F; E+F+flower -> G; E+G+prism -> H.
  The exact offering of each step and species is found by trying; the book shows only its kind.
- The breed book: silhouettes, the kinds, the first breeder's name; the first breeder may copy a recipe scroll for 12
  coins, tradeable. A new species needs only its ladder of eight.

### The 32 breeds

| | A | B · C · D (real) | E · F · G (fantasy) | H (legend) |
|---|---|---|---|---|
| chicken | barn hen | Silkie · Araucana (blue egg) · Marans (chocolate egg) | lantern hen (glowing egg, refills a farm lamp) · cloud hen (light egg: souffle, meringue) · golden hen (gold-shelled egg) | pocket phoenix (ember egg, lights a stove) |
| duck | puddle duck | Indian runner (slim feathers: floats) · Cayuga (green sheen: waterproof wax) · mandarin (bright feathers: hats) | raindrop duck (a rain egg waters a whole bed) · moon duck (moon pearl) · paperboat duck (paper down: recipe scrolls) | little leviathan (deep-sea scale) |
| sheep | meadow sheep | Shetland (many natural colours) · Jacob four-horn · Valais blacknose (the fluffiest) | dandelion lamb (fleece blows into wildflower seeds) · rainbow sheep (dye wool) · star-fleece (glowing knits) | golden fleece ram |
| cow | spotted dairy cow | Jersey (cream) · Highland (shaggy) · Brown Swiss (cheese) | strawberry cow (pink milk) · cocoa cow (chocolate milk) · flower cow (flower milk) | Milky Way cow (star milk) |

Family rule: every egg is an egg in recipes, every milk is milk, every wool is wool; each breed adds one use of its own.

## Ranks (line "animals", ordinary marks 50 ... 12,000, a day's bound of 150 then a quarter)

| rank | gift | what it does |
|---|---|---|
| 1 | charm: herd bell | ring anywhere on the farm: your animals come to you; what they left on the map glints for you |
| 2 | thing: the orange barn cat | lives in the barn; the first time a day you come onto the farm, every animal of yours has its day's pet |
| 3 | thing: warm milk bottle | your babies and young always grow +1 (x2), while fed |
| 4 | charm: star collar | your animals' produce always rolls at the top of its range (the ceiling is still the hearts) |
| 5 | thing: grandma's warm cradle | once a day an adult of yours of ANY species gives a baby of its breed, no partner or offering; 1 in 5 a real rare breed of that species; works for every future species by its ladder |
| 6 | familiar: cloud ram | ridden on every map x1.5 (the stag is x2); a second seat a nearby member takes after accepting |
| 7 | pair: twin cradle | a cross with a friend's animal gives a baby to each, once a day |
| 8 | group: pasture harp | one tap a day: 30 minutes, everybody near you then plays the animal games with windows x2 (no extra produce) |
| 9 | map: spring wind | one tap a day, the town is told; for one hour, every owner who comes onto the farm in it: each adult's round in progress is ready at once (the owner still plays to collect), the young grow x3 for the rest of the hour; once per animal a day across all casters; a round already ready gets nothing |
| 10 | village: the hay wagon | one tap a day: an ox-drawn wagon tours the farm and two other maps' stops (stops are data: one by each map's gate; a new map adds a stop), at most ~4 minutes; anybody hops on or off at a stop; two legs ridden: every animal of the rider +1 heart, once a day a member; a missing stop or a lost connection lets the rider off at the last safe stop |

Points: daily care of an animal, collecting, breeding, first of a breed; the exact table is in lib/town/animals.ts.

## Caring for a friend's animals (helpers points)

- The owner sets who may care: nobody / named friends (default) / anybody.
- A helper may give the day's pet (if nobody has), a treat from their own bag, food from their own bag into the trough.
  Never collect, breed, sell or move.
- Helpers points: pet 1, treat 1, every 4 h of the helper's food actually eaten 1; at most **30 a day** from animal care.
- A hungry animal of somebody who allows me shows me a small bubble. The animal card lists today's helpers. The farm's
  existing thanks (one a day, 3 points) covers crops and animals together.

## Time of day (rules of AGENTS.md)

- Forage plants in the meadow, two a band (16), some spanning bands; feed hours, speed-up feed and offerings; the rare
  03-07 ones make the 72 h compact feed and the dew-clover speed-up (convenience only).
- Finds while out by band: hens scratch up seeds and beetles, ducks dabble snails and pebbles, fleece brings wildflower
  seeds the uncle never sells. Production and grades never depend on the hour.

## Crosses

Farm (crops and companions as feed, manure, slugs, weeds) · kitchen (graded farm egg/milk/cream/butter/cheese in
existing recipes and new dishes) · fishing (runner feathers to floats, worms from hens to bait, small fish to ducks) ·
forest (acorns, berries, herbs as treats) · insects (common insects as hens' treats, wool cushions in the insect house) ·
helpers (friend care) · well (the village water trough filled by carriers, a small heart bonus) · felling (nest boxes,
fences, troughs, shavings) · mining (salt lick, forged shears and bells, minerals as offerings) · outfits (yarn knits,
dyes from the rainbow sheep).

## Art

- Uncle Popoto (a popoto like the uncle, banker and smith); barn, coop, nursery, pond, fences, troughs, the nest, the
  processing table, the gate, the wagon and its stops; the three games' scenes and pieces; icons of every item.
- Animals: babies and young per species, adults per breed; 4 facings; idle, walk, eat, sleep, happy; a shorn sheep;
  the cloud ram with two riders. Base pictures by gen.mjs (the owner's workflow, Codex's `art` gate), facings and frames
  by PixelLab (`pl.mjs`), trial on the chick and hen first.

## The contract between the page and the database

- One keeper method: `animals(input: AnimalInput, request?: string): Promise<{ ok: boolean; why?: AnimalWhy; world: AnimalWorld; got?: AnimalReply["got"] }>`
  (types in lib/town/animal-act.ts). The trial runs `animalAction` and keeps its world in localStorage (as the
  warehouse does); DbKeeper calls `town_animals(p_input jsonb, p_request text)`.
- `town_animals` answers through `town.answer(me, …)` (so the purse comes back as every deed's does) with
  `{ ok, why?, got?, world }`. On `look` the world is whole: every animal (all members', for drawing), every herd's
  `{owner, care, carers, facade}` (keeping counts only for me), the gate log (last 64), `found`, live spells, today's
  wagons. On any other step `world` is partial: `{ animals: <the animals the step touched or added>, removed: [ids],
  herds: [mine], gate, spells, wagons, found }`, and the keeper merges it into what it holds. `p_request` makes a retried
  call answer the first answer (idempotent).
- Map facts the database needs (egg spots, meadow spots, wagon stops, the farm's bounds) live in lib/town/pasture.ts and
  go into the catalog row `animals` with the rules' numbers; the page piece owns their values.
- What changes elsewhere in the database: the farm's shape copies widen to `[128,-32,60,118]` (cooking.map.farm,
  insects.nectar.maps, ground.maps, rewards.nurseryBoxes) and `town.reward_relay_place`'s farm rows to -32..85; the
  kitchen's matching reads a breed's egg / milk / wool as its family; `town.carries_grade` and the relatives' grade pay
  take animal produce; the line `animals` is counted from the deeds `animal_*` (`doc.pts`), helpers points from
  `animal_care`.

## State and order of work

Kept up to date as the build goes; newest last.

- 2026-10-19: worktree and branch made on origin/main `1d31960c`; v291 claimed; this file written.
- From fcnext-c3 (v290, the town 16 rows longer, RAN): the farm's database copies are all `[128,0,60,86]` today
  (cooking.map.farm, insects.nectar.maps, ground.maps, rewards.nurseryBoxes); `town.reward_relay_place`'s farm branch is
  x 128..187 × y 0..85 and lib/town/reward-relay's `relayPlace` is the page's copy; a second farm<->town gate sits at
  farm (128, 63-64). **jsonb `@>` takes [128,0,60,44] to be in [128,0,60,86]**: guards compare elements exactly.
  Its branch `town-gate` (not pushed) drops the first half's south-rim trees in FARM_PROPS' `gap` filter only.
- 2026-10-20 ~01:00, committed on `animals`:
  - The rules (`9c37e1b4`, `b6562b85`): 16 unit tests.
  - The contract and lib/town/pasture.ts (`e3140886`).
  - The v291 draft (`359ce8cd`):
    - scripts/db/v291.core.sql, v291.act.sql and build-v291.mjs make supabase/v291_a_farm_of_animals.sql.
    - v291.test.mjs: 1,946 checks, among them 300 random settlings held to lib/town/animals, the bands, the yields, the range and the meadow, and every step.
    - v291.mutations.mjs: 9 breaks.
  - Also: the market lets produce fall, the pasture counts as a source (uses.ts), breed scrolls are written and read, and the kitchen reads families.
- Dry-run bench: `V291_BENCH=<scratch>/bench-v290.tar` caches the replayed database after v290. Without it the test replays everything, which takes about 5 minutes. The worktree's supabase/ needs the shared tree's untracked v199, v200, v201 and v257 copied in. They must never be committed.
- Owed:
  - Regenerate v291 after the page piece's world.ts is merged (the farm's shape copies, the relay's rows).
  - `TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts` to rewrite the ran files' seed blocks, as v277 did.
  - Pot icons for the 17 dishes (cooking.test). The art piece.
  - From fcnext-d9 (v292, every dish stacks 20 a slot; worktree fcnext-wt-dishstack, branch dish-stack): once its
    DISH_STACK rule is on main, rebase and regenerate v291 so the pasture's 17 dishes come out at 20. The next free number
    after v292 is v293.
- 2026-10-20, the page piece (branch `animals-page` on `animals`, worktree `fcnext-wt-animals-page`, not pushed): the
  pasture's map (lib/town/pasture: the rows at y -32..-1, FARM_ALL (128,-32,60,118); the garden held byte for byte by
  lib/town/pasture.test.ts), Keeper.animals (trial: the browser's world; DbKeeper: town_animals, a look whole, a step's
  part merged by lib/town/animal-world; a denied town_animals is the pasture shut, not the game), the map's drawing
  and taps (components/town/TownPasture), Uncle Popoto's talk and panel (TownAnimals), the three games
  (lib/town/animal-games, TownAnimalGames), the gifts' buttons, the wagon's tour and the ram's second seat (a `seat`
  told to the room, lib/town/seats), the test window's Animals leaf. Art: every picture by one name
  (lib/town/pasture-art), stand-ins marked `// ART:`, the list in ART-NEEDED.md. Checked by
  `.claude/skills/fc-cash-town/scripts/town-animals.mjs` (113 checks at desktop, phone, small phone and two tabs);
  screenshots and the contact sheet in `shots/` (not committed: the repo keeps no plan pictures).
  For the database: POPOTO_SHOP sells the four making tools and the 17 dish scrolls; the egg spots, the meadow's
  spots and the wagon's stops have their values (farm [151,-3], town [57,32], forest [190,186]); line-points counts
  `animal_*` deeds by `doc.pts` (animal_care on the helpers' line); the page reads the purse's `animalCare`,
  `animalBook`, `meadow`, `animalRode`.
