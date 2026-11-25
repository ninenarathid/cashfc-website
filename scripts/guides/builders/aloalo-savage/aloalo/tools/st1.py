"""Setup, the first trash pack and boss 1 (Ketuduke): game8 573544."""
from core import step, FR
import sc1 as S1

P0 = ("เตรียมตัว", "Setup")
PT1 = ("ทางเดิน 1: ก่อนบอส 1", "Trash 1: before boss 1")
PB1 = ("บอส 1: Ketuduke", "Boss 1: Ketuduke")

LEGEND = ("ภาพ: วงฟ้า = คนติด Bubble Weave (ฟอง) / จุดเหลือง = คนติด Foamy Fetters (ตรึง)\n"
          "ไอคอนน้ำเงินมีกากบาท = Hydrofall (stack คู่) / ไอคอนน้ำเงินจุดขาว = Hydrobullet (spread)\n"
          "ส่วนสีแดงมีจุดชมพู 2 จุด = ลูกเต๋า 2 / ส่วนสีเทามีจุดขาว 1 จุด = ลูกเต๋า 1")
LEGEND_EN = ("Picture: blue bubble = a player with Bubble Weave / yellow dot = a player with Foamy Fetters\n"
             "Blue icon with an X = Hydrofall (pair stack) / blue icon with a white dot = Hydrobullet (spread)\n"
             "Red quarter with two pink dots = die 2 / grey quarter with one white dot = die 1")


def build():
    # ------------------------------------------------------------ setup
    step(P0, "Waymarks", "Marker บอส 1 และบอส 2", "Waymarks for bosses 1 and 2",
         "Marker ตามภาพของ game8 (บอส 1 และบอส 2):\nA เหนือ\nB ตะวันออก\nC ใต้\nD ตะวันตก\nวางกลางขอบสนามแต่ละด้าน\n\n"
         "สนามบอส 1 เป็นสี่เหลี่ยม 4×4 ช่อง (ภาพนี้) / สนามบอส 2 เป็นสี่เหลี่ยม 5×5 ช่อง\n"
         "บอส 3 สนามวงกลม ใช้ marker ตัวเลขด้วย (ขั้นถัดไป)",
         "Waymarks as game8 draws them (bosses 1 and 2):\nA north\nB east\nC south\nD west\nEach at the middle of its edge\n\n"
         "Boss 1's arena is a 4×4 square (this picture) / boss 2's is a 5×5 square\n"
         "Boss 3's arena is round and also uses the number waymarks (next step)",
         strict=False, scene=S1.S([], boss=S1.BOSS))
    step(P0, "Waymarks", "Marker บอส 3", "Waymarks for boss 3",
         "Marker ตามภาพของ game8 (บอส 3):\nA เหนือ / B ตะวันออก / C ใต้ / D ตะวันตก\n1 ตะวันออกเฉียงเหนือ\n2 ตะวันออกเฉียงใต้\n3 ตะวันตกเฉียงใต้\n4 ตะวันตกเฉียงเหนือ\nใช้ marker ตัวเลขใน Present Box",
         "Waymarks as game8 draws them (boss 3):\nA north / B east / C south / D west\n1 north-east\n2 south-east\n3 south-west\n4 north-west\nThe number waymarks are used in Present Box",
         strict=False, scene=__import__("sc3").S([], wm=True))



def trash1():
    step(PT1, "Kill order", "ลำดับการฆ่า", "Kill order",
         "ศัตรูชุดก่อนบอส 1 ฆ่าตามลำดับนี้:\n1. Aloalo Kiwakin\n2. Aloalo Snipper และ Aloalo Crab\n3. Aloalo Ray และ Aloalo Paddle Biter\n4. Aloalo Monk\n\n"
         "Savage: game8 บอกว่าศัตรูทางเดินตีแรงกว่า Another มาก",
         "Kill the pack before boss 1 in this order:\n1. Aloalo Kiwakin\n2. Aloalo Snipper and Aloalo Crab\n3. Aloalo Ray and Aloalo Paddle Biter\n4. Aloalo Monk\n\n"
         "Savage: game8 says the trash hits far harder than in Another",
         refs=[FR("trash1-pack", "v1", 26, "ศัตรูชุดแรก: ฆ่า Kiwakin ก่อน แล้วตามลำดับ", "The first pack: Kiwakin first, then the rest in order")])
    step(PT1, "Tornadoes", "พายุหมุนในสนาม", "Tornadoes on the field",
         "เข้าสนามแล้วมีพายุหมุน (tornado) หลายลูก\nโดนแล้วดาเมจแรง + knockback เล็กน้อย\n"
         "พายุหมุนวิ่งตัดกันบ่อย: ระวังตำแหน่ง อย่าให้โดนติดกัน 2 ลูก",
         "Several tornadoes appear once you enter\nA hit deals heavy damage + a small knockback\n"
         "They often cross each other: mind where you stand so you don't take two in a row",
         refs=[FR("trash1-tornado", "v1", 36, "พายุหมุน: โดนแล้วดาเมจแรง + knockback ระวังโดนติดกัน 2 ลูก", "Tornado: heavy damage + knockback; don't take two in a row")])
    step(PT1, "Aloalo Kiwakin", "ท่าของ Aloalo Kiwakin", "Aloalo Kiwakin's attacks",
         "Lead Hook / Sharp Strike: tank buster\nTail Screw: AoE วงกลมเล็ก ตั้งแต่ใกล้ตัวมันไปจนถึงด้านหน้า",
         "Lead Hook / Sharp Strike: tank busters\nTail Screw: small circle AoEs from near it to its front",
         refs=[FR("trash1-kiwakin", "v1", 20, "Aloalo Kiwakin: Sharp Strike = tank buster ใส่ Tank", "Aloalo Kiwakin: Sharp Strike, a tank buster on the tank")])
    step(PT1, "Aloalo Snipper", "ท่าของ Aloalo Snipper", "Aloalo Snipper's attacks",
         "Water III: stack\nBubble Shower: AoE กรวยด้านหน้า\nCrab Dribble: AoE กรวยด้านหลัง",
         "Water III: a stack\nBubble Shower: a cone to its front\nCrab Dribble: a cone to its back",
         refs=[FR("trash1-snipper", "v1", 40, "Aloalo Snipper: Water III = stack / Bubble Shower กรวยหน้า / Crab Dribble กรวยหลัง", "Aloalo Snipper: Water III stack / Bubble Shower front cone / Crab Dribble back cone")])
    step(PT1, "Aloalo Ray", "ท่าของ Aloalo Ray", "Aloalo Ray's attacks",
         "Hydrocannon: AoE แนวตรง\nExpulsion: AoE วงกลมรอบตัวมัน\nElectric Whorl: AoE donut",
         "Hydrocannon: a line AoE\nExpulsion: a circle around itself\nElectric Whorl: a donut",
         refs=[FR("trash1-ray", "v1", 56, "Aloalo Ray: Electric Whorl = AoE donut รอบตัว", "Aloalo Ray: Electric Whorl, a donut around it")])
    step(PT1, "Aloalo Monk", "ท่าของ Aloalo Monk", "Aloalo Monk's attacks",
         "Hydroshot: knockback ใส่ 1 คน + ติด debuff Dropsy (DoT น้ำ)\nCross Attack: tank buster",
         "Hydroshot: knocks one player back + Dropsy (a water DoT)\nCross Attack: a tank buster",
         refs=[FR("trash1-monk", "v1", 74, "Aloalo Monk: ฆ่าเป็นตัวสุดท้าย ระวัง Cross Attack (tank buster)", "Aloalo Monk: killed last; watch for Cross Attack (tank buster)")])


def boss1():
    TR = "Tidal Roar"
    step(PB1, TR, "raid-wide + DoT", "Raid-wide + DoT",
         "raid-wide + ติด DoT Dropsy (น้ำ)\nใช้ mitigate และ barrier ให้เต็มที่",
         "A raid-wide that leaves Dropsy (a water DoT)\nUse mitigation and barriers fully",
         refs=[FR("tidal-roar", "v1", 110, "Tidal Roar: raid-wide + DoT ใช้ mitigate + barrier", "Tidal Roar: raid-wide + DoT; mitigate + barriers")])

    SC = "Spring Crystals → Fluke Gale"
    step(PB1, SC, "ภาพรวม", "Overview",
         "1. Spring Crystals: คริสตัลหล่นลงหลายก้อนทั่วสนาม\n"
         "2. Bubble Net: ทุกคนติด debuff Foamy Fetters (ตรึง) หรือ Bubble Weave (ฟอง)\n"
         "3. ทุกคนติด debuff Hydrofall (stack คู่) หรือ Hydrobullet (spread) อย่างใดอย่างหนึ่ง\n"
         "4. สนามแบ่งเป็น 4 ส่วนใหญ่ แต่ละส่วนมีลูกเต๋า 1 หรือ 2\n"
         "5. Fluke Gale ทำงานตามลูกเต๋า 1 แล้ว 2: ลมพัดคริสตัลเลื่อนไป\n\n"
         "รับ stack / spread ในจุดปลอดภัยที่เกิดขึ้น",
         "1. Spring Crystals: crystals drop all over the arena\n"
         "2. Bubble Net: everyone gets Foamy Fetters (bind) or Bubble Weave (bubble)\n"
         "3. Everyone gets either Hydrofall (pair stack) or Hydrobullet (spread)\n"
         "4. The arena splits into 4 big quarters, each with a die of 1 or 2\n"
         "5. Fluke Gale goes off on die 1, then die 2: the wind moves the crystals\n\n"
         "Take the stack / spread in the safe spots that are left",
         refs=[FR("fluke-gale", "v1", 170, "Fluke Gale: พื้นแบ่ง 4 ส่วนตามลูกเต๋า ลมพัดคริสตัลและคนติดฟอง", "Fluke Gale: the floor splits into quarters by die; the wind moves crystals and bubbled players")])
    step(PB1, SC, "debuff ของ Mechanic นี้", "The debuffs",
         "Foamy Fetters (ตรึง): หมดเวลาแล้วถูกตรึงอยู่กับที่\n"
         "Bubble Weave (ฟอง): หมดเวลาแล้วถูกฟองห่อลอยขึ้น ลมของ Fluke Gale พัดให้เลื่อนไปเอง\n"
         "Hydrobullet (spread): หมดเวลาแล้ว AoE วงกลมใหญ่ลงที่ตัว\n"
         "Hydrofall (stack คู่): หมดเวลาแล้ว stack คู่ลงที่ตัว",
         "Foamy Fetters (bind): when it runs out you're held in place\n"
         "Bubble Weave (bubble): when it runs out a bubble lifts you up, and Fluke Gale's wind carries you\n"
         "Hydrobullet (spread): when it runs out a big circle lands on you\n"
         "Hydrofall (pair stack): when it runs out a pair stack lands on you",
         refs=[FR("bubble-net", "v1", 124, "Bubble Net: ทุกคนติดฟองหรือตรึง ดู debuff ของตัวเอง", "Bubble Net: everyone is bubbled or bound; check your own debuff")])
    step(PB1, SC, "วิธีของ Soryu: จุดเริ่ม", "Soryu's way: where to start",
         "game8 แนะนำวิธีของ Soryu (มีวิดีโออธิบาย):\nไม่ต้องคิดว่าจุดปลอดภัยเกิดที่ไหน\n"
         "ดูแค่รูปแบบคริสตัลที่หล่นลงมาตอนแรก + debuff ของตัวเอง แล้วไปยืนตามจุด\n\n"
         "จุดเริ่ม: MT·D2 ฝั่งเหนือ / H1·D1 ฝั่งใต้",
         "game8 recommends Soryu's way (there is a video of it):\nno need to work out where the safe spots appear\n"
         "Read only the crystals' first pattern + your own debuff, and go to your spot\n\n"
         "Start: MT·D2 on the north side / H1·D1 on the south side",
         strict=True, pic="b1-06", scene=S1.soryu_start(),
         says={"MT": "ฝั่งเหนือ คู่กับ D2", "D2": "ฝั่งเหนือ คู่กับ MT", "H1": "ฝั่งใต้ คู่กับ D1", "D1": "ฝั่งใต้ คู่กับ H1"},
         says_en={"MT": "North side, with D2", "D2": "North side, with MT", "H1": "South side, with D1", "D1": "South side, with H1"})
    step(PB1, SC, "รูปแบบคริสตัล A", "Crystal pattern A",
         "รูปแบบ A: มี 2 คอลัมน์ (แนวตั้ง) ที่มีคริสตัลคอลัมน์ละ 2 ก้อน",
         "Pattern A: two columns each hold two crystals",
         strict=False, pic="b1-07", scene=S1.pattern_a())
    step(PB1, SC, "รูปแบบคริสตัล B", "Crystal pattern B",
         "รูปแบบ B: ทุกคอลัมน์ (แนวตั้ง) มีคริสตัลคอลัมน์ละ 1 ก้อน",
         "Pattern B: every column holds one crystal",
         strict=False, pic="b1-08", scene=S1.pattern_b())
    step(PB1, SC, "รูปแบบ A + stack", "Pattern A + stack",
         "Bubble Weave: ยืนข้างคริสตัลที่วางนอน ในส่วนที่เป็นลูกเต๋า 1\n"
         "Foamy Fetters: เลื่อนจากคน Bubble Weave ไปทางเหนือหรือใต้ 1 ช่อง\n\n" + LEGEND,
         "Bubble Weave: beside a lying crystal, in a die-1 quarter\n"
         "Foamy Fetters: one tile north or south of the Bubble Weave player\n\n" + LEGEND_EN,
         strict=False, pic="b1-09", scene=S1.a_stack())
    step(PB1, SC, "รูปแบบ A + spread", "Pattern A + spread",
         "Bubble Weave: ยืนข้างคริสตัลที่วางนอน ในส่วนที่เป็นลูกเต๋า 1\n"
         "Foamy Fetters: เลื่อนจากคน Bubble Weave ไปทางเหนือหรือใต้ 1 ช่อง แล้วเลื่อนไปด้านข้างอีก 2 ช่อง\n\n" + LEGEND,
         "Bubble Weave: beside a lying crystal, in a die-1 quarter\n"
         "Foamy Fetters: one tile north or south of the Bubble Weave player, then two tiles sideways\n\n" + LEGEND_EN,
         strict=False, pic="b1-10", scene=S1.a_spread())
    step(PB1, SC, "รูปแบบ B + stack", "Pattern B + stack",
         "Bubble Weave: ยืนข้างคริสตัลที่วางนอน ในส่วนที่เป็นลูกเต๋า 1\n"
         "Foamy Fetters: ยืนบนช่องของคริสตัลที่วางนอน (ข้างคน Bubble Weave)\n\n" + LEGEND,
         "Bubble Weave: beside a lying crystal, in a die-1 quarter\n"
         "Foamy Fetters: on the lying crystal's tile (next to the Bubble Weave player)\n\n" + LEGEND_EN,
         strict=False, pic="b1-11", scene=S1.b_stack())
    step(PB1, SC, "รูปแบบ B + spread", "Pattern B + spread",
         "Bubble Weave: ยืนข้างคริสตัลที่วางนอน ในส่วนที่เป็นลูกเต๋า 1\n"
         "Foamy Fetters: ไปสุดแถว (แนวนอน) เดียวกับคน Bubble Weave\n\n" + LEGEND,
         "Bubble Weave: beside a lying crystal, in a die-1 quarter\n"
         "Foamy Fetters: to the far end of the Bubble Weave player's row\n\n" + LEGEND_EN,
         strict=False, pic="b1-12", scene=S1.b_spread())
    step(PB1, SC, "สรุปจำง่าย", "The short version",
         "คำแนะนำของ game8:\n"
         "Bubble Weave: ทุกรูปแบบ ยืนข้างคริสตัลที่วางนอน\n"
         "Foamy Fetters รูปแบบ A: ส่วนใหญ่เลื่อนจากคน Bubble Weave ไปเหนือหรือใต้ 1 ช่อง\n"
         "Foamy Fetters รูปแบบ B: อยู่แถวแนวนอนเดียวกับคน Bubble Weave",
         "game8's tip:\n"
         "Bubble Weave: in every pattern, beside a lying crystal\n"
         "Foamy Fetters, pattern A: mostly one tile north or south of the Bubble Weave player\n"
         "Foamy Fetters, pattern B: on the same row as the Bubble Weave player")

    BB = "Hydrofall / Hydrobullet + Blowing Bubbles"
    step(PB1, BB, "ภาพรวม", "Overview",
         "ร่ายแรกเป็น Hydrobullet: spread ก่อน แล้ว stack\nร่ายแรกเป็น Hydrofall: stack ก่อน แล้ว spread\n\n"
         "พร้อมกันนั้น ฟองลอยเข้ามาเป็นแนวตรงจากขอบสนาม: โดนแล้วถูกตรึง (bind)\n"
         "หลบฟอง แล้วรับ stack และ spread ในจุดปลอดภัย รวม 2 รอบ",
         "If the first cast is Hydrobullet: spread first, then stack\nIf it is Hydrofall: stack first, then spread\n\n"
         "Meanwhile bubbles float in straight lines from the edge: touching one binds you\n"
         "Dodge the bubbles and take the stack and the spread in the safe spots, two rounds",
         refs=[FR("blowing-bubbles", "v1", 446, "Blowing Bubbles: ฟองลอยเป็นแนวตรงจากขอบ โดนแล้วถูกตรึง", "Blowing Bubbles: bubbles float in lines from the edge; touching one binds you")])
    PAIR = {"MT": "คู่ MT·D2", "D2": "คู่ MT·D2", "H1": "คู่ H1·D1", "D1": "คู่ H1·D1"}
    PAIR_EN = {"MT": "Pair MT·D2", "D2": "Pair MT·D2", "H1": "Pair H1·D1", "D1": "Pair H1·D1"}
    step(PB1, BB, "stack ก่อน ①: ร่าย Hydrofall", "Stack first ①: Hydrofall is cast",
         "ร่าย Hydrofall: stack ก่อน\nMT·D2 ใช้ฝั่งเหนือ / H1·D1 ใช้ฝั่งใต้",
         "Hydrofall is cast: the stack comes first\nMT·D2 use the north side / H1·D1 the south side",
         strict=True, pic="b1-14", scene=S1.bb_stack1(), says=PAIR, says_en=PAIR_EN)
    step(PB1, BB, "stack ก่อน ②: วาง AoE + หลบฟองเป็นคู่", "Stack first ②: drop the AoEs, dodge as pairs",
         "วาง AoE ทิ้ง และหลบฟองที่ลอยมาจากขอบ: เดินไปเป็นคู่\nฝั่ง MT·D2: เดินไล่ตามหลังฟองที่เพิ่งลอยผ่านไป",
         "Drop the AoEs and dodge the bubbles from the edge, moving as pairs\nThe MT·D2 side: follow behind the bubbles that have just passed",
         strict=True, pic="b1-15", scene=S1.bb_stack2(), says=PAIR, says_en=PAIR_EN)
    step(PB1, BB, "stack ก่อน ③: stack ลง แล้ว spread", "Stack first ③: the stack, then spread",
         "stack ลง\nจากนั้นสายตีไกลถอยห่างจากบอส / สายตีใกล้เข้าใกล้บอส แล้ว spread\nภาพ: D2 กับ H1 ไปขอบสนาม / MT กับ D1 อยู่ใกล้บอส",
         "The stack goes off\nThen the ranged move away from the boss / the melee close in, and spread\nPicture: D2 and H1 go to the edge / MT and D1 stay near the boss",
         strict=False, pic="b1-16", scene=S1.bb_stack3())
    step(PB1, BB, "stack ก่อน ④: AoE spread ลง", "Stack first ④: the spread goes off",
         "AoE spread ลง: วงใหญ่มาก ทุกคนพยายามอยู่ห่างกันให้มากที่สุด",
         "The spread goes off: the circles are very big, so keep as far apart as you can",
         strict=False, pic="b1-17", scene=S1.bb_stack4())
    step(PB1, BB, "spread ก่อน ①: ร่าย Hydrobullet", "Spread first ①: Hydrobullet is cast",
         "ร่าย Hydrobullet: spread ก่อน\nทั้ง 4 คนแยกไปคนละทิศ หลบฟอง",
         "Hydrobullet is cast: the spread comes first\nAll four split to their own directions while dodging the bubbles",
         strict=False, pic="b1-18", scene=S1.bb_spread1())
    step(PB1, BB, "spread ก่อน ②: วาง AoE + หลบฟอง", "Spread first ②: drop the AoEs, dodge",
         "วาง AoE ทิ้ง พร้อมหลบฟอง", "Drop the AoEs while dodging the bubbles",
         strict=False, pic="b1-19", scene=S1.bb_spread2())
    step(PB1, BB, "spread ก่อน ③: AoE spread ลง", "Spread first ③: the spread goes off",
         "AoE spread ลง", "The spread goes off",
         strict=False, pic="b1-20", scene=S1.bb_spread3())
    step(PB1, BB, "spread ก่อน ④: กลับมารวม stack", "Spread first ④: regroup for the stack",
         "ต่อด้วย stack: กลับมารวมคู่\nMT·D2 ฝั่งเหนือ / H1·D1 ฝั่งใต้",
         "The stack is next: regroup in pairs\nMT·D2 north / H1·D1 south",
         strict=True, pic="b1-21", scene=S1.bb_spread4(), says=PAIR, says_en=PAIR_EN)

    TW = "Hydrofall + Strewn Bubbles → Twintides"
    step(PB1, TW, "ภาพรวม", "Overview",
         "รอบนี้ได้ debuff stack เสมอ\nกระแสน้ำจากขอบสนามพุ่งตรงเข้ามา 2 ช่อง\n\n"
         "พร้อมกันนั้น บอสใช้อย่างใดอย่างหนึ่ง:\n"
         "Receding Twintides: AoE วงกลมรอบตัวบอสก่อน แล้ว donut (game8 เรียกแบบ Round → Ring)\n"
         "Encroaching Twintides: AoE donut ก่อน แล้ววงกลมรอบตัวบอส (แบบ Ring → Round)",
         "This one always gives a stack\nWater flows run two tiles straight in from the edge\n\n"
         "At the same time the boss uses one of:\n"
         "Receding Twintides: a circle around the boss first, then a donut (game8: Round → Ring)\n"
         "Encroaching Twintides: a donut first, then the circle around the boss (Ring → Round)",
         refs=[FR("twintides-round", "v1", 556, "Twintides: กระแสน้ำ 2 ช่องจากขอบ + วงกลมรอบบอส ดูว่าวงกลมหรือ donut ก่อน", "Twintides: two-tile water flows + the boss's circle; see whether circle or donut comes first")])
    step(PB1, TW, "Round → Ring ①: กระแสน้ำโผล่", "Round → Ring ①: the flows appear",
         "กระแสน้ำโผล่ที่ขอบเหนือและใต้ (มีแบบตะวันออก-ตะวันตกด้วย)",
         "Water flows appear on the north and south edges (they can come from east and west too)",
         strict=True, pic="b1-22", scene=S1.tw_start(), says=PAIR, says_en=PAIR_EN)
    step(PB1, TW, "Round → Ring ②: วงกลมก่อน ออกห่างบอส", "Round → Ring ②: circle first, stay out",
         "Receding Twintides: วงกลมรอบบอสลงก่อน ช่วงแรกออกห่างบอส\nยืนเป็นคู่ในช่องที่ไม่โดนกระแสน้ำ",
         "Receding Twintides: the circle around the boss comes first, so start away from it\nStand in pairs on tiles the water misses",
         strict=True, pic="b1-23", scene=S1.tw_round1(), says=PAIR, says_en=PAIR_EN)
    step(PB1, TW, "Round → Ring ③: donut ตาม เข้าใกล้บอส", "Round → Ring ③: the donut follows, close in",
         "วงกลมลงแล้ว donut ตามมาทันที: เข้าใกล้บอส\nstack ลงพร้อมกัน",
         "Right after the circle the donut comes: close in on the boss\nThe stacks go off at the same time",
         strict=True, pic="b1-24", scene=S1.tw_ring1(), says=PAIR, says_en=PAIR_EN)
    step(PB1, TW, "Ring → Round ①: กระแสน้ำโผล่", "Ring → Round ①: the flows appear",
         "เหมือนแบบแรก: กระแสน้ำโผล่ที่ขอบ", "As before: water flows appear at the edge",
         strict=True, pic="b1-22", scene=S1.tw_start(), says=PAIR, says_en=PAIR_EN)
    step(PB1, TW, "Ring → Round ②: donut ก่อน เข้าใกล้บอส", "Ring → Round ②: donut first, close in",
         "Encroaching Twintides: donut ลงก่อน ช่วงแรกเข้าใกล้บอส",
         "Encroaching Twintides: the donut comes first, so start close to the boss",
         strict=True, pic="b1-25", scene=S1.tw_ring2(), says=PAIR, says_en=PAIR_EN)
    step(PB1, TW, "Ring → Round ③: วงกลมตาม ออกห่างบอส", "Ring → Round ③: the circle follows, get out",
         "donut ลงแล้ว วงกลมรอบบอสตามมาทันที: ออกห่างบอส\nstack ลงพร้อมกัน",
         "Right after the donut the circle around the boss comes: get away from it\nThe stacks go off at the same time",
         strict=True, pic="b1-26", scene=S1.tw_round2(), says=PAIR, says_en=PAIR_EN)
    step(PB1, TW, "กระแสน้ำมาจากด้านข้าง", "Flows from the sides",
         "ถ้ากระแสน้ำมาจากด้านข้าง (ตะวันออก-ตะวันตก):\nจากจุดเริ่ม หมุนทวนเข็ม ไปรับที่ฝั่งตะวันออกและตะวันตก",
         "If the flows come from the sides (east and west):\nfrom the start, turn anticlockwise and take it on the east and west sides",
         strict=True, pic="b1-27", scene=S1.tw_side(), says=PAIR, says_en=PAIR_EN)

    RO = "Hydrobullet → Roar → Spring Crystals"
    step(PB1, RO, "ภาพรวม + ลำดับ", "Overview + priority",
         "Spring Crystals สร้างจุดปลอดภัย 4 จุด: รับ Hydrobullet (spread) ในจุดนั้น\n"
         "Roar เรียกศัตรู 4 ตัว: ล่อการโจมตีของทั้ง 4 ตัวให้หันออกนอกสนาม\n\n"
         "ทุกคนติด debuff Bubble Weave (ฟอง) หรือ Foamy Fetters (ตรึง)\n"
         "ศัตรูที่มีฟอง: คน Foamy Fetters ล่อ\nศัตรูที่ไม่มีฟอง: คน Bubble Weave ล่อ\n\n"
         "ลำดับ (จากเหนือตามเข็ม): MT > D1 > D2 > H1\n"
         "คน debuff เดียวกันเทียบลำดับกัน แล้วไปจุดปลอดภัยใกล้ศัตรูที่ตัวเองต้องล่อ",
         "Spring Crystals leaves 4 safe spots: take Hydrobullet (spread) in them\n"
         "Roar calls 4 adds: bait all four so their attacks face out of the arena\n\n"
         "Everyone has Bubble Weave (bubble) or Foamy Fetters (bind)\n"
         "An add with a bubble: baited by a Foamy Fetters player\nAn add without one: baited by a Bubble Weave player\n\n"
         "Priority (clockwise from north): MT > D1 > D2 > H1\n"
         "Players with the same debuff compare places, then go to the safe spot near the add they bait",
         refs=[FR("roar-adds", "v1", 664, "Roar: ศัตรู 4 ตัวโผล่รอบบอส ดูว่าตัวไหนมีฟอง", "Roar: four adds appear around the boss; see which have bubbles")])
    step(PB1, RO, "จุดปลอดภัย แบบที่ 1", "Safe spots, layout 1",
         "game8 แบ่งจุดปลอดภัยเป็น 3 แบบตามคริสตัลที่หล่นลง\nแบบที่ 1: สีส้ม = โดน AoE คริสตัล",
         "game8 sorts the safe spots into 3 layouts by where the crystals land\nLayout 1: orange = hit by the crystals",
         strict=False, pic="b1-28", scene=S1.roar_safe_vert())
    step(PB1, RO, "จุดปลอดภัย แบบที่ 2", "Safe spots, layout 2",
         "แบบที่ 2: สีส้ม = โดน AoE คริสตัล", "Layout 2: orange = hit by the crystals",
         strict=False, pic="b1-29", scene=S1.roar_safe_horiz())
    step(PB1, RO, "จุดปลอดภัย แบบที่ 3: 4 มุม", "Safe spots, layout 3: the corners",
         "แบบที่ 3: ปลอดภัยที่ 4 มุม", "Layout 3: the four corners are safe",
         strict=False, pic="b1-30", scene=S1.roar_safe_corner())
    step(PB1, RO, "① ติด Hydrobullet", "① Hydrobullet goes on",
         "ทุกคนติด debuff Hydrobullet (spread)", "Everyone gets Hydrobullet (spread)",
         strict=True, pic="b1-31", scene=S1.roar1())
    step(PB1, RO, "② Roar: ศัตรูโผล่", "② Roar: the adds appear",
         "Roar: ศัตรูโผล่ 4 ตัว (เหนือ / ใต้ / ตะวันออก / ตะวันตก)", "Roar: four adds appear (north / south / east / west)",
         strict=True, pic="b1-32", scene=S1.roar2())
    step(PB1, RO, "③ คริสตัลหล่น: ดูจุดปลอดภัย", "③ Crystals land: find the safe spots",
         "Spring Crystals: คริสตัลหล่นลง รีบดูว่าจุดปลอดภัยเกิดที่ไหน\nภาพนี้เป็นแบบ 4 มุม",
         "Spring Crystals: the crystals land; see quickly where the safe spots are\nThis picture is the corners layout",
         strict=True, pic="b1-33", scene=S1.roar3())
    step(PB1, RO, "④ Bubble Net: รู้ว่าล่อตัวไหน", "④ Bubble Net: know your add",
         "Bubble Net: ติด debuff ตรึงหรือฟอง รู้แล้วว่าต้องล่อศัตรูตัวไหน: ไปจุดปลอดภัยตามลำดับ\nภาพ: ศัตรูเหนือ-ใต้มีฟอง",
         "Bubble Net: with bind or bubble on you, you now know which add is yours: go to your safe spot by priority\nPicture: the north and south adds have bubbles",
         strict=False, pic="b1-34", scene=S1.roar4())
    step(PB1, RO, "⑤ ไปจุดปลอดภัยถัดไปตามเข็ม", "⑤ The next safe spot clockwise",
         "หลักคือไปจุดปลอดภัยที่อยู่ถัดจากศัตรูที่ต้องล่อ ไปทางตามเข็ม 1 จุด",
         "As a rule, go to the safe spot one step clockwise from the add you bait",
         strict=False, pic="b1-35", scene=S1.roar5())
    step(PB1, RO, "⑥ รีบไปหาศัตรูที่ต้องล่อ", "⑥ Hurry to your add",
         "AoE คริสตัลลงแล้ว รีบไปหาศัตรูที่ต้องล่อทันที\nเวลาน้อยมาก: ใช้ Sprint ได้",
         "Once the crystals go off, go straight to your add\nThere is very little time: Sprint is fine",
         strict=False, pic="b1-36", scene=S1.roar6())
    step(PB1, RO, "⑦ หันการโจมตีออกนอกสนาม", "⑦ Point the attacks outward",
         "ทุกคนหันการโจมตีของศัตรูออกนอกสนามได้: ผ่าน", "Everyone has turned their add's attack out of the arena: done",
         strict=False, pic="b1-37", scene=S1.roar7())

    step(PB1, "Hydrofall / Hydrobullet → Angry Seas", "knockback + stack / spread", "Knockback + stack / spread",
         "knockback ออกซ้าย-ขวาจากกลางสนาม + stack คู่ → spread หรือ spread → stack คู่\n\n"
         "ถ้า stack ก่อน: ใช้ Surecast / Arm's Length กัน knockback แล้วรับ stack\nจากนั้นแยก 4 ทิศรับ AoE ใหญ่\n\n"
         "AoE ใหญ่มาก: ตอน spread ต้องอยู่ห่างจากทุกคน",
         "A knockback left and right from the middle + pair stack → spread, or spread → pair stack\n\n"
         "If the stack is first: Surecast / Arm's Length against the knockback, take the stack\nthen split four ways for the big AoEs\n\n"
         "The AoEs are very big: when spreading, keep away from everyone",
         refs=[FR("angry-seas", "v1", 738, "Angry Seas: knockback ออกซ้าย-ขวาจากกลางสนาม ใช้ Surecast / Arm's Length", "Angry Seas: knockback left and right from the middle; use Surecast / Arm's Length")])

    TY = "Spring Crystals → Fluke Typhoon (towers)"
    step(PB1, TY, "ภาพรวม + ลำดับ", "Overview + priority",
         "ก่อนหน้านี้มี Hydrofall / Hydrobullet\nคริสตัลหล่นลงฝั่งตะวันออกหรือตะวันตก\n"
         "ฝั่งที่มีคริสตัลมี tower 1 อัน / อีกฝั่งมี tower 3 อัน\n"
         "1 คนเข้าฟองให้ลมพัดข้ามไปอีกฝั่ง: เหยียบ tower ครบ 4 อัน\n\n"
         "ลำดับเข้า tower (จากเหนือ): MT > D1 > D2 > H1\nคนที่เข้าฟองลอยข้ามไป: DPS ตกลงกันเอง",
         "Hydrofall / Hydrobullet come first\nThe crystals land on the east or the west side\n"
         "The crystal side gets 1 tower / the other side gets 3\n"
         "One player rides a bubble across on the wind, so all 4 towers are taken\n\n"
         "Tower priority (from the north): MT > D1 > D2 > H1\nWho rides the bubble across: the DPS settle it",
         refs=[FR("fluke-typhoon", "v1", 874, "Fluke Typhoon: tower โผล่ 2 ฝั่ง เข้าฟองเพื่อให้ลมพัดข้าม", "Fluke Typhoon: towers on both sides; ride a bubble to cross on the wind")])
    step(PB1, TY, "① แยกคู่ตะวันตก-ตะวันออก", "① Split into pairs, west and east",
         "แยกเป็นคู่: MT·D2 ฝั่งตะวันตก / H1·D1 ฝั่งตะวันออก", "Split into pairs: MT·D2 west / H1·D1 east",
         strict=True, pic="b1-38", scene=S1.ty1(),
         says={"MT": "ฝั่งตะวันตก คู่กับ D2", "D2": "ฝั่งตะวันตก คู่กับ MT", "H1": "ฝั่งตะวันออก คู่กับ D1", "D1": "ฝั่งตะวันออก คู่กับ H1"},
         says_en={"MT": "West side, with D2", "D2": "West side, with MT", "H1": "East side, with D1", "D1": "East side, with H1"})
    step(PB1, TY, "② กัน knockback + รับ stack", "② Hold the knockback, take the stack",
         "ใช้ Arm's Length / Surecast กัน knockback แล้วรับ stack", "Arm's Length / Surecast against the knockback, then take the stack",
         strict=True, pic="b1-39", scene=S1.ty2(),
         says={"MT": "ฝั่งตะวันตก คู่กับ D2", "D2": "ฝั่งตะวันตก คู่กับ MT", "H1": "ฝั่งตะวันออก คู่กับ D1", "D1": "ฝั่งตะวันออก คู่กับ H1"},
         says_en={"MT": "West side, with D2", "D2": "West side, with MT", "H1": "East side, with D1", "D1": "East side, with H1"})
    step(PB1, TY, "③ spread ตามมาทันที", "③ The spread follows at once",
         "stack แล้ว spread ตามมาทันที: ถอยไปทาง 4 มุม", "Right after the stack comes the spread: back off toward the four corners",
         strict=False, pic="b1-40", scene=S1.ty3())
    step(PB1, TY, "④ คริสตัลหล่นฝั่งเดียว", "④ Crystals land on one side",
         "Spring Crystals: คริสตัลหล่นฝั่งเดียว (ตะวันออกหรือตะวันตก)\nฝั่งที่ไม่มีคริสตัลมี tower 3 อัน: คนฝั่งตะวันตก 1 คนต้องไปฝั่งตะวันออก",
         "Spring Crystals: the crystals land on one side (east or west)\nThe side without crystals gets 3 towers: one player from the west must go east",
         strict=False, pic="b1-41", scene=S1.ty4())
    step(PB1, TY, "⑤ Bubble Net: ฟองโผล่", "⑤ Bubble Net: bubbles appear",
         "Bubble Net: ฟองเกิดขึ้น", "Bubble Net: the bubbles appear",
         strict=False, pic="b1-42", scene=S1.ty5())
    step(PB1, TY, "⑥ Fluke Typhoon: ของในฟองจะเลื่อน", "⑥ Fluke Typhoon: bubbled things will move",
         "Fluke Typhoon: ของที่อยู่ในฟองจะเลื่อนไปหลังจากนี้", "Fluke Typhoon: whatever is in a bubble moves after this",
         strict=False, pic="b1-43", scene=S1.ty6())
    step(PB1, TY, "⑦ tower โผล่: 1 คนเข้าฟอง", "⑦ Towers appear: one rides a bubble",
         "tower โผล่\nภาพนี้ D2 (Range) เข้าฟองทางตะวันตกฝั่งใต้", "The towers appear\nIn this picture D2 (ranged) takes the south-west bubble",
         strict=False, pic="b1-44", scene=S1.ty7())
    step(PB1, TY, "⑧ รอดูระเบิด แล้วค่อยเข้า tower", "⑧ Watch the blasts, then take the towers",
         "Fluke Typhoon ทำงาน: คริสตัลฝั่งตะวันตกเลื่อนมาระเบิด ก่อนเข้า tower 2 อันบนฝั่งตะวันออก\n"
         "รอดูระเบิดก่อน แล้วค่อยเข้า tower\nใครเข้า tower ไหน: ตามลำดับ",
         "Fluke Typhoon goes off: the west crystals move over and explode before the two upper east towers can be taken\n"
         "Watch the blasts first, then step in\nWho takes which tower: by priority",
         strict=False, pic="b1-45", scene=S1.ty8())
    step(PB1, TY, "⑨ เข้า tower: จบ", "⑨ Into the towers: done",
         "เข้า tower ครบ: จบ Mechanic", "All towers taken: done",
         strict=False, pic="b1-46", scene=S1.ty9())
    step(PB1, "Spring Crystals → Strewn Bubbles → Tidal Roar", "หมดเวลา (enrage)", "Time's up (enrage)",
         "หลังจากนั้นบอสใช้ Spring Crystals (Mechanic แรก) และ Strewn Bubbles อีกครั้ง\nแล้วใช้ Tidal Roar: หมดเวลา (enrage)",
         "After this the boss uses Spring Crystals (its first Mechanic) and Strewn Bubbles again\nthen Tidal Roar: time's up (enrage)",
         refs=[FR("tidal-roar-enrage", "v1", 920, "Tidal Roar ครั้งสุดท้าย: หมดเวลา (enrage)", "The last Tidal Roar: time is up (enrage)")])
