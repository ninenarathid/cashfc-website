"""P3 Alexander Prime (03_alex_prime), as Tuufless's Notes has it."""
import scenes_tea as S
from frames_list import FR

IMG = "https://ffxiv.tuufless.com/images/ultimates/tea/03/"
PH = ("P3 Alexander Prime", "P3 Alexander Prime")
WH = "Wormhole Formation"
M1, M1E = "วิธีที่ 1: สลับ Melee", "Method 1: melee swap"
M2, M2E = "วิธีที่ 2: TTD/HHD", "Method 2: TTD/HHD"

WSTEPS = [
    ("① ดูเลข + stack กลางล่อ Chakram", "① Read your number + stack for the Chakrams",
     "① ดูเลข Limit Cut ของตัวเอง แล้ว stack กลางสนามล่อ Chakram\n"
     "ดูว่า Brute Justice อยู่ตรงไหน: เป็นตัวกำหนดว่าใครล่อ Super Jump และ Apocalyptic Ray (สองคนนี้ต้องยืนเป๊ะกว่าคนอื่น)",
     "① Read your Limit Cut number and stack in the middle to bait the Chakrams\n"
     "Note where Brute Justice is: it decides who baits Super Jump and Apocalyptic Ray (those two have stricter spots)", None),
    ("② เข้าตำแหน่ง + แอ่ง Void", "② Take your spots + the Void puddles",
     "② เข้าตำแหน่ง\n"
     "คนที่อยู่ทแยงตรงข้าม Brute Justice (3 หรือ 4): ล่อ Super Jump หน้าจุดแดง\n"
     "คนที่อยู่ทแยงตรงข้าม Cruise Chaser (3 หรือ 4): ไปสุดขอบเพื่อหลบ Apocalyptic Ray\n"
     "1 และ 2: ใช้ anti-knockback\n"
     "ภาพ: 3 เยื้องเข้ามาเพราะล่อ Super Jump / 4 อยู่สุดขอบ\n\n"
     "แอ่ง Void 2 อันโผล่เยื้องจากตะวันออกและตะวันตก ต้องรับ 3 รอบตามคน: รอบ 1 5 + 6 / รอบ 2 7 + 8 / รอบ 3 1 + 2\n"
     "รับแต่ละครั้งแอ่งจะเล็กลง",
     "② Move to your spots\n"
     "Whoever is diagonally opposite Brute Justice (3 or 4): bait Super Jump in front of the red dot\n"
     "Whoever is diagonally opposite Cruise Chaser (3 or 4): go all the way to the edge to dodge Apocalyptic Ray\n"
     "1 and 2: use anti-knockback\n"
     "Picture: 3 is slightly further in because they bait Super Jump / 4 is at the edge\n\n"
     "Two Void puddles spawn slightly off east and west and must be soaked three times: 1st 5 + 6 / 2nd 7 + 8 / 3rd 1 + 2\n"
     "Each soak makes the puddle smaller", "wh-void"),
    ("③ Chakram พุ่ง + Super Jump", "③ The Chakrams + Super Jump",
     "③ Chakram พุ่ง และ Brute Justice ใช้ Super Jump ใส่คนที่ไกลที่สุด\n"
     "Cruise Chaser ฟัน 1\n"
     "คนที่เริ่มยืนหน้า Brute Justice (1 หรือ 2): ยืนบนจุดแดงไว้จนกว่า Apocalyptic Ray ยิงออก",
     "③ The Chakrams fly; Brute Justice Super Jumps on the furthest player\n"
     "Cruise Chaser cleaves 1\n"
     "Whoever started in front of Brute Justice (1 or 2) stays on the red dot until Apocalyptic Ray comes out", None),
    ("④ Apocalyptic Ray + พุ่งใส่ 2", "④ Apocalyptic Ray + the dash at 2",
     "④ Brute Justice หันไปคนที่ไกลที่สุด (ควรเป็น 1 หรือ 2) แล้วร่าย Apocalyptic Ray\n"
     "Cruise Chaser พุ่งใส่ 2\n"
     "3 และ 4: ใช้ anti-knockback\n"
     "5 และ 6: เข้าไปในแอ่ง Void",
     "④ Brute Justice turns to the furthest player (should be 1 or 2) and casts Apocalyptic Ray\n"
     "Cruise Chaser dashes at 2\n"
     "3 and 4: use anti-knockback\n"
     "5 and 6: move inside the Void puddles", None),
    ("⑤ 5, 6 รับแอ่งแล้วไปเหนือ", "⑤ 5 and 6 soak, then go north",
     "⑤ 5 และ 6 รับแอ่ง Void แล้วไปยืนฝั่งเหนือ (ที่ 1 และ 2 เคยยืน)\n"
     "Cruise Chaser ฟัน 3\n"
     "Alexander เริ่มชาร์จ Sacrament (ไม่ต้องตกใจ)",
     "⑤ 5 and 6 resolve their Void puddles, then take the north spots (where 1 and 2 were)\n"
     "Cruise Chaser cleaves 3\n"
     "Alexander starts charging Sacrament (don't panic)", None),
    ("⑥ พุ่งใส่ 4 / 7, 8 เข้าแอ่ง", "⑥ The dash at 4 / 7 and 8 into the puddles",
     "⑥ Cruise Chaser พุ่งใส่ 4\n"
     "3, 4: ขยับขึ้นเหนือ 1 ขีด หลบ Sacrament\n"
     "5, 6: ใช้ anti-knockback\n"
     "7, 8: เข้าไปในแอ่ง Void",
     "⑥ Cruise Chaser dashes at 4\n"
     "3, 4: move one notch north to dodge Sacrament\n"
     "5, 6: use anti-knockback\n"
     "7, 8: move inside the Void puddles", None),
    ("⑦ ฟัน 5 + Sacrament ลง", "⑦ The cleave on 5 + Sacrament",
     "⑦ Cruise Chaser ฟัน 5 และ Sacrament ลง\n"
     "7, 8: รับแอ่ง Void",
     "⑦ Cruise Chaser cleaves 5; Sacrament resolves\n"
     "7, 8: resolve the Void puddles", None),
    ("⑧ พุ่งใส่ 6 / 1, 2 เข้าแอ่ง", "⑧ The dash at 6 / 1 and 2 into the puddles",
     "⑧ Cruise Chaser พุ่งใส่ 6\n"
     "1, 2: เข้าไปในแอ่ง Void\n"
     "7, 8: ใช้ anti-knockback",
     "⑧ Cruise Chaser dashes at 6\n"
     "1, 2: move inside the Void puddles\n"
     "7, 8: use anti-knockback", None),
    ("⑨ ฟัน 7 / เริ่มเข้ากลาง", "⑨ The cleave on 7 / start moving in",
     "⑨ Cruise Chaser ฟัน 7\n"
     "1, 2: รับแอ่ง Void\n"
     "3, 4, 5, 6: เริ่มเดินเข้ากลาง เตรียม Incinerating Heat",
     "⑨ Cruise Chaser cleaves 7\n"
     "1, 2: resolve the Void puddles\n"
     "3, 4, 5, 6: start moving to the middle for Incinerating Heat", None),
    ("⑩ พุ่งใส่ 8", "⑩ The dash at 8",
     "⑩ Cruise Chaser พุ่งใส่ 8\n"
     "7: ต้องรอ Cruise Chaser พุ่งไปก่อนค่อยเข้ากลาง หรือเดินอ้อม Cruise Chaser (ห้ามตัดผ่าน: กากบาทแดงในภาพ)\n"
     "เคล็ดลับ: 8 ไม่จำเป็นต้องรับ Super Blassty Charge ทางตะวันออกเฉียงใต้ จะรับทางใต้ก็ได้ จะได้ใกล้จุด stack Incinerating Heat ขึ้นนิดหนึ่ง",
     "⑩ Cruise Chaser dashes at 8\n"
     "7: either wait for the dash before moving in, or run around Cruise Chaser (never straight through: the red cross)\n"
     "Tip: 8 need not take Super Blassty Charge south-east; south works too and is a little closer to the Incinerating Heat stack", None),
]


def p3(step):
    TS = "Temporal Stasis"
    ts_note = ("ไม่มี debuff: ไปบอสฝั่งตะวันออก / Tank·Healer เหนือ / DPS ใต้\n"
               "สายแดง/เขียว: ไปบอสฝั่งตะวันตก ห่างกันราว 1 marker / Tank·Healer เหนือ / DPS ใต้\n"
               "สายน้ำเงิน: Tank·Healer ตะวันตก / DPS ตะวันออก\n"
               "คนสายน้ำเงินฝั่ง Cruise Chaser: เดินเข้าหา Cruise Chaser ไม่กี่ก้าว\n"
               "Aggravated Assault: สุดขอบตะวันตกหรือตะวันออก ฝั่งเดียวกับ Brute Justice\n")
    ts_note_en = ("No debuff: go to the east boss / tanks and healers north / DPS south\n"
                  "Red/green tether: go to the west boss, about one marker apart / tanks and healers north / DPS south\n"
                  "Blue tether: tanks and healers west / DPS east\n"
                  "The blue-tether player on Cruise Chaser's side takes a few steps towards Cruise Chaser\n"
                  "Aggravated Assault: far west or east, on Brute Justice's side\n")
    step(PH, TS, "Temporal Stasis: Cruise Chaser ตะวันตก", "Temporal Stasis: Cruise Chaser west",
         "หลังชนะ Brute Justice + Cruise Chaser สนามเปลี่ยน Alexander Prime โผล่พร้อมบอสทั้งสอง แล้วเริ่มช่วงเปลี่ยน phase\n\n" + ts_note +
         "\nภาพ: Cruise Chaser ตะวันตก จึงเป็น Tank·Healer สายน้ำเงินที่เดินเข้ามา / Aggravated Assault ไปขอบตะวันออก (ฝั่ง Brute Justice)\n\n"
         "ทำไมต้องเข้ามา: Cruise Chaser ฟัน 3 คนที่ใกล้ที่สุด ถ้าคนสายน้ำเงินไปถึงขอบ คนที่ 3 จะกลายเป็นคนที่บอสอีกตัว ตายทั้งฝั่ง",
         "After Brute Justice + Cruise Chaser the arena changes and Alexander Prime appears with both bosses for the transition\n\n" + ts_note_en +
         "\nPicture: Cruise Chaser is west, so the blue-tether tank/healer steps in / Aggravated Assault goes to the east edge (Brute Justice's side)\n\n"
         "Why step in: Cruise Chaser cleaves the three closest players; if the blue tether goes to the edge, the third becomes a player at the other boss, killing that whole side",
         strict=False, pic=IMG + "temporal_stasis_01.jpg", scene=S.stasis(False), refs=[FR("ts-blue")])
    step(PH, TS, "Temporal Stasis: Brute Justice ตะวันตก", "Temporal Stasis: Brute Justice west",
         ts_note + "\nภาพ: Cruise Chaser ตะวันออก จึงเป็น DPS สายน้ำเงินที่เดินเข้ามา / Aggravated Assault ไปขอบตะวันตก (ฝั่ง Brute Justice)\n\n"
         "ชื่อดาเมจ: Plaint of Severity = Aggravated Assault / Plaint of Solidarity = Shared Sentence / Plaint of Surety = สายแดง/เขียว และสายน้ำเงิน",
         ts_note_en + "\nPicture: Cruise Chaser is east, so the blue-tether DPS steps in / Aggravated Assault goes to the west edge (Brute Justice's side)\n\n"
         "Damage names: Plaint of Severity = Aggravated Assault / Plaint of Solidarity = Shared Sentence / Plaint of Surety = the red/green and blue tethers",
         strict=False, pic=IMG + "temporal_stasis_02.jpg", scene=S.stasis(True), refs=[FR("ts-aggravated")])
    CH = "Chastening Heat + Divine Spear"
    step(PH, CH, "ครั้งที่ 1: ST invuln", "The first: ST invuln",
         "หลัง Temporal Stasis: ST ดึง aggro แล้ว invuln รับ Chastening Heat ของ Alexander Prime\n"
         "กด invuln ให้คลุม Divine Spear 3 ครั้ง (กรวย) ที่ตามมาด้วย\n"
         "อีกทาง: ใช้ mitigate รับ Chastening Heat แล้ว invuln รับ Divine Spear (มี auto-attack 1 ครั้งคั่น)\n"
         "หลัง Divine Spear: สลับ Tank จาก ST เป็น MT (MT Provoke) บอสตี auto 2 ครั้งแล้วร่าย Inception Formation\n\n"
         "ทำไม ST ถือบอสตอนเริ่ม\n"
         "invuln ของ MT จะกลับมาทันครั้งที่ 2 (หลัง Inception) ได้ invuln ทั้งสองครั้ง\n"
         "ST ยังใช้ invuln ตอน Ordained Capital Punishment ครั้งที่ 2 ใน Perfect Alexander ได้ แม้เป็น PLD",
         "After Temporal Stasis the ST takes aggro and invulns Alexander Prime's Chastening Heat\n"
         "Time it to also cover the three Divine Spear cleaves after it\n"
         "Or: mitigate Chastening Heat and invuln the Divine Spears (one auto-attack in between)\n"
         "After the Divine Spears: tank swap ST → MT (the MT Provokes); two autos, then Inception Formation\n\n"
         "Why the ST holds the boss first\n"
         "The MT's invuln is back for the second set (after Inception), so both can be invulned\n"
         "The ST can still invuln the second Ordained Capital Punishment in Perfect Alexander, even as a PLD",
         strict=False, refs=[FR("ap-chastening")])

    IF = "Inception Formation"
    step(PH, IF, "① สายเขียว + AoE คริสตัล", "① Green tethers + crystal AoEs",
         "① Alexander โผล่ทิศเหนือจริงหรือใต้จริง / Brute Justice กับ Cruise Chaser โผล่ตะวันออก-ตะวันตก (สุ่มฝั่ง)\n"
         "สายเขียว (4 คน): เดินไปทาง Alexander ฝั่งตรงข้ามลูกที่ผูกสาย ให้สายไขว้กัน\n"
         "AoE คริสตัล (4 คน): ยืนเป็นสี่เหลี่ยมจัตุรัสฝั่งตรงข้าม Alexander ให้มีช่องเล็กๆ ระหว่างวง\n"
         "คริสตัล 2 คนที่ไกล Alexander สุด: ยืนห่างจุดแดงฝั่งตรงข้าม Alexander ราว 1.5 ขีด / อีก 2 คนยืนเทียบให้เป็นสี่เหลี่ยม\n"
         "ระวังอย่าให้สี่เหลี่ยมเอียงเป็นข้าวหลามตัด\n\n"
         "ทำไมไขว้สาย: กันลูกเขียว (โดยเฉพาะลูกล่าง) ลอยมาขวางทางคนวางคริสตัล\n"
         "ทำไมวางเป็นสี่เหลี่ยม: True Heart ที่โผล่ตรงข้าม Alexander ต้องโดนคริสตัลครบ 4 และ True Heart โดนคริสตัลแล้วเกิดดาเมจตามระยะ จึงวางให้ไกลปาร์ตี้",
         "① Alexander appears true north or true south / Brute Justice and Cruise Chaser east and west (random sides)\n"
         "Green tethers (4): go towards Alexander, opposite your orb, and criss-cross the tethers\n"
         "Crystal AoEs (4): make a square opposite Alexander with a small gap between the telegraphs\n"
         "The two crystals furthest from Alexander stand about 1.5 notches from the red dot opposite him / the other two square up on them\n"
         "Don't let the square slant into a diamond\n\n"
         "Why cross the tethers: the green orbs (the lower ones above all) won't drift into the crystal players' path\n"
         "Why a square: the True Heart opposite Alexander must hit all four crystals, and each hit deals proximity damage, so they go far from the party",
         strict=False, pic=IMG + "inception_01.jpg", scene=S.inception_01(), refs=[FR("ap-inception")])
    step(PH, IF, "② วางคริสตัลและลูกเขียว", "② Place the crystals and the orbs",
         "② คริสตัลโผล่ตรงที่ AoE ลง: ใหญ่กว่าวงเตือนเล็กน้อย\n"
         "กระจายลูกเขียวไปตามขอบด้านที่ Alexander อยู่: ลูกตะวันออก / ตะวันตก วางบนจุดแดง / 2 ลูกที่ใกล้ Alexander วางสูงขึ้นจากจุดแดง 1 ขีด\n"
         "ทำถูก: True Heart ที่โผล่ตรงข้าม Alexander โดนคริสตัลครบ 4 อัน กลายเป็นสีทอง ปาร์ตี้ได้บัฟ Enigma Codex\n"
         "Enigma Codex จำเป็นต้องมีเพื่อผ่าน Perfect Alexander (ทำให้เห็นร่างโคลนใน Fate Calibration α / β)\n\n"
         "พลาดแบบนี้\n"
         "True Heart โดนคริสตัลไม่ครบ 4 (วางไกลกลางเกิน)\n"
         "คริสตัล 2 อันขึ้นไปแตะกัน: เต้นเป็นวงดาเมจตามระยะ True Heart ทะลุผ่าน\n"
         "แตะลูกเขียวแล้วเหลือแอ่งเขียว: ถ้าแอ่ง 2 อันแตะกัน ระเบิดตายทั้งปาร์ตี้",
         "② The crystals appear where the AoEs were: slightly larger than the telegraphs\n"
         "Spread the green orbs along the edge towards Alexander: the east / west orbs on the red dots / the two nearer Alexander one notch up from them\n"
         "Done right, the True Heart opposite Alexander hits all four crystals and turns gold: the party gets Enigma Codex\n"
         "Enigma Codex is required to clear Perfect Alexander (it shows the clones in Fate Calibration α / β)\n\n"
         "Failures\n"
         "The True Heart misses a crystal (placed too far from the middle)\n"
         "Two crystals touch: they pulse with proximity telegraphs and the True Heart passes through\n"
         "A touched orb leaves a green puddle: two puddles touching explode and wipe",
         strict=False, pic=IMG + "inception_02.jpg", scene=S.inception_02())
    step(PH, IF, "③ เลียบขอบไปรวมทางเหนือ", "③ Along the edge to the north wall",
         "③ เดินเลียบขอบสนามไปรวมกันตามกำแพงเหนือ ทางฝั่ง Brute Justice จะได้ไม่โดนดาเมจตามระยะของคริสตัล\n"
         "พอคริสตัลระเบิด MT กับ ST เข้าตำแหน่งข้าง Brute Justice เตรียมล่อ Flarethrower 2 ครั้ง\n"
         "แอ่งเขียวที่เหลือทำให้เดินช้า",
         "③ Move along the arena's edge to gather on the north wall towards Brute Justice, clear of the crystals' proximity damage\n"
         "When the crystals explode, the MT and ST take their spots beside Brute Justice to bait two Flarethrowers\n"
         "The green puddles left behind slow you down",
         strict=["MT", "ST"], pic=IMG + "inception_03.jpg", scene=S.inception_03())
    step(PH, IF, "④ Flarethrower 3 ครั้ง", "④ Three Flarethrowers",
         "④ Brute Justice ยิง Flarethrower ใส่ 3 คนที่ใกล้ที่สุด เริ่มจากคนใกล้สุด\n"
         "MT: ล่อลูกที่ 1 ไปทางใต้\n"
         "ST: ล่อลูกที่ 2 แนวกลาง\n"
         "คนที่เหลือ: อยู่แถวขอบมุมทแยง แต่ไม่ชิด Brute Justice (คนในกลุ่มนี้ 1 คนจะล่อลูกที่ 3)\n"
         "มาโคร: MT (ใต้) → ST (กลาง) → ปาร์ตี้ (เหนือ)",
         "④ Brute Justice Flarethrowers the three closest players, nearest first\n"
         "MT: bait the first south\n"
         "ST: bait the second through the middle\n"
         "Everyone else: stay near the intercardinal edge, not close to Brute Justice (one of you baits the third)\n"
         "Macro: MT (south) → ST (mid) → party (north)",
         strict=["MT", "ST"], pic=IMG + "inception_04.jpg", scene=S.inception_04(), refs=[FR("ap-flare")])
    step(PH, IF, "⑤ Sacrament + debuff", "⑤ Sacrament + the debuffs",
         "⑤ True Heart ลอยไปจุดสุ่มที่ขอบสนาม Alexander โผล่ตรงนั้นแล้วร่าย Sacrament\n"
         "ทุกคนได้ debuff ต่างๆ ถือ True Heart เป็นทิศเหนือ\n"
         "Tank: ไปซ้าย / Healer: ไปขวา\n"
         "DPS ที่ได้ Shared Sentence: ไปซ้าย / DPS คนอื่น: ไปขวา\n"
         "มาโคร: ตะวันตก MT + ST + DPS Shared Sentence / ตะวันออก H1 + H2 + DPS ที่เหลือ",
         "⑤ The True Heart moves to a random spot on the edge, where Alexander appears and casts Sacrament\n"
         "Everyone gets debuffs to resolve, the True Heart as north\n"
         "Tanks: left / healers: right\n"
         "DPS with Shared Sentence: left / other DPS: right\n"
         "Macro: west MT + ST + the Shared Sentence DPS / east H1 + H2 + the other DPS",
         strict=["MT", "ST", "H1", "H2"], pic=IMG + "inception_05.jpg", scene=S.inception_05())
    step(PH, IF, "⑥ Brute Justice ตะวันตก / Cruise Chaser กลาง", "⑥ Brute Justice west / Cruise Chaser in the middle",
         "⑥ Brute Justice โผล่ใหม่ทางตะวันตก Cruise Chaser โผล่กลางสนาม (ถือทิศจริง)\n"
         "ST: สุดตะวันออก\n"
         "H1: เหนือ ชิด Cruise Chaser\n"
         "H2: ใต้ ชิด Cruise Chaser\n"
         "DPS ที่เคยมีสายน้ำเงิน: ตะวันตก ชิด Cruise Chaser\n"
         "คนที่เหลือ: ตะวันออก ระหว่าง Cruise Chaser กับ ST (อย่าชิด Cruise Chaser เกิน)",
         "⑥ Brute Justice reappears west and Cruise Chaser in the middle (true north)\n"
         "ST: far east\n"
         "H1: north, next to Cruise Chaser\n"
         "H2: south, next to Cruise Chaser\n"
         "The DPS who had the blue tether: west, next to Cruise Chaser\n"
         "Everyone else: east, between Cruise Chaser and the ST (not too close to Cruise Chaser)",
         strict=["ST", "H1", "H2"], pic=IMG + "inception_06.jpg", scene=S.inception_06())
    step(PH, IF, "⑦ Alpha Sword 3 คน", "⑦ Alpha Sword on three",
         "⑦ Cruise Chaser ใช้ Alpha Sword ฟัน 3 คนที่ใกล้ที่สุด: ควรเป็น Healer 2 คน กับ DPS สายน้ำเงิน\n"
         "พอ Cruise Chaser ฟันคนเหนือหรือใต้ ปาร์ตี้วิ่งไปหลังคนนั้นได้ เพื่อหลบ Super Jump ที่ตามมา",
         "⑦ Cruise Chaser Alpha Swords the three closest players: the two healers and the blue-tether DPS\n"
         "When it cleaves the north or south player, the rest can run behind that player to avoid the coming Super Jump",
         strict=["ST", "H1", "H2"], pic=IMG + "inception_07.jpg", scene=S.inception_07())
    step(PH, IF, "⑧ Super Jump ใส่ ST", "⑧ Super Jump on the ST",
         "⑧ Brute Justice ใช้ Super Jump ใส่คนที่ไกลที่สุด: ควรเป็น ST\n"
         "วงกระแทกใหญ่มาก: คนอื่นวิ่งหนีจาก ST ให้ทันก่อน Alpha Sword ครั้งที่ 3",
         "⑧ Brute Justice Super Jumps on the furthest player: the ST\n"
         "The impact is large, so everyone else runs away from the ST by the third Alpha Sword",
         strict=["ST"], pic=IMG + "inception_08.jpg", scene=S.inception_08())
    step(PH, CH, "ครั้งที่ 2: MT invuln", "The second: MT invuln",
         "Alexander Prime กลับมากลางสนาม ร่าย Chastening Heat → Divine Spear 3 ครั้ง ใส่ MT\n"
         "ทำแบบเดิม: invuln รับทั้งหมด หรือ mitigate Chastening Heat แล้ว invuln Divine Spear\n"
         "ครั้งนี้ MT invuln\n\n"
         "ถ้า MT เป็น PLD และเคลียร์ phase ก่อนหน้าเร็ว Hallowed Ground อาจยังไม่กลับมา: Tank ทั้งสองใช้ mitigate แล้วสลับ Tank ตอน Chastening Heat กำลังร่าย (ให้ ST หัน Divine Spear ไปทางตะวันออก)\n"
         "จากนั้นบอสตี auto 2 ครั้งแล้วร่าย Wormhole Formation",
         "Alexander Prime returns to the middle for Chastening Heat → three Divine Spears on the MT\n"
         "As before: invuln it all, or mitigate Chastening Heat and invuln the Divine Spears\n"
         "This time the MT invulns\n\n"
         "A PLD MT who cleared the earlier phases fast may not have Hallowed Ground back: both tanks mitigate and swap while Chastening Heat is cast (the ST points the Divine Spears east)\n"
         "Then two autos and Wormhole Formation",
         strict=False)

    step(PH, WH, "ภาพรวม: แผน 09STOP", "Overview: 09STOP",
         "ใช้แผนของ 09STOP (ตามที่ Korean simulator แสดง)\n"
         "เลขคี่ทุกคนต้องหันหน้าออกนอกสนาม และใช้ Arm's Length / Surecast ตอนล่อ Cruise Chaser กัน knockback จาก Alpha Sword\n\n"
         "แต่ละคู่ทำงานแยกจากคนอื่น โฟกัสแค่ส่วนของตัวเอง\n"
         "เรื่องทั้งหมดเกิดฝั่งเหนือกับใต้ ถ้ายังไม่ถึงตาหรือทำเสร็จแล้ว กลับไปยืนฝั่งตะวันออก / ตะวันตก\n\n"
         "1 และ 2: Arm's Length / Surecast ตอน Chakram พุ่ง → รับฟัน (1) และพุ่ง (2) ฝั่งเหนือ → ล่อ Apocalyptic Ray → รับแอ่งรอบที่ 3\n"
         "3 และ 4: ล่อ Super Jump ฝั่งใต้ → Arm's Length / Surecast ตอน Brute Justice กระโดด → รับฟัน (3) และพุ่ง (4) ฝั่งใต้ → หลบลำแสง Sacrament\n"
         "5 และ 6: รับแอ่งรอบแรก → Arm's Length / Surecast ตอนแอ่งลง → รับฟัน (5) และพุ่ง (6) ฝั่งเหนือ\n"
         "7 และ 8: รับแอ่งรอบที่ 2 → Arm's Length / Surecast ตอนแอ่งลง → รับฟัน (7) และพุ่ง (8) ฝั่งใต้",
         "09STOP's method (the one the Korean simulator shows)\n"
         "Every odd number faces outside and uses Arm's Length / Surecast when baiting Cruise Chaser, to nullify Alpha Sword's knockback\n\n"
         "Each pair's job is independent of the rest: focus on your own part\n"
         "Everything happens north and south; when it isn't your turn, or you're done, go back to the east / west spots\n\n"
         "1 and 2: Arm's Length / Surecast as the Chakrams fly → the cleave (1) and dash (2) north → bait Apocalyptic Ray → soak the 3rd puddles\n"
         "3 and 4: bait Super Jump south → Arm's Length / Surecast as Brute Justice jumps → the cleave (3) and dash (4) south → dodge Sacrament\n"
         "5 and 6: soak the 1st puddles → Arm's Length / Surecast as they resolve → the cleave (5) and dash (6) north\n"
         "7 and 8: soak the 2nd puddles → Arm's Length / Surecast as they resolve → the cleave (7) and dash (8) south",
         strict=False, refs=[FR("wh-one")])
    for k, (n, ne, t, te, fr) in enumerate(WSTEPS, 1):
        step(PH, WH, n, ne, t, te, strict=False, pic=f"{IMG}wormhole_{k:02d}.jpg", scene=S.wormhole(k), refs=[FR(fr)] if fr else None)
    step(PH, WH, "⑪ Incinerating Heat: stack 3 กลุ่ม", "⑪ Incinerating Heat: three stacks",
         "⑪ ทั้งปาร์ตี้ stack กลางสนามรับ Incinerating Heat\n"
         "แยกเป็น 3 กลุ่ม ห่างพอดูออกว่าต้องสลับ Enumeration ไหม แต่ใกล้พอให้ทุกคนแชร์ดาเมจ\n"
         "D1, D3: stack เยื้องไปตะวันตกนิดหนึ่ง\n"
         "Tank + Healer: stack รวมกันตรงกลาง\n"
         "D2, D4: stack เยื้องไปตะวันออกนิดหนึ่ง",
         "⑪ The party stacks in the middle for Incinerating Heat\n"
         "In three groups, far enough apart to see whether an Enumeration swap is needed, close enough for everyone to share\n"
         "D1, D3: a little west\n"
         "Tanks + healers: together in the middle\n"
         "D2, D4: a little east",
         strict=True, pic=IMG + "wormhole_11.jpg", scene=S.wormhole_11())
    step(PH, WH, "⑫ Enumeration: แบบ BJCC", "⑫ Enumeration as in BJCC",
         "⑫ ทำ Enumeration เหมือนตอน Brute Justice + Cruise Chaser\n"
         "MT, ST: ไม่เข้า Enumeration\n"
         "H1, D3: Enumeration ตะวันตกเสมอ\n"
         "H2, D4: Enumeration ตะวันออกเสมอ\n"
         "D1 ตะวันตก / D2 ตะวันออก ยกเว้นต้องสลับ\n"
         "ถ้าฝั่งเดียวมี Enumeration 2 อัน (หรือไม่มีเลย): D1 กับ D2 สลับฝั่ง\n"
         "เคล็ดลับ: ถ้าเป็น D1 หรือ D2 แล้วเห็นฝั่งตัวเองมี 4 คน แปลว่าต้องสลับ (อีกคนสลับไปแล้วแต่เรายังไม่ได้สลับ)",
         "⑫ Resolve Enumeration exactly as in Brute Justice + Cruise Chaser\n"
         "MT, ST: never in an Enumeration\n"
         "H1, D3: always the west Enumeration\n"
         "H2, D4: always the east Enumeration\n"
         "D1 west / D2 east unless a swap is needed\n"
         "If one side has both Enumerations (or none), D1 and D2 swap sides\n"
         "Tip: as D1 or D2, four people on your side means you must swap (your counterpart already has, you haven't)",
         strict=True, pic=IMG + "wormhole_12.jpg", scene=S.wormhole_12(), plan=M1, plan_en=M1E, refs=[FR("wh-enum")])
    step(PH, WH, "⑫ Enumeration: กลุ่มเหนือ / ใต้", "⑫ Enumeration: north / south groups",
         "⑫ แบ่ง Enumeration เป็นกลุ่มเหนือกับใต้ (บางคนว่าง่ายกว่า)\n"
         "MT, ST: อยู่ใน Enumeration เหนือเสมอ\n"
         "H1, H2: อยู่ใน Enumeration ใต้เสมอ\n"
         "DPS ที่โดน Enumeration: ไปเหนือ / ใต้ตามลำดับ เหนือ D1 > D2 > D3 > D4 ใต้\n"
         "DPS ที่ไม่โดน: อยู่นอกทั้งสองวง",
         "⑫ Split the Enumerations into a north and a south group (some find it easier)\n"
         "MT, ST: always inside the north Enumeration\n"
         "H1, H2: always inside the south Enumeration\n"
         "DPS with an Enumeration: north / south by the priority north D1 > D2 > D3 > D4 south\n"
         "DPS without one: stay out of both",
         strict=["MT", "ST", "H1", "H2"], pic=IMG + "wormhole_12_ttdhhd.jpg", scene=S.wormhole_12b(), plan=M2, plan_en=M2E)
    step(PH, WH, "แก้ปัญหา: Apocalyptic Ray โดนคน", "Troubleshooting: Apocalyptic Ray clipping",
         "ช่วงฝึกเจอบ่อย เป็นส่วนที่ต้องใช้ฝีมือที่สุดของแผน\n"
         "เช็คก่อนว่าคนรับแอ่ง Void ไม่ได้เดินเข้ากลางเกินจนเข้าแนว Apocalyptic Ray\n"
         "ส่วนมากคนที่โดนคือ 3 หรือ 4 (คนที่ไม่ได้ล่อ Super Jump) ให้เช็คว่า\n"
         "ล่อ Super Jump หน้าจุดแดงหรือเปล่า\n"
         "คนที่ไม่ได้ล่อ Super Jump อยู่สุดขอบหรือเปล่า\n"
         "คนล่อ Apocalyptic Ray (1 หรือ 2) ขยับออกก่อนเวลาหรือเปล่า: ลำแสงเอียงไปนิดเดียวก็พอฆ่าอีกคน (ดูภาพ)\n\n"
         "3 หรือ 4 รับแอ่งสุดท้ายแทน 1 หรือ 2 ที่ตายได้ไหม: ไม่ได้ เพราะติด Magic Vulnerability Up จาก Alpha Sword (ดาเมจขึ้นราว 6–7 เท่า)\n"
         "แต่ดาเมจแอ่งต่ำพอที่ Tank ที่ติด vuln จะรับได้แม้ไม่ mitigate",
         "Common while learning, and the technical part of the strat\n"
         "First check that the puddle soakers aren't moving too far in, into the ray's path\n"
         "More often 3 or 4 (whoever didn't bait Super Jump) dies; check\n"
         "Was Super Jump baited in front of the red dot?\n"
         "Was the player not baiting Super Jump all the way at the edge?\n"
         "Did the ray's bait (1 or 2) leave early? That tilts the ray just enough to kill the other player (see the picture)\n\n"
         "Can 3 or 4 take the last puddle if 1 or 2 is dead? No: Alpha Sword's Magic Vulnerability Up (about 6–7 times the damage)\n"
         "But the puddle is weak enough that a tank with the vulnerability can take it even unmitigated",
         strict=False, pic=IMG + "wormhole_faq.jpg", scene=S.wormhole_faq())

    step(PH, "Mega Holy", "Mega Holy 2 ครั้ง", "Mega Holy ×2",
         "จบ Wormhole Formation ด้วย Enumeration แล้ว Alexander Prime กลับมากลางสนาม ร่าย Mega Holy 2 ครั้งติดกัน (raid-wide)\n"
         "mitigate: MT Reprisal / D1 / D4\n"
         "(มาโคร: MT Reprisal + D4 Addle)\n"
         "กดจังหวะถูก Reprisal, Feint และ Addle คลุมทั้ง 2 ครั้ง\n"
         "จากนั้นร่าย Summon Alexander แล้วหายไป",
         "After Wormhole Formation's Enumeration, Alexander Prime returns to the middle and casts two Mega Holies back to back (raid-wides)\n"
         "Mitigation: MT Reprisal / D1 / D4\n"
         "(Macro: MT Reprisal + D4 Addle)\n"
         "Timed right, Reprisal, Feint and Addle cover both\n"
         "Then he casts Summon Alexander and disappears",
         strict=False, refs=[FR("ap-megaholy")])
    step(PH, "J Storm + J Wave", "J Wave: ฆ่าตามลำดับ", "J Waves: the kill order",
         "บอสทั้ง 3 กลับมา Brute Justice ลงพร้อม J Storm\n"
         "Cruise Chaser กับ Alexander Prime เริ่มร่าย enrage ทันที\n"
         "Brute Justice ยิง J Wave (raid-wide) ราวทุก GCD และได้บัฟเพิ่มดาเมจ 1 stack ทุกครั้ง (สูงสุด 16)\n\n"
         "ฆ่าตามลำดับ\n"
         "1. Cruise Chaser (enrage ของมันเสร็จก่อน Brute Justice ถึง stack ที่ 8)\n"
         "2. Brute Justice (ถึงจะตี Alexander Prime ได้)\n"
         "3. Alexander Prime (invuln ตราบที่ Brute Justice / Cruise Chaser ยังอยู่ ถ้ามีเวลาสะสม gauge ไว้เปิด Perfect Alexander)\n\n"
         "mitigate ตาม stack\n"
         "หลัง 6 stack: MT 90s / ST 90s / H1 120s / H2 120s (ราวตอน Cruise Chaser ตาย)\n"
         "หลัง 8 stack: ST Reprisal / H2 30s / D2 / D3\n"
         "หลัง 10 stack: mitigate ที่เหลือทั้งหมด\n"
         "(มาโคร: หลัง 8 stack H2 30s + D3 + ST Reprisal / หลัง 10 stack MT Reprisal)\n\n"
         "Alexander Prime มี HP ขั้นต่ำ 1 ก่อน J Wave: ข้าม J Wave ไม่ได้",
         "All three bosses return, Brute Justice landing with J Storm\n"
         "Cruise Chaser and Alexander Prime start their enrages at once\n"
         "Brute Justice hits the party with J Wave (raid-wide) about every GCD, gaining a damage-up stack each time (max 16)\n\n"
         "Kill order\n"
         "1. Cruise Chaser (its enrage lands before Brute Justice's 8th stack)\n"
         "2. Brute Justice (this lets you damage Alexander Prime)\n"
         "3. Alexander Prime (invulnerable while the other two live; with time, build gauge for the Perfect Alexander opener)\n\n"
         "Mitigation by stacks\n"
         "After 6: MT 90s / ST 90s / H1 120s / H2 120s (around when Cruise Chaser dies)\n"
         "After 8: ST Reprisal / H2 30s / D2 / D3\n"
         "After 10: whatever is left\n"
         "(Macro: after 8 H2 30s + D3 + ST Reprisal / after 10 MT Reprisal)\n\n"
         "Alexander Prime has a 1 HP floor before J Waves: they can't be skipped",
         strict=False, refs=[FR("ap-jwave")])
    step(PH, "Divine Judgment", "Divine Judgment: Tank LB3", "Divine Judgment: tank LB3",
         "ฆ่า Alexander Prime แล้วเริ่มนับถอยหลัง Divine Judgment\n"
         "ถ้า Alexander ไม่ enrage รอดได้ด้วย Tank LB3 + mitigate\n"
         "Tank LB3 / H2 barrier / H2 30s\n"
         "กด Tank LB3 ตอนนับถอยหลังเหลือราว 4 วินาที\n"
         "จากนั้นเข้า Perfect Alexander",
         "When Alexander Prime dies a countdown to Divine Judgment starts\n"
         "If Alexander didn't enrage, it is survivable with a tank LB3 and mitigation\n"
         "Tank LB3 / H2 shields / H2 30s\n"
         "Tank LB3 at about 4 seconds left on the countdown\n"
         "Then on to Perfect Alexander",
         strict=False, refs=[FR("ap-divine")])
