"""P4 (Blue Screen), from Tuufless's Notes: elemental/top/04_blue_screen/ (+ mitigation/)."""
from core import step, FR, P4
from scenes_top import *

BS = "Wave Cannon"
B0 = (50, 50)
TRN = target_ring(B0, 29, face=0, gap=80)
CY = "#38d6d6"
BASE = dict(MT=(14, 43), D3=(14, 58), H1=(20, 72), D1=(28, 80), ST=(86, 43), D4=(86, 58), H2=(80, 72), D2=(72, 80))
LST, RST = (44, 86), (56, 86)


def spread_beams(keys, pos):
    return [cone(B0, ang(B0, pos[k]), 22, 70, "#e8f0ff", 0.3) for k in keys]


def stack_at(left, right, ln, rn):
    """Two groups of four stacked south; ln / rn the seats in each."""
    out = {}
    offs = [(-1.6, -1.6), (1.6, -1.6), (-1.6, 1.6), (1.6, 1.6)]
    for (dx, dy), k in zip(offs, ln):
        out[k] = (left[0] + dx * 1.4, left[1] + dy * 1.4)
    for (dx, dy), k in zip(offs, rn):
        out[k] = (right[0] + dx * 1.4, right[1] + dy * 1.4)
    return out


step(P4, "Blue Screen", "ภาพรวม: เฟสสั้น 55 วินาที เช็ก DPS", "Overview: a 55-second DPS check",
     "Omega ใน P3 ตายแล้ว 'รีบูต' HP กลับเป็น 100% แล้วเริ่มเฟสนี้\n"
     "เฟสสั้น 55 วินาที: ต้องตีให้ HP ต่ำกว่า 20% ก่อน Blue Screen (enrage) ลง\n"
     "ปกติเปิดเฟสด้วย Melee LB3\n"
     "ลำดับ Melee LB3: NIN > DRG > MNK > VPR > RPR > SAM (เลือกคนที่เสียน้อยที่สุด)\n\n"
     "ระหว่างนี้แก้ stack / spread ง่ายๆ และหลบ donut ที่ขยายออก (Wave Repeater) แบบช่วงเปลี่ยนเฟสก่อนหน้า\n\n"
     "เคล็ดลับ: stack แรงกว่า spread / mitigate ที่อยู่ 15 วินาทีใช้หลังลำแสง spread จะคลุมได้ 2 stack\n\n"
     "mitigate: Tank 90s, D1, D3 ต้องเก็บไว้ใช้ Run: Dynamis (Delta) จึงใช้ในเฟสนี้ไม่ได้\n"
     "Healer เป็นคน mitigate (Tank ช่วยด้วย Reprisal) ใช้ตรงไหนก็ได้\n"
     "Healer 120s แต่ละอันคลุมได้ 2 stack 2 spread",
     "Omega, beaten in P3, 'reboots' to 100% HP and starts this phase\n"
     "A short 55-second race: get Omega under 20% before Blue Screen (the enrage)\n"
     "Groups usually open with a melee LB3\n"
     "Melee LB3 priority: NIN > DRG > MNK > VPR > RPR > SAM (whoever loses least)\n\n"
     "Meanwhile, simple stacks / spreads while dodging the expanding donuts (Wave Repeater) from the transition\n\n"
     "Tip: the stack hits harder than the spread / 15-second mitigations used after the spread beams cover two stacks\n\n"
     "Mitigation: tank 90s, D1 and D3 are saved for Run: Dynamis (Delta), so they can't be used here\n"
     "The healers mitigate this phase (with Reprisal); where doesn't much matter\n"
     "Each healer 120s lasts two stacks and two spreads",
     strict=False,
     refs=[FR("blue-screen", "nin", 501, "Blue Screen: Wave Cannon ยิงใส่ทุกคน แล้ว stack 2 กลุ่มทางใต้", "Blue Screen: Wave Cannon hits everyone, then two stacks to the south")])

sh = TRN + stackmark(BASE["MT"], 4.4) + stackmark(BASE["H1"], 4.4) + [arrow((25, 72), (73, 70), "#ffd23f", 0.4), arrow((70, 82), (31, 82), "#ffd23f", 0.4)]
step(P4, BS, "รอบแรก ①: ยืนข้างบอส เว้นทางใต้ / ดู stack", "First wave ①: along the sides, south empty / check the stacks",
     "① กระจายยืนสองข้างของ Omega เว้นทางใต้ไว้\n"
     "จากเหนือลงใต้: Tank > Range > Healer > Melee\n\n"
     "Omega มาร์ก Wave Cannon (stack) ใส่ 2 คนแบบสุ่ม\n"
     "ถ้าฝั่งเราได้ stack ทั้ง 2 อัน: คนที่โดนมาร์กที่อยู่ล่างกว่า ย้ายไปอีกฝั่ง\n"
     "ถ้าฝั่งเราไม่มี stack เลย: Melee ฝั่งเราย้ายไปอีกฝั่ง\n\n"
     "ตัวอย่าง: MT กับ H1 โดน (ฝั่งซ้ายทั้งคู่) จึงสลับ H1 กับ D2 ทีหลัง\n"
     "mitigate: MT Reprisal (คลุมทั้ง spread และ stack ชุดนี้)",
     "① Spread out along Omega's sides, leaving the south empty\n"
     "North to south: Tank > Range > Healer > Melee\n\n"
     "Omega marks two random players for Wave Cannon stacks\n"
     "Your side has both stacks: the lower marked player swaps to the other side\n"
     "Your side has none: your melee swaps to the other side\n\n"
     "Example: MT and H1 are marked (both left), so H1 and D2 swap later\n"
     "Mitigation: MT Reprisal (covers this spread and stack)",
     strict=True, pic="04/blue_screen_1_1.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**BASE)))

sh = TRN + spread_beams(("MT", "D3", "H1", "D1", "ST", "D4", "H2", "D2"), BASE) + [arrow((30, 66), (42, 84)), arrow((70, 66), (58, 84))]
step(P4, BS, "② spread ลง แล้วไปรวม stack ทางใต้", "② Spread beams, then stack south",
     "② Wave Cannon ชุดแรก (spread) ยิงออกไป\n"
     "ไปจุดทางใต้ แล้ว stack กลุ่มละ 4 (สลับฝั่งถ้าต้องสลับ)",
     "② The first Wave Cannons (spread) go out\n"
     "Move to the south spots and stack in fours, swapping if needed",
     strict=True, pic="04/blue_screen_1_2.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**BASE)))

S1 = stack_at(LST, RST, ("MT", "D3", "D2", "D1"), ("ST", "D4", "H1", "H2"))
sh = TRN + aoe(LST, 8, "#ffc9a8", 0.4) + aoe(RST, 8, "#ffc9a8", 0.4) + stackmark(LST, 5) + stackmark(RST, 5)
step(P4, BS, "③ stack ลง แล้วกลับที่เดิม", "③ Stacks resolve; back to your spots",
     "③ stack ลง\n"
     "กลับไปยืนตำแหน่งเดิมของตัวเอง\n"
     "เคล็ดลับ: ใช้ Sprint ตรงนี้ได้ดี โดยเฉพาะ Tank",
     "③ The stacks resolve\n"
     "Go back to your original spots\n"
     "Tip: a good place for Sprint, especially for tanks",
     strict=True, pic="04/blue_screen_1_3.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**S1)))

sh = TRN + aoe(B0, 12, CY, 0.4) + stackmark(BASE["D4"], 4.4) + stackmark(BASE["D1"], 4.4)
step(P4, BS, "รอบที่ 2 ④: stack ฝั่งละอัน ไม่ต้องสลับ", "Second wave ④: one stack each side, no swap",
     "Wave Cannon ชุดต่อจากนี้มาพร้อม Wave Repeater (วงขยายจากกลาง)\n\n"
     "④ Omega มาร์ก stack ใส่ 2 คนแบบสุ่ม\n"
     "วงแรกของ Wave Repeater ลงที่กลาง\n"
     "ตัวอย่าง: ฝั่งละ 1 อัน ไม่ต้องสลับ\n"
     "mitigate: ST Reprisal (คลุมทั้ง spread และ stack ชุดนี้)",
     "The next Wave Cannons come with the expanding Wave Repeater from the middle\n\n"
     "④ Omega marks two random players for stacks\n"
     "The Wave Repeater's first hit goes off in the middle\n"
     "Example: one stack each side, no swap\n"
     "Mitigation: ST Reprisal (covers this spread and stack)",
     strict=True, pic="04/blue_screen_2_1.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**BASE)))

sh = TRN + [donut(B0, 27, 12, CY, 0.38)] + spread_beams(("MT", "D3", "H1", "D1", "ST", "D4", "H2", "D2"), BASE) + [arrow((26, 64), (40, 72)), arrow((74, 64), (60, 72))]
step(P4, BS, "⑤ หลบเข้าวงแหวน แล้วรวมทางใต้", "⑤ Dodge into the ring, gather south",
     "⑤ วงแหวนที่ 2 ของ Wave Repeater ลงพร้อม Wave Cannon (spread) ชุดแรก\n"
     "หลบเข้าไปในวงแหวน (ที่เพิ่งลง) แล้วรวมกันทางใต้ (สลับฝั่งถ้าต้องสลับ)",
     "⑤ The Wave Repeater's second ring goes off with the first Wave Cannons (spread)\n"
     "Dodge into the ring (just gone off) and gather south, swapping if needed",
     strict=True, pic="04/blue_screen_2_2.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**BASE)))

S2 = stack_at((43, 71), (57, 71), ("MT", "D3", "H1", "D1"), ("ST", "D4", "H2", "D2"))
sh = TRN + [donut(B0, 42, 27, CY, 0.38)] + stackmark((43, 71), 5) + stackmark((57, 71), 5)
step(P4, BS, "⑥ หลบเข้าวงแหวนนอก", "⑥ Into the outer ring",
     "⑥ วงแหวนนอกลง: หลบเข้าไปในวงแหวน (ที่เพิ่งลง)",
     "⑥ The outer ring goes off: dodge into it as it resolves",
     strict=True, pic="04/blue_screen_2_3.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**S2)))

S2b = stack_at(LST, RST, ("MT", "D3", "H1", "D1"), ("ST", "D4", "H2", "D2"))
sh = TRN + [donut(B0, 49, 42, CY, 0.38)] + aoe(LST, 8, "#ffc9a8", 0.4) + aoe(RST, 8, "#ffc9a8", 0.4)
step(P4, BS, "⑦ stack ลง กลับที่เดิม (ตัดผ่านบอสได้)", "⑦ Stacks resolve; back (through the boss is fine)",
     "⑦ stack ลง\n"
     "กลับไปตำแหน่งเดิม\n"
     "เคล็ดลับ: เดินตัดผ่านตัวบอสกลับไปได้",
     "⑦ The Wave Cannon stacks resolve\n"
     "Go back to your original spots\n"
     "Tip: you can cut through the boss to get back",
     strict=True, pic="04/blue_screen_2_4.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**S2b)))

sh = TRN + stackmark(BASE["D4"], 4.4) + stackmark(BASE["D2"], 4.4) + [arrow((30, 80), (70, 80), "#ffd23f", 0.4), arrow((70, 84), (30, 84), "#ffd23f", 0.4)]
step(P4, BS, "รอบที่ 3 ⑧: D2 กับ D4 โดน: สลับ D1 กับ D2", "Third wave ⑧: D2 and D4 marked; D1 and D2 swap",
     "⑧ Omega มาร์ก stack ใส่ 2 คนแบบสุ่ม\n"
     "ตัวอย่าง: D2 กับ D4 โดน (ฝั่งขวาทั้งคู่)\n"
     "D2 อยู่ล่างกว่าจึงย้ายไปซ้าย / ฝั่งซ้ายไม่มี stack Melee ฝั่งซ้าย (D1) จึงย้ายไปขวา: D1 กับ D2 สลับกัน",
     "⑧ Omega marks two random players for stacks\n"
     "Example: D2 and D4 are marked (both right)\n"
     "D2 is lower so goes left / the left has none, so its melee (D1) goes right: D1 and D2 swap",
     strict=True, pic="04/blue_screen_3_1.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**BASE)))

sh = TRN + spread_beams(("MT", "D3", "H1", "D1", "ST", "D4", "H2", "D2"), BASE) + aoe(B0, 12, "#ffc9a8", 0.35) + [arrow((30, 66), (42, 84)), arrow((70, 66), (58, 84))]
step(P4, BS, "⑨ spread ลง รวม stack ทางใต้", "⑨ Spread beams, stack south",
     "⑨ Wave Cannon ชุดแรกลง\n"
     "รวมกันทางใต้ stack กลุ่มละ 4 (สลับฝั่งถ้าต้องสลับ)",
     "⑨ The first Wave Cannons go off\n"
     "Gather south and stack in fours, swapping if needed",
     strict=True, pic="04/blue_screen_3_2.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**BASE)))

S3 = stack_at(LST, RST, ("MT", "D3", "H1", "D2"), ("ST", "D4", "H2", "D1"))
sh = TRN + aoe(B0, 12, CY, 0.4) + aoe(LST, 8, "#ffc9a8", 0.4) + aoe(RST, 8, "#ffc9a8", 0.4)
step(P4, BS, "⑩ stack ลง รออยู่ที่เดิม", "⑩ Stacks resolve; stay put",
     "⑩ stack ลง\n"
     "รออยู่ตรงนั้น ให้ Wave Repeater ลงก่อน\n"
     "mitigate: Healer 120s ที่ใช้ตรง stack ชุดนี้จะคลุม Blue Screen ด้วย",
     "⑩ The Wave Cannon stacks resolve\n"
     "Wait where you are for the Wave Repeater\n"
     "Mitigation: healer 120s used on this stack also cover Blue Screen",
     strict=True, pic="04/blue_screen_3_3.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**S3)))

S3b = stack_at((44, 80), (56, 80), ("MT", "D3", "H1", "D2"), ("ST", "D4", "H2", "D1"))
sh = TRN + [donut(B0, 34, 16, CY, 0.4)] + [arrow((44, 90), (44, 84)), arrow((56, 90), (56, 84))]
step(P4, BS, "⑪ หลบเข้าวง Wave Repeater", "⑪ Dodge into the Wave Repeater",
     "⑪ หลบเข้าไปในวง AoE ของ Wave Repeater (ที่เพิ่งลง)",
     "⑪ Dodge into the Wave Repeater's AoE as it resolves",
     strict=True, pic="04/blue_screen_3_4.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**S3b)))

sh = TRN + [donut(B0, 44, 34, CY, 0.4)]
step(P4, "Blue Screen", "⑫ Blue Screen: ต้องต่ำกว่า 20%", "⑫ Blue Screen: under 20%",
     "⑫ Omega ร่าย Blue Screen: enrage ของเฟส\n"
     "ต้องตี Omega ให้ HP ต่ำกว่า 20% จึงผ่าน\n"
     "mitigate: H2 30s (H2 120s ใช้แทน barrier หรือ H2 30s ได้)",
     "⑫ Omega casts Blue Screen, the phase's hard enrage\n"
     "Omega must be below 20% HP to clear it\n"
     "Mitigation: H2 30s (H2 120s can stand in for shields or H2 30s)",
     strict=False, pic="04/blue_screen_3_5.jpg", scene=board(sh, wm=False, boss=B0, roles=roles(**S3b)))
