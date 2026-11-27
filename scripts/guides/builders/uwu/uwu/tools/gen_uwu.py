"""Builds scripts/guides/data/uwu.json: The Weapon's Refrain (Ultimate), Tuufless's Notes (Elemental DC PF plan),
Nukemaru's footage. Run from the repo root: python3 scripts/guides/builders/uwu/uwu/tools/gen_uwu.py [allowmissing]"""
import sys, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scenes_uwu as S

OUT = "scripts/guides/data/uwu.json"
DL = "scripts/guides/.work/uwu/dl"
FOOT = json.load(open(os.path.join(HERE, "footage.json"), encoding="utf-8")) if os.path.exists(os.path.join(HERE, "footage.json")) else {}
TU = "https://ffxiv.tuufless.com/images/ultimates/uwu/"
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"


def FR(name, say, say_en):
    """A footage picture by name (frames/uwu/<name>.webp), its moment from footage.json."""
    f = FOOT.get(name)
    if not f:
        return None
    return (f"frames/uwu/{name}.webp", say, say_en, "Nukemaru", f"https://youtu.be/{f['video']}?t={f['t']}")


steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None, refs=None, plan=None):
    s = {"phase": phase, "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [TU + pic]
    refs = [r for r in (refs or []) if r]
    if refs:
        missing = [r[0] for r in refs if not os.path.exists(os.path.join("scripts/guides/data", r[0]))]
        if missing and "allowmissing" not in sys.argv:
            raise SystemExit(f"missing frames: {missing}")
        refs = [r for r in refs if r[0] not in missing]
    if refs:
        s["refs"] = [{"src": r[0], "say": r[1], "by": r[3], "url": r[4]} for r in refs]
    if plan:
        s["plan"] = plan[0]
    if scene is not None:
        s["ring"] = 5
        s["scene"] = scene
    else:
        s["scene"] = None
    en = {"phase": phase, "mech": mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    if plan:
        en["plan"] = plan[1]
    s["en"] = en
    steps.append(s)


P1, P2, P3, P4, P5 = "P1 Garuda", "P2 Ifrit", "P3 Titan", "P4 Lahabrea", "P5 Ultima"

# ================================================================== setup (before the pull)
step(P1, "Waymarks", "Marker ของไฟต์", "The fight's waymarks",
     "A B C D: บอกทิศ (A เหนือ / B ตะวันออก / C ใต้ / D ตะวันตก) วางใกล้กลางสนาม\n\n"
     "Garuda: 4 = จุด stack ทั้งปาร์ตี้ตอน Mistral Song 2 ครั้ง (Midruda)\n"
     "Ifrit: A B C D แบ่งตำแหน่งทิศหลัก (ตอนหลบ Crimson Cyclone ครั้งแรก)\n"
     "Titan: A B C D และ 1 ใช้กับ Granite Gaol\n"
     "Ultima: 3 = จุดหลบ Crimson Cyclone ตอน Annihilation และ Primal Roulette / 4 = Granite Gaol ตอน Suppression / B = จุด stack Fireball ตอน Suppression\n\n"
     "ภาพวาดตามภาพในเกมของ Tuufless: 1 กลางสนาม / 2 ขอบเหนือ / 3 ตะวันตกเฉียงเหนือใกล้ขอบ / 4 ตะวันออกเฉียงใต้\n"
     "ระวัง: ชุด preset (WaymarkPresetPlugin) ในหน้าเดียวกันวาง 2 / 3 / 4 สลับกับภาพนี้ ถ้านำเข้า preset ให้เช็กตำแหน่ง 3 กับ 4 ก่อน",
     "A B C D: orientation (A north / B east / C south / D west), placed near the middle\n\n"
     "Garuda: 4 = the party stack for the two Mistral Songs (Midruda)\n"
     "Ifrit: A B C D mark the cardinals (dodging the first Crimson Charge)\n"
     "Titan: A B C D and 1 for the Granite Gaols\n"
     "Ultima: 3 = dodging the Crimson Charges in Annihilation and Primal Roulette / 4 = Granite Gaol in Suppression / B = the Fireball stack in Suppression\n\n"
     "Drawn as Tuufless's in-game screenshot shows them: 1 the centre / 2 the north edge / 3 north-west near the edge / 4 south-east\n"
     "Careful: the WaymarkPresetPlugin preset on the same page has 2 / 3 / 4 in a rotated order; check 3 and 4 if you import it",
     strict=False, pic="markers.jpg", scene=S.waymarks())

step(P1, "BiS", "Gear และ potion", "Gear and potions",
     "gear ตั้งแต่ i500 ขึ้นไป substat ถูก cap เต็มแล้ว\n"
     "อาวุธ Relic substat cap ที่ 136\n"
     "potion ต่ำสุดที่ยังได้ผลเต็ม: HQ Grade 4 Tincture",
     "Any gear at i500 or above has its substats capped\n"
     "Relic weapons have their substats capped at 136\n"
     "The lowest potion that still gives the full benefit: HQ Grade 4 Tincture",
     strict=False)

# ================================================================== P1 Garuda
step(P1, "Aetherically Charged", "ปลุก Primal: กติกาของ 3 ช่วงแรก", "Waking the Primals: the rule of the first three phases",
     "Garuda / Ifrit / Titan ต้องถูก \"ปลุก\" ทุกตัว\n"
     "ทำ Mechanic ในแบบที่กำหนด (มักยากกว่า) บอสได้ Aetherically Charged 1 stack\n"
     "ครบ 4 stack บอสตื่น (Woken):\n"
     "ท่าบางท่าเปลี่ยนไปหรือเพิ่มขึ้น\n"
     "ตอนตาย ทิ้งวงแสงไว้ใต้ตัว: คนเหยียบได้ buff Beyond Limits\n"
     "คนมี Beyond Limits ใช้ LB3 แล้ว buff หาย และเกจ LB เติมกลับเป็น LB3\n"
     "Caster 1 / Healer 1 / Melee 1 ต้องมี buff นี้ ถึงจะผ่านช่วงต่อเข้า Ultima Weapon\n\n"
     "เคล็ดลับ: การปลุกครบ 3 ตัวและได้ Beyond Limits สำคัญแค่ตอนหลัง Titan\n"
     "ถ้ายังซ้อม 3 ช่วงแรกแล้วปลุกพลาด ไม่ต้องกังวล เล่นต่อให้ผ่านไปก่อน",
     "Garuda, Ifrit and Titan each have to be \"woken\"\n"
     "Doing a mechanic a set (usually harder) way gives the boss one stack of Aetherically Charged\n"
     "At four stacks the boss is Woken:\n"
     "Some attacks change or are added\n"
     "On death it leaves a light puddle: whoever steps in gets Beyond Limits\n"
     "A player with Beyond Limits who uses an LB3 consumes it, and the gauge refills to LB3\n"
     "A caster, a healer and a melee must have it to clear the transition to Ultima Weapon\n\n"
     "Tip: waking all three and getting Beyond Limits only matters after Titan\n"
     "If you're still learning the first three phases and miss one, don't worry: keep progressing",
     strict=False)

step(P1, "Thermal Low", "วิธีปลุก Garuda: Thermal Low", "Waking Garuda: Thermal Low",
     "Thermal Low เป็น debuff ที่ได้จาก:\n"
     "Cyclone (tankbuster ของ Spiny Plume)\n"
     "Friction ของ Garuda\n\n"
     "ล้าง stack ได้ 2 ทาง:\n"
     "เดินเข้าฟองลมที่ Spiny Plume ทิ้งไว้ตอนถูกทำลาย\n"
     "รับสาย Mesohigh จาก Chirada กับ Suparna (\"สองพี่น้อง\")\n\n"
     "ตอนล้าง ทั้งปาร์ตี้โดน raid-wide (Super Cyclone) ตามจำนวน stack ที่ล้าง:\n"
     "1 stack: ดาเมจน้อย\n"
     "2 stack: ดาเมจเยอะ\n"
     "3 stack ขึ้นไป: ตายทั้งปาร์ตี้\n\n"
     "Garuda ได้ Aetherically Charged 1 stack เมื่อมีคนล้าง Thermal Low ทีเดียวตั้งแต่ 2 stack ขึ้นไป",
     "Thermal Low is a debuff from:\n"
     "Cyclone (the Spiny Plume's tankbuster)\n"
     "Garuda's Friction\n\n"
     "Stacks are cleansed two ways:\n"
     "stepping into the bubble the Spiny Plume leaves when destroyed\n"
     "taking a Mesohigh tether from Chirada and Suparna (\"the sisters\")\n\n"
     "A cleanse hits the party with a raid-wide (Super Cyclone) by the stacks cleansed:\n"
     "1 stack: minor damage\n"
     "2 stacks: a lot of damage\n"
     "3 or more: lethal\n\n"
     "Garuda gains one Aetherically Charged when a player cleanses at least two stacks at once",
     strict=False)

step(P1, "Thermal Low", "Garuda ตื่นแล้วท่าเปลี่ยนอย่างไร", "What changes when Garuda is woken",
     "Wicked Wheel: ปกติเป็น AoE รอบตัว / ตื่นแล้ว: ตามด้วย donut (Wicked Tornado) ทันที ไม่มีร่ายไม่มีวงเตือน\n\n"
     "Downburst: ปกติเป็นกรวยด้านหน้าที่ MT รับ / ตื่นแล้ว: กรวยที่ทั้งปาร์ตี้หารกัน\n\n"
     "Satin Plume: ปกติเป็น add ที่โยงสายเข้าหาผู้เล่น ต้องฆ่าก่อนร่าย Sleep ใส่ทั้งปาร์ตี้ / "
     "ตื่นแล้ว: กลายเป็น Razor Plume วนรอบขอบสนาม แล้วพุ่งเข้าหาผู้เล่นและระเบิด AoE ถึงตาย ถ้าไม่ถูกลมพัดตก (เช่น Wicked Tornado หรือ Super Cyclone)",
     "Wicked Wheel: normally a point-blank AoE / woken: immediately followed by a donut (Wicked Tornado) with no cast or telegraph\n\n"
     "Downburst: normally a frontal cleave the MT takes / woken: a frontal cleave shared by the party\n\n"
     "Satin Plume: normally adds that tether and close in on players and must die before their raid-wide Sleep / "
     "woken: Razor Plumes circling the edge that home in and explode lethally unless blown down by wind (Wicked Tornado, Super Cyclone)",
     strict=False)

SP = "Spiny Plume"
step(P1, SP, "① ลาก Garuda ไปกลางสนาม", "① Pull Garuda to the centre",
     "ลาก Garuda ไปกลางสนาม\n"
     "Healer 1 คน (สุ่ม) ได้มาร์กเขียวบนหัว\n\n"
     "Healer: ยืนทางตะวันออก",
     "Pull Garuda to the centre\n"
     "One healer (random) gets a green marker overhead\n\n"
     "Healers: stand east",
     strict=["H1", "H2"], pic="01/garuda_01.jpg", scene=S.g01(),
     says={"H1": "ยืนทางตะวันออก (Healer ที่ได้มาร์กเขียวเป็นเป้า Mistral Song)", "H2": "ยืนทางตะวันออก (Healer ที่ได้มาร์กเขียวเป็นเป้า Mistral Song)"},
     says_en={"H1": "Stand east (the healer with the green marker is the Mistral Song target)", "H2": "Stand east (the healer with the green marker is the Mistral Song target)"},
     refs=[FR("garuda-mistral-song", "Mistral Song: มาร์กเขียวบนหัว Healer · ST ยืนขวางระหว่าง Garuda กับ Healer", "Mistral Song: the green marker over a healer · the ST stands between Garuda and the healer")])
step(P1, SP, "② Slipstream + Mistral Song", "② Slipstream + Mistral Song",
     "Garuda ใช้ Slipstream: กรวยเล็กด้านหน้า ไม่มีวงเตือน\n"
     "แล้วใช้ Mistral Song ไปทาง Healer ที่มีมาร์กเขียว: กรวยใหญ่ 150 องศา และเป็น tankbuster ใส่คนที่โดนคนแรกสุด (คนที่ใกล้ที่สุด) ซึ่งต้องเป็น ST",
     "Garuda casts Slipstream: a small frontal cone with no telegraph\n"
     "Then Mistral Song towards the healer with the green marker: a large 150-degree cone that is also a tankbuster on the closest player hit, who should be the ST",
     strict=["ST"], pic="01/garuda_02.jpg", scene=S.g02(),
     says={"MT": "หลบ Slipstream", "ST": "ยืนขวางระหว่าง Garuda กับ Healer"},
     says_en={"MT": "Dodge Slipstream", "ST": "Stand between Garuda and the healers"})
step(P1, SP, "③ ลาก Garuda ไปตะวันตก", "③ Pull Garuda west",
     "ST โดน Mistral Song แล้ว ทอร์นาโดสีเขียว (AoE) เกิดตรงที่ ST ยืน\n"
     "MT ลาก Garuda ไปทางตะวันตก: หลบ AoE นี้ และเตรียมตำแหน่ง Garuda สำหรับขั้นถัดไป",
     "When the ST is hit by Mistral Song, a green tornado AoE spawns where the ST stood\n"
     "The MT pulls Garuda west, out of it and into place for the next step",
     strict=False, pic="01/garuda_03.jpg", scene=S.g03(),
     says={"MT": "ลาก Garuda ไปตะวันตก"}, says_en={"MT": "Pull Garuda west"})
step(P1, SP, "④ Satin Plume + Spiny Plume", "④ Satin Plumes + the Spiny Plume",
     "Satin Plume หลายตัวโผล่และโยงสายกับผู้เล่น\n"
     "Spiny Plume 1 ตัวโผล่ทางตะวันตก จะโยงสายกับคนแรกที่ตีมัน: ต้องเป็น ST\n\n"
     "ห้ามใช้สกิล AoE จนกว่า ST ตี Spiny Plume และมันโยงสายกับ ST แล้ว",
     "Several Satin Plumes spawn and tether to party members\n"
     "One Spiny Plume spawns west and tethers to the first player who hits it: the ST\n\n"
     "No AoE attacks until the ST has hit the Spiny Plume and it has tethered to the ST",
     strict=False, pic="01/garuda_04.jpg", scene=S.g04(),
     says={"ST": "ตี Spiny Plume ก่อนใคร ให้มันโยงสายมาที่ตัวเอง"}, says_en={"ST": "Hit the Spiny Plume first so it tethers to you"},
     refs=[FR("spiny-plume-bubble", "Spiny Plume ถูกทำลาย ทิ้งฟองลมไว้: เดินเข้าไปแล้ว Thermal Low ถูกล้าง", "The destroyed Spiny Plume leaves a bubble: stepping in cleanses Thermal Low")])
step(P1, SP, "⑤ Slipstream หันออก + Cyclone", "⑤ Slipstream away + Cyclone",
     "Garuda ใช้ Slipstream อีกครั้ง: หันกรวยออกจากปาร์ตี้\n"
     "Spiny Plume ใช้ Cyclone เป็นระยะ: tankbuster เป้าเดียวใส่คนที่มันโยงสาย (ST) และให้ Thermal Low 1 stack",
     "Garuda casts another Slipstream: point it away from the party\n"
     "The Spiny Plume periodically casts Cyclone: a single-target tankbuster on its tether (the ST) that also gives a stack of Thermal Low",
     strict=False, pic="01/garuda_05.jpg", scene=S.g05(),
     says={"MT": "หัน Slipstream ออกจากปาร์ตี้"}, says_en={"MT": "Point Slipstream away from the party"})
step(P1, SP, "⑥ Downburst + ตี Satin Plume", "⑥ Downburst + AoE the Satin Plumes",
     "MT กลับไปหน้า Garuda รับ Downburst: กรวยด้านหน้า ไม่มีวงเตือนและไม่มีแถบร่าย\n"
     "ตอนนี้ปาร์ตี้ AoE Satin Plume ให้ตายหมด\n\n"
     "ห้ามทำลาย Spiny Plume",
     "The MT goes back in front of Garuda to bait Downburst: a frontal AoE with no telegraph and no cast bar\n"
     "The party AoEs all the Satin Plumes down now\n\n"
     "Do not destroy the Spiny Plume",
     strict=False, pic="01/garuda_06.jpg", scene=S.g06(),
     says={"MT": "อยู่หน้า Garuda รับ Downburst"}, says_en={"MT": "In front of Garuda for Downburst"})
step(P1, SP, "⑦ Feather Rain + Spiny Plume ตีครั้งที่ 2", "⑦ Feather Rain + the Spiny Plume's second hit",
     "Garuda กระโดด (มีเสียงกรีดร้อง) แล้ววาง Feather Rain ใต้ผู้เล่น 5 คนแบบสุ่ม: ขยับหลบ\n"
     "Spiny Plume ตี ST อีกครั้ง: ST มี Thermal Low 2 stack\n"
     "ทำลาย Spiny Plume ก่อนมันตีอีกครั้ง (ไม่งั้น ST ได้ stack ที่ 3)",
     "Garuda jumps (with a shriek) and drops Feather Rain puddles on five random players: move out\n"
     "The Spiny Plume hits the ST again: the ST has two Thermal Low stacks\n"
     "Destroy the Spiny Plume before it attacks again (or the ST gets a third stack)",
     strict=False, pic="01/garuda_07.jpg", scene=S.g07(),
     refs=[FR("feather-rain", "Feather Rain: Garuda กระโดด วงตกใต้ผู้เล่น ขยับหลบ", "Feather Rain: Garuda jumps and puddles drop under players; move out")])

FR_ = "Friction"
step(P1, FR_, "⑧ ทำลาย Spiny Plume", "⑧ Destroy the Spiny Plume",
     "Spiny Plume ตี ST ครั้งที่ 2 แล้ว (Thermal Low 2 stack) ทำลายมัน\n"
     "มันระเบิดเป็น AoE มีวงเตือน แล้วทิ้งฟองลมไว้\n\n"
     "ยิ่งทำลายช้า ยิ่งมีเวลาทำขั้นต่อไปมาก\n"
     "แต่ถ้าช้าเกินจน ST ได้ Thermal Low stack ที่ 3: ปาร์ตี้ล้ม",
     "After the Spiny Plume's second hit on the ST (two Thermal Low stacks), destroy it\n"
     "It explodes in a telegraphed AoE and leaves a bubble behind\n\n"
     "The later it dies, the more time the next steps have\n"
     "Too late, and the ST gets a third Thermal Low stack: a wipe",
     strict=False, pic="01/garuda_08.jpg", scene=S.g08())
step(P1, FR_, "⑨ stack ที่ขอบฟอง: ST ล้างก่อน", "⑨ Stack on the bubble's edge: the ST cleanses first",
     "stack ใกล้ขอบฟองลม:\n"
     "ในฟอง: MT ST H1 H2 D3 D4\n"
     "นอกฟอง: D1 D2\n\n"
     "ST เข้าฟองแล้ว Thermal Low 2 stack ถูกล้าง: ทั้งปาร์ตี้โดน raid-wide และ Garuda ได้ Aetherically Charged stack แรก",
     "Stack near the bubble's edge:\n"
     "Inside: MT ST H1 H2 D3 D4\n"
     "Outside: D1 D2\n\n"
     "When the ST enters, their two Thermal Low stacks are cleansed: a raid-wide, and Garuda's first Aetherically Charged",
     strict=["D1", "D2"], pic="01/garuda_09.jpg", scene=S.g09(),
     says={"D1": "อยู่นอกฟอง", "D2": "อยู่นอกฟอง", "ST": "เข้าฟองล้าง Thermal Low"},
     says_en={"D1": "Stay outside the bubble", "D2": "Stay outside the bubble", "ST": "Enter the bubble to cleanse Thermal Low"})
step(P1, FR_, "⑩ ST ออกไปอยู่กับ D1 D2 + Friction ครั้งแรก", "⑩ The ST joins D1 D2 + the first Friction",
     "ST ออกไปอยู่กับ D1 D2 นอกฟอง\n"
     "Garuda ใช้ Friction ใส่ผู้เล่นสุ่ม 1 คน: AoE เล็ก คนที่โดนได้ Thermal Low 1 stack\n"
     "คนที่อยู่ในฟองถูกล้าง stack ทันที\n\n"
     "ตอนนี้ต้องมีแค่ ST D1 D2 ที่มี Thermal Low 1 stack",
     "The ST joins D1 and D2 outside the bubble\n"
     "Garuda casts Friction on a random player: a small AoE giving everyone hit one Thermal Low stack\n"
     "Players inside the bubble are cleansed at once\n\n"
     "Now only the ST, D1 and D2 should have one stack",
     strict=False, pic="01/garuda_10.jpg", scene=S.g10(),
     refs=[FR("friction", "Friction: AoE เล็กใส่ผู้เล่นสุ่ม · คนที่โดนได้ Thermal Low 1 stack", "Friction: a small AoE on a random player · everyone hit gets one Thermal Low stack")])
step(P1, FR_, "⑪ ทุกคนออกนอกฟอง + Friction ครั้งที่ 2", "⑪ Everyone out + the second Friction",
     "ทุกคนออกจากฟอง stack รวมกันข้างนอก\n"
     "Garuda ใช้ Friction ครั้งที่ 2 ใส่ผู้เล่นสุ่ม: ทุกคนได้ Thermal Low 1 stack\n\n"
     "ตอนนี้ทุกคนมี 1 stack ยกเว้น ST D1 D2 ที่มีคนละ 2 stack",
     "Everyone leaves the bubble and stacks outside\n"
     "Garuda casts a second Friction on a random player: everyone gets a Thermal Low stack\n\n"
     "Everyone now has one stack, except the ST, D1 and D2 with two each",
     strict=False, pic="01/garuda_11.jpg", scene=S.g11())
step(P1, FR_, "⑫ D1 เข้าฟอง", "⑫ D1 enters the bubble",
     "D1 เข้าฟองล้าง Thermal Low\n"
     "Garuda ได้ Aetherically Charged stack ที่ 2",
     "D1 enters the bubble to cleanse Thermal Low\n"
     "Garuda gains her second Aetherically Charged",
     strict=["D1"], pic="01/garuda_12.jpg", scene=S.g12(),
     says={"D1": "เข้าฟองล้าง Thermal Low"}, says_en={"D1": "Enter the bubble to cleanse"})
step(P1, FR_, "⑬ heal ก่อน แล้ว D2 เข้าฟอง", "⑬ Heal up, then D2 enters",
     "heal ให้เต็มก่อน แล้ว D2 เข้าฟองล้าง Thermal Low\n"
     "Garuda ได้ Aetherically Charged stack ที่ 3\n\n"
     "ตอนนี้ MT H1 H2 D3 D4 มีคนละ 1 stack / ST มี 2 stack",
     "Heal up, then D2 enters the bubble to cleanse\n"
     "Garuda gains her third Aetherically Charged\n\n"
     "Now MT H1 H2 D3 D4 have one stack each / the ST has two",
     strict=["D2"], pic="01/garuda_13.jpg", scene=S.g13(),
     says={"D2": "รอ heal ให้เต็ม แล้วเข้าฟองล้าง Thermal Low"}, says_en={"D2": "Wait for the heal, then enter the bubble"})
step(P1, FR_, "⑭ Feather Rain", "⑭ Feather Rain",
     "Garuda กระโดด (มีเสียงกรีดร้อง) วาง Feather Rain ใต้ผู้เล่นสุ่ม: ขยับหลบ\n\n"
     "ตอนนี้ Garuda มีแค่ 3 จาก 4 stack ที่ต้องใช้ปลุก",
     "Garuda jumps (with a shriek) and drops Feather Rain on random players: move out\n\n"
     "Garuda has only three of the four stacks needed to wake her",
     strict=False, pic="01/garuda_14.jpg", scene=S.g14())

MS = "Mistral Song"
step(P1, MS, "Midruda ①: สองพี่น้องโผล่", "Midruda ①: the sisters appear",
     "Garuda ลงมาแล้วร่าย Aerial Blast จากนั้นเรียก Chirada กับ Suparna (สองพี่น้อง)\n"
     "สองตัวนี้เหมือน Garuda: กระโดดพร้อมเสียงกรีดร้อง แล้ว Feather Rain ตกใส่ผู้เล่น 5 คนแบบสุ่ม",
     "Garuda lands and casts Aerial Blast, then summons Chirada and Suparna (the sisters)\n"
     "They follow Garuda's rules: they jump with a shriek and Feather Rain drops on five random players",
     strict=False, pic="01/garuda_15.jpg", scene=S.g15())
step(P1, MS, "Midruda ②: stack ใต้ แล้วหลบไปตะวันออกเฉียงใต้", "Midruda ②: stack south, then dodge south-east",
     "stack รวมกันทางใต้ เพื่อล่อ Feather Rain ตอนสองพี่น้องกระโดด\n"
     "พยายามให้ Garuda อยู่กลางสนาม (จึงเรียกว่า \"Midruda\")\n"
     "พอสองพี่น้องกรีดร้อง หลบ Feather Rain แล้วไป stack ทางตะวันออกเฉียงใต้ (marker 4)",
     "Stack south to bait Feather Rain when Chirada and Suparna jump\n"
     "Try to keep Garuda in the middle (hence \"Midruda\")\n"
     "When the sisters shriek, dodge the Feather Rain and stack south-east (marker 4)",
     strict=False, pic="01/garuda_16.jpg", scene=S.g16(),
     refs=[FR("sisters-mistral-song", "Chirada / Suparna นอกสนามใช้ Mistral Song: MT / ST วิ่งไปขวางรับ", "Chirada / Suparna outside the arena cast Mistral Song: the MT and ST run out to block")])
step(P1, MS, "Midruda ③: Tank วิ่งไปขวาง Mistral Song", "Midruda ③: the tanks intercept Mistral Song",
     "Chirada กับ Suparna โผล่นอกสนาม 2 ใน 4 ทิศหลัก แล้วใช้ Mistral Song ใส่ผู้เล่นสุ่ม 2 คน (ไม่ใช่ Tank)\n"
     "Tank 2 คนต้องไปขวางรับแทน เหมือนที่ ST ทำตอนเริ่มไฟต์\n"
     "ให้ Garuda อยู่กลางจนวงเตือน AoE ของมันขึ้นก่อน แล้วค่อยออกไปขวาง\n\n"
     "MT: รับตัวแรกโดยเริ่มนับจากเหนือ (นับเหนือด้วย) วนทวนเข็ม: เหนือ > ตะวันตก > ใต้\n"
     "ST: รับตัวแรกโดยเริ่มนับจากตะวันออก (นับตะวันออกด้วย) วนตามเข็ม: ตะวันออก > ใต้ > ตะวันตก",
     "Chirada and Suparna appear outside the arena on two of the four cardinals and target two random non-tanks with Mistral Song\n"
     "The two tanks intercept, as the ST did at the very start\n"
     "Keep Garuda in the middle until her telegraphed AoE appears before going out\n\n"
     "MT: take the first sister counting from north (inclusive), anticlockwise: N > W > S\n"
     "ST: take the first sister counting from east (inclusive), clockwise: E > S > W",
     strict=False, pic="01/garuda_17.jpg", scene=S.g17(),
     says={"MT": "เริ่มที่เหนือ วนทวนเข็ม: เหนือ > ตะวันตก > ใต้ ตัวแรกที่เจอคือของเรา", "ST": "เริ่มที่ตะวันออก วนตามเข็ม: ตะวันออก > ใต้ > ตะวันตก ตัวแรกที่เจอคือของเรา"},
     says_en={"MT": "From north, anticlockwise: N > W > S; the first sister you meet is yours", "ST": "From east, clockwise: E > S > W; the first sister you meet is yours"})
step(P1, MS, "Midruda ④: กลางสนามปลอดภัยเสมอ", "Midruda ④: the centre is always safe",
     "สองพี่น้องกระโดด (หลบ Feather Rain) แล้วทอร์นาโดเขียว 2 ลูกเกิดตรงที่ MT กับ ST ยืน\n"
     "ถ้าทำถูก กลางสนามปลอดภัยเสมอ",
     "The sisters jump (dodge the Feather Rain) and two green tornadoes spawn where the MT and ST stood\n"
     "Done correctly, the centre is always safe",
     strict=False, pic="01/garuda_18.jpg", scene=S.g18())

ME = "Mesohigh"
step(P1, ME, "① Satin Plume + สาย Mesohigh", "① Satin Plumes + the Mesohigh tethers",
     "Satin Plume 4 ตัวโผล่และโยงสายกับผู้เล่นสุ่ม: ทำลายให้หมด\n"
     "Chirada กับ Suparna กลับมาที่ตะวันออกและตะวันตก แล้วโยงสายเขียว Mesohigh กับผู้เล่นสุ่ม 2 คน\n\n"
     "ST: รับสายฝั่งตะวันตก ดึงออกห่างปาร์ตี้\n"
     "D4: รับสายฝั่งตะวันออก ดึงออกห่างปาร์ตี้\n"
     "MT: ล่อ Slipstream อีกครั้ง หันออกจากปาร์ตี้",
     "Four Satin Plumes spawn and tether to random players: destroy them\n"
     "Chirada and Suparna return east and west and tether two random players with green Mesohigh tethers\n\n"
     "ST: take the west tether away from the party\n"
     "D4: take the east tether away from the party\n"
     "MT: bait another Slipstream away from the party",
     strict=["ST", "D4"], pic="01/garuda_19.jpg", scene=S.g19(),
     says={"ST": "รับสาย Mesohigh ฝั่งตะวันตก ออกห่างปาร์ตี้", "D4": "รับสาย Mesohigh ฝั่งตะวันออก ออกห่างปาร์ตี้", "MT": "ล่อ Slipstream หันออกจากปาร์ตี้"},
     says_en={"ST": "Take the west Mesohigh tether away from the party", "D4": "Take the east Mesohigh tether away from the party", "MT": "Bait Slipstream away from the party"},
     refs=[FR("mesohigh-tethers", "Mesohigh: สายเขียวจาก Chirada / Suparna · ST รับฝั่งตะวันตก / D4 ฝั่งตะวันออก", "Mesohigh: green tethers from Chirada / Suparna · the ST takes west, D4 takes east")])
step(P1, ME, "② Downburst + Garuda ตื่น", "② Downburst + Garuda wakes",
     "MT กลับไปหน้า Garuda ล่อ Downburst (กรวยด้านหน้า) ขณะที่ ST กับ D4 ถูกสาย Mesohigh ล้าง stack\n"
     "ST ล้าง Thermal Low 2 stack: Garuda ได้ stack ที่ 4 และตื่น (ตะโกนประโยคตอนตื่น)",
     "The MT returns to the front to bait Downburst (a frontal cleave) while the Mesohigh tethers cleanse the ST and D4\n"
     "The ST's two stacks are cleansed: Garuda's fourth Aetherically Charged wakes her (she shouts her line)",
     strict=["ST", "D4"], pic="01/garuda_20.jpg", scene=S.g20(),
     says={"MT": "ดาเมจเข้าหนักมากแม้ไม่ใช่ tankbuster: ใช้ cooldown"}, says_en={"MT": "A lot of damage even without a named tankbuster: use cooldowns"})
step(P1, ME, "③ Feather Rain", "③ Feather Rain",
     "สองพี่น้องกระโดด (มีเสียงกรีดร้อง): ล่อแล้วหลบ Feather Rain อีกครั้ง",
     "The sisters jump (and shriek): bait and dodge Feather Rain again",
     strict=False, pic="01/garuda_21.jpg", scene=S.g21())
step(P1, ME, "④ Slipstream", "④ Slipstream",
     "MT ล่อ Slipstream หันออกจากปาร์ตี้",
     "The MT baits a Slipstream away from the party",
     strict=False, pic="01/garuda_22.jpg", scene=S.g22())
step(P1, "Wicked Wheel", "Wicked Wheel + Wicked Tornado", "Wicked Wheel + Wicked Tornado",
     "Garuda ใช้ Wicked Wheel (AoE รอบตัว) อีกครั้ง\n"
     "แต่ตอนนี้ตื่นแล้ว: มี donut (Wicked Tornado) ตามมาทันที ไม่มีวงเตือนและไม่มีร่าย\n"
     "พอ Wicked Wheel ลงเสร็จ เดินเข้าไปในวงของ Wicked Wheel ทันที เพื่อหลบ Wicked Tornado\n\n"
     "ส่วนใหญ่ฆ่า Garuda ได้ก่อนถึงตรงนี้",
     "Garuda casts Wicked Wheel (point-blank) again\n"
     "Now that she's woken, a donut (Wicked Tornado) follows at once with no telegraph or cast\n"
     "As soon as Wicked Wheel resolves, step into its area to avoid Wicked Tornado\n\n"
     "Most groups have killed Garuda by now",
     strict=False, pic="01/garuda_23.jpg", scene=S.g23(),
     refs=[FR("wicked-tornado", "Garuda ตื่นแล้ว: Wicked Wheel แล้ว donut ตามทันที · เดินเข้าวงในทันทีที่ Wicked Wheel ลง", "Woken Garuda: Wicked Wheel then a donut at once · step in as soon as Wicked Wheel resolves")])
step(P1, "Downburst", "Downburst แบบตื่น: หารทั้งปาร์ตี้", "Woken Downburst: shared by the party",
     "Garuda ใช้ Downburst (แบบตื่น) ใส่ MT\n"
     "ตื่นแล้ว Downburst หารดาเมจทั้งปาร์ตี้: ทุกคนเข้าไปรับด้วยกัน",
     "Garuda uses a (woken) Downburst on the MT\n"
     "Woken, it is split among the whole party: everyone takes it together",
     strict=False, pic="01/garuda_24.jpg", scene=S.g24())
step(P1, "Aerial Blast", "Slipstream สุดท้าย + enrage", "The last Slipstream + enrage",
     "MT ไปหน้า Garuda ล่อ Slipstream อีกครั้ง หันออกจากปาร์ตี้\n"
     "จากนั้น Garuda กระโดด (Feather Rain) หายตัว แล้ว enrage (Aerial Blast)\n\n"
     "Garuda ที่ตื่นแล้วตาย: ทิ้งวงแสงไว้ใต้ตัว เหยียบแล้วได้ Beyond Limits\n"
     "Beyond Limits ของ Garuda: Healer (macro: Limit Break = Healer)\n"
     "ใช้ตอนช่วงต่อเข้า Ultima Weapon\n\n"
     "MT H1 H2 D3 ควรเหลือ Thermal Low คนละ 1 stack: ใช้อีกทีตั้งแต่ Ultimate Annihilation",
     "The MT goes in front again to bait one more Slipstream away from the party\n"
     "Then Garuda jumps (Feather Rain), becomes untargetable and enrages (Aerial Blast)\n\n"
     "A woken Garuda leaves a light puddle when she dies: stepping in gives Beyond Limits\n"
     "Garuda's Beyond Limits: a healer (macro: Limit Break = Healer)\n"
     "It is used in the transition to Ultima Weapon\n\n"
     "MT H1 H2 D3 should each keep one Thermal Low stack: it matters again from Ultimate Annihilation",
     strict=False, pic="01/garuda_25.jpg", scene=S.g25())

# ================================================================== P2 Ifrit
step(P2, "Crimson Cyclone", "Ifrit โผล่: หาจุดปลอดภัย", "Ifrit arrives: find the safe spot",
     "Ifrit โผล่ที่ทิศหลักทิศหนึ่ง แล้วพุ่งผ่านสนาม\n"
     "ทั้งพื้นเต็มไปด้วย Eruption เหลือจุดปลอดภัยจุดเดียว: 90 องศาจากทิศที่ Ifrit โผล่\n"
     "เวลาน้อยมาก: แนะนำให้ใช้ Sprint",
     "Ifrit spawns on one of the cardinals and charges through the arena\n"
     "The whole floor is covered in Eruptions with one safe spot, 90 degrees from where Ifrit spawned\n"
     "The timing is tight: Sprint is highly recommended",
     strict=False, pic="01/garuda_26.jpg", scene=S.g26(),
     refs=[FR("ifrit-entry", "Ifrit พุ่งผ่านสนาม + Eruption เต็มพื้น: จุดปลอดภัยเดียวอยู่ 90 องศาจาก Ifrit", "Ifrit charges through with Eruptions everywhere: the one safe spot is 90 degrees from Ifrit")])
step(P2, "Infernal Nails", "วิธีปลุก Ifrit + ท่าที่เปลี่ยน", "Waking Ifrit + what changes",
     "Infernal Nail โดน Violent Eruption ที่ผู้เล่นล่อได้: โดน 1 ครั้งได้ 1 stack (สูงสุด 2) และตัวใหญ่ขึ้น\n"
     "แต่ละ stack: ดาเมจที่ Nail รับลดลงประมาณ 10% / raid-wide ตอน Nail ถูกทำลายแรงขึ้น\n"
     "Ifrit ได้ Aetherically Charged 1 stack ทุกครั้งที่ทำลาย Nail ที่มี 2 stack\n\n"
     "ตื่นแล้วเปลี่ยน:\n"
     "Crimson Cyclone: ปกติพุ่งเป็นเส้นตรงวนตามเข็ม / ตื่นแล้ว: พุ่งตามลำดับที่ Nail ถูกทำลาย และตามด้วย AoE รูปกากบาท 45 องศาจากแนวพุ่ง\n"
     "Flaming Crush: ปกติเป็น stack หารดาเมจ / ตื่นแล้ว: ติด DoT หนัก Accursed Flame ด้วย ยิ่งคนรับเยอะยิ่งสั้น: รับอย่างน้อย 6 คน\n\n"
     "ถ้า Tank เป็น PLD + GNB หรือ DPS ของปาร์ตี้สูงจนข้ามท่าพุ่งได้ อาจต้องปรับวิธี tank Ultima Weapon ทีหลัง (ดูขั้นถัดไป)",
     "Infernal Nails can be hit by baited Violent Eruptions: each hit adds a stack (max two) and grows the Nail\n"
     "Each stack: the Nail takes about 10% less damage / the raid-wide when it's destroyed hits harder\n"
     "Ifrit gains one Aetherically Charged whenever a two-stack Nail is destroyed\n\n"
     "Woken changes:\n"
     "Crimson Cyclone: normally straight dashes going clockwise / woken: dashes in the order the Nails were destroyed, followed by a cross-shaped AoE 45 degrees to the dash\n"
     "Flaming Crush: normally a split stack / woken: also a heavy Accursed Flame DoT that shortens with more players: share it with at least six\n\n"
     "With a PLD + GNB, or DPS high enough to skip the dashes, the Ultima Weapon tanking may need adjusting later (next steps)",
     strict=False)
step(P2, "Incinerate", "เปิด: ST tank + Incinerate 3 ครั้ง", "Opener: the ST tanks + three Incinerates",
     "ST ดึง aggro ตอนเริ่ม: tank Ifrit หันหน้าไปทางใต้ ปาร์ตี้อยู่เหนือ\n\n"
     "Ifrit เปิดด้วย Hellfire (raid-wide หนัก) แล้วตามด้วย Vulcan Burst\n"
     "Vulcan Burst: knockback ไกล (เกือบครึ่งสนาม) กันได้ด้วย Arm's Length / Surecast หรือ shield ที่พอ เพราะ knockback เฉพาะคนที่โดนดาเมจ\n"
     "shield ของ H2 กันดาเมจ Vulcan Burst ได้ ยกเว้น H2 ติด Weakness\n\n"
     "แล้ว Ifrit ใช้ Incinerate 3 ครั้งติด: tankbuster รูปกรวย ติด Fire Resistance Down ทุกคนที่โดน\n"
     "ST: ใช้ invuln รับ Incinerate ทั้ง 3 ครั้ง (วิธี \"ตามตำรา\" คือสลับ Tank 2 ครั้ง ระหว่างแต่ละ Incinerate)\n"
     "ครบ 3 ครั้งแล้ว MT Provoke รับ Ifrit ต่อ",
     "The ST takes hate at the start: tank Ifrit facing south, party north\n\n"
     "Ifrit opens with Hellfire (heavy raid damage), then Vulcan Burst\n"
     "Vulcan Burst: a large knockback (just under half the arena), stopped by Arm's Length / Surecast or by enough shields, as it only knocks back a player who takes damage\n"
     "H2's shields nullify Vulcan Burst's damage, unless H2 is weakened\n\n"
     "Then three Incinerates in a row: a conal tankbuster that gives Fire Resistance Down to anyone hit\n"
     "ST: invuln all three (the \"proper\" way is two tank swaps, one between each)\n"
     "After the third, the MT Provokes and takes over",
     strict=["ST"], pic="02/ifrit_01.jpg", scene=S.i01(),
     says={"ST": "tank Ifrit หันใต้ ใช้ invuln รับ Incinerate ทั้ง 3 ครั้ง", "MT": "หลัง Incinerate ครั้งที่ 3 ใช้ Provoke รับ Ifrit", "H2": "shield ทั้งปาร์ตี้กัน Vulcan Burst"},
     says_en={"ST": "Tank Ifrit facing south; invuln all three Incinerates", "MT": "Provoke after the third Incinerate", "H2": "Shield the party for Vulcan Burst"})
step(P2, "Incinerate", "invuln ของ Tank: กรณี PLD / GNB", "Tank invulns: the PLD / GNB edge cases",
     "ถ้ามี PLD หรือ GNB และอาจข้ามท่าพุ่งของ Ifrit ได้ ต้องคิดลำดับ invuln:\n"
     "ข้ามท่าพุ่ง: จาก Incinerate ชุดแรกของ Ifrit ถึง Homing Lasers หลัง Ultimate Predation ห่างกันราว 6:30 (PLD invuln ทั้ง 2 ครั้งไม่ทัน)\n"
     "ไม่ข้าม: จาก Incinerate ชุดที่ 2 ถึง Homing Lasers หลัง Ultimate Predation ห่างกันราว 5:40 (GNB และ PLD invuln ทั้ง 2 ครั้งไม่ทัน)\n\n"
     "แก้ได้โดยสลับ Tank รับ Incinerate ชุดที่ 2 แทนการใช้ invuln ของ MT (แต่ปกติไม่ค่อยมีใครทำ)",
     "With a PLD or GNB, and a chance of skipping Ifrit's dashes, plan the invulns:\n"
     "Skipping the dashes: about 6:30 from Ifrit's first Incinerates to the Homing Lasers after Ultimate Predation (a PLD can't invuln both)\n"
     "Not skipping: about 5:40 from Ifrit's second Incinerates to those Homing Lasers (GNB and PLD can't invuln both)\n\n"
     "You can fix it by tank swapping Ifrit's second Incinerates instead of using the MT's invuln (rarely practised)",
     strict=False)

IN = "Infernal Nails"
step(P2, IN, "① Nail 4 อัน + Searing Wind: เข้าที่", "① Four Nails + Searing Wind: positions",
     "Infernal Nail 4 อันโผล่เป็นรูปสี่เหลี่ยมคางหมู หันทิศสุ่ม\n"
     "Ifrit ใส่ Searing Wind ให้ Healer สุ่ม 1 คน\n\n"
     "ทิศในภาพนับจาก Nail: ด้านบน = คู่ Nail ที่ใกล้กัน",
     "Four Infernal Nails spawn in a trapezium, in a random orientation\n"
     "Ifrit gives one random healer Searing Wind\n\n"
     "Directions here are relative to the Nails: the top is the close pair",
     strict=["MT", "D3", "D4"], pic="02/ifrit_02.jpg", scene=S.i02(),
     says={"MT": "ลาก Ifrit ไปไว้ระหว่าง Nail คู่ที่ใกล้กัน (ด้านบนของคางหมู) และจำตำแหน่งนี้ไว้",
           "D3": "ยืนข้าง Nail ล่างซ้าย ห่างจาก MT ราว 135 องศา", "D4": "ยืนข้าง Nail ล่างขวา ห่างจาก MT ราว 135 องศา",
           "H1": "ถ้าได้ Searing Wind: ยืนฝั่งตรงข้าม MT", "H2": "ถ้าได้ Searing Wind: ยืนฝั่งตรงข้าม MT"},
     says_en={"MT": "Bring Ifrit between the two close Nails (the top) and remember where this is",
              "D3": "Beside the bottom-left Nail, about 135 degrees from the MT", "D4": "Beside the bottom-right Nail, about 135 degrees from the MT",
              "H1": "With Searing Wind: stand opposite the MT", "H2": "With Searing Wind: stand opposite the MT"},
     refs=[FR("infernal-nails", "Infernal Nails: Nail ไฟรอบ Ifrit · ให้โดน Eruption 2 ครั้งแล้วค่อยทำลาย", "Infernal Nails: the fire nails around Ifrit · let each take two Eruptions, then destroy it")])
step(P2, IN, "② D3 D4 ล่อ Eruption ใส่ Nail", "② D3 and D4 bait Eruptions onto the Nails",
     "สองคนที่ไกล Ifrit ที่สุด (ไม่นับคนมี Searing Wind) ล่อ Violent Eruption คนละ 4 ลูก: ต้องเป็น D3 กับ D4\n\n"
     "2 ลูกแรก: ให้โดน Nail ล่างของตัวเอง (ซ้าย / ขวา)\n"
     "2 ลูกหลัง: ให้โดน Nail บน 2 อัน (เผื่อไว้ ถ้าใครช้าจน Nail ที่ 4 ไม่โดน)",
     "The two players furthest from Ifrit (not counting Searing Wind) bait four Violent Eruptions each: D3 and D4\n\n"
     "The first two: onto your bottom Nail (left / right)\n"
     "The last two: onto the top two Nails (a backup if someone is slow and misses the fourth Nail)",
     strict=["MT"], pic="02/ifrit_03.jpg", scene=S.i03(),
     says={"D3": "Eruption 2 ลูกแรกใส่ Nail ล่างซ้าย แล้ว 2 ลูกหลังใส่ Nail บน", "D4": "Eruption 2 ลูกแรกใส่ Nail ล่างขวา แล้ว 2 ลูกหลังใส่ Nail บน"},
     says_en={"D3": "First two Eruptions on the bottom-left Nail, the last two on the top Nails", "D4": "First two Eruptions on the bottom-right Nail, the last two on the top Nails"})
step(P2, IN, "③ ทำลาย Nail แบบ Reverse-Z", "③ Destroy the Nails in a Reverse-Z",
     "Nail ที่โดน Eruption ครบ 2 ครั้ง (2 stack) แล้วค่อยทำลาย\n"
     "ลำดับ Reverse-Z: ล่างขวา > ล่างซ้าย > บนขวา > บนซ้าย\n\n"
     "Nail ยิ่งใหญ่ยิ่งรับดาเมจน้อย: ตีลด HP ไว้ตอนยังเล็ก (แต่อย่าให้แตก)\n"
     "ทำลาย Nail แต่ละอัน ทั้งปาร์ตี้โดน raid-wide และรับดาเมจเพิ่มชั่วครู่: เว้นจังหวะให้ heal ทัน\n\n"
     "DPS สุ่ม 1 คนถูกโซ่ Infernal Fetters ผูกกับคนที่ aggro อันดับ 2: DoT + ตีเบาลง + โดนแรงขึ้น ยิ่งโซ่ยาวยิ่งแรง แต่แทบไม่มีผล\n\n"
     "จำตำแหน่ง Nail อันที่ 4 ไว้: เป็นจุดเริ่มหลบท่าพุ่งของ Ifrit ทีหลัง\n"
     "ทำถูก Ifrit ได้ 4 stack (Nail ละ 1) ตื่นพร้อมพูดประโยคตอนตื่น และตัวเรืองแสงสีฟ้า (สำคัญทีหลัง)",
     "Destroy a Nail once it has taken its second Eruption (two stacks)\n"
     "Reverse-Z order: bottom-right > bottom-left > top-right > top-left\n\n"
     "Nails take less damage as they grow: lower their HP while small (without breaking them)\n"
     "Each Nail destroyed deals a raid-wide and briefly raises damage taken: leave time to heal between\n\n"
     "One random DPS is chained to the second-in-aggro by Infernal Fetters: a DoT, less damage dealt, more taken, growing with the chain's length, but negligible\n\n"
     "Remember where the fourth Nail was: the start for dodging Ifrit's dashes later\n"
     "Done right, Ifrit gets four stacks (one per Nail), wakes with his line, and glows blue (important later)",
     strict=False, pic="02/ifrit_04.jpg", scene=S.i04())

CC = "Crimson Cyclone"
step(P2, CC, "พุ่งชุดที่ 1 ①: Hellfire + เข้าที่", "Dashes #1 ①: Hellfire + positions",
     "Ifrit กลับมาพร้อม Hellfire (raid-wide หนัก)\n"
     "แล้วใส่ Searing Wind ให้ Healer สุ่มอีกครั้ง",
     "Ifrit returns with Hellfire (heavy raid-wide)\n"
     "Then gives a random healer Searing Wind again",
     strict=["MT", "D3", "D4"], pic="02/ifrit_05.jpg", scene=S.i05(),
     says={"MT": "ลาก Ifrit ไปมุมทแยงที่ใกล้ตำแหน่ง Nail อันที่ 4", "D3": "ยืนล่างขวา ห่างปาร์ตี้ราว 135 องศา", "D4": "ยืนล่างขวา ห่างปาร์ตี้ราว 135 องศา",
           "H1": "ถ้าได้ Searing Wind: ยืนล่างซ้าย ห่างปาร์ตี้ราว 135 องศา", "H2": "ถ้าได้ Searing Wind: ยืนล่างซ้าย ห่างปาร์ตี้ราว 135 องศา"},
     says_en={"MT": "Pull Ifrit to the intercardinal near where the fourth Nail was", "D3": "Bottom-right, about 135 degrees from the party", "D4": "Bottom-right, about 135 degrees from the party",
              "H1": "With Searing Wind: bottom-left, about 135 degrees from the party", "H2": "With Searing Wind: bottom-left, about 135 degrees from the party"})
step(P2, CC, "พุ่งชุดที่ 1 ②: D3 D4 ล่อ Eruption ทวนเข็ม", "Dashes #1 ②: D3 and D4 bait Eruptions anticlockwise",
     "D3 กับ D4 ล่อ Violent Eruption อีก 2 ชุดด้วยกัน เดินทวนเข็ม แล้วกลับเข้า stack กับปาร์ตี้\n"
     "Healer ที่มี Searing Wind ก็หมุนทวนเข็ม ไปจบที่ฝั่งตรงข้ามปาร์ตี้พอดี",
     "D3 and D4 bait two more sets of Violent Eruptions together, moving anticlockwise, then join the party\n"
     "The healer with Searing Wind also rotates anticlockwise to end directly opposite the party",
     strict=False, pic="02/ifrit_06.jpg", scene=S.i06())
step(P2, CC, "พุ่งชุดที่ 1 ③: ร่างแยก 2 ตัวพุ่งตามแนวทิศหลัก", "Dashes #1 ③: two clones dash on the cardinals",
     "ร่างแยก Ifrit 2 ตัวโผล่ที่ทิศหลัก แล้วพุ่งข้ามสนาม\n"
     "ชุดนี้พุ่งตามแนวทิศหลักเสมอ",
     "Two Ifrit clones spawn on cardinals and dash across the arena\n"
     "These dashes are always along the cardinals",
     strict=False, pic="02/ifrit_07.jpg", scene=S.i07())
step(P2, CC, "พุ่งชุดที่ 1 ④: Searing Wind อีกคน + Flaming Crush", "Dashes #1 ④: Searing Wind on the other healer + Flaming Crush",
     "Ifrit ใส่ Searing Wind ให้ Healer อีกคน\n"
     "Healer คนแรก: หมุนกลับตามเข็ม ไปอยู่ล่างซ้ายของปาร์ตี้ (ราว 135 องศา)\n"
     "Healer คนใหม่: ไปล่างขวา ห่างปาร์ตี้ (ราว 135 องศา)\n\n"
     "Ifrit ใช้ Flaming Crush (แบบตื่น) ใส่ผู้เล่นสุ่ม: stack รับ 6 คน\n\n"
     "ถ้า DPS ดี ฆ่า Ifrit ได้ตรงนี้ ข้ามท่าพุ่งชุดที่ 2",
     "Ifrit gives the other healer Searing Wind\n"
     "The first healer: rotate back clockwise to the party's bottom-left (about 135 degrees)\n"
     "The new healer: move bottom-right, away from the party (about 135 degrees)\n\n"
     "Ifrit targets a random player with a woken Flaming Crush: take it as a 6-player stack\n\n"
     "With good DPS, Ifrit dies here and the second set of dashes is skipped",
     strict=False, pic="02/ifrit_08.jpg", scene=S.i08())
step(P2, CC, "พุ่งชุดที่ 2 ①: หา Ifrit สีฟ้า", "Dashes #2 ①: find the blue Ifrit",
     "Ifrit 4 ตัวโผล่รอบนอกสนาม: 3 ตัวเป็นร่างแยก ตัวจริง (ตื่นแล้ว) เรืองแสงสีฟ้า\n"
     "ตัวจริงมี afterburn: AoE รูปกากบาท (X) ไม่มีวงเตือน เอียง 45 องศาจากแนวพุ่ง\n"
     "Ifrit ทั้ง 4 พุ่งตามลำดับที่ Nail ถูกทำลาย\n\n"
     "ไปยืนตรงที่ Nail อันที่ 4 เคยอยู่ / Healer ที่มี Searing Wind อยู่ฝั่งตรงข้ามปาร์ตี้พอดี\n"
     "หา Ifrit ที่เรืองแสงสีฟ้า\n"
     "ทุกคนวิ่งทวนเข็ม ไปจบที่ 90 หรือ 180 องศาจาก Ifrit สีฟ้า\n"
     "ต้องวิ่งเข้าแนวพุ่ง 1 หรือ 2 ครั้งเสมอ\n\n"
     "ตัวอย่างในภาพ: Ifrit สีฟ้าอยู่ตรงตำแหน่ง Nail อันที่ 4 ปาร์ตี้ต้องวิ่ง 2 ครั้ง",
     "Four Ifrits appear outside the arena: three clones and the real (woken) one glowing blue\n"
     "The real one has an afterburn: an untelegraphed X-shaped AoE 45 degrees from its dash\n"
     "All four dash in the order the Nails were destroyed\n\n"
     "Stand where the fourth Nail was / the healer with Searing Wind directly opposite the party\n"
     "Find the Ifrit glowing blue\n"
     "Everyone runs anticlockwise to end 90 or 180 degrees from the blue Ifrit\n"
     "You always have to move into one or two dashes to do this\n\n"
     "The example: the blue Ifrit is at the fourth Nail, so the party moves twice",
     strict=False, pic="02/ifrit_09.jpg", scene=S.i09(),
     refs=[FR("ifrit-blue", "Crimson Cyclone: Ifrit พุ่งข้ามสนาม · ตัวจริงเรืองแสงสีฟ้า มี AoE กากบาทตามหลัง", "Crimson Cyclone: the Ifrits dash across · the real one glows blue and leaves an X behind")])
step(P2, CC, "พุ่งชุดที่ 2 ②: พุ่งครั้งที่ 1", "Dashes #2 ②: the first dash",
     "Ifrit ตัวแรกพุ่ง\n"
     "พุ่งผ่านแล้ววิ่งเข้าแนวนั้นทันที",
     "The first Ifrit dashes\n"
     "Move into its lane right after the dash",
     strict=False, pic="02/ifrit_10.jpg", scene=S.i10())
step(P2, CC, "พุ่งชุดที่ 2 ③: พุ่งครั้งที่ 2", "Dashes #2 ③: the second dash",
     "Ifrit ตัวที่ 2 พุ่ง\n"
     "ถ้าจำเป็น พุ่งผ่านแล้ววิ่งเข้าแนวนั้น",
     "The second Ifrit dashes\n"
     "Move into its lane after the dash, if you need to",
     strict=False, pic="02/ifrit_11.jpg", scene=S.i11())
step(P2, CC, "พุ่งชุดที่ 2 ④: พุ่งครั้งที่ 3", "Dashes #2 ④: the third dash",
     "Ifrit ตัวที่ 3 พุ่ง\nถึงตรงนี้ปาร์ตี้ไม่ต้องขยับแล้ว",
     "The third Ifrit dashes\nThe party shouldn't need to move now",
     strict=False, pic="02/ifrit_12.jpg", scene=S.i12())
step(P2, CC, "พุ่งชุดที่ 2 ⑤: พุ่งครั้งที่ 4", "Dashes #2 ⑤: the fourth dash",
     "Ifrit ตัวที่ 4 พุ่ง\nปาร์ตี้ไม่ต้องขยับ",
     "The fourth Ifrit dashes\nThe party shouldn't need to move",
     strict=False, pic="02/ifrit_13.jpg", scene=S.i13())
step(P2, CC, "พุ่งชุดที่ 2 ⑥: afterburn ของตัวจริง", "Dashes #2 ⑥: the real one's afterburn",
     "ตัวอย่างนี้ตัวที่ 4 เป็นตัวจริง (ตื่นแล้ว): หลังพุ่งมี AoE afterburn รูปกากบาท\n"
     "afterburn นี้อาจซ้อนกับขั้นไหนก็ได้ใน 3 ขั้นก่อนหน้า ขึ้นกับว่าตัวจริงเป็นตัวไหน",
     "In this example the fourth Ifrit was the real (woken) one: an X-shaped afterburn follows its dash\n"
     "It can land on top of any of the three previous steps, depending on which Ifrit is real",
     strict=False, pic="02/ifrit_14.jpg", scene=S.i14())

step(P2, "Incinerate", "ปิดท้าย ①: Searing Wind ยังเหลืออีก 1 ครั้ง", "Wrapping up ①: Searing Wind pulses once more",
     "Ifrit กลับมากลางสนาม\n"
     "Searing Wind ของ Healer ยังระเบิดอีก 1 ครั้งก่อนหมด",
     "Ifrit returns to the centre\n"
     "The Searing Wind healer still has one more pulse before it wears off",
     strict=["D3", "D4"], pic="02/ifrit_15.jpg", scene=S.i15(),
     says={"H1": "ถ้ามี Searing Wind: รอให้ระเบิดครั้งสุดท้ายก่อน แล้วค่อยกลับเข้าปาร์ตี้", "H2": "ถ้ามี Searing Wind: รอให้ระเบิดครั้งสุดท้ายก่อน แล้วค่อยกลับเข้าปาร์ตี้",
           "D3": "ไปยืนห่างจาก MT ราว 135 องศา", "D4": "ไปยืนห่างจาก MT ราว 135 องศา"},
     says_en={"H1": "With Searing Wind: wait for its last pulse before rejoining", "H2": "With Searing Wind: wait for its last pulse before rejoining",
              "D3": "Stand about 135 degrees from the MT", "D4": "Stand about 135 degrees from the MT"})
step(P2, "Incinerate", "ปิดท้าย ②: Incinerate 3 ครั้ง (MT invuln)", "Wrapping up ②: three Incinerates (MT invuln)",
     "Ifrit ใช้ Incinerate 3 ครั้ง: tankbuster เดียวกับตอนเปิดช่วงนี้",
     "Ifrit Incinerates three times: the same tankbuster as at the start",
     strict=["MT"], pic="02/ifrit_16.jpg", scene=S.i16(),
     says={"MT": "ใช้ invuln รับ Incinerate ทั้ง 3 ครั้ง"}, says_en={"MT": "Invuln all three Incinerates"})
step(P2, "Flaming Crush", "ปิดท้าย ③: Eruption + Flaming Crush + enrage", "Wrapping up ③: Eruptions + Flaming Crush + enrage",
     "สองคนที่ไกล Ifrit ที่สุด (D3 กับ D4) ล่อ Violent Eruption อีก 4 ลูก แล้วกลับเข้าปาร์ตี้รับ Flaming Crush (stack)\n"
     "จากนั้น Ifrit กระโดด หายตัว แล้ว enrage (Hellfire)\n\n"
     "Ifrit ที่ตื่นแล้วตาย: ทิ้งวงแสงให้ Beyond Limits เหมือนกัน\n"
     "Beyond Limits ของ Ifrit: Caster (macro: Limit Break = Caster)",
     "The two furthest from Ifrit (D3 and D4) bait four more Violent Eruptions, then join the party for the Flaming Crush stack\n"
     "Then Ifrit jumps, becomes untargetable and enrages (Hellfire)\n\n"
     "A woken Ifrit also leaves a Beyond Limits puddle\n"
     "Ifrit's Beyond Limits: a caster (macro: Limit Break = Caster)",
     strict=False, pic="02/ifrit_17.jpg", scene=S.i17())

# ================================================================== P3 Titan
step(P3, "Geocrush", "Titan ลงกลางสนาม: ไปชิดขอบ", "Titan lands in the centre: go to the edge",
     "Titan ลงกลางสนาม ดาเมจตามระยะ (Geocrush) ใส่ทุกคน\n"
     "Geocrush ดาเมจลดลงเร็วมากตามระยะ: มองเป็น AoE ใหญ่ตรงกลางได้เลย\n"
     "ยืนชิดขอบสนามสุด จะได้ไม่ตายจาก Geocrush",
     "Titan lands in the centre with proximity damage (Geocrush) on everyone\n"
     "Its damage drops off very sharply: treat it as a very large central AoE\n"
     "Stand all the way at the edge so it doesn't kill you",
     strict=False, pic="02/ifrit_18.jpg", scene=S.i18())
step(P3, "Granite Gaol", "วิธีปลุก Titan + ท่าที่เปลี่ยน", "Waking Titan + what changes",
     "Titan ปลุกยากที่สุดใน 3 ตัว\n\n"
     "หลัง knockback Titan เลือกผู้เล่นสุ่ม 3 คน (ไม่รวม MT) ขังใน Granite Gaol\n"
     "หินก้อนหนึ่งโผล่ฝั่งตรงข้าม Titan แล้วระเบิดเป็น AoE\n"
     "Gaol ที่โดน AoE นี้ระเบิด ทิ้งบ่อโคลน (ทำให้เดินช้า + DoT) และระเบิดต่อไปโดน Gaol อื่นๆ ด้วย\n"
     "ไอเดีย: เรียง 3 คนที่ติด Gaol เป็นแถวระหว่าง Titan กับหินฝั่งตรงข้าม ให้ระเบิดต่อกันจนบ่อโคลนแตะตัว Titan\n"
     "Titan ได้ Aetherically Charged 1 stack ต่อ DoT ที่ติดจากบ่อโคลน 1 ครั้ง\n\n"
     "ลำดับ Gaol (macro): D1 > D2 > ST > D3 > D4 > H1 > H2\n"
     "ใช้ automarker มาร์ก Gaol เป็นเรื่องปกติ (ใช้ด้วยความเสี่ยงของตัวเอง): เลขน้อยวาง Gaol ใกล้ Titan (macro ภาษาญี่ปุ่น)\n\n"
     "ตื่นแล้วเปลี่ยน:\n"
     "Landslide: ปกติเป็นแนวตรง 5 เส้น / ตื่นแล้ว: ตามด้วยอีก 5 เส้นที่แบ่งครึ่งระหว่างชุดแรก\n"
     "Weight of the Land: ปกติวงใต้ผู้เล่นสุ่ม 2 ชุด / ตื่นแล้ว: 3 ชุด",
     "Titan is the last and easily the hardest primal to wake\n\n"
     "After a knockback, Titan traps three random players (not the MT) in Granite Gaols\n"
     "A boulder spawns opposite Titan and explodes in an AoE\n"
     "A Gaol hit by it explodes, leaving a sludge puddle (slow + DoT), and sets off any other Gaol it hits\n"
     "The idea: line the three gaoled players up between Titan and that boulder so the chain puts sludge under Titan\n"
     "Titan gains one Aetherically Charged per DoT tick from the sludge\n\n"
     "Gaol priority (macro): D1 > D2 > ST > D3 > D4 > H1 > H2\n"
     "Automarkers for the Gaols are the norm (use at your own risk): lower numbers go nearer Titan (the Japanese macro)\n\n"
     "Woken changes:\n"
     "Landslide: normally five straight lines / woken: a second five that bisect the first\n"
     "Weight of the Land: normally two sets under random players / woken: three",
     strict=False)
step(P3, "Mountain Buster", "เปิด: MT tank + Rock Buster > Mountain Buster", "Opener: the MT tanks + Rock Buster > Mountain Buster",
     "MT ดึง aggro ตอนเริ่ม: tank Titan หันหน้าไปทางใต้ ปาร์ตี้อยู่เหนือ\n"
     "Titan เปิดด้วย Earthen Fury (raid-wide หนัก) แล้วเริ่มชุด Rock Buster > Mountain Buster\n"
     "Mountain Buster อันตรายเป็นพิเศษ เพราะมี Rock Buster มาก่อนเสมอ",
     "The MT takes hate at the start: tank Titan facing south, party north\n"
     "Titan opens with Earthen Fury (heavy raid damage) and starts a Rock Buster > Mountain Buster sequence\n"
     "Mountain Buster is especially dangerous as it always follows a Rock Buster",
     strict=["MT"], pic="03/titan_01.jpg", scene=S.t01(),
     says={"MT": "tank Titan หันหน้าไปทางใต้"}, says_en={"MT": "Tank Titan facing south"})
step(P3, "Weight of the Land", "Weight of the Land 2 ชุด แล้ว Titan หันทิศ", "Two Weights of the Land, then Titan turns",
     "ผู้เล่นโดนเป้า Weight of the Land 2 ชุด\n"
     "ชุดแรก: stack กันหลัง Titan\n"
     "ชุดที่ 2: หลบไปซ้าย / ขวา ล่อที่ข้างตัว แล้วกลับมา\n\n"
     "พอชุดที่ 2 ระเบิด Titan หันไปทางทิศหลักแบบสุ่มเร็วๆ แล้วกระโดด",
     "Players are targeted by two sets of Weight of the Land\n"
     "First set: stack together behind Titan\n"
     "Second set: dodge left / right to bait it at the sides, then come back\n\n"
     "When the second set explodes, Titan quickly turns to a random cardinal before jumping",
     strict=False, pic="03/titan_02.jpg", scene=S.t02(),
     refs=[FR("titan-facing", "Titan หันไปทางทิศหลักทิศหนึ่งก่อนกระโดด: ไปฝั่งตรงข้ามกับที่หัน", "Titan turns to a cardinal before jumping: go to the opposite side")])

GG = "Granite Gaol"
step(P3, GG, "① ไปฝั่งตรงข้ามทิศที่ Titan หัน", "① Go opposite where Titan faced",
     "ไปฝั่งตรงข้ามกับทิศที่ Titan หันก่อนกระโดด",
     "Move to the side opposite where Titan faced before he jumped",
     strict=False, pic="03/titan_03.jpg", scene=S.t03())
step(P3, GG, "② เข้าใกล้ Titan: ยืนให้ knockback เข้าช่อง", "② Close in on Titan: stand to be knocked into the gap",
     "เดินเข้าไปใกล้ Titan\n"
     "หินชุดหนึ่งโผล่ฝั่งตรงข้ามสนาม มีช่องว่างทางซ้ายหรือขวา\n"
     "ยืนเยื้องไปซ้ายหรือขวาของ Titan นิดหน่อย ให้ knockback ส่งเข้าช่องพอดี\n"
     "ปาร์ตี้ยืนฝั่งเดียวกับหัวลูกศรของวงเป้า (target circle) ของ Titan",
     "Move up to Titan\n"
     "A formation of boulders spawns on the far side with a gap on the left or right\n"
     "Stand just left or right of Titan so the knockback sends you into the gap\n"
     "The party stands on the side of the arrowhead of Titan's targeting circle",
     strict=False, pic="03/titan_04.jpg", scene=S.t04(),
     refs=[FR("titan-boulders", "หินเรียงฝั่งตรงข้าม มีช่องซ้ายหรือขวา · ยืนเยื้องข้าง Titan ให้ knockback เข้าช่อง", "The boulders across the arena with a gap left or right · stand off to Titan's side to be knocked into it")])
step(P3, GG, "③ Knockback", "③ Knockback",
     "knockback\n"
     "ท่านี้ใช้ Arm's Length / Surecast กันไม่ได้",
     "Knockback\n"
     "It can't be nullified with Arm's Length / Surecast",
     strict=False, pic="03/titan_05.jpg", scene=S.t05())
step(P3, GG, "④ Granite Gaol 3 คน + Landslide", "④ Three Granite Gaols + Landslide",
     "ผู้เล่นสุ่ม 3 คน (ไม่รวม MT) โดนเป้า Granite Gaol ขณะที่ Titan เตรียม Landslide\n"
     "หินก้อนหนึ่งตกลงในช่องว่างเมื่อกี้แล้วระเบิด\n\n"
     "เป้าหมาย: ต่อ Gaol เป็นแถวเชื่อม Titan กับหินที่ระเบิดก้อนแรก\n"
     "คนที่ติด Gaol ต้องหลบ Landslide ชุดนี้",
     "Three random players (not the MT) are targeted by Granite Gaols while Titan readies Landslides\n"
     "A boulder drops into the gap from before and explodes\n\n"
     "The goal: a chain of Gaols connecting Titan to that first exploding boulder\n"
     "Gaoled players must dodge this Landslide",
     strict=False, pic="03/titan_06.jpg", scene=S.t06(),
     refs=[FR("landslide", "Landslide: เส้นตรงจาก Titan · คนที่ติด Gaol ต้องหลบชุดนี้", "Landslide: straight lines from Titan · gaoled players must dodge this set")])
step(P3, GG, "⑤ Landslide ชุดที่ 2 + Gaol ระเบิด", "⑤ The second Landslide + the Gaols explode",
     "Titan ใช้ Landslide ชุดที่ 2 ขณะที่หินระเบิด\n"
     "คนที่ติด Gaol ไม่ต้องหลบชุดนี้\n"
     "แต่พอ Gaol ของตัวเองระเบิด ต้องรีบไปรวมกับปาร์ตี้ทางซ้ายของ Titan เพราะจะมีบ่อโคลนเหลืออยู่",
     "Titan casts a second Landslide while the boulders explode\n"
     "Gaoled players don't need to dodge this one\n"
     "But join the party on Titan's left as soon as your Gaol explodes, as a sludge puddle is left behind",
     strict=False, pic="03/titan_07.jpg", scene=S.t07())
step(P3, GG, "⑥ Tumult 8 ครั้ง + สลับ Tank", "⑥ Eight Tumults + tank swap",
     "ระหว่าง Gaol ระเบิด Titan เริ่ม Tumult 8 ครั้ง\n"
     "ถ้าทำถูก Gaol 3 อันทิ้งบ่อโคลนต่อกันเป็นแนวถึงตัว Titan\n"
     "ทุกครั้งที่ Titan ยืนในบ่อโคลนแล้วโดน DoT: Titan ได้ Aetherically Charged 1 stack\n\n"
     "Tank: สลับ Tank ตรงนี้ (ST ถือ aggro ต่อ)",
     "While the Gaols explode, Titan starts eight Tumults\n"
     "Done right, the three Gaols leave a line of sludge puddles reaching Titan\n"
     "Every tick Titan stands in the sludge gives him an Aetherically Charged stack\n\n"
     "Tanks: swap here (the ST now holds hate)",
     strict=False, pic="03/titan_08.jpg", scene=S.t08(),
     says={"ST": "Provoke รับ Titan (สลับ Tank)"}, says_en={"ST": "Provoke Titan (tank swap)"})

WL = "Landslide"
step(P3, WL, "Titan ตื่น ①: Weight of the Land 2 ชุด", "Woken Titan ①: two Weights of the Land",
     "ปาร์ตี้ stack รวมกันทางซ้าย Titan เริ่ม Weight of the Land 2 ชุด\n"
     "ระหว่างนี้ Titan ตื่น (ตะโกนประโยคตอนตื่น)",
     "With the party stacked on the left, Titan starts two Weights of the Land\n"
     "During this, Titan wakes (he shouts his line)",
     strict=False, pic="03/titan_09.jpg", scene=S.t09())
step(P3, WL, "Titan ตื่น ②: Weight of the Land ชุดที่ 2", "Woken Titan ②: the second Weight of the Land",
     "Weight of the Land ชุดที่ 2",
     "The second set of Weight of the Land",
     strict=False, pic="03/titan_10.jpg", scene=S.t10())
step(P3, WL, "Titan ตื่น ③: Landslide 2 ชุด", "Woken Titan ③: two sets of Landslides",
     "Titan เตรียม Landslide อีกครั้ง\n"
     "ตื่นแล้วมี Landslide 2 ชุด\n"
     "แค่เดินเข้าแนวของชุดแรก ก็หลบชุดที่ 2 ได้",
     "Titan readies Landslides again\n"
     "Now woken, there are two sets\n"
     "Simply move into the first set's lines to dodge the second",
     strict=False, pic="03/titan_11.jpg", scene=S.t11())
step(P3, WL, "Titan ตื่น ④: Landslide ชุดที่ 2 (ไม่มีวงเตือน)", "Woken Titan ④: the second (untelegraphed) Landslides",
     "Landslide ชุดที่ 2 ไม่มีวงเตือน แบ่งครึ่งระหว่างเส้นของชุดแรก",
     "The second (untelegraphed) set bisects the first",
     strict=False, pic="03/titan_12.jpg", scene=S.t12(),
     says={"ST": "ลาก Titan ไปกลางสนาม"}, says_en={"ST": "Bring Titan to the centre"})

MK = "Weight of the Land"
step(P3, MK, "Mario Kart ①: Titan หันแล้วกระโดด สนามเล็กลง", "Mario Kart ①: Titan turns and jumps, the arena shrinks",
     "Titan หันไปทางทิศหลักทิศหนึ่งอีกครั้งก่อนกระโดด\n"
     "ปาร์ตี้ไปฝั่งตรงข้ามกับที่ Titan หัน เพื่อหลบดาเมจ Geocrush ที่ถึงตาย และสนามเล็กลงอีก",
     "Titan briefly turns to a cardinal again before jumping\n"
     "The party moves opposite where he faced to avoid lethal Geocrush damage, and the arena shrinks again",
     strict=False, pic="03/titan_13.jpg", scene=S.t13())
step(P3, MK, "Mario Kart ②: Gaol ที่ Healer: ทำลายเร็ว", "Mario Kart ②: a healer's Gaol: break it fast",
     "Healer สุ่ม 1 คนโดน Gaol\n"
     "รอบนี้ต้องทำลาย Granite Gaol ให้เร็ว ให้ Healer มีเวลาหลบ Landslide ที่จะมา\n"
     "ถ้าทำลายหลัง Landslide: เสี่ยง Gaol ระเบิดแล้วปาร์ตี้ล้ม",
     "One random healer is gaoled\n"
     "This time the party must destroy the Granite Gaol quickly so the healer has time to dodge the coming Landslides\n"
     "Destroying it after the Landslide risks it blowing up and wiping the raid",
     strict=False, pic="03/titan_14.jpg", scene=S.t14())
step(P3, MK, "Mario Kart ③: Landslide ชุดแรก", "Mario Kart ③: the first Landslides",
     "Landslide ชุดแรก (มีวงเตือน)\n"
     "หลบเข้าแนวของชุดนี้ เพื่อไม่โดนชุดที่ตามมา",
     "The first, telegraphed Landslides\n"
     "Dodge into them to avoid the follow-up set",
     strict=False, pic="03/titan_15.jpg", scene=S.t15())
step(P3, MK, "Mario Kart ④: Landslide ชุดที่ 2", "Mario Kart ④: the second Landslides",
     "Landslide ชุดที่ 2 (ไม่มีวงเตือน)",
     "The second (untelegraphed) Landslides",
     strict=False, pic="03/titan_16.jpg", scene=S.t16())
step(P3, MK, "Mario Kart ⑤: Tumult 8 ครั้ง + Mountain Buster ใส่ ST", "Mario Kart ⑤: eight Tumults + Mountain Buster on the ST",
     "Titan ใช้ Tumult 8 ครั้ง แล้วใช้ Rock Buster > Mountain Buster ใส่ ST",
     "Titan does another eight Tumults, then Rock Buster > Mountain Buster on the ST",
     strict=False, pic="03/titan_17.jpg", scene=S.t17(),
     says={"MT": "Provoke ดึง aggro กลับมา", "ST": "รับ Rock Buster > Mountain Buster ที่ขอบสนาม"},
     says_en={"MT": "Provoke and take hate back", "ST": "Take Rock Buster > Mountain Buster at the edge"})
step(P3, MK, "Mario Kart ⑥: หินตกกลาง + Weight of the Land 3 ชุด", "Mario Kart ⑥: rocks fill the centre + three Weights of the Land",
     "ทุกคนออกจากกลางสนาม ไป stack กับ ST ที่ขอบ: หินตกลงกลางสนาม ใช้พื้นตรงกลางไม่ได้\n"
     "Titan เริ่ม Weight of the Land 3 ชุด\n\n"
     "Tank + Melee: วนทวนเข็ม ออกห่าง Titan\n"
     "Healer + Range: วนตามเข็ม ออกห่าง Titan",
     "Everyone leaves the centre and stacks with the ST at the edge: rocks drop in the middle and remove it from play\n"
     "Titan starts three Weights of the Land\n\n"
     "Tanks + melee: rotate anticlockwise, away from Titan\n"
     "Healers + range: rotate clockwise, away from Titan",
     strict=False, pic="03/titan_18.jpg", scene=S.t18(),
     refs=[FR("weight-of-the-land", "Weight of the Land 3 ชุด · Tank+Melee วนทวนเข็ม / Healer+Range วนตามเข็ม", "Three Weights of the Land · tanks + melee anticlockwise / healers + range clockwise")])
step(P3, MK, "Mario Kart ⑦: ชุดที่ 2", "Mario Kart ⑦: the second set",
     "Weight of the Land ชุดที่ 2: แยกเป็น 2 กลุ่ม\n"
     "Tank + Melee ทวนเข็ม / Healer + Range ตามเข็ม",
     "The second Weight of the Land: two groups\n"
     "Tanks + melee anticlockwise / healers + range clockwise",
     strict=["MT", "ST", "H1", "H2"], pic="03/titan_19.jpg", scene=S.t19())
step(P3, MK, "Mario Kart ⑧: ชุดที่ 3 + Landslide", "Mario Kart ⑧: the third set + Landslide",
     "Weight of the Land ชุดที่ 3 มาพร้อม Landslide\n"
     "วิ่งต่อไป แล้วหลบเข้าแนวของ Landslide ชุดแรก",
     "The third Weight of the Land comes with another Landslide\n"
     "Keep running and dodge into the first set of Landslides",
     strict=False, pic="03/titan_20.jpg", scene=S.t20())
step(P3, MK, "Mario Kart ⑨: Landslide ชุดที่ 2", "Mario Kart ⑨: the second Landslides",
     "Landslide ชุดที่ 2",
     "The second set of Landslides",
     strict=False, pic="03/titan_21.jpg", scene=S.t21())
step(P3, MK, "ช่วงท้าย ①: Mountain Buster ใส่ MT", "The end ①: Mountain Buster on the MT",
     "MT ออกห่างปาร์ตี้ รับ Rock Buster > Mountain Buster อีกชุด\n"
     "ปาร์ตี้ stack กลางสนาม เตรียมล่อ Weight of the Land\n\n"
     "ส่วนใหญ่ฆ่า Titan ได้ตรงนี้",
     "The MT moves away from the party for another Rock Buster > Mountain Buster\n"
     "The party stacks in the centre, ready to bait Weight of the Land\n\n"
     "Most groups kill Titan by this point",
     strict=False, pic="03/titan_22.jpg", scene=S.t22())
step(P3, MK, "ช่วงท้าย ②: Weight of the Land ชุดแรก", "The end ②: the first Weight of the Land",
     "Weight of the Land ชุดแรก",
     "The first set of Weight of the Land",
     strict=False, pic="03/titan_23.jpg", scene=S.t23())
step(P3, MK, "ช่วงท้าย ③: ชุดที่ 2", "The end ③: the second set",
     "Weight of the Land ชุดที่ 2",
     "The second set of Weight of the Land",
     strict=False, pic="03/titan_24.jpg", scene=S.t24())
step(P3, MK, "ช่วงท้าย ④: ชุดที่ 3 + enrage", "The end ④: the third set + enrage",
     "Weight of the Land ชุดที่ 3\n"
     "แล้ว Titan ใช้ Tumult 8 ครั้ง จากนั้นกระโดด หายตัว แล้ว enrage (Earthen Fury)\n\n"
     "Titan ที่ตื่นแล้วตาย: ทิ้งวงแสงให้ Beyond Limits\n"
     "Beyond Limits ของ Titan: Melee (macro: Limit Break = Melee)",
     "The third set of Weight of the Land\n"
     "Titan then does another eight Tumults, jumps, becomes untargetable and enrages (Earthen Fury)\n\n"
     "A woken Titan leaves a Beyond Limits puddle\n"
     "Titan's Beyond Limits: a melee (macro: Limit Break = Melee)",
     strict=False, pic="03/titan_25.jpg", scene=S.t23(3))

# ================================================================== P4 Lahabrea (the transition)
step(P4, "Limit Break", "LB3 ต่อกัน 4 ครั้ง", "Four LB3s in a row",
     "ถึงตรงนี้ Healer 1 / Caster 1 / Melee 1 ต้องมี buff Beyond Limits\n"
     "คนมี Beyond Limits ใช้ LB3 แล้ว buff หาย และ LB3 เติมกลับมาเต็ม: ปาร์ตี้จึงใช้ LB3 ได้ 4 ครั้งติดกัน\n\n"
     "ลำดับ: Caster > Healer > Melee > Tank\n\n"
     "เริ่ม LB ของ Caster ตอน Magitek Bits ลงพื้น (ทั้งปาร์ตี้โดนดาเมจกระแทก)\n"
     "LB อื่นใช้ได้ทันทีที่เกจ LB3 เต็มอีกครั้ง",
     "By now a healer, a caster and a melee should have Beyond Limits\n"
     "Using an LB3 with Beyond Limits consumes it and refills the LB3: the party can LB3 four times in a row\n\n"
     "Order: Caster > Healer > Melee > Tank\n\n"
     "Start the caster LB when the Magitek Bits land (the party takes impact damage)\n"
     "Every other LB as soon as the LB3 bar refills",
     strict=False,
     says={"D3": "ถ้าเป็น Caster ที่มี Beyond Limits: LB3 ตอน Magitek Bits ลง (คนแรก)", "D4": "ถ้าเป็น Caster ที่มี Beyond Limits: LB3 ตอน Magitek Bits ลง (คนแรก)",
           "H1": "ถ้ามี Beyond Limits: LB3 ต่อจาก Caster ทันทีที่เกจเต็ม", "H2": "ถ้ามี Beyond Limits: LB3 ต่อจาก Caster ทันทีที่เกจเต็ม",
           "D1": "ถ้ามี Beyond Limits: LB3 ต่อจาก Healer ทันทีที่เกจเต็ม", "D2": "ถ้ามี Beyond Limits: LB3 ต่อจาก Healer ทันทีที่เกจเต็ม",
           "MT": "LB3 ของ Tank เป็นคนสุดท้าย", "ST": "LB3 ของ Tank เป็นคนสุดท้าย"},
     says_en={"D3": "If you're the caster with Beyond Limits: LB3 when the Magitek Bits land (first)", "D4": "If you're the caster with Beyond Limits: LB3 when the Magitek Bits land (first)",
              "H1": "With Beyond Limits: LB3 after the caster, as soon as the bar refills", "H2": "With Beyond Limits: LB3 after the caster, as soon as the bar refills",
              "D1": "With Beyond Limits: LB3 after the healer, as soon as the bar refills", "D2": "With Beyond Limits: LB3 after the healer, as soon as the bar refills",
              "MT": "The tank LB3 is last", "ST": "The tank LB3 is last"},
     refs=[FR("magitek-bits", "ช่วง Lahabrea: Magitek Bits ลงพื้น · เริ่ม LB3 ต่อกัน Caster > Healer > Melee > Tank", "The Lahabrea transition: the Magitek Bits land · start the LB3 chain, Caster > Healer > Melee > Tank")])

# ================================================================== P5 Ultima
step(P5, "Ultima Aether", "เกจ Ultima Aether = เวลา enrage", "The Ultima Aether gauge = the enrage timer",
     "ไฟต์ต่อจากนี้มีเกจ Ultima Aether: เป็นตัวจับเวลา enrage ของ Ultima\n"
     "เกจถึง 100: Ultima เริ่มท่า enrage\n\n"
     "เกจเพิ่มเมื่อ:\n"
     "Ultima Weapon ใช้ท่าบางท่า (+2)\n"
     "ผู้เล่นโดนลูกบอลเขียว Aetheroplasm (+1 ต่อคนที่โดน)\n"
     "ผู้เล่นตาย (+4 ต่อคน)\n\n"
     "ข้อสุดท้ายสำคัญ: คนตายทำให้ enrage มาเร็วขึ้น นอกจากติด Weakness",
     "From here there is an Ultima Aether gauge: the timer to Ultima's enrage\n"
     "At 100, Ultima starts its enrage\n\n"
     "It builds when:\n"
     "Ultima Weapon performs certain actions (+2)\n"
     "players are hit by green Aetheroplasm orbs (+1 per player hit)\n"
     "a player dies (+4 per death)\n\n"
     "The last matters: deaths bring the enrage forward, on top of Weakness",
     strict=False)

VA = "Viscous Aetheroplasm"
step(P5, VA, "เปิด: Tank Purge + จัด aggro", "Opener: Tank Purge + set the hate",
     "Ultima เปิดด้วย Tank Purge (raid-wide)\n"
     "ระหว่างนี้ Tank 2 คนต้องขึ้นเป็น aggro อันดับ 1 และ 2: MT อันดับ 1 / ST อันดับ 2\n"
     "เวลาไม่มาก: ระวัง ST ดึง aggro จาก MT ไปโดยไม่ตั้งใจ",
     "Ultima opens with Tank Purge (raid-wide)\n"
     "Meanwhile the two tanks become first and second in hate: MT first / ST second\n"
     "There isn't much time: make sure the ST doesn't take hate from the MT by accident",
     strict=False,
     refs=[FR("viscous-aetheroplasm", "Viscous Aetheroplasm: AoE เล็กรอบ MT · MT แยกจากปาร์ตี้ก่อนติด debuff", "Viscous Aetheroplasm: a small AoE around the MT · split away before it lands")])
step(P5, VA, "① Viscous Aetheroplasm ที่ MT", "① Viscous Aetheroplasm on the MT",
     "Ultima ใส่ Viscous Aetheroplasm เป็น AoE เล็กรอบคนที่ aggro อันดับ 1 (MT)\n"
     "คนที่ยืนใกล้จะติด debuff Viscous Aetheroplasm ไปด้วย",
     "Ultima applies Viscous Aetheroplasm in a small AoE around the top of the hate list (the MT)\n"
     "Anyone nearby also gets the Viscous Aetheroplasm debuff",
     strict=["MT", "ST"], pic="04a/predation_01.jpg", scene=S.u_pred1(),
     says={"MT": "แยกออกจากปาร์ตี้รับ Viscous Aetheroplasm คนเดียว"}, says_en={"MT": "Split away from the party to take Viscous Aetheroplasm alone"})
step(P5, VA, "② Homing Lasers ที่ ST", "② Homing Lasers on the ST",
     "Ultima Weapon หันไปหาคนที่ aggro อันดับ 2 (ST) แล้วใช้ Homing Lasers: tankbuster AoE หนัก\n"
     "macro: ช่วงก่อน Predation Homing Lasers ให้ ST ใช้ mitigate เต็มที่",
     "Ultima Weapon turns to the second in hate (the ST) for Homing Lasers: a heavy AoE tankbuster\n"
     "Macro: before Predation, the ST takes these Homing Lasers fully mitigated",
     strict=["ST"], pic="04a/predation_02.jpg", scene=S.u_pred2(),
     says={"MT": "ติด debuff แล้ว กลับไป stack กับปาร์ตี้", "ST": "รับ Homing Lasers: ใช้ mitigate เต็มที่ ห่างปาร์ตี้"},
     says_en={"MT": "Once you have the debuff, stack with the party", "ST": "Take Homing Lasers fully mitigated, away from the party"})
step(P5, VA, "③ debuff หมด: หารดาเมจทั้งปาร์ตี้", "③ The debuff expires: shared by the party",
     "Viscous Aetheroplasm หมดเวลา: ดาเมจหารกันทั้งปาร์ตี้",
     "Viscous Aetheroplasm expires and deals split damage shared by the party",
     strict=False, pic="04a/predation_03.jpg", scene=S.u_pred3())

UP = "Ultimate Predation"
M1 = ("วิธีที่ 1: รับ afterburn (แนะนำ)", "Method 1: take the afterburn")
M2 = ("วิธีที่ 2: หลบให้หมด", "Method 2: dodge everything")
step(P5, UP, "ภาพรวม: บอสโผล่ 4 ตัว + กติกา 3 ข้อ", "Overview: four bosses + three rules",
     "ชุด \"Trio\" แรกของไฟต์ Primal ทุกตัวตื่นแล้ว จึงใช้ท่าแบบตื่น\n\n"
     "Garuda: โผล่ใน 1 ใน 4 ส่วนสนามแบบสุ่ม เยื้องจากกลางไปทางทแยงนิดหน่อย\n"
     "Ifrit: โผล่ที่มุมทแยงแบบสุ่ม\n"
     "Titan: โผล่ที่ทิศหลักแบบสุ่ม เยื้องซ้ายหรือขวานิดหน่อย\n"
     "Ultima: โผล่ที่มุมทแยงแบบสุ่ม\n\n"
     "เพราะ Wicked Wheel > Wicked Tornado ของ Garuda ปลอดภัยแค่ส่วนสนามที่อยู่ทแยงตรงข้าม Garuda\n\n"
     "มี 2 วิธี แต่ใช้กติกาเดียวกัน:\n"
     "Rule 1: ไปส่วนสนามที่ทแยงตรงข้าม Garuda\n"
     "Rule 2: อยู่ห่าง Titan\n"
     "Rule 3: ออกห่าง Ultima",
     "The first \"Trio\" combo. Every primal is woken, so they all use their woken attacks\n\n"
     "Garuda: a random quadrant, slightly offset diagonally from the centre\n"
     "Ifrit: a random intercardinal\n"
     "Titan: a random cardinal, shifted slightly left or right\n"
     "Ultima: a random intercardinal\n\n"
     "Because of Garuda's Wicked Wheel > Wicked Tornado, only the quadrant diagonally opposite Garuda is safe\n\n"
     "There are two methods, with the same rules:\n"
     "Rule 1: move to the quadrant diagonally opposite Garuda\n"
     "Rule 2: be away from Titan\n"
     "Rule 3: move away from Ultima",
     strict=False,
     refs=[FR("predation", "Ultimate Predation: บอสโผล่พร้อมกัน 4 ตัว · หา Garuda แล้วไปส่วนสนามทแยงตรงข้าม", "Ultimate Predation: four bosses at once · find Garuda and go to the opposite quadrant")])
step(P5, UP, "วิธีที่ 1: จงใจรับ afterburn ของ Ifrit", "Method 1: take Ifrit's afterburn on purpose",
     "วิธีที่ Tuufless ใช้ และเป็นแผนมาตรฐานของญี่ปุ่นบน Mana DC และ Gaia DC\n"
     "ไม่ได้หลบให้หมด แต่ตั้งใจให้ทั้งปาร์ตี้โดน afterburn ของ Ifrit โดยใช้ mitigate\n\n"
     "รอบขอบสนามมีรูนเรียงอยู่\n"
     "หลบ Landslide ของ Titan กับการพุ่งครั้งแรกของ Ifrit (Crimson Cyclone) แต่ไปจบ \"ระหว่างรูน\" ด้านนอก (คือที่ทิศหลัก) ให้โดน afterburn ครั้งที่ 2\n"
     "ถ้า Ultima Weapon อยู่มุมทแยงที่ติดกัน: อยู่ครึ่งที่ห่างจาก Ultima\n\n"
     "ปกติ afterburn นี้ถึงตาย แต่รอดได้ด้วย mitigate และได้เกจ LB จากการรอดดาเมจหนัก\n"
     "ต้องมี shield + mitigate อีก 3 อย่าง: H2 30s / ท่า 90s ของ Tank / D3\n\n"
     "เป้าหมายจริงคือสร้างเกจ LB ให้ได้แน่นอน: รับประกันว่ามี LB3 ตอน Ultima ครั้งที่ 2\n"
     "ไฟต์นี้เก่าแล้ว ผู้เล่นตีแรงกว่าตอนออก (4.3) มาก จนมักถึง Ultima ครั้งที่ 2 โดยไม่มี LB3 แล้วล้มทันที โดยเฉพาะเพราะ Ultimate Suppression เข้าเร็วได้",
     "Tuufless's preferred method, and the Japanese standard on Mana DC and Gaia DC\n"
     "Rather than resolving it cleanly, the party gets hit by Ifrit's afterburn with mitigations\n\n"
     "Rune marks line the outside of the arena\n"
     "Dodge Titan's Landslide and Ifrit's first Crimson Cyclone dash, but end up between the outside runes (basically a cardinal) to take the second afterburn\n"
     "If Ultima Weapon is on an adjacent intercardinal, be on the half away from it\n\n"
     "It would normally be lethal; surviving it with mitigation generates limit break\n"
     "It needs shields + three more mitigations: H2's 30s / a tank's 90s / D3's\n\n"
     "The real goal is to generate LB consistently, guaranteeing an LB3 for Ultima #2\n"
     "The fight is outscaled: players hit far harder than at release (4.3) and often reach Ultima #2 without an LB3 and wipe, especially as Ultimate Suppression can be pushed early",
     strict=False, plan=M1,
     refs=[FR("edge-runes", "รูนรอบขอบสนาม · Ultimate Predation วิธีที่ 1: ยืนระหว่างรูน (ทิศหลัก) ให้โดน afterburn", "The runes around the edge · Predation Method 1: stand between them (a cardinal) to take the afterburn")])
step(P5, UP, "วิธีที่ 1 ①: หา Garuda", "Method 1 ①: find Garuda",
     "Ultima Weapon หายตัว แล้วโผล่มาพร้อม Primal ทุกตัว\n"
     "หา Garuda แล้วไปส่วนสนามที่ทแยงตรงข้าม",
     "Ultima Weapon disappears and reappears with all the primals\n"
     "Find Garuda and move to the quadrant diagonally opposite",
     strict=False, pic="04a/predation_4a_safe_01.jpg", scene=S.pred4a(1), plan=M1)
step(P5, UP, "วิธีที่ 1 ②: AoE ชุดแรก", "Method 1 ②: the first set",
     "AoE ชุดแรกลง\n"
     "หลบทั้งการพุ่งของ Ifrit และ Landslide ชุดแรกของ Titan",
     "The first set of AoEs resolves\n"
     "Avoid both Ifrit's dash and Titan's first Landslide",
     strict=False, pic="04a/predation_4a_safe_02.jpg", scene=S.pred4a(2), plan=M1)
step(P5, UP, "วิธีที่ 1 ③: รับ afterburn ที่ทิศหลัก", "Method 1 ③: take the afterburn on a cardinal",
     "AoE ชุดที่ 2 ลง\n"
     "ไปที่ทิศหลักเพื่อรับ afterburn ของ Crimson Cyclone: ยืน \"ระหว่าง\" รูนรอบขอบสนาม ให้โดน\n"
     "ถ้า Ultima Weapon อยู่ติดกับเรา: ยืนฝั่งที่ห่างจาก Ultima\n\n"
     "ต้องมีครบ:\n"
     "shield\n"
     "ท่า 90s ทั้งปาร์ตี้ของ Tank\n"
     "H2 30s\n"
     "mitigate ทั้งปาร์ตี้ของ D3\n\n"
     "ถ้ามี SCH: พยายามไปทิศหลักเดียวกันทั้งปาร์ตี้ จะได้อยู่ใน Sacred Soil ทุกคน",
     "The second set of AoEs resolves\n"
     "Move to a cardinal to take the Crimson Cyclone afterburn: stand between the runes on the edge to get hit\n"
     "If Ultima Weapon is next to you, stand on the side away from it\n\n"
     "The party needs:\n"
     "shields\n"
     "a tank's 90s party mitigation\n"
     "H2's 30s\n"
     "D3's party mitigation\n\n"
     "With a SCH, try to dodge to the same cardinal so everyone is under Sacred Soil",
     strict=False, pic="04a/predation_4a_safe_03.jpg", scene=S.pred4a(3), plan=M1,
     says={"H2": "ใช้ mitigate 30s รับ afterburn", "D3": "ใช้ mitigate ทั้งปาร์ตี้รับ afterburn", "MT": "Tank คนหนึ่งใช้ท่า 90s ทั้งปาร์ตี้", "ST": "Tank คนหนึ่งใช้ท่า 90s ทั้งปาร์ตี้"},
     says_en={"H2": "Your 30s mitigation for the afterburn", "D3": "Your party mitigation for the afterburn", "MT": "One tank uses their 90s party mitigation", "ST": "One tank uses their 90s party mitigation"})
step(P5, UP, "วิธีที่ 1 ④: จบ + Feather Rain", "Method 1 ④: the end + Feather Rain",
     "บอสหายตัว จบ Mechanic\n"
     "ล่อแล้วหลบ Feather Rain",
     "The bosses disappear, ending the mechanic\n"
     "Bait and dodge Feather Rain",
     strict=False, pic="04a/predation_4a_safe_04.jpg", scene=S.pred4a(4), plan=M1)

step(P5, UP, "วิธีที่ 2: หลบ AoE ทั้งหมด", "Method 2: dodge every AoE",
     "หลบ AoE ของ Primal ให้หมด: เป็นวิธีที่ใช้กันตอนไฟต์นี้ยังเป็นปัจจุบัน\n"
     "แต่ไฟต์นี้เก่าแล้ว: เสี่ยงไม่มี LB3 ตอนจบ Ultimate Suppression และล้มทันที\n\n"
     "รอบขอบสนามมีรูนเรียงอยู่\n"
     "รูนอันที่ 4 นับจากทิศหลัก: หลบท่าชุดที่ 2 ของ Ifrit และ Titan ได้ เหลือแค่ระวัง Garuda กับ Ultima\n"
     "กากบาทเขียวในภาพ = รูนอันที่ 4",
     "Simply dodge every primal AoE: how it was done while the fight was current\n"
     "But it's outscaled now: you risk having no LB3 at the end of Ultimate Suppression, an automatic wipe\n\n"
     "Rune marks line the outside of the arena\n"
     "The fourth rune from a cardinal dodges Ifrit's and Titan's second set, leaving only Garuda and Ultima to manage\n"
     "The green crosses in the pictures mark the fourth rune",
     strict=False, plan=M2)
for n, nm, nm_en, nt, nt_en in [
        (1, "วิธีที่ 2 ①: หา Garuda", "Method 2 ①: find Garuda",
         "Ultima Weapon หายตัว แล้วโผล่มาพร้อม Primal ทุกตัว\nหา Garuda แล้วไปส่วนสนามที่ทแยงตรงข้าม",
         "Ultima Weapon disappears and reappears with all the primals\nFind Garuda and move to the quadrant diagonally opposite"),
        (2, "วิธีที่ 2 ②: AoE ชุดแรก", "Method 2 ②: the first set",
         "AoE ชุดแรกลง\nกากบาทเขียว = รูนอันที่ 4", "The first set of AoEs resolves\nGreen crosses mark the fourth rune"),
        (3, "วิธีที่ 2 ③: AoE ชุดที่ 2", "Method 2 ③: the second set",
         "AoE ชุดที่ 2 ลง\nกากบาทเขียว = รูนอันที่ 4", "The second set of AoEs resolves\nGreen crosses mark the fourth rune"),
        (4, "วิธีที่ 2 ④: จบ + Feather Rain", "Method 2 ④: the end + Feather Rain",
         "บอสหายตัว จบ Mechanic\nล่อแล้วหลบ Feather Rain", "The bosses disappear, ending the mechanic\nBait and dodge Feather Rain")]:
    step(P5, UP, nm, nm_en, nt, nt_en, strict=False, pic=f"04a/predation_4_safe_0{n}.jpg", scene=S.pred_dodge(4, n), plan=M2)
for n, nt, nt_en in [
        (1, "ตัวอย่างเพิ่ม: เหลือจุดปลอดภัย 3 จุด\nหา Garuda แล้วไปส่วนสนามที่ทแยงตรงข้าม",
         "Extra example: three safe spots\nFind Garuda and move to the quadrant diagonally opposite"),
        (2, "AoE ชุดแรกลง\nกากบาทเขียว = รูนอันที่ 4", "The first set of AoEs resolves\nGreen crosses mark the fourth rune"),
        (3, "AoE ชุดที่ 2 ลง: ตำแหน่งของ Ultima ตัด 1 ใน 4 จุดออก\nกากบาทเขียว = รูนอันที่ 4",
         "The second set resolves: Ultima's position removes one of the four spots\nGreen crosses mark the fourth rune"),
        (4, "บอสหายตัว จบ Mechanic\nล่อแล้วหลบ Feather Rain", "The bosses disappear, ending the mechanic\nBait and dodge Feather Rain")]:
    step(P5, UP, f"ตัวอย่าง 3 จุดปลอดภัย {'①②③④'[n - 1]}", f"Example, three safe spots {'①②③④'[n - 1]}", nt, nt_en,
         strict=False, pic=f"04a/predation_3_safe_0{n}.jpg", scene=S.pred_dodge(3, n), plan=M2)
for n, nt, nt_en in [
        (1, "ตัวอย่างเพิ่ม: เหลือจุดปลอดภัย 1 จุด\nหา Garuda แล้วไปส่วนสนามที่ทแยงตรงข้าม",
         "Extra example: one safe spot\nFind Garuda and move to the quadrant diagonally opposite"),
        (2, "AoE ชุดแรกลง\nกากบาทเขียว = รูนอันที่ 4", "The first set of AoEs resolves\nGreen crosses mark the fourth rune"),
        (3, "AoE ชุดที่ 2 ลง: ตำแหน่งของ Titan ตัด 2 ใน 4 จุดออก และ Ultima ตัดอีก 1\nกากบาทเขียว = รูนอันที่ 4",
         "The second set resolves: Titan's position removes two of the four spots and Ultima's one more\nGreen crosses mark the fourth rune"),
        (4, "บอสหายตัว จบ Mechanic\nล่อแล้วหลบ Feather Rain", "The bosses disappear, ending the mechanic\nBait and dodge Feather Rain")]:
    step(P5, UP, f"ตัวอย่าง 1 จุดปลอดภัย {'①②③④'[n - 1]}", f"Example, one safe spot {'①②③④'[n - 1]}", nt, nt_en,
         strict=False, pic=f"04a/predation_1_safe_0{n}.jpg", scene=S.pred_dodge(1, n), plan=M2)
step(P5, UP, "วิธีที่ 2: สร้าง LB ตอน Tank Purge", "Method 2: build LB at Tank Purge",
     "ถ้าปาร์ตี้เลือกหลบ Ultimate Predation อาจต้องสร้างเกจ LB เอง เพื่อไม่ให้ถึง Ultima ครั้งที่ 2 โดยไม่มี LB3\n"
     "วิธี: ไม่ heal ปาร์ตี้หลัง LB3 ของ Tank ที่ช่วยให้รอด Ultima ครั้งแรก\n"
     "ให้ HP ต่ำจนจะตายจาก Tank Purge ตอนเปิด Ultima Weapon แต่รอดเพราะ shield และ mitigate\n\n"
     "HP ของปาร์ตี้ต่ำกว่า 15k (ดาเมจของ Tank Purge)\n"
     "HP ยิ่งต่ำ ยิ่งต้องใช้ mitigate มาก\n"
     "อย่าใส่ debuff ให้ Ultima Weapon ถ้าเลี่ยงได้ (Feint / Addle / Reprisal): ทำให้ดาเมจของบอสต่ำลง ปาร์ตี้อาจรอดด้วย HP ตรงๆ และไม่ได้ LB\n\n"
     "ข้อเสียที่ Tuufless บอก: Healer ที่ไม่รู้แผน heal ปาร์ตี้หลัง Ultima ครั้งแรกก็พัง / กะด้วยตายากว่า HP กับ shield พอไหม / "
     "SCH ใช้ Adloquium > Deployment Tactics จาก Tank ให้ HP ยังต่ำได้ แต่ SGE ทำไม่ได้\n"
     "จึงสรุปว่า mitigate รับ afterburn ของ Crimson Cyclone (วิธีที่ 1) แน่นอนกว่า",
     "If the group dodges Ultimate Predation, it may need to generate LB artificially to avoid reaching Ultima #2 without an LB3\n"
     "How: don't heal the party after the tank LB3 that keeps them alive through the first Ultima\n"
     "Keep HP low enough that the opening Tank Purge would kill, but shields and mitigation keep them alive\n\n"
     "Keep the party under 15k HP (what Tank Purge deals)\n"
     "The lower the HP, the more mitigation you need\n"
     "Try not to debuff Ultima Weapon (Feint / Addle / Reprisal): it lowers its damage, the party may survive on raw HP and build no LB\n\n"
     "The drawbacks Tuufless lists: one well-meaning healer topping the party up after Ultima #1 ruins it / it's hard to eyeball whether HP and shields are enough / "
     "a SCH can Adloquium > Deployment Tactics off a tank to keep HP low, a SGE can't\n"
     "So mitigating Crimson Cyclone's afterburn (Method 1) is the more consistent approach",
     strict=False, plan=M2)

UA = "Ultimate Annihilation"
step(P5, UA, "ก่อน Annihilation ①: ลาก Ultima ขึ้นเหนือ", "Pre-Annihilation ①: pull Ultima north",
     "Ultima Weapon กลับมากลางสนาม Ifrit โผล่นอกสนามทางเหนือ\n"
     "แผนนี้ลาก Ultima ขึ้นเหนือนิดหน่อย (ไม่ใช่ใต้แบบ guide ของ Clees)\n\n"
     "macro: ปาร์ตี้อยู่เหนือ / D3 + D4 ล่อ Eruption จากทางใต้",
     "Ultima Weapon respawns in the centre while Ifrit appears outside the arena to the north\n"
     "This plan pulls Ultima slightly north (not south as in Clees' guide)\n\n"
     "Macro: party north / D3 + D4 bait the Eruptions from the south",
     strict=["D3", "D4"], pic="04b/annihilation_01.jpg", scene=S.a01(),
     says={"MT": "ลาก Ultima Weapon ขึ้นเหนือนิดหน่อย", "D3": "เริ่มที่ใต้ เตรียมล่อ Violent Eruption", "D4": "เริ่มที่ใต้ เตรียมล่อ Violent Eruption"},
     says_en={"MT": "Pull Ultima Weapon slightly north", "D3": "Start south, ready to bait Violent Eruptions", "D4": "Start south, ready to bait Violent Eruptions"})
step(P5, UA, "ก่อน Annihilation ②: D3 D4 ล่อ Eruption 4 ชุด", "Pre-Annihilation ②: D3 and D4 bait four sets of Eruptions",
     "สองคนที่ไกล Ifrit ที่สุด (D3 กับ D4) ล่อ Violent Eruption 4 ชุด\n"
     "แยกกันคนละข้างตามภาพ หรือ stack กันล่อเป็นคู่ก็ได้",
     "The two furthest from Ifrit (D3 and D4) bait four sets of Violent Eruptions\n"
     "They can split up as drawn, or stack and bait as a pair",
     strict=False, pic="04b/annihilation_02.jpg", scene=S.a02())
step(P5, UA, "ก่อน Annihilation ③: Radiant Plume รอบนอก", "Pre-Annihilation ③: Radiant Plumes around the outside",
     "Ultima Weapon วาง Radiant Plume รอบนอกสนาม\n"
     "อยู่ชิดขอบเหนือไว้: หินจะตกกลางสนาม\n\n"
     "Titan โผล่ที่มุมทแยงฝั่งที่ห่างจาก Ultima: จำตำแหน่ง Titan ไว้เตรียมหลบขั้นถัดไป",
     "Ultima Weapon places Radiant Plumes around the outside\n"
     "Stay close to the north edge: boulders will drop in the centre\n\n"
     "Titan spawns on an intercardinal away from Ultima: note where, for the next move",
     strict=False, pic="04b/annihilation_03.jpg", scene=S.a03(),
     refs=[FR("radiant-plumes", "Radiant Plume รอบนอกสนาม · อยู่ชิดขอบเหนือ หินจะตกกลางสนาม", "Radiant Plumes around the outside · stay by the north edge; boulders drop in the centre")])
step(P5, UA, "ก่อน Annihilation ④: หลบขึ้นเหนือล่อ Landslide ของ Ultima", "Pre-Annihilation ④: dodge north for Ultima's Landslide",
     "หินตกลงกลางสนามทีละก้อน ขณะที่ทั้ง Titan และ Ultima เตรียม Landslide ใส่ผู้เล่นสุ่มทีละคน\n\n"
     "Landslide ของ Titan มี 2 ชุด แต่ของ Ultima มีชุดเดียว\n"
     "Titan เตรียมก่อน แล้ว Ultima ตามมาไม่นาน\n\n"
     "หลบขึ้นเหนือก่อน ล่อ Landslide ของ Ultima ให้ลงก่อน แล้วค่อยหลบ Landslide ของ Titan",
     "Boulders drop one by one in the centre while Titan and Ultima both ready Landslides at random players, one at a time\n\n"
     "Titan's Landslide is doubled, Ultima's isn't\n"
     "Titan readies his first, Ultima shortly after\n\n"
     "Dodge north first to bait Ultima's Landslide, then dodge Titan's",
     strict=False, pic="04b/annihilation_04.jpg", scene=S.a04())
step(P5, UA, "ก่อน Annihilation ⑤: เข้าแนว Landslide ชุดแรกของ Titan", "Pre-Annihilation ⑤: into Titan's first Landslides",
     "หลบเข้าแนว Landslide ชุดแรกของ Titan เพื่อหลบชุดที่ 2\n"
     "มีแค่ Titan ที่มี Landslide ชุดที่ 2",
     "Dodge into Titan's first set of Landslides to avoid the second\n"
     "Only Titan has a second set",
     strict=False, pic="04b/annihilation_05.jpg", scene=S.a05())
step(P5, UA, "ก่อน Annihilation ⑥: Viscous Aetheroplasm + สลับ Tank", "Pre-Annihilation ⑥: Viscous Aetheroplasm + tank swap",
     "Titan เริ่ม Tumult 7 ครั้ง ระหว่างนั้น Ultima Weapon ใส่ Viscous Aetheroplasm ให้คน aggro อันดับ 1 (MT)\n"
     "สองพี่น้องโผล่ตะวันออกและตะวันตก ใช้ Wicked Wheel: ไม่ต้องสนใจ",
     "Titan starts seven Tumults, during which Ultima Weapon puts Viscous Aetheroplasm on the top of the hate list (the MT)\n"
     "The sisters also spawn east and west and cast Wicked Wheel: these can be ignored",
     strict=False, pic="04b/annihilation_06.jpg", scene=S.a06(),
     says={"MT": "ขยับตามเข็มออกจากปาร์ตี้ ให้ Viscous Aetheroplasm ติดเราคนเดียว", "ST": "พอ MT ติด debuff: สลับ Tank ดึง aggro"},
     says_en={"MT": "Move clockwise from the party so Viscous Aetheroplasm only hits you", "ST": "When the MT gets the debuff: tank swap and take hate"})
step(P5, UA, "ก่อน Annihilation ⑦: Feather Rain ของสองพี่น้อง", "Pre-Annihilation ⑦: the sisters' Feather Rain",
     "สองพี่น้องกระโดด ล่อ Feather Rain ใส่ผู้เล่นสุ่ม\n\n"
     "macro: MT หลบตามเข็ม / ปาร์ตี้หลบทวนเข็ม",
     "The sisters jump, baiting Feather Rain on random players\n\n"
     "Macro: MT dodges clockwise / party anticlockwise",
     strict=False, pic="04b/annihilation_07.jpg", scene=S.a07(),
     says={"MT": "วนตามเข็มรอบ Ultima Weapon"}, says_en={"MT": "Rotate clockwise around Ultima Weapon"})
step(P5, UA, "ก่อน Annihilation ⑧: Feather Rain ของ Garuda + Homing Lasers", "Pre-Annihilation ⑧: Garuda's Feather Rain + Homing Lasers",
     "Garuda กระโดด ล่อ Feather Rain ชุดที่ 2 ใส่ผู้เล่นสุ่ม: ทุกคนวนทวนเข็มหลบ\n"
     "Viscous Aetheroplasm หมดเวลา แล้ว Ultima Weapon ใช้ Homing Lasers ใส่คน aggro อันดับ 2 (ซึ่งตอนนี้คือ MT)\n\n"
     "Ultima Weapon หายตัวแล้วโผล่ตรงที่ยืน (เหนือ) แล้วเริ่ม Ultimate Annihilation",
     "Garuda jumps, baiting a second set of Feather Rain on random players: everyone rotates anticlockwise\n"
     "Viscous Aetheroplasm expires and Ultima Weapon casts Homing Lasers on the second in hate (now the MT)\n\n"
     "Ultima Weapon then disappears, reappears where it stands (north) and begins Ultimate Annihilation",
     strict=False, pic="04b/annihilation_08.jpg", scene=S.a08(),
     says={"MT": "ใช้ invuln รับดาเมจ Viscous Aetheroplasm (คลุม Homing Lasers ด้วย) แล้วสลับ Tank ดึง aggro คืนหลัง Homing Lasers"},
     says_en={"MT": "Invuln the Viscous Aetheroplasm (it covers the Homing Lasers too); tank swap back after the Homing Lasers"})
step(P5, UA, "ลูกบอลเขียว: ภาพรวม", "The green orbs: overview",
     "ชุด Trio เดียวในทุกไฟต์ Ultimate ที่บอส (Ultima Weapon) ยังตีได้ระหว่างนั้น\n"
     "มีลูกบอลเขียว Aetheroplasm 4 ลูกให้รับ: วิธีรับมีผลกับ Aetheric Boom ช่วงท้ายไฟต์\n"
     "ลูกบอลเกิดที่ขาซ้ายของ Ultima Weapon (ด้านตะวันออกเฉียงใต้ของตัว) เสมอ\n\n"
     "แผนนี้รับแบบ 2211 (ไม่ใช่ 3311 แบบ guide ของ Clees)\n"
     "macro: MT ST > MT ST > MT > MT",
     "The only Trio-like mechanic in any Ultimate where the boss (Ultima Weapon) stays targetable\n"
     "Four green Aetheroplasm orbs must be taken: how affects Aetheric Boom near the end\n"
     "They always spawn on Ultima Weapon's left leg (its south-east corner)\n\n"
     "This plan takes them 2211 (not 3311 as in Clees' guide)\n"
     "Macro: MT ST > MT ST > MT > MT",
     strict=False,
     refs=[FR("annihilation-cast", "Ultima Weapon ร่าย Ultimate Annihilation · ระหว่างนี้ยังตี Ultima ได้", "Ultima Weapon casts Ultimate Annihilation · it stays targetable throughout")])
step(P5, UA, "Annihilation ①: stack ตะวันตกเฉียงใต้ของ Ultima", "Annihilation ①: stack south-west of Ultima",
     "เริ่มด้วย stack รวมกันที่มุมตะวันตกเฉียงใต้ของ Ultima Weapon\n"
     "จะมี Weight of the Land 3 ชุด พร้อม Flaming Crush (stack)",
     "Start stacked on Ultima Weapon's south-west corner\n"
     "There will be three Weights of the Land with a Flaming Crush stack",
     strict=False, pic="04b/annihilation_09.jpg", scene=S.a09())
step(P5, UA, "Annihilation ②: Weight of the Land ชุดที่ 2 + สาย Garuda", "Annihilation ②: the second Weight of the Land + Garuda's tether",
     "Weight of the Land ชุดที่ 2\n"
     "Garuda โผล่ทางใต้ แล้วโยงสายกับผู้เล่นสุ่ม",
     "The second Weight of the Land\n"
     "Garuda spawns south and tethers a random player",
     strict=False, pic="04b/annihilation_10.jpg", scene=S.a10())
step(P5, UA, "Annihilation ③: แยกตามหน้าที่ + ลูกที่ 1", "Annihilation ③: split up + the first orb",
     "Weight of the Land ชุดที่ 3 และ Flaming Crush ลงพร้อมกัน\n"
     "แยกกันตามนี้:\n"
     "MT ST: ไปตะวันออก รับลูกบอลเขียวลูกแรก\n"
     "H1 H2: ไปตะวันตก\n"
     "D1 D2 D4: ไปเหนือ ข้าง Ultima Weapon\n"
     "D3: ไปใต้ รับสาย Mesohigh (macro: Mesohigh D3 ก่อน แล้ว Healer ที่มี Searing Wind)",
     "The third Weight of the Land, together with the Flaming Crush\n"
     "Split up:\n"
     "MT ST: east, to take the first green orb\n"
     "H1 H2: west\n"
     "D1 D2 D4: north, beside Ultima Weapon\n"
     "D3: south, to take the Mesohigh tether (macro: Mesohigh D3 first, then the Searing Wind healer)",
     strict=True, pic="04b/annihilation_11.jpg", scene=S.a11(),
     says={"MT": "ไปตะวันออก รับลูกบอลเขียวลูกแรกกับ ST", "ST": "ไปตะวันออก รับลูกบอลเขียวลูกแรกกับ MT", "H1": "ไปตะวันตก", "H2": "ไปตะวันตก",
           "D1": "ไปเหนือ ข้าง Ultima Weapon", "D2": "ไปเหนือ ข้าง Ultima Weapon", "D4": "ไปเหนือ ข้าง Ultima Weapon", "D3": "ไปใต้ รับสาย Mesohigh"},
     says_en={"MT": "East: take the first green orb with the ST", "ST": "East: take the first green orb with the MT", "H1": "West", "H2": "West",
              "D1": "North, beside Ultima Weapon", "D2": "North, beside Ultima Weapon", "D4": "North, beside Ultima Weapon", "D3": "South: take the Mesohigh tether"})
step(P5, UA, "Annihilation ④: Searing Wind + ลูกที่ 2", "Annihilation ④: Searing Wind + the second orb",
     "Ifrit ใส่ Searing Wind ให้ Healer สุ่ม แล้ว Garuda กระโดด (หลบ Feather Rain)\n\n"
     "MT ST: รับลูกบอลเขียวลูกที่ 2\n"
     "Healer ที่มี Searing Wind: ไปใต้\n"
     "Healer ที่ไม่มี: ไปเหนือ\n"
     "คนที่เหลือ: รวมกันทางเหนือ หลัง Ultima Weapon",
     "Ifrit gives a random healer Searing Wind, then Garuda jumps (dodge the Feather Rain)\n\n"
     "MT ST: take the second green orb\n"
     "The healer with Searing Wind: move south\n"
     "The healer without: move north\n"
     "Everyone else: gather north, behind Ultima Weapon",
     strict=False, pic="04b/annihilation_12.jpg", scene=S.a12(),
     says={"MT": "รับลูกบอลเขียวลูกที่ 2 กับ ST", "ST": "รับลูกบอลเขียวลูกที่ 2 กับ MT",
           "H1": "มี Searing Wind: ไปใต้ / ไม่มี: ไปเหนือ", "H2": "มี Searing Wind: ไปใต้ / ไม่มี: ไปเหนือ"},
     says_en={"MT": "Take the second green orb with the ST", "ST": "Take the second green orb with the MT",
              "H1": "With Searing Wind: south / without: north", "H2": "With Searing Wind: south / without: north"})
step(P5, UA, "Annihilation ⑤: Crimson Cyclone + Landslide", "Annihilation ⑤: Crimson Cyclone + Landslide",
     "Ifrit เตรียม Crimson Cyclone ขณะที่ Titan เตรียม Landslide\n\n"
     "MT: หลบตามเข็มไปตะวันออกเฉียงเหนือ\n"
     "Healer ที่มี Searing Wind: หลบเข้าแนว Landslide ชุดแรกของ Titan ไปทางที่ Ifrit เคยอยู่\n"
     "คนที่เหลือ: หลบทวนเข็มไปตะวันตกเฉียงเหนือ (marker 3 ใช้หลบ Crimson Cyclone ตอนนี้)",
     "Ifrit prepares Crimson Cyclone while Titan readies a Landslide\n\n"
     "MT: dodge clockwise to the north-east\n"
     "The Searing Wind healer: dodge into Titan's first Landslides towards where Ifrit was\n"
     "Everyone else: dodge anticlockwise to the north-west (marker 3 is for dodging these Crimson Charges)",
     strict=False, pic="04b/annihilation_13.jpg", scene=S.a13(),
     says={"MT": "หลบตามเข็มไปตะวันออกเฉียงเหนือ"}, says_en={"MT": "Dodge clockwise to the north-east"})
step(P5, UA, "Annihilation ⑥: Landslide ชุดที่ 2", "Annihilation ⑥: the second Landslides",
     "Landslide ชุดที่ 2\n"
     "รอให้ลงก่อน แล้วค่อยเดินเข้ากลางสนาม",
     "The second set of Landslides\n"
     "Wait for them to resolve before moving towards the centre",
     strict=False, pic="04b/annihilation_14.jpg", scene=S.a14())
step(P5, UA, "Annihilation ⑦: Eye of the Storm + ลูกที่ 3", "Annihilation ⑦: Eye of the Storm + the third orb",
     "Eye of the Storm ปิดพื้นที่รอบนอกสนาม ขณะที่ลูกบอลเขียวลูกที่ 3 เกิดตะวันออกเฉียงใต้ของ Ultima Weapon\n\n"
     "MT: รับลูกที่ 3 คนเดียว\n"
     "Healer ที่มี Searing Wind: รับสาย Mesohigh แล้วอยู่ใต้ให้สุดเท่าที่ได้",
     "An Eye of the Storm cuts off the outer arena while the third orb spawns on Ultima Weapon's south-east side\n\n"
     "MT: take the third orb alone\n"
     "The Searing Wind healer: take the Mesohigh tether and stay as far south as you can",
     strict=False, pic="04b/annihilation_15.jpg", scene=S.a15(),
     says={"MT": "รับลูกบอลเขียวลูกที่ 3 คนเดียว", "H1": "ถ้ามี Searing Wind: รับสาย Mesohigh อยู่ใต้สุด", "H2": "ถ้ามี Searing Wind: รับสาย Mesohigh อยู่ใต้สุด"},
     says_en={"MT": "Take the third orb alone", "H1": "With Searing Wind: take the Mesohigh tether, as far south as possible", "H2": "With Searing Wind: take the Mesohigh tether, as far south as possible"},
     refs=[FR("eye-of-the-storm", "Eye of the Storm: ขอบนอกสนามโดน AoE · อยู่ด้านในวง", "Eye of the Storm: the outer ring is an AoE · stay inside")])
step(P5, UA, "Annihilation ⑧: Tank Purge + Mesohigh + ลูกที่ 4", "Annihilation ⑧: Tank Purge + Mesohigh + the fourth orb",
     "Ultima Weapon ใช้ Tank Purge พร้อมกับสาย Mesohigh ระเบิด\n"
     "ดาเมจรวมหนักมาก: ต้อง mitigate เพราะ Healer ที่รับ Mesohigh ทำให้เกิด raid-wide เพิ่มอีก\n"
     "สุดท้าย Garuda กระโดด (หลบ Feather Rain)\n\n"
     "MT: รับลูกบอลเขียวลูกที่ 4 คนเดียว\n"
     "Healer ที่มี Searing Wind: อยู่ใต้\n\n"
     "หลัง Feather Rain Ultima Weapon หายตัวชั่วครู่: จบช่วงนี้",
     "Ultima Weapon casts Tank Purge as the Mesohigh tether resolves\n"
     "That's a lot of damage: mitigate it, as the healer's Mesohigh adds another raid-wide\n"
     "Finally Garuda jumps (dodge the Feather Rain)\n\n"
     "MT: take the fourth orb alone\n"
     "The Searing Wind healer: stay south\n\n"
     "After the Feather Rain, Ultima Weapon briefly disappears: the end of this block",
     strict=False, pic="04b/annihilation_16.jpg", scene=S.a16(),
     says={"MT": "รับลูกบอลเขียวลูกที่ 4 คนเดียว"}, says_en={"MT": "Take the fourth orb alone"})
step(P5, UA, "ลูกบอลเขียวมีผลกับ Aetheric Boom", "How the orbs feed Aetheric Boom",
     "จำนวนคนที่รับลูกบอลแต่ละลูก กำหนดเวลาที่มีตอนเก็บลูกบอล 4 คู่ใน Aetheric Boom\n"
     "ลูกที่ 1 > คู่ตะวันตกเฉียงเหนือ\n"
     "ลูกที่ 2 > คู่ตะวันออกเฉียงเหนือ\n"
     "ลูกที่ 3 > คู่ตะวันออกเฉียงใต้\n"
     "ลูกที่ 4 > คู่ตะวันตกเฉียงใต้\n\n"
     "ยิ่งคนรับเยอะ ลูกบอล 2 ลูกในคู่ยิ่งอยู่ห่างกัน: มีเวลามากขึ้น\n"
     "แต่ทุกคนที่โดนเพิ่มเกจ Ultima Aether +1",
     "How many players take each orb sets the time the party has for the four pairs in Aetheric Boom\n"
     "1st orb > the north-west pair\n"
     "2nd orb > the north-east pair\n"
     "3rd orb > the south-east pair\n"
     "4th orb > the south-west pair\n\n"
     "More players hit means the two orbs of a pair start further apart: more time\n"
     "But each player hit adds 1 to the Ultima Aether gauge",
     strict=False)

US = "Ultimate Suppression"
step(P5, US, "ก่อน Suppression ①: Eye of the Storm", "Pre-Suppression ①: Eye of the Storm",
     "ช่วงนี้ Ultimate Suppression เข้าเร็วได้: เริ่มเมื่อ HP Ultima Weapon ต่ำกว่า 50%\n"
     "ตอนจบ Ultimate Suppression ต้องมี LB3 ของ Tank: ถ้าเกจยังไม่พอ อาจต้องชะลอ DPS ให้มีเวลาเพิ่ม\n"
     "ที่สำคัญของช่วงนี้ โดยเฉพาะถ้า DPS ต่ำ: shield กัน Vulcan Burst ไม่ให้กระเด็นออกนอกสนาม\n\n"
     "Ultima โผล่กลางสนาม และ Eye of the Storm ทำให้พื้นที่เล็กลงชั่วครู่\n"
     "Searing Wind ยังเหลือระเบิดอีก 1 ครั้ง",
     "Ultimate Suppression can be pushed early: it starts when Ultima Weapon drops below 50% HP\n"
     "You must have a tank LB3 when it ends: if the LB isn't built, consider holding DPS for time\n"
     "What matters here, especially with low DPS: shield the Vulcan Bursts so nobody is knocked out of the arena\n\n"
     "Ultima reappears in the centre while an Eye of the Storm briefly shrinks the area\n"
     "The Searing Wind still has one more pulse left",
     strict=False, pic="04c/suppression_01.jpg", scene=S.s01())
step(P5, US, "ก่อน Suppression ②: Homing Lasers (ST invuln)", "Pre-Suppression ②: Homing Lasers (ST invuln)",
     "Ultima Weapon หันไปหาคน aggro อันดับ 2 (ST) ใช้ Homing Lasers\n\n"
     "macro: MT อยู่เหนือบอส / ปาร์ตี้อยู่ตะวันตกของบอส / ST อยู่ตะวันออกของบอส",
     "Ultima Weapon turns to the second in hate (the ST) for Homing Lasers\n\n"
     "Macro: MT north of the boss / the party west of it / the ST east of it",
     strict=["MT", "ST"], pic="04c/suppression_02.jpg", scene=S.s02(),
     says={"ST": "ใช้ invuln รับ Homing Lasers"}, says_en={"ST": "Invuln the Homing Lasers"})
step(P5, US, "ก่อน Suppression ③: Eye of the Storm อีกครั้ง", "Pre-Suppression ③: Eye of the Storm again",
     "Eye of the Storm ทำให้สนามเล็กลงอีกครั้ง\n"
     "ยืนใกล้ขอบ เตรียมออกไปข้างนอก",
     "Eye of the Storm shrinks the arena again\n"
     "Stand near the border, ready to move out",
     strict=False, pic="04c/suppression_03.jpg", scene=S.s03())
step(P5, US, "ก่อน Suppression ④: Radiant Plume กลางสนาม", "Pre-Suppression ④: Radiant Plumes in the middle",
     "Radiant Plume โผล่ช่วงกลางสนาม\n"
     "ส่วนใหญ่ตี Ultima Weapon ถึง 49% ได้ตรงนี้",
     "Radiant Plumes appear towards the middle\n"
     "Most groups have pushed Ultima Weapon to 49% by now",
     strict=False, pic="04c/suppression_04.jpg", scene=S.s04())
step(P5, US, "ก่อน Suppression ⑤: Diffusion Ray", "Pre-Suppression ⑤: Diffusion Ray",
     "Ultima ใช้ Diffusion Ray: กรวยด้านหน้า tankbuster ไม่มีร่าย ใส่ MT",
     "Ultima uses Diffusion Ray: an instant frontal tankbuster cleave on the MT",
     strict=["MT"], pic="04c/suppression_05.jpg", scene=S.s05(),
     says={"H2": "shield ทั้งปาร์ตี้กัน Vulcan Burst"}, says_en={"H2": "Shield the party for Vulcan Burst"})
step(P5, US, "ก่อน Suppression ⑥: Vulcan Burst + Eye of the Storm", "Pre-Suppression ⑥: Vulcan Burst + Eye of the Storm",
     "Ultima ใช้ Vulcan Burst: knockback ทุกคนที่โดนดาเมจ ขณะที่ Eye of the Storm อีกอันปิดขอบนอกสนาม",
     "Ultima casts Vulcan Burst, knocking back anyone who takes damage, while another Eye of the Storm blocks the outside",
     strict=False, pic="04c/suppression_06.jpg", scene=S.s06(),
     says={"MT": "ถ้าไม่ได้ shield หลัง Diffusion Ray: ต้องใช้ Arm's Length กัน Vulcan Burst"},
     says_en={"MT": "If no shield came after Diffusion Ray: Arm's Length the Vulcan Burst"})
step(P5, US, "ก่อน Suppression ⑦: Homing Lasers อีกครั้ง", "Pre-Suppression ⑦: Homing Lasers again",
     "ตามด้วย Homing Lasers อีกครั้ง ใส่คน aggro อันดับ 2 (ST)",
     "Then another Homing Lasers on the second in hate (the ST)",
     strict=["MT", "ST"], pic="04c/suppression_07.jpg", scene=S.s07(),
     says={"H2": "shield ทั้งปาร์ตี้กัน Vulcan Burst"}, says_en={"H2": "Shield the party for Vulcan Burst"})
step(P5, US, "ก่อน Suppression ⑧: Eye of the Storm + Vulcan Burst ซ้ำ", "Pre-Suppression ⑧: Eye of the Storm + Vulcan Burst again",
     "Ultima ใช้ Eye of the Storm + Vulcan Burst ซ้ำอีกชุด\n"
     "จากนั้น Ultima Weapon เริ่ม Ultimate Suppression",
     "Ultima repeats Eye of the Storm + Vulcan Burst\n"
     "Then Ultima Weapon begins Ultimate Suppression",
     strict=False, pic="04c/suppression_08.jpg", scene=S.s08() if hasattr(S, "s08") else S.s03())
step(P5, US, "Suppression ①: จุดเริ่ม (แบบ Fan)", "Suppression ①: start positions (Fan)",
     "เข้าที่ก่อน Ultimate Suppression (แผน Fan)\n"
     "Tank: ยืนมุมตะวันตกเฉียงใต้\n"
     "คนที่เหลือ: กระจายเป็นแนวตามขอบตะวันตกเฉียงเหนือ\n\n"
     "ลำดับจากตะวันตกไปเหนือ (macro): D1 H1 D3 D2 H2 D4",
     "Take your starting positions for Ultimate Suppression (Fan)\n"
     "Tanks: the south-west corner\n"
     "Everyone else: fan out along the north-west edge\n\n"
     "Order from west to north (macro): D1 H1 D3 D2 H2 D4",
     strict=True, pic="04c/suppression_09.jpg", scene=S.s09())
step(P5, US, "Suppression ②: 6 คนได้หน้าที่สุ่ม", "Suppression ②: six random jobs",
     "ใน 6 คนที่ไม่ใช่ Tank:\n"
     "3 คน: สุ่มล่อ Violent Eruption\n"
     "2 คน: สุ่มเป็นเป้า Mistral Song (มาร์กเขียว)\n"
     "1 คนที่เหลือ: เป้า Light Pillar\n\n"
     "กระจายให้ห่างพอ จะได้ดูออกชัดว่าตัวเองได้อะไร",
     "Of the six non-tanks:\n"
     "three are randomly chosen to bait Violent Eruptions\n"
     "two are randomly chosen for Mistral Song (green markers)\n"
     "the one left is targeted by Light Pillar\n\n"
     "Spread wide enough that everyone can clearly tell which they got",
     strict=["MT", "ST"], pic="04c/suppression_10.jpg", scene=S.s10(),
     refs=[FR("suppression", "Ultimate Suppression: 6 คนได้หน้าที่สุ่ม · Eruption 3 / Mistral Song 2 / Light Pillar 1", "Ultimate Suppression: six random jobs · Eruption 3 / Mistral Song 2 / Light Pillar 1")])
step(P5, US, "Suppression ③: ไปตามหน้าที่", "Suppression ③: go by what you got",
     "Violent Eruption: ล่อ 4 ลูก ลูกที่ 4 ให้ลงหลังพี่น้องตัวตะวันออกเฉียงใต้\n"
     "คน Eruption 1 คนจะโดน Granite Gaol ด้วย: ยังต้องวางลูกที่ 4 หลังพี่น้องตัวนั้น แต่ไม่ต้องหลบออกจากมัน (marker 4 = จุด Granite Gaol)\n\n"
     "Mistral Song / Light Pillar: ยืนหลัง Tank 2 คนที่มุมตะวันตกเฉียงใต้",
     "Violent Eruption: bait four, the fourth behind the south-east sister\n"
     "One Eruption player is also targeted by Granite Gaol: still place the fourth behind the sister, but no need to dodge out of it (marker 4 = the Granite Gaol)\n\n"
     "Mistral Song / Light Pillar: stand behind the two tanks in the south-west",
     strict=["MT", "ST"], pic="04c/suppression_11.jpg", scene=S.s11())
step(P5, US, "Suppression ④: Tank ขวาง Mistral Song", "Suppression ④: the tanks block Mistral Song",
     "AoE กรวยใหญ่จาก Garuda ขึ้น ขณะที่สองพี่น้องยิง Mistral Song ใส่ 2 คนที่มีมาร์กเขียว\n"
     "Tank 2 คนขวางรับคนละสาย",
     "A large cone from Garuda appears while the sisters fire Mistral Song at the two green-marked players\n"
     "The two tanks block one each",
     strict=["MT", "ST"], pic="04c/suppression_12.jpg", scene=S.s12())
step(P5, US, "Suppression ⑤: Feather Rain ของสองพี่น้อง", "Suppression ⑤: the sisters' Feather Rain",
     "สองพี่น้องกระโดด (หลบ Feather Rain)\n"
     "Light Pillar: หลบตามเข็ม\n"
     "คนอื่น: หลบทวนเข็ม",
     "The sisters jump (dodge the Feather Rain)\n"
     "Light Pillar: dodge clockwise\n"
     "Everyone else: dodge anticlockwise",
     strict=False, pic="04c/suppression_13.jpg", scene=S.s13())
step(P5, US, "Suppression ⑥: Feather Rain ของ Garuda + ทำลาย Gaol", "Suppression ⑥: Garuda's Feather Rain + break the Gaol",
     "Garuda กระโดด (หลบ Feather Rain ชุดที่ 2)\n"
     "มาเร็วมากหลังสองพี่น้อง: ล่อ Feather Rain ไว้ในวง AoE ใหญ่ที่ Mistral Song ทิ้งไว้ก็ได้\n\n"
     "ทำลาย Granite Gaol\n"
     "ควรเก็บ burst ไว้ตรงนี้: ทั้งตีได้น้อยลงเพราะต้องหลบ Feather Rain ฯลฯ และขาดอีก 1 คน (Light Pillar)",
     "Garuda jumps (dodge a second set of Feather Rain)\n"
     "It comes very soon after the sisters: you can bait it inside the large AoEs Mistral Song left\n\n"
     "Destroy the Granite Gaol\n"
     "Worth saving burst for this: less uptime from dodging the Feather Rain, and one more player (the Light Pillar) is out",
     strict=False, pic="04c/suppression_14.jpg", scene=S.s14())
step(P5, US, "Suppression ⑦: Light Pillar ไล่ + stack ตะวันออกของกลาง", "Suppression ⑦: the Light Pillar chases + stack east of centre",
     "AoE ของ Light Pillar โผล่และไล่ตามเป้าของมัน\n"
     "ทุกคน stack รวมกันเยื้องไปทางตะวันออกของกลางสนามนิดหน่อย",
     "The Light Pillar AoE appears and chases its target\n"
     "Everyone stacks a little east of the centre",
     strict=False, pic="04c/suppression_15.jpg", scene=S.s15())
step(P5, US, "Suppression ⑧: Landslide + สาย Garuda + Flaming Crush", "Suppression ⑧: Landslide + Garuda's tether + Flaming Crush",
     "Titan ใช้ Landslide ใส่ปาร์ตี้ / Garuda โยงสายกับผู้เล่นสุ่ม / Ifrit ใช้ Flaming Crush ใส่อีกคน (ไม่ใช่ MT)",
     "Titan targets the party with Landslide / Garuda tethers a random player / Ifrit targets another player (not the MT) with Flaming Crush",
     strict=False, pic="04c/suppression_16.jpg", scene=S.s16(),
     says={"MT": "แยกจากกลุ่มไปรับสาย Mesohigh"}, says_en={"MT": "Break away from the group and take the Mesohigh tether"},
     refs=[FR("featherlance", "ขนนก (Featherlance) ระเบิดรอบตัว · MT รับ Mesohigh และอยู่ห่างขอบสนาม", "The feathers explode (Featherlance) · the MT takes the Mesohigh and stays off the edge")])
step(P5, US, "Suppression ⑨: เข้าแนว Landslide แรก + หาร Flaming Crush", "Suppression ⑨: into the first Landslide + split Flaming Crush",
     "หลบกลับเข้าแนว Landslide ชุดแรกของ Titan แล้วหารดาเมจ Flaming Crush ของ Ifrit (marker B = จุด stack)",
     "Dodge back into Titan's first Landslide and split Ifrit's Flaming Crush (marker B = the stack)",
     strict=False, pic="04c/suppression_17.jpg", scene=S.s17())
step(P5, US, "Suppression ⑩: Feather Rain + Tank Purge + Featherlance", "Suppression ⑩: Feather Rain + Tank Purge + Featherlance",
     "Garuda กระโดด (หลบ Feather Rain) และ Ultima ร่าย Tank Purge เสร็จ\n"
     "มีสาย Mesohigh ระเบิดพร้อมกันด้วย: ดาเมจรวมหนักมาก\n"
     "ขนนกจะระเบิดเป็น AoE รอบตัว (Featherlance)\n\n"
     "ที่มาของขนนก: เป็นท่าของ Garuda ตอนตื่น (เห็นได้ใน P1 ถ้าล้าง Thermal Low ด้วยฟองลม 3 ชุดแทน 2)\n"
     "ขนนกจะพุ่งเข้าหาผู้เล่นจนตาย: กันได้โดยพัดมันตกด้วย Super Cyclone คือรับสาย Garuda ตอนที่ยังมี Thermal Low 1 stack\n"
     "ตอนนี้เหลือแค่ 2 คนที่ทำได้: MT หรือ Healer ที่ไม่ได้ Searing Wind ตอน Ultimate Annihilation (macro: Mesohigh = MT)",
     "Garuda jumps (dodge the Feather Rain) and Ultima finishes Tank Purge\n"
     "A Mesohigh tether goes off at the same time: a lot of damage\n"
     "The feathers explode in a point-blank Featherlance\n\n"
     "Where they come from: a woken Garuda mechanic (seen in P1 if three sets of Thermal Low are cleansed with the bubble instead of two)\n"
     "The feathers home in and kill: knock them out of the air with a Super Cyclone, by taking Garuda's tether while holding a Thermal Low stack\n"
     "Only two players can now: the MT, or the healer who didn't get Searing Wind in Ultimate Annihilation (macro: Mesohigh = MT)",
     strict=False, pic="04c/suppression_18.jpg", scene=S.s18(),
     says={"MT": "อยู่ห่างขอบสนาม: ขนนกระเบิด Featherlance รอบตัว"}, says_en={"MT": "Stay away from the edge: the feathers explode in a point-blank Featherlance"})

step(P5, "Ultima", "Ultima ครั้งที่ 2: LB3 ของ Tank", "Ultima #2: the tank LB3",
     "Ultima Weapon กลับมากลางสนามและร่าย Ultima อีกครั้ง\n"
     "ต้องใช้ LB3 ของ Tank ถึงจะรอด: ควรสร้างเกจกลับมาครบแล้วถึงตรงนี้",
     "Ultima Weapon reappears in the centre and casts Ultima again\n"
     "It requires a tank LB3 to survive, which you should have rebuilt by now",
     strict=False)
AB = "Aetheric Boom"
step(P5, AB, "① Aetheric Boom: knockback จากกลาง", "① Aetheric Boom: knockback from the centre",
     "หลัง Ultima รีบ heal ให้เต็ม เตรียม Aetheric Boom\n"
     "ลูกบอล 4 คู่ผูกสายจะโผล่ สายดึงลูกบอลเข้าหากัน ถ้าสองลูกชนกัน: ปาร์ตี้ล้ม\n"
     "ความยาวสายขึ้นกับจำนวนคนที่รับลูกบอลเขียวตอน Ultimate Annihilation\n"
     "ลูก 3 กับ 4 ตอนนั้น MT รับคนเดียว: คู่ทางใต้สายสั้นที่สุด จึงเริ่มเก็บจากคู่ใต้\n\n"
     "Ultima ร่าย Aetheric Boom: knockback จากกลางสนามด้วย",
     "After the Ultima, top the party up quickly for Aetheric Boom\n"
     "Four tethered pairs of orbs spawn; the tethers pull each pair together, and if they touch the party wipes\n"
     "Tether length depends on how many players took the green orbs in Ultimate Annihilation\n"
     "The MT took the last two alone, so the southern pairs are shortest: start from the south\n\n"
     "Ultima casts Aetheric Boom, which also knocks back from the centre",
     strict=["MT", "ST"], pic="04d/aetheric_boom_01.jpg", scene=S.ab(1),
     says={"MT": "ยืนตะวันตกเฉียงใต้ของ Ultima Weapon แล้วใช้ LB1 ของ Tank", "ST": "ยืนตะวันตกเฉียงใต้ของ Ultima Weapon แล้วใช้ LB1 ของ Tank"},
     says_en={"MT": "Stand south-west of Ultima Weapon and Tank LB1", "ST": "Stand south-west of Ultima Weapon and Tank LB1"},
     refs=[FR("aetheric-boom", "Aetheric Boom: ลูกบอล 4 คู่ผูกสาย · เก็บคู่ทางใต้ก่อน แล้วคู่ทางเหนือ", "Aetheric Boom: four tethered pairs · take the southern pairs first, then the northern")])
step(P5, AB, "② ลูกบอล 4 คู่", "② Four pairs of orbs",
     "ลูกบอล 4 คู่ผูกสายโผล่ที่มุมทแยง สายดึงเข้าหากัน ถ้าชนกันปาร์ตี้ล้ม\n\n"
     "macro: MT + ST ตะวันตกเฉียงใต้ > ตะวันตกเฉียงเหนือ / ปาร์ตี้ ตะวันออกเฉียงใต้ > ตะวันออกเฉียงเหนือ",
     "Four tethered pairs of orbs spawn on the intercardinals; the tethers pull them together and the party wipes if they touch\n\n"
     "Macro: MT + ST south-west > north-west / party south-east > north-east",
     strict=["MT", "ST"], pic="04d/aetheric_boom_02.jpg", scene=S.ab(2))
step(P5, AB, "③ เก็บคู่ทางใต้", "③ Take the southern pairs",
     "เก็บลูกบอล 2 คู่ทางใต้\n"
     "ดาเมจนี้ใช้ invuln รับไม่ได้",
     "Take the two southern pairs\n"
     "This damage can't be invulned",
     strict=["MT", "ST"], pic="04d/aetheric_boom_03.jpg", scene=S.ab(3))
step(P5, AB, "④ heal แล้วเก็บคู่ทางเหนือ", "④ Heal, then the northern pairs",
     "รีบ heal ให้เต็ม แล้วเก็บ 2 คู่ทางเหนือก่อนลูกบอลชนกัน",
     "Quickly heal up and take the two northern pairs before they touch",
     strict=["MT", "ST"], pic="04d/aetheric_boom_04.jpg", scene=S.ab(4))
step(P5, AB, "⑤ รวมกันทางเหนือ", "⑤ Gather north",
     "รวมกันทางเหนือ เตรียม Primal Roulette",
     "Gather north and prepare for the Primal Roulette",
     strict=False, pic="04d/aetheric_boom_05.jpg", scene=S.ab(5))

PR = "Primal Roulette"
step(P5, PR, "ภาพรวม: ลำดับ + mitigate", "Overview: the order + mitigation",
     "Ultima Weapon ใส่ Viscous Aetheroplasm ให้ผู้เล่นสุ่ม 3 คน: เริ่ม Primal Roulette\n"
     "debuff ทั้ง 3 ระเบิดระหว่างชุด Primal ที่ตามมา: บังคับให้ปาร์ตี้ขยับไปด้วยกันเป็นกลุ่ม\n\n"
     "Primal แต่ละตัวจบด้วยท่าประจำตัว (Aerial Blast / Hellfire / Earthen Fury)\n"
     "แต่ Primal ตีไม่ได้: ใช้ mitigate แบบใส่บอส เช่น Reprisal / Addle ไม่ได้\n\n"
     "แผน mitigate ที่แนะนำ:\n"
     "Primal ตัวที่ 1: MT 90s + H2 30s\n"
     "ตัวที่ 2: H2 90s + D3 (macro: D3 + shield ที่แรงขึ้น)\n"
     "ตัวที่ 3: ST 90s + H2 30s\n\n"
     "ลำดับไม่ได้สุ่มทั้งหมด: เห็นตัวแรกแล้วรู้ 2 ตัวที่เหลือ\n"
     "Garuda > Ifrit > Titan\n"
     "Ifrit > Garuda > Titan\n"
     "Titan > Ifrit > Garuda\n\n"
     "macro: เดินจากเหนือ > ตะวันตกเฉียงเหนือ (> กลับเหนือ)",
     "Ultima Weapon puts Viscous Aetheroplasm on three random players to start the Primal Roulette\n"
     "Each goes off during the coming primal sequences, forcing the party to move together\n\n"
     "Each primal ends with its signature attack (Aerial Blast / Hellfire / Earthen Fury)\n"
     "They aren't targetable: no targeted mitigation like Reprisal / Addle\n\n"
     "Recommended mitigation:\n"
     "1st primal: MT 90s + H2 30s\n"
     "2nd: H2 90s + D3 (macro: D3 + stronger shields)\n"
     "3rd: ST 90s + H2 30s\n\n"
     "The order isn't fully random: the first primal decides the other two\n"
     "Garuda > Ifrit > Titan\n"
     "Ifrit > Garuda > Titan\n"
     "Titan > Ifrit > Garuda\n\n"
     "Macro: movement N > NW (> N)",
     strict=False,
     says={"MT": "Primal ตัวที่ 1: ใช้ mitigate 90s", "ST": "Primal ตัวที่ 3: ใช้ mitigate 90s", "H2": "ตัวที่ 1: 30s / ตัวที่ 2: 90s / ตัวที่ 3: 30s", "D3": "Primal ตัวที่ 2: ใช้ mitigate ทั้งปาร์ตี้"},
     says_en={"MT": "1st primal: your 90s", "ST": "3rd primal: your 90s", "H2": "1st: 30s / 2nd: 90s / 3rd: 30s", "D3": "2nd primal: your party mitigation"},
     refs=[FR("primal-roulette", "Primal Roulette: Primal ออกมาทีละตัว · ตัวแรกบอกลำดับของที่เหลือ", "Primal Roulette: one primal at a time · the first tells you the rest")])
step(P5, PR, "Garuda ①: Wicked Wheel จากกลาง", "Garuda ①: Wicked Wheel from the centre",
     "Garuda เตรียม Wicked Wheel จากกลางสนาม\n"
     "ยืนนอกวง Wicked Wheel พอดี เตรียมเดินเข้า",
     "Garuda readies Wicked Wheel from the centre\n"
     "Stand just outside it, ready to step in",
     strict=False, pic="04d/primal_roulette_garuda_01.jpg", scene=S.rg(1))
step(P5, PR, "Garuda ②: เดินเข้าวงหลบ Wicked Tornado", "Garuda ②: step in to avoid Wicked Tornado",
     "รีบเดินเข้าวง Wicked Wheel (หลังลงแล้ว) เพื่อหลบ Wicked Tornado ที่ตามมา\n"
     "Viscous Aetheroplasm 1 อันระเบิดราวๆ ตอนนี้",
     "Quickly step into Wicked Wheel's AoE to avoid the follow-up Wicked Tornado\n"
     "One Viscous Aetheroplasm goes off around now",
     strict=False, pic="04d/primal_roulette_garuda_02.jpg", scene=S.rg(2))
step(P5, PR, "Garuda ③: Feather Rain แล้วกลับเหนือ", "Garuda ③: Feather Rain, then back north",
     "Garuda กระโดด (หลบ Feather Rain)\n"
     "กลับไปเหนือ เตรียม Primal ตัวถัดไป",
     "Garuda jumps (dodge the Feather Rain!)\n"
     "Return north and prepare for the next primal",
     strict=False, pic="04d/primal_roulette_garuda_03.jpg", scene=S.rg(3))
step(P5, PR, "Ifrit ①: Ifrit กลาง + ร่างแยก 2 ตัว", "Ifrit ①: Ifrit in the middle + two clones",
     "Ifrit (ตื่นแล้ว) โผล่กลางสนาม ใส่ Violent Eruption ให้ผู้เล่นสุ่ม\n"
     "ร่างแยก Ifrit 2 ตัวโผล่ที่ทิศหลัก",
     "The woken Ifrit appears in the middle and targets random players with Violent Eruption\n"
     "Two Ifrit clones spawn on cardinals",
     strict=False, pic="04d/primal_roulette_ifrit_01.jpg", scene=S.ri(1))
step(P5, PR, "Ifrit ②: วิ่งไปมุมตะวันตกเฉียงเหนือ", "Ifrit ②: run to the north-west",
     "รีบวิ่งไปมุมตะวันตกเฉียงเหนือ (marker 3) หลบ Crimson Cyclone (แนะนำ Sprint มาก)\n"
     "Viscous Aetheroplasm 1 อันระเบิดราวๆ ตอนนี้",
     "Quickly run to the north-west (marker 3) to dodge the Crimson Cyclones (Sprint highly recommended)\n"
     "One Viscous Aetheroplasm goes off around now",
     strict=False, pic="04d/primal_roulette_ifrit_02.jpg", scene=S.ri(2))
step(P5, PR, "Ifrit ③: Hellfire แล้วกลับเหนือ", "Ifrit ③: Hellfire, then back north",
     "Ifrit ร่าย Hellfire แล้วกระโดด\n"
     "กลับไปเหนือ เตรียม Primal ตัวถัดไป",
     "Ifrit casts Hellfire, then jumps\n"
     "Return north and prepare for the next primal",
     strict=False, pic="04d/primal_roulette_ifrit_03.jpg", scene=S.ri(3))
step(P5, PR, "Titan ①: Weight of the Land 3 ชุด", "Titan ①: three Weights of the Land",
     "Titan เริ่มด้วย Weight of the Land 3 ชุด",
     "Titan begins with three Weights of the Land",
     strict=False, pic="04d/primal_roulette_titan_01.jpg", scene=S.rt(1))
step(P5, PR, "Titan ②: ชุดที่ 2", "Titan ②: the second set",
     "Weight of the Land ชุดที่ 2\n"
     "Viscous Aetheroplasm 1 อันระเบิดราวๆ ตอนนี้",
     "The second Weight of the Land\n"
     "One Viscous Aetheroplasm goes off around now",
     strict=False, pic="04d/primal_roulette_titan_02.jpg", scene=S.rt(2))
step(P5, PR, "Titan ③: ชุดที่ 3", "Titan ③: the third set",
     "Weight of the Land ชุดที่ 3",
     "The third Weight of the Land",
     strict=False, pic="04d/primal_roulette_titan_03.jpg", scene=S.rt(3))
step(P5, PR, "Titan ④: Earthen Fury แล้วกลับเหนือ", "Titan ④: Earthen Fury, then back north",
     "Titan ร่าย Earthen Fury แล้วกระโดด\n"
     "กลับไปเหนือ เตรียม Primal ตัวถัดไป",
     "Titan casts Earthen Fury, then jumps\n"
     "Return north and prepare for the next primal",
     strict=False, pic="04d/primal_roulette_titan_04.jpg", scene=S.rt(4))
step(P5, "Ultima Aether", "Enrage", "Enrage",
     "Primal ครบ 3 ชุดแล้ว Ultima Weapon วาร์ปไปทางเหนือ แล้วเติมเกจ Ultima Aether อย่างรวดเร็ว\n"
     "เกจถึง 100: ผู้เล่นถูกทำให้หมดสภาพทีละคน เริ่มจากคนที่ทำดาเมจน้อยที่สุดไปหามากที่สุด\n"
     "นี่คือ enrage ของ Ultima Weapon\n"
     "แต่หลังคนสุดท้ายล้มแล้ว DoT ยังมีเวลาติดอีกไม่กี่วินาที",
     "With all three primal sequences done, Ultima Weapon teleports north and rapidly charges the Ultima Aether gauge\n"
     "At 100, players are incapacitated one by one, from the least damage done to the most\n"
     "That is Ultima Weapon's enrage\n"
     "There are still a few seconds for DoTs to tick after the last player falls",
     strict=False,
     refs=[FR("enrage", "ช่วงสุดท้าย: Ultima Weapon เติมเกจ Ultima Aether · ถึง 100 = enrage", "The end: Ultima Weapon charges the Ultima Aether gauge · 100 is the enrage")])

# ================================================================== guide
macro_en = open(os.path.join(DL, "uwu.en.md"), encoding="utf-8").read().strip().strip("`").strip("\n")
macro_ja = open(os.path.join(DL, "uwu.jp.md"), encoding="utf-8").read().strip().strip("`").strip("\n")

NOTE = ("แผนตาม Tuufless's Notes (สาย PF ของ Elemental DC) ซึ่งส่วนใหญ่ตาม guide ของ Clees ต่างกัน 2 จุด:\n"
        "หลัง Ultimate Predation ลาก Ultima ขึ้นเหนือนิดหน่อย (ไม่ใช่ใต้) คนล่อ Eruption เริ่มที่ใต้\n"
        "ลูกบอลเขียวใน Ultimate Annihilation เก็บแบบ 2211 (ไม่ใช่ 3311)\n\n"
        "Garuda แบบ Midruda / Ifrit แบบ Reverse-Z / Titan แบบ Mario Kart / Ultimate Suppression แบบ Fan\n"
        "Ultimate Predation มี 2 วิธี (แท็บ): Tuufless แนะนำวิธีรับ afterburn\n\n"
        "Marker: A B C D บอกทิศ / 1–4 ใช้เฉพาะบาง Mechanic (ดูขั้นแรก)\n\n"
        "Beyond Limits (macro: Limit Break): Garuda > Healer / Ifrit > Caster / Titan > Melee\n"
        "LB3 ช่วง Lahabrea: Caster > Healer > Melee > Tank\n\n"
        "ลำดับ Granite Gaol: D1 > D2 > ST > D3 > D4 > H1 > H2\n"
        "Mesohigh: Garuda ตะวันตก ST / ตะวันออก D4 · Annihilation D3 > Healer ที่มี Searing Wind · Suppression MT\n"
        "ลูกบอลเขียว 2211: MT·ST > MT·ST > MT > MT")
NOTE_EN = ("Plan follows Tuufless's Notes (the Elemental DC PF), which largely follows Clees' guide with two differences:\n"
           "after Ultimate Predation Ultima is pulled a little north (not south); Eruption baiters start south\n"
           "the green orbs in Ultimate Annihilation are taken 2211 (not 3311)\n\n"
           "Garuda: Midruda / Ifrit: Reverse-Z / Titan: Mario Kart / Ultimate Suppression: Fan\n"
           "Ultimate Predation has two methods (tabs): Tuufless prefers taking the afterburn\n\n"
           "Waymarks: A B C D for orientation / 1–4 for specific mechanics (see the first step)\n\n"
           "Beyond Limits (macro: Limit Break): Garuda > Healer / Ifrit > Caster / Titan > Melee\n"
           "Lahabrea LB3s: Caster > Healer > Melee > Tank\n\n"
           "Granite Gaol priority: D1 > D2 > ST > D3 > D4 > H1 > H2\n"
           "Mesohigh: Garuda west ST / east D4 · Annihilation D3 > the Searing Wind healer · Suppression MT\n"
           "Green orbs 2211: MT·ST > MT·ST > MT > MT")

WEAPONS = [("Curtana Ultima", "PLD", "030000/030588"), ("Holy Shield Ultima", "PLD", "030000/030181"),
           ("Bravura Ultima", "WAR", "031000/031562"), ("Deathbringer Ultima", "DRK", "034000/034316"),
           ("Thyrus Ultima", "WHM", "032000/032737"), ("Omnilex Ultima", "SCH", "033000/033261"), ("Atlas Ultima", "AST", "034000/034913"),
           ("Sphairai Ultima", "MNK", "031000/031154"), ("Gae Bolg Ultima", "DRG", "031000/031962"), ("Yoshimitsu Ultima", "NIN", "033000/033940"),
           ("Amakura Ultima", "SAM", "036000/036470"), ("Artemis Bow Ultima", "BRD", "032000/032353"), ("Ferdinand Ultima", "MCH", "034000/034439"),
           ("Stardust Rod Ultima", "BLM", "033000/033105"), ("The Veil of Wiyu Ultima", "SMN", "033000/033262"), ("Needle Ultima", "RDM", "036000/036771")]
pieces = [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for n, j, p in WEAPONS]
ESCHINA = {"map": {"map": "g3t1/00", "size": 200, "x": 13.8, "y": 11.7, "label": "Eschina"},
           "say": "จุดแลก: Eschina ใน Rhalgr's Reach (X: 13.8 Y: 11.7)", "say_en": "Where to exchange: Eschina in Rhalgr's Reach (X: 13.8 Y: 11.7)"}

rewards = [
    {"kind": "token", "name": "Ultima Totem", "icon_src": ICON("ui/icon/026000/026532_hr1.tex"),
     "say": "เคลียร์แล้วได้ทั้ง 8 คน คนละ 1 ชิ้น\n\n"
            "แลกที่ Eschina ใน Rhalgr's Reach (X: 13.8 Y: 11.7) เมนู Totem Gear (The Ultima Weapon)\n"
            "อาวุธ IL375: 1 ชิ้น ต่ออาวุธ 1 ชิ้น อาชีพไหนก็ได้ (Paladin ได้ดาบ + โล่)",
     "say_en": "Every clear gives all eight players one\n\n"
               "Exchange it with Eschina in Rhalgr's Reach (X: 13.8 Y: 11.7), Totem Gear (The Ultima Weapon)\n"
               "IL375 weapon: one totem per weapon, any job (a Paladin gets sword + shield)",
     "pics": [ESCHINA]},
    {"kind": "weapon", "name": "Ultima Weapons", "ilvl": 375, "icon_src": ICON("ui/icon/030000/030588_hr1.tex"),
     "say": "แลกด้วย Ultima Totem 1 ชิ้น ต่ออาวุธ 1 ชิ้น\n"
            "มีให้ 15 อาชีพของ Stormblood แตะไอคอนเพื่อดูชื่ออาวุธ",
     "say_en": "One Ultima Totem per weapon\n"
               "For the 15 Stormblood jobs; tap an icon for the weapon's name",
     "pieces": pieces},
    {"kind": "other", "name": "The Ultimate Legend", "icon_src": ICON("ui/icon/000000/000317_hr1.tex"),
     "say": "ฉายาพิเศษ ได้จาก achievement Ultimatum (ชนะ Ultima Weapon ใน The Weapon's Refrain (Ultimate))",
     "say_en": "A special title, from the achievement Ultimatum (defeat the Ultima Weapon in the Weapon's Refrain (Ultimate))"},
]

guide = {
    "slug": "uwu", "short": "UWU",
    "name": "The Weapon's Refrain (Ultimate)",
    "category": "ultimate", "expansion": "Stormblood", "patch": "4.31",
    "source_name": "Tuufless's Notes (Elemental PF)", "source_url": "https://ffxiv.tuufless.com/elemental/uwu/",
    "content_key": "ult:The Weapon's Refrain",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 70, "ilvl": 375, "party": 8, "minutes": 120,
            "unlock": "เคลียร์ Sigmascape V4.0 (Savage) ให้ได้ก่อน\n"
                      "แล้วคุยกับ wandering minstrel ที่ Kugane (X: 11.6 Y: 12.6) ด้วย Lv70 ขึ้นไป เพื่อปลดล็อก\n"
                      "ในดันเจี้ยน level ถูก sync เป็น 70 และ item level ถูก sync เป็น 375 (ใส่ของ IL สูงกว่าก็คิดเป็น 375)\n"
                      "เข้าได้เฉพาะปาร์ตี้ 8 คน",
            "unlock_en": "Clear Sigmascape V4.0 (Savage) first\n"
                         "then talk to the wandering minstrel in Kugane (X: 11.6 Y: 12.6) at level 70 or above to unlock it\n"
                         "Inside, level is synced to 70 and item level to 375 (higher gear counts as 375)\n"
                         "Full parties of eight only",
            "unlock_pics": [{"map": {"map": "e3t1/00", "size": 200, "x": 11.6, "y": 12.6, "label": "Wandering Minstrel"},
                             "say": "Kugane (X: 11.6 Y: 12.6) — wandering minstrel", "say_en": "Kugane (X: 11.6 Y: 12.6) — the wandering minstrel"}]},
    "macro_en": macro_en, "macro_ja": macro_ja,
    "xref_name": "Tuufless's Notes (Elemental PF)", "xref_url": "https://ffxiv.tuufless.com/elemental/uwu/",
}

defaults = {"frame": [1, 1], "bg": "#2c2d31", "arena": {"shape": "circle", "at": [50, 50], "r": 49.5, "fill": "#4b4547", "lines": False},
            "waymarks": {}, "iconSize": 6, "markSize": 5, "bossSize": 8, "ring": 5}

data = {"guide": guide, "defaults": defaults, "steps": steps, "rewards": rewards}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "scenes", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps))
