"""P4 Perfect Alexander (04_perfect_alex), as Tuufless's Notes has it."""
import scenes_tea as S
from frames_list import FR

IMG = "https://ffxiv.tuufless.com/images/ultimates/tea/04/"
PH = ("P4 Perfect Alexander", "P4 Perfect Alexander")


def p4(step):
    FW = "The Final Word"
    step(PH, FW, "Light / Dark คืออะไร", "Light and Dark",
         "เริ่ม phase: MT ดึง aggro\n"
         "Perfect Alexander เปิดด้วย The Final Word แบ่งปาร์ตี้เป็น 2 ทีม: Light กับ Dark\n\n"
         "Contact Regulation = Light Beacon: ถ้าตาย คน Light ทุกคนตาย\n"
         "Contact Prohibition = Light: ถูกบังคับเดินเข้าหา Light Beacon แตะ Light Beacon แล้วตาย\n"
         "Escape Detection = Dark Beacon: ถ้าตาย คน Dark ทุกคนตาย\n"
         "Escape Prohibition = Dark: ถูกบังคับเดินหนี Dark Beacon ตายถ้าออกห่าง Dark Beacon เกิน หรือถูกพาชนกำแพง\n"
         "คน Dark ต้องรู้ว่าใครเป็น Dark Beacon: ยืนใกล้ (จะได้ไม่ห่างเกิน) และอยู่ฝั่งที่ถูก (จะได้ไม่ชนกำแพง)\n"
         "Light กับ Dark ไม่เกี่ยวกันเลย / โดน Divine Retribution = Light แตะ Light Beacon หรือ Dark ห่าง Dark Beacon เกิน\n\n"
         "ช่วงนี้เป็น 'tutorial' ของ phase แบ่งได้เป็น\n"
         "1. Ordained Stillness / Motion\n"
         "2. Forced March\n"
         "3. Ordained Motion / Stillness (อันที่ยังไม่มา)\n"
         "4. Stack / Spread\n"
         "5. Spread / Stack (อันที่ยังไม่มา)",
         "The MT takes aggro to start the phase\n"
         "Perfect Alexander opens with The Final Word, splitting the party into two teams: Light and Dark\n\n"
         "Contact Regulation = the Light Beacon: if it dies, every Light player dies\n"
         "Contact Prohibition = Light: marched towards the Light Beacon; touching it kills\n"
         "Escape Detection = the Dark Beacon: if it dies, every Dark player dies\n"
         "Escape Prohibition = Dark: marched away from the Dark Beacon; too far from it, or into a wall, kills\n"
         "Dark players must know who the Dark Beacon is: stay close (not too far) and on the right side (not into the wall)\n"
         "Light and Dark don't interact at all / Divine Retribution = a Light touched the Light Beacon or a Dark went too far from the Dark Beacon\n\n"
         "This 'tutorial' section blocks out as\n"
         "1. Ordained Stillness / Motion\n"
         "2. Forced March\n"
         "3. Ordained Motion / Stillness (whichever didn't come)\n"
         "4. Stack / Spread\n"
         "5. Spread / Stack (whichever didn't come)",
         strict=False, refs=[FR("pa-ordained")])
    FM = "Forced March"
    step(PH, FM, "Forced March: ตำแหน่ง", "Forced March: the spots",
         "ระหว่างเวลา Forced March นับถอยหลัง Perfect Alexander ร่าย Ordained Stillness หรือ Ordained Motion อย่างใดอย่างหนึ่ง\n"
         "Light Beacon: ตะวันตก\n"
         "Dark Beacon: ตะวันออก (marker B)\n"
         "คนที่เหลือ: เยื้องไปทางตะวันตกของ Dark Beacon นิดหนึ่ง\n"
         "ทิศเดิน: ตะวันออก → ตะวันตก\n\n"
         "เคารพ Stillness: เป็น meme ก็เพราะคนตายกันเยอะจริง\n"
         "เคล็ดลับ: ถ้ายังไปไม่ถึงตำแหน่งแล้ว Ordained Stillness มาก่อน ให้ทำ Stillness ก่อน ยังมีเวลาเข้าที่นิดหน่อยก่อน Forced March เริ่ม\n"
         "หลัง Forced March บอสใช้ Ordained Stillness / Motion อันที่ยังไม่มา\n\n"
         "ทำไมเดินตะวันออกไปตะวันตก ไม่ใช่ใต้ไปเหนือ: ให้ Dark Beacon อยู่ตำแหน่งเดียวกับ Fate Calibration β (ถ้าอยากได้ positional จริงๆ ให้ MT หันบอสไปตะวันตก แต่ไม่ค่อยดี)",
         "While the Forced March timers count down, Perfect Alexander casts either Ordained Stillness or Ordained Motion\n"
         "Light Beacon: west\n"
         "Dark Beacon: east (marker B)\n"
         "Everyone else: just west of the Dark Beacon\n"
         "March direction: east → west\n\n"
         "RESPECT STILLNESS: it's a meme for a reason\n"
         "Tip: if you can't reach your spot and Ordained Stillness comes first, resolve Stillness first; there is a little time before the march to finish getting there\n"
         "After the march the boss uses whichever of Stillness / Motion didn't come\n\n"
         "Why east to west, not south to north: it keeps the Dark Beacon where it stands for Fate Calibration β (for positionals the MT could face the boss west, but that's janky)",
         strict=False, pic=IMG + "forced_march_01.jpg", scene=S.forced_march_01(), refs=[FR("pa-march")])
    SS = "Stack / Spread"
    step(PH, SS, "Stack: 2 กลุ่ม ตะวันตก / ตะวันออก", "Stacks: west / east",
         "หลัง Forced March บอสใช้ stack กับ spread ธรรมดา ลำดับสุ่ม\n"
         "Stack: สุ่ม 2 คนได้มาร์ก stack (ไม่ได้แบ่ง Light กับ Dark: stack ช่วงนี้สุ่ม)\n"
         "ตะวันตก: H1 > D3 > D1 > MT\n"
         "ตะวันออก: H2 > D4 > D2 > ST\n"
         "ถ้ากลุ่มเดียวได้มาร์ก 2 อัน: ย้ายแค่คนเดียวไปอีกกลุ่ม แล้วรับแบบ 5-3 (มาโคร: คนลำดับต่ำกว่าเป็นคนย้าย)\n\n"
         "เคล็ดลับ: ใช้ mitigate ที่มีทั้งหมดตอน stack ยังไม่ต้องใช้อีกพักใหญ่ และช่วยให้รอดแม้แบ่ง 6-2",
         "After the march the boss does a simple stack and spread, in random order\n"
         "Stack: two random players get a stack marker (not Light vs. Dark: these stacks are random)\n"
         "West: H1 > D3 > D1 > MT\n"
         "East: H2 > D4 > D2 > ST\n"
         "If one group has both markers, only one player moves to the other group and you resolve it 5-3 (macro: the lower priority switches)\n\n"
         "Tip: use whatever mitigation you have for the stacks; you won't need it soon, and it lets you survive a 6-2",
         strict=True, pic=IMG + "forced_march_02.jpg", scene=S.forced_march_02())
    step(PH, SS, "Spread: ตำแหน่งตามมาโคร", "Spread: the macro's spots",
         "Spread ตามมาโครของแผน (ภาพวาดจากตัวหนังสือในมาโคร)\n"
         "แถวเหนือ: D3 MT D4\n"
         "แถวกลาง: H1 H2\n"
         "แถวใต้: D1 ST D2",
         "The spread from the plan's macro (drawn from its text layout)\n"
         "North row: D3 MT D4\n"
         "Middle row: H1 H2\n"
         "South row: D1 ST D2",
         strict=True, scene=S.p4_spread(), refs=[FR("pa-stack")])

    A = "Fate Calibration Alpha"
    step(PH, A, "ภาพรวม: ดูร่างโคลนของตัวเอง", "Overview: watch your clone",
         "ถ้าปาร์ตี้มีบัฟ Enigma Codex จาก phase ก่อน จะมีร่างโคลนโผล่ข้างทุกคน\n"
         "ลูกศรจากตัวเราชี้ไปหาโคลน / ลูกศรจากโคลนชี้มาหาเรา / มีเส้นจางๆ โยงเรากับโคลน\n"
         "Fate Calibration α และ β ไม่มีไอคอน debuff ในรายชื่อปาร์ตี้ และไม่มี cast bar\n"
         "โคลนแสดงท่าที่จะเกิดจริง: ดูโคลนของตัวเองว่าได้ debuff อะไร\n\n"
         "debuff ขึ้นตามลำดับที่จะเกิดจริง\n"
         "1. Ordained Stillness / Motion ครั้งที่ 1\n"
         "2. Defamation\n"
         "3. Shared Sentence + Aggravated Assault\n"
         "4. Ordained Stillness / Motion ครั้งที่ 2 + Sacrament 3 ครั้ง\n"
         "ทุกคนต้องจำ debuff ให้ได้จากเอฟเฟกต์ตอนมันเกิด",
         "With the Enigma Codex from the last phase, a clone appears next to each player\n"
         "An arrow from you points at your clone / an arrow from it points at you / a faint tether links you\n"
         "Fate Calibration α and β show no debuff icons in the party list and no cast bars\n"
         "The clones telegraph what will happen: watch YOUR clone to see what debuffs it gets\n\n"
         "They appear in the order they resolve\n"
         "1. Ordained Stillness / Motion #1\n"
         "2. Defamation\n"
         "3. Shared Sentence + Aggravated Assaults\n"
         "4. Ordained Stillness / Motion #2 + three Sacraments\n"
         "Everyone must recognise the debuffs by their visual effects",
         strict=False)
    step(PH, A, "debuff ของ α", "The α debuffs",
         "Ordained Stillness: ทั้งปาร์ตี้ต้องอยู่นิ่ง\n"
         "auto-attack นับเป็นการขยับ: Tank กับ Melee เก็บอาวุธ หรือเลิกเป้าบอสไว้ก่อน\n"
         "กำลังใช้สกิล channel (Flamethrower, Meditate, Improvisation) ไม่นับเป็นการขยับ / emote ก็ไม่นับ\n"
         "มี 3 คนที่เห็นสัญลักษณ์ แต่ใช้กับทั้งปาร์ตี้\n\n"
         "Ordained Motion: ทั้งปาร์ตี้ต้องขยับ\n"
         "การร่ายนับเป็นการขยับ แต่ช่วงหลังร่ายเสร็จก่อน GCD กลับมาไม่นับ (ระวังสกิล instant)\n"
         "สกิล channel ไม่นับเป็นการขยับ\n"
         "ขยับตัวไปมา หรือกระโดดซ้ำๆ ก็ได้ แต่อย่าทำทั้งสองอย่างพร้อมกัน โดยเฉพาะตอนใกล้ขอบ\n\n"
         "Defamation (1 คน): AoE ใหญ่มากรอบตัว ยืนหน้าโคลน Alexander ตัวที่ไม่ร่าย Sacrament (ลำแสงขาว) ซึ่งเป็น 1 ใน 2 ตัวตรงกลางเสมอ\n"
         "Shared Sentence (1 คน): แชร์ดาเมจกับ 3 คนที่ไม่มี debuff: stack ฝั่งตะวันตก\n"
         "Aggravated Assault (3 คน): ดาเมจเดี่ยว + ติด magic vulnerability: รวมกันฝั่งตะวันออก ห่าง Shared Sentence",
         "Ordained Stillness: the whole party must keep still\n"
         "Auto-attacks count as movement: tanks and melee sheathe or untarget the boss to be safe\n"
         "Being mid-channel (Flamethrower, Meditate, Improvisation) doesn't count / emotes don't either\n"
         "Three players get the indicator, but it applies to everyone\n\n"
         "Ordained Motion: the whole party must be moving\n"
         "Casting counts as movement, but the gap after a cast before the GCD is back does not (careful with instants)\n"
         "Channelled abilities don't count\n"
         "Wiggle around, or keep jumping, but don't do both, especially near the edge\n\n"
         "Defamation (1): a giant AoE on the player; stand in front of the Alexander clone that does NOT cast Sacrament (the white lasers), always one of the two middle clones\n"
         "Shared Sentence (1): shared with the three with no debuff: stack west\n"
         "Aggravated Assault (3): single-target damage + a magic vulnerability: stack together east, away from the Shared Sentence",
         strict=False)
    step(PH, A, "α: ตำแหน่งตอนเกิดจริง", "α: where to stand when it resolves",
         "Fate Calibration α ร่ายเสร็จ Perfect Alexander หายไป ท่าที่โคลนแสดงไว้เกิดจริง\n"
         "จุดปลอดภัยอยู่ตรงข้ามโคลน Perfect Alexander ตัวกลาง 1 ใน 2 ตัวเสมอ\n"
         "Shared Sentence: ซ้าย\n"
         "ไม่มี debuff: ซ้าย\n"
         "Aggravated Assault: ขวา\n"
         "(มาโคร: ตะวันตก Shared Sentence + ไม่มี debuff / ตะวันออก Aggravated Assault)\n\n"
         "ดูฝั่งปลอดภัยจาก Sacrament ยังไงอีก: โคลนตัวกลางตัวหนึ่งมีท่าร่ายสั้นๆ ตัวนั้นไม่ยิง Sacrament เป็นจุดปลอดภัยของคน Defamation",
         "When Fate Calibration α finishes, Perfect Alexander disappears and what the clones telegraphed happens for real\n"
         "The safe spots are always opposite one of the two middle Perfect Alexander clones\n"
         "Shared Sentence: left\n"
         "No debuff: left\n"
         "Aggravated Assault: right\n"
         "(Macro: west Shared Sentence + no debuff / east Aggravated Assault)\n\n"
         "Another way to read the safe side: one of the two middle clones has a brief cast animation; it fires no Sacrament and is the Defamation's safe spot",
         strict=False, pic=IMG + "fate_calibration_alpha.jpg", scene=S.fca(), refs=[FR("pa-alpha")])
    OCP = "Ordained Capital Punishment"
    step(PH, OCP, "ครั้งที่ 1: MT + ST แชร์", "#1: MT + ST share",
         "หลัง α Perfect Alexander ร่าย Ordained Capital Punishment ครั้งแรก: tankbuster แชร์ระหว่าง Tank 2 คน\n"
         "ST: Provoke ดึง aggro ตอนบอสร่าย Ordained Punishment\n"
         "MT + ST: ใช้ buff เต็มที่\n"
         "สลับ Tank จาก MT เป็น ST\n"
         "ยืนรวมกันรับ Ordained Capital Punishment แล้วแยกกันหลังโดนครั้งที่ 3\n"
         "มาโคร: MT+ST แชร์ → ST invuln → MT invuln",
         "After α, Perfect Alexander casts the first Ordained Capital Punishment, shared between both tanks\n"
         "ST: Provoke to take aggro when it casts Ordained Punishment\n"
         "MT + ST: full buffs\n"
         "Tank swap MT → ST\n"
         "Stack together for Ordained Capital Punishment and split after the third hit\n"
         "Macro: MT+ST share → ST invuln → MT invuln",
         strict=False, refs=[FR("pa-ocp")])

    B = "Fate Calibration Beta"
    step(PH, B, "ภาพรวม β + debuff", "β overview + debuffs",
         "เหมือน α: โคลนโผล่ข้างทุกคน แสดงท่าที่จะเกิด ต้องจำ debuff จากเอฟเฟกต์\n"
         "ลำดับ\n"
         "1. Light / Dark + สาย (tether)\n"
         "2. Shared Sentence + Super Jump\n"
         "3. Collective / Individual Reprobation (stack / spread)\n"
         "4. Radiant Sacrament\n\n"
         "Light (4 คน): แค่ดูว่าตัวเองเป็น Beacon หรือเปล่า\n"
         "คนที่โคลนไม่ขยับ = Light Beacon: ยืนเยื้องตะวันตกจากเหนือนิดหนึ่ง ห่างจากปาร์ตี้\n"
         "Light คนอื่น: ไปรวมกับปาร์ตี้ฝั่งตะวันออก\n\n"
         "Dark (4 คน): แต่ละคนมีหน้าที่ตามสายที่ได้ ดูให้ดีว่าได้สายอะไร\n"
         "คนที่โคลนไม่ขยับ = Dark Beacon: ยืนบน marker ตะวันออก (B)\n"
         "Dark คนอื่น: ยืนตามตำแหน่งเทียบกับ Dark Beacon",
         "Like α: clones appear next to everyone and telegraph what happens; recognise the debuffs by their effects\n"
         "Order\n"
         "1. Light / Dark + tethers\n"
         "2. Shared Sentence + Super Jumps\n"
         "3. Collective / Individual Reprobation (stack / spread)\n"
         "4. Radiant Sacrament\n\n"
         "Light (4): only work out whether you are the Beacon\n"
         "The one whose clone doesn't move is the Light Beacon: a little west of north, away from the party\n"
         "Other Light players: join the party east\n\n"
         "Dark (4): each has a job by their tether, so note which tether you got\n"
         "The one whose clone doesn't move is the Dark Beacon: stand ON the east marker (B)\n"
         "Other Dark players: position relative to the Dark Beacon",
         strict=False)
    step(PH, B, "mitigate ก่อน β", "Mitigating β",
         "β ควร mitigate เบาๆ ก่อน Forced March (ไม่ค่อยมีใครนึกถึง) แต่ยังต้องเก็บ mitigate ไว้สำหรับ Exatrine ด้วย\n"
         "ST 90s / H2 barrier แรง (Deployed Adloquium หรือ Eukrasian Prognosis + Zoe)\n\n"
         "เหตุผล: กันกรณีแย่สุดที่ต้อง spread (Individual Reprobation)\n"
         "Dark ล่อ Super Jump และ Light โดน stack ของ Shared Sentence แล้วต่อด้วย spread: ไม่มีอะไรรับประกันว่ามี Healer อยู่ใกล้",
         "β should be lightly mitigated before the march (it isn't obvious), while still keeping mitigation for the Exatrines\n"
         "ST 90s / strong H2 shields (Deployed Adloquium, or a Zoe'd Eukrasian Prognosis)\n\n"
         "Why: it hedges against the worst case, a spread (Individual Reprobation)\n"
         "The Dark players bait Super Jumps and the Light players take the Shared Sentence stack, then the spread, with no guarantee of a healer nearby",
         strict=False)
    step(PH, B, "① ตำแหน่งเริ่ม", "① Starting spots",
         "① ตำแหน่งเริ่ม (β ร่ายเสร็จ Perfect Alexander หายไป ท่าที่โคลนแสดงไว้เกิดจริง)\n"
         "Light Beacon: เยื้องตะวันตกจากเหนือนิดหนึ่ง (NNW)\n"
         "Dark Beacon: ตะวันออก บน marker\n"
         "Dark สายแดง/เขียว: เยื้องตะวันตกเฉียงเหนือของ Dark Beacon\n"
         "Dark ไม่มีสาย: เยื้องตะวันตกของ Dark Beacon\n"
         "Dark สายน้ำเงิน: เยื้องตะวันตกเฉียงใต้ของ Dark Beacon\n"
         "Light คนอื่น: รวมกับปาร์ตี้ฝั่งตะวันออก",
         "① Starting spots (when β finishes, Perfect Alexander disappears and the telegraphs resolve)\n"
         "Light Beacon: slightly west of north (NNW)\n"
         "Dark Beacon: east, on the marker\n"
         "Dark with red/green tether: slightly north-west of the Dark Beacon\n"
         "Dark with no tether: slightly west of the Dark Beacon\n"
         "Dark with blue tether: slightly south-west of the Dark Beacon\n"
         "Other Light players: with the party east",
         strict=False, pic=IMG + "fate_calibration_beta_01.jpg", scene=S.fcb_01())
    step(PH, B, "① ใกล้ Dark Beacon (ภาพขยาย)", "① Around the Dark Beacon (close-up)",
         "ภาพขยายรอบ Dark Beacon (ทิศเหนืออยู่บน)\n"
         "Dark สายแดง/เขียว: ตะวันตกเฉียงเหนือของ Dark Beacon\n"
         "Dark ไม่มีสาย: ตะวันตก\n"
         "Dark สายน้ำเงิน: ตะวันตกเฉียงใต้\n"
         "Light คนอื่น: เหนือขึ้นไปเล็กน้อย\n"
         "Light Beacon: อยู่นอกภาพ ทางตะวันตกเฉียงเหนือ",
         "Close-up around the Dark Beacon (north up)\n"
         "Dark with red/green tether: north-west of the Dark Beacon\n"
         "Dark with no tether: west\n"
         "Dark with blue tether: south-west\n"
         "Other Light players: a little north\n"
         "Light Beacon: off the picture, to the north-west",
         strict=False, pic=IMG + "fate_calibration_beta/beta_positioning.jpg", scene=S.fcb_positioning())
    step(PH, B, "② Forced March ทำงาน", "② The march resolves",
         "② Forced March ทำงาน\n"
         "Light ทั้งหมด + Dark สายแดง/เขียว: stack รวมกันทางเหนือ\n"
         "Dark คนอื่น (ยกเว้นสายแดง/เขียว): ถูกพาไปถึงขอบสนาม",
         "② The Forced March resolves\n"
         "All Light players + the red/green Dark: stack together north\n"
         "The other Dark players (not red/green): marched to the edge of the arena",
         strict=False, pic=IMG + "fate_calibration_beta_02.jpg", scene=S.fcb(2), refs=[FR("pa-beta")])
    step(PH, B, "③ Shared Sentence + Super Jump", "③ Shared Sentence + Super Jumps",
         "③ Shared Sentence ของ Light และ Super Jump ลง\n"
         "โคลน Alexander กระโดดใส่คนที่ไกลที่สุดจากตัวมัน: Dark Beacon กับ Dark ไม่มีสายต้องอยู่ขอบสนามเพื่อล่อ\n"
         "ถ้าคนใดคนหนึ่งลืมไปขอบ Dark สายน้ำเงิน (ทางใต้) จะเป็นคนไกลสุดของโคลน 2 ตัว โดน J Jump 2 ครั้ง",
         "③ The Light Shared Sentence and the Super Jumps resolve\n"
         "The Alexander clones jump to the furthest player from them: the Dark Beacon and the no-tether Dark must be at the edge to bait them\n"
         "If either forgets, the blue-tether Dark (south) becomes the furthest for two clones and takes two J Jumps",
         strict=False, pic=IMG + "fate_calibration_beta_03.jpg", scene=S.fcb(3), refs=[FR("pa-beta-jump")])
    step(PH, B, "④ Stack / Spread", "④ Stack / spread",
         "④ Stack หรือ Spread\n"
         "ถ้าเป็น stack: Light stack แถวกลางสนาม / Dark stack ทางใต้\n"
         "stack ของ β ล็อก Light Beacon กับ Dark Beacon เสมอ จึงแบ่งตาม Light / Dark (ต่างจาก stack ก่อน α ที่สุ่ม)\n"
         "stack ต้องมีคนช่วยรับ: รับคนเดียว (แม้ invuln) เกิด raid-wide Faithlessness ตายทั้งปาร์ตี้",
         "④ Stack or spread\n"
         "If stacks: Light players stack around the middle / Dark players stack south\n"
         "β's stacks always target the Light and Dark Beacons, hence the Light / Dark split (unlike the random stacks before α)\n"
         "A stack can't be taken solo: a solo stack (even invulned) triggers the raid-wide Faithlessness and wipes",
         strict=False, pic=IMG + "fate_calibration_beta_04.jpg", scene=S.fcb(4))
    step(PH, B, "⑤ Radiant Sacrament", "⑤ Radiant Sacrament",
         "⑤ Radiant Sacrament ลง\n"
         "ภาพ: ทั้งปาร์ตี้รวมกันในวงปลอดภัยทางใต้ ใต้โคลนตัวนั้น",
         "⑤ Radiant Sacrament resolves\n"
         "Picture: the whole party together in the safe circle to the south, under that clone",
         strict=False, pic=IMG + "fate_calibration_beta_05.jpg", scene=S.fcb(5))
    step(PH, OCP, "ครั้งที่ 2: ST invuln", "#2: ST invuln",
         "หลัง β Perfect Alexander ร่าย Ordained Capital Punishment ครั้งที่ 2 (tankbuster)\n"
         "ST invuln (รับคนเดียว)\n"
         "สลับ Tank จาก ST เป็น MT",
         "After β, Perfect Alexander casts the second Ordained Capital Punishment (a tank buster)\n"
         "ST invuln (solo)\n"
         "Tank swap ST → MT",
         strict=False)

    E = "Almighty Judgment"
    step(PH, E, "Exatrine: อ่านยังไง", "Exatrines: how to read them",
         "Almighty Judgment (เรียกกันว่า Exatrine: จาก Exaflare ของ UCoB + Trine ของ O8S) คือ AoE บนพื้น เตือน 3 ชุดก่อน แล้วระเบิดจริงตามลำดับ\n"
         "ตำแหน่งไม่ได้สุ่มทั้งหมด: มาจาก 3 แบบในภาพถัดไป ลำดับสุ่ม\n"
         "ปาร์ตี้สนใจแค่จุดสีแดง (marker 1 2 3 4)\n"
         "มีทางหลบแบบ 3 → 1 เสมอ และไม่เคยหลบแนวทแยง\n"
         "1. ดูวงเตือนชุดแรก: ตรงนั้นคือจุดจบ\n"
         "2. หาวงในชุดที่ 3 ที่ติดกับวงของชุดแรก: ตรงนั้นคือจุดเริ่ม\n\n"
         "ทำไมใช้จุดตะวันตกเฉียงใต้ ไม่ใช่กลางสนาม\n"
         "ใช้กลางสนามทำให้คิดว่าหลบจากกลางไป marker ตะวันออกได้ ซึ่งไม่เคยเกิด: วาง SW ทำให้จุดเรียงเป็นแนวเดียว\n"
         "คำว่า 'กลาง' สับสนได้ว่ากลางสนามหรือจุดใต้\n"
         "ถ้าหลบจากกลางลงใต้ เสาแสงชุดแรกบังจอ: ใช้ SW ทำให้เดินแนวขวาง เสาแสงบังน้อยกว่า",
         "Almighty Judgment ('Exatrines', after UCoB's Exaflare and O8S's Trine): three sets of telegraphed ground AoEs that then go off for real\n"
         "Not fully random: they come from the three layouts in the next pictures, in a random order\n"
         "The party only considers the red spots (markers 1 2 3 4)\n"
         "There is always a 3-to-1 dodge, and you never dodge diagonally\n"
         "1. Look at the first set of telegraphs: that is where you END\n"
         "2. Find the third-set telegraph next to it: that is where you START\n\n"
         "Why the SW spot, not the middle\n"
         "The middle suggests a middle-to-east-marker dodge that never happens: SW puts the spots on one line\n"
         "'Middle' can be misheard as the arena's middle or the south spot\n"
         "Dodging middle-to-south, the first pillars of light block the camera: SW makes the move lateral",
         strict=False, refs=[FR("pa-exatrine")])
    for k, (sc, n, ne, t, te) in enumerate(zip(S.exatrines(),
            ["แบบที่ 1: จุดแดงที่ 4 และ 1", "แบบที่ 2: จุดแดงที่ 2", "แบบที่ 3: จุดแดงที่ 3"],
            ["Layout 1: red at 4 and 1", "Layout 2: red at 2", "Layout 3: red at 3"],
            ["แบบที่ 1 ของ AoE ชุดหนึ่ง: จุดที่ปาร์ตี้สนใจ (สีแดง) คือ marker 4 และ 1",
             "แบบที่ 2: จุดที่ปาร์ตี้สนใจ (สีแดง) คือ marker 2",
             "แบบที่ 3: จุดที่ปาร์ตี้สนใจ (สีแดง) คือ marker 3"],
            ["Layout 1 of a set: the spots the party considers (red) are markers 4 and 1",
             "Layout 2: the spot the party considers (red) is marker 2",
             "Layout 3: the spot the party considers (red) is marker 3"]), 1):
        step(PH, E, n, ne, t, te, strict=False, pic=f"{IMG}exatrine_{k:02d}.jpg", scene=sc)
    step(PH, "Irresistible Grace", "stack 8 คน + mitigate", "The 8-player stack + mitigation",
         "Exatrine แต่ละรอบตามด้วย Irresistible Grace: stack 8 คน ต้อง mitigate หนัก\n"
         "รอบ 1: MT Reprisal / MT 90s / H1 120s / H2 barrier / H2 30s / D1 / D4\n"
         "รอบ 2: ST Reprisal / ST 90s / H2 120s / H2 barrier / H2 30s / D2 / D3\n\n"
         "หลัง Exatrine รอบแรกมี tankbuster อีก 1 ครั้ง\n"
         "Ordained Capital Punishment ครั้งที่ 3: MT invuln (รับคนเดียว) / สลับ Tank จาก MT เป็น ST",
         "Each Exatrine is followed by Irresistible Grace, an 8-player stack that needs heavy mitigation\n"
         "1st: MT Reprisal / MT 90s / H1 120s / H2 shields / H2 30s / D1 / D4\n"
         "2nd: ST Reprisal / ST 90s / H2 120s / H2 shields / H2 30s / D2 / D3\n\n"
         "One last tank buster after the first Exatrine\n"
         "Ordained Capital Punishment #3: MT invuln (solo) / tank swap MT → ST",
         strict=False, refs=[FR("pa-grace")])
    step(PH, "Temporal Prison", "enrage: เข้าคุก 7 อัน", "The enrage: seven jails",
         "หลัง Irresistible Grace ครั้งที่ 2 Perfect Alexander ร่าย Temporal Prison = hard enrage ของไฟต์\n"
         "tower / คุก 7 อันโผล่และเกิดทีละอัน เริ่มจากตะวันออกเฉียงเหนือ วนตามเข็มนาฬิการอบ Perfect Alexander\n"
         "คนที่ DPS ต่ำสุดเข้าคุกก่อน\n"
         "H2 > H1 > ST > MT > D3 > D4 > D2 > D1\n"
         "DoT ยังทำงานต่อแม้คนนั้นถูกขังแล้ว",
         "After the second Irresistible Grace, Perfect Alexander casts Temporal Prison, the fight's hard enrage\n"
         "Seven towers / jails appear and resolve, starting north-east and going clockwise around Perfect Alexander\n"
         "The lowest-DPS players go first\n"
         "H2 > H1 > ST > MT > D3 > D4 > D2 > D1\n"
         "DoTs keep ticking after the player is jailed",
         strict=False, refs=[FR("pa-prison")])
