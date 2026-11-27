"""P7 Dragon-king Thordan (Tuufless: 07_dragonking_thordan + mitigation)."""
from core import step, both, FR
import sc7 as S

P7 = ("P7 Dragon-king Thordan", "P7 Dragon-king Thordan")
SAYS = lambda d: dict(zip(("says", "says_en"), both(d)))

step(P7, "Mitigation", "แผน mitigate ของ P7", "P7's mitigation plan",
     "P7 ต้องวางแผน mitigate ให้ใช้ cooldown ของปาร์ตี้ได้คุ้มสุด:\n"
     "Akh Morn's Edge 1: MT Reprisal, H1 120s, H2 30s, D1 / Tank Rampart + 3rd\n"
     "Gigaflare's Edge 1: ST Reprisal, H2 30s, D2, D4\n"
     "Akh Morn's Edge 2: MT Reprisal, MT 90s, ST 90s, H2 30s, D3 / Tank 30%\n"
     "Gigaflare's Edge 2: ST Reprisal, H2 30s, H2 120s, D1\n"
     "Akh Morn's Edge 3: MT Reprisal, MT 90s, ST 90s, H1 120s, H2 30s, D2, D3, D4 / Tank Rampart + 3rd (WAR ใช้ Holmgang)\n\n"
     "ต้องจับจังหวะ mitigate บางอันตอน auto-attack ครั้งที่ 2 (Trinity) ก่อน Akh Morn's Edge เพื่อให้ได้ใช้เพิ่ม:\n"
     "AM1: ใช้ H2 30s ตอน Trinity ครั้งที่ 2 หลัง Exaflare's Edge → H2 30s กลับมาทัน Gigaflare's Edge\n"
     "AM2: ใช้ MT 90s, ST 90s, H2 30s, D3 ตอน Trinity ครั้งที่ 2 หลัง Exaflare's Edge → MT 90s, ST 90s, D3 กลับมาทัน AM3\n"
     "AM3: ใช้ MT 90s, ST 90s, D3 ทันทีที่กลับมา\n"
     "MT, ST, H2, D3 ดู Trinity หลัง Exaflare's Edge เพื่อกดให้ตรงจังหวะ\n"
     "H1 180s (Liturgy of the Bell / Macrocosmos) ใช้ที่ AM2 / SCH ชอบใช้ Seraph ที่ Gigaflare / SGE ใช้ Panhaima ที่ AM1 และ AM3",
     "P7 needs mitigation planning to get the most out of the party's cooldowns:\n"
     "Akh Morn's Edge 1: MT Reprisal, H1 120s, H2 30s, D1 / tanks Rampart + 3rd\n"
     "Gigaflare's Edge 1: ST Reprisal, H2 30s, D2, D4\n"
     "Akh Morn's Edge 2: MT Reprisal, MT 90s, ST 90s, H2 30s, D3 / tanks 30%\n"
     "Gigaflare's Edge 2: ST Reprisal, H2 30s, H2 120s, D1\n"
     "Akh Morn's Edge 3: MT Reprisal, MT 90s, ST 90s, H1 120s, H2 30s, D2, D3, D4 / tanks Rampart + 3rd (a WAR Holmgangs)\n\n"
     "Some mitigation is timed at the second auto-attack (Trinity) before Akh Morn's Edge to gain extra uses:\n"
     "AM1: H2 30s at the 2nd Trinity after Exaflare's Edge → it's back for Gigaflare's Edge\n"
     "AM2: MT 90s, ST 90s, H2 30s, D3 at the 2nd Trinity after Exaflare's Edge → MT 90s, ST 90s, D3 are back for AM3\n"
     "AM3: MT 90s, ST 90s, D3 as soon as they're available\n"
     "MT, ST, H2 and D3 watch the Trinity after Exaflare's Edge to time them\n"
     "H1 180s (Liturgy of the Bell / Macrocosmos) at AM2 / a SCH prefers Seraph at Gigaflare / a SGE's Panhaima at AM1 and AM3",
     strict=False)

step(P7, "Mitigation", "ดาเมจและจังหวะ", "Damage and timing",
     "Akh Morn's Edge: 36k–38k ต่อวินาที\n"
     "Gigaflare's Edge: 67k–71k ต่อครั้ง แต่ 3 ครั้งห่างกันใน 8 วินาที (เฉลี่ยต่อวินาทีน้อยกว่า แต่ต้องขยับและ heal ไปด้วย)\n"
     "Gigaflare's Edge ยาว 8 วินาที แต่ Reprisal / Feint / Addle อยู่แค่ 10 วินาที: ต้องจับจังหวะ",
     "Akh Morn's Edge: 36k-38k a second\n"
     "Gigaflare's Edge: 67k-71k a hit, but the three are spread over 8 seconds (less per second, offset by moving and healing)\n"
     "Gigaflare's Edge lasts 8 s while Reprisal / Feint / Addle last only 10 s: time them",
     strict=False)

FI = "Fire of Ascalon / Ice of Ascalon"
step(P7, FI, "ดาบแดง = Fire: ออกนอกวง target", "Red swords = Fire: outside the target circle",
     "Mechanic ใหญ่ทุกอันของ Dragon-king Thordan มาพร้อม Fire หรือ Ice of Ascalon ลงพร้อมกันตอนเริ่ม\n"
     "ดาบเรืองแดง: Fire of Ascalon = AoE รอบตัว ทุกคนต้องอยู่นอกวง target",
     "Every big Mechanic of Dragon-king Thordan comes with Fire or Ice of Ascalon, resolving at its start\n"
     "Red swords: Fire of Ascalon, a point-blank AoE: everyone outside his target circle",
     strict=False, pic="07/fire_of_ascalon_02.jpg", scene=S.fire())
step(P7, FI, "ดาบน้ำเงิน = Ice: เข้าในวง target", "Blue swords = Ice: inside the target circle",
     "ดาบเรืองน้ำเงิน: Ice of Ascalon = AoE donut ทุกคนต้องอยู่ในวง target",
     "Blue swords: Ice of Ascalon, a donut AoE: everyone inside his target circle",
     strict=False, pic="07/ice_of_ascalon_02.jpg", scene=S.ice(),
     refs=[FR("p7-ice", "1fsbzkZsWUE", 420, "Ice of Ascalon (ดาบน้ำเงิน): donut ข้างนอก ทุกคนอยู่ในวง target", "Ice of Ascalon (blue swords): the donut outside; everyone inside the target circle")])
step(P7, "Trinity", "auto-attack 3 เป้า + คนรับแทน", "The three-target auto-attack + who takes it",
     "จบแต่ละ Mechanic Thordan auto-attack 2 ครั้ง แต่ละครั้งโดน 3 คน:\n"
     "hate อันดับ 1: ดาเมจมืด + Dark Resistance Down 1 stack\n"
     "hate อันดับ 2: ดาเมจแสง + Light Resistance Down 1 stack\n"
     "คนที่ใกล้สุด: Dark + Light Resistance Down + Physical Vulnerability Up\n\n"
     "คนที่ไม่ใช่ Tank ผลัดกันรับคนละ 1 ครั้ง (เป็นคนใกล้สุด):\n"
     "หลัง Exaflare's Edge: D1 > D2\nหลัง Akh Morn's Edge: D3 > D4\nหลัง Gigaflare's Edge: H1 > H2\n\n"
     "ดีบัฟ Light/Dark สะสมบน Tank: Tank สลับ hate ตลอดไฟต์\n"
     "Tip: ใส่ข้อความใน macro Provoke ให้ใน chat มีบันทึกว่าใคร Provoke ล่าสุด / Tank ที่มี Dark Resistance Down 0 หรือ 1 stack ควรถือ hate",
     "After each Mechanic Thordan auto-attacks twice, each hitting three players:\n"
     "highest aggro: dark damage + a stack of Dark Resistance Down\n"
     "second aggro: light damage + a stack of Light Resistance Down\n"
     "the closest player: Dark + Light Resistance Down + Physical Vulnerability Up\n\n"
     "The non-tanks rotate in to take one each (as the closest player):\n"
     "after Exaflare's Edge: D1 > D2\nafter Akh Morn's Edge: D3 > D4\nafter Gigaflare's Edge: H1 > H2\n\n"
     "With Light/Dark stacks building on the tanks, they swap aggro all fight\n"
     "Tip: add text to a Provoke macro so chat records who provoked last / the tank with 0 or 1 Dark Resistance Down should hold aggro",
     strict=["MT", "ST", "D1"], pic="07/trinity.jpg", scene=S.trinity(),
     **SAYS({"D1": ("รับ Trinity ครั้งที่ 1 หลัง Exaflare's Edge (D2 ครั้งที่ 2)", "Take the 1st Trinity after Exaflare's Edge (D2 the 2nd)"),
             "D2": ("รับ Trinity ครั้งที่ 2 หลัง Exaflare's Edge", "Take the 2nd Trinity after Exaflare's Edge"),
             "D3": ("รับ Trinity ครั้งที่ 1 หลัง Akh Morn's Edge", "Take the 1st Trinity after Akh Morn's Edge"),
             "D4": ("รับ Trinity ครั้งที่ 2 หลัง Akh Morn's Edge", "Take the 2nd Trinity after Akh Morn's Edge"),
             "H1": ("รับ Trinity ครั้งที่ 1 หลัง Gigaflare's Edge", "Take the 1st Trinity after Gigaflare's Edge"),
             "H2": ("รับ Trinity ครั้งที่ 2 หลัง Gigaflare's Edge", "Take the 2nd Trinity after Gigaflare's Edge")}))

EX = "Exaflare's Edge"
step(P7, EX, "① Exaflare 3 ลูก", "① Three Exaflares",
     "Thordan วน 3 Mechanic ซ้ำ 3 รอบ: Exaflare's Edge → Akh Morn's Edge → Gigaflare's Edge (รอบที่ 3 เปลี่ยนเป็น Morn Afah's Edge)\n\n"
     "ก่อนเริ่ม Tank ที่ถือ hate หัน Thordan ไปเหนือหรือใต้\n"
     "Exaflare 3 ลูกขึ้นตามทิศที่ Thordan หัน",
     "Thordan runs this loop three times: Exaflare's Edge → Akh Morn's Edge → Gigaflare's Edge (Morn Afah's Edge on the third loop)\n\n"
     "Before it starts, the tank with aggro points Thordan north or south\n"
     "Three Exaflare telegraphs appear relative to Thordan's facing",
     strict=False, pic="07/exaflare_01.jpg", scene=S.exaflare(1),
     **SAYS({"MT": ("หัน Thordan ไปเหนือหรือใต้ (ถ้าถือ hate)", "Point Thordan north or south (if holding aggro)"),
             "ST": ("หัน Thordan ไปเหนือหรือใต้ (ถ้าถือ hate)", "Point Thordan north or south (if holding aggro)")}),
     refs=[FR("p7-exaflare", "1fsbzkZsWUE", 465, "Exaflare's Edge: วง Exaflare รอบ Thordan ดูจุดสว่างกลางลูกหลัง Thordan", "Exaflare's Edge: an Exaflare by Thordan; watch the bright dot of the one behind him")])
step(P7, EX, "② ดูจุดสว่างของลูกหลัง Thordan", "② Watch the bright dot behind Thordan",
     "ดูจุดสว่างที่กลาง Exaflare ลูกที่อยู่ด้านหลัง Thordan: นี่คือจุดหลบแรก",
     "Focus on the bright dot at the centre of the Exaflare at Thordan's back: that's your first dodge spot",
     strict=False)
step(P7, EX, "③ หลบครั้งแรก: เข้าจุดสว่าง", "③ First dodge: onto the bright dot",
     "Exaflare ลง: หลบเข้าไปตรงที่จุดสว่างเคยอยู่",
     "When the Exaflares resolve, dodge to where the bright dot was",
     strict=False, pic="07/exaflare_03.jpg", scene=S.exaflare(3), plan="ถอยลงใต้ (แผนหลัก)", plan_en="Step back south (main)")
step(P7, EX, "④ หลบครั้งที่ 2: ถอยหลัง", "④ Second dodge: step back",
     "หลบอีกครั้งให้พ้น Exaflare ชุดถัดไป\n"
     "ถ้า Thordan หันเหนือหรือใต้ ถอยหลังมาจุดนี้บนพื้น (ดูภาพ) ปลอดภัยเสมอ\n"
     "เล่นคล่องแล้วจะเห็นแบบที่หลบแล้วยัง Melee ตีได้ (เช่นหลบไปซ้าย) แต่ไม่จำเป็น\n\n"
     "จากนั้น Thordan auto-attack 2 ครั้ง: Tank 2 คน + D1 แล้ว D2 / Tank หัน Thordan เหนือหรือใต้ ออกจากปาร์ตี้ต่อ",
     "Dodge again to avoid the next Exaflares\n"
     "With Thordan facing north or south, stepping back to this spot on the floor (see the picture) is always safe\n"
     "With experience you'll see patterns that keep melee uptime (dodging left here), but it isn't needed\n\n"
     "Thordan then auto-attacks twice: the tanks plus D1, then D2 / the tanks keep Thordan facing north or south, away from the party",
     strict=False, pic="07/exaflare_04.jpg", scene=S.exaflare(4), plan="ถอยลงใต้ (แผนหลัก)", plan_en="Step back south (main)")
UP = [("แบบ 1: NW และ NE ไม่เฉียงทั้งคู่", "Case 1: neither NW nor NE diagonal",
       "แบบง่าย หลบครั้งเดียว:\nเข้ากลาง Exaflare ใต้\nแล้วอยู่ที่เดิม",
       "The easy case, one dodge:\nmove to the centre of the south Exaflare\nthen stay where you are"),
      ("แบบ 2: NW เฉียงลูกเดียว", "Case 2: only NW diagonal",
       "เข้ากลาง Exaflare ใต้\nแล้วหลบไปซ้าย", "Move to the centre of the south Exaflare\nthen dodge left"),
      ("แบบ 3: NE เฉียงลูกเดียว", "Case 3: only NE diagonal",
       "เข้ากลาง Exaflare ใต้\nแล้วหลบไปขวา", "Move to the centre of the south Exaflare\nthen dodge right"),
      ("แบบ 4: เฉียงทั้ง NW และ NE", "Case 4: both NW and NE diagonal",
       "แบบที่ตีไม่ได้ (ถ้าใช้ลูกใต้):\nเข้ากลาง Exaflare ใต้\nแล้วหลบลงใต้",
       "The forced-downtime pattern (if you use the south Exaflare):\nmove to the centre of the south Exaflare\nthen dodge south")]
for i, (n, ne, t, te) in enumerate(UP):
    pre = ("แบบ uptime (ตีได้ตลอด): ถอยลงใต้แบบที่ผ่านมาปลอดภัยทุกแบบแต่ Melee ตีไม่ถึง / หลบได้ทุกแบบโดย Melee ตีได้ตลอด:\n"
           "หลบแรกเข้ากลาง Exaflare ลูกใดลูกหนึ่งเสมอ / ทิศของอีก 2 ลูกบอกหลบที่ 2 (ไม่ครบทุกแบบ แต่ส่วนใหญ่อยู่ใน 4 แบบนี้)\n\n") if i == 0 else ""
    pre_e = ("Uptime option: stepping south as above is safe for every pattern but leaves melee out of range / every pattern can be dodged with full uptime:\n"
             "the first dodge is always into an Exaflare's centre / the other two's directions set the second dodge (not exhaustive, but most fall into these four)\n\n") if i == 0 else ""
    step(P7, EX, "uptime " + n, "Uptime " + ne, pre + t, pre_e + te, strict=False, pic=f"07/uptime_exaflare_0{i + 1}{'a' if i == 3 else ''}.jpg",
         scene=S.uptime(i + 1), plan="หลบแบบ uptime", plan_en="Uptime dodges")
step(P7, EX, "uptime แบบ 4: เข้าลูก NW / NE แทน", "Uptime case 4: use the NW / NE Exaflare",
     "แบบ 4 ก็ยังหลบได้โดยตีได้ตลอด ถ้าหลบแรกเข้า Exaflare NW หรือ NE แทน แต่ยังต้องอ่านอีก 2 ลูกเพื่อหลบที่ 2\n"
     "Exaflare ใต้อาจพาดผ่านกลางลูกที่เลือก: แต่ละลูกไม่เท่ากัน\n"
     "ตัวอย่างนี้: เฉพาะลูก NW ที่ 'เข้าแล้วอยู่เลย' ได้ / ลูก NE ต้องขยับนิดหน่อย\n"
     "(Tuufless มองว่าแบบนี้ซับซ้อนเกินคุ้ม แต่ทำได้ถ้ารู้ว่าทำอะไรอยู่)",
     "Case 4 can still keep full uptime if the first dodge goes into the NW or NE Exaflare, but you still read the other two for the second dodge\n"
     "The south Exaflare may pass through your chosen one's centre: not all are equal\n"
     "In this example only the NW one is 'dodge in and stay' / the NE one needs a small adjustment\n"
     "(Tuufless feels the extra complexity isn't worth it here, but it's there if you know what you're doing)",
     strict=False, pic="07/uptime_exaflare_04b.jpg", scene=S.uptime(5), plan="หลบแบบ uptime", plan_en="Uptime dodges")

step(P7, "Akh Morn's Edge", "tower 3-3-2", "The 3-3-2 towers",
     "Thordan วาง tower 3 อันตามทิศที่หัน:\ntower แดงหน้าซ้าย / tower แดงหน้าขวา / tower น้ำเงินด้านหลัง\n"
     "tower น้ำเงินแรงกว่า: ให้ Tank รับ\n"
     "ทุกคนต้องอยู่ในวง target ของ Thordan ถึงจะอยู่ในระยะ heal ของ Healer ทั้ง 2: ถ้าตอนแรกดาบแดง (ออกนอก) อย่าลืมกลับเข้า\n\n"
     "แบ่ง 3-3-2 ทุกครั้ง:\nหน้าซ้าย: H1, D1, D3\nหน้าขวา: H2, D2, D4\nหลัง: MT, ST\n\n"
     "จากนั้น auto-attack 2 ครั้ง: Tank 2 คน + D3 แล้ว D4 / หลัง Akh Morn's Edge Thordan หันทางไหนก็ได้\n"
     "บัฟ/potion รอบที่ 2: ระหว่าง Akh Morn's Edge ครั้งที่ 3",
     "Thordan places three towers relative to his facing:\na red tower front-left / a red tower front-right / a blue tower behind\n"
     "The blue tower hits harder and is for the tanks\n"
     "Everyone must be inside Thordan's hitbox to be in range of both healers: step back in if the swords were red\n\n"
     "Always 3-3-2:\nFront-left: H1, D1, D3\nFront-right: H2, D2, D4\nBack: MT, ST\n\n"
     "Then two auto-attacks: the tanks plus D3, then D4 / where Thordan faces after Akh Morn's Edge doesn't matter\n"
     "The second buff / potion window: during Akh Morn's Edge 3",
     strict=True, pic="07/akh_morn.jpg", scene=S.akh_morn(),
     refs=[FR("p7-akh-morn", "pRkdxw9YOLo", 150, "Akh Morn's Edge: tower แดงหน้าซ้าย/ขวา + tower น้ำเงินด้านหลัง (Tank)", "Akh Morn's Edge: red towers front-left/right + the blue tower behind (tanks)")])
step(P7, "Akh Morn's Edge", "ทำไมไม่ใช้ 1-1-6", "Why not 1-1-6",
     "1-1-6: Tank 1 คน invuln ใน tower Tank / Tank อีกคนรับ tower DPS คนเดียวพร้อม mitigate / อีก 6 คนรับ tower DPS ที่เหลือ\n"
     "heal ง่ายกว่า แต่ Tank ต้อง mitigate Wyrmsbreath 2 และ Cauterize ด้วย 30% ชุดเดียวกันตอนท้าย P6 (ไม่ใช้ invuln) ทำให้ P6 พลาดง่ายขึ้น\n"
     "ยังเปิดทางพลาดใหม่: H2 / D2 / D4 หรือ Tank ไปผิด tower ผิดรอบ / 'heal น้อยลง' ไม่ใช่ 'ไม่ต้อง heal'\n"
     "แผนนี้ใช้ 3-3-2 ทุกครั้ง (ภาพเป็นแค่ตัวอย่าง 1-1-6 ให้รู้จัก)",
     "1-1-6: one tank invulns the tank tower / the other tank solos a DPS tower with mitigation / the other six take the remaining DPS tower\n"
     "It's easier to heal, but the tanks must mitigate Wyrmsbreath 2 and Cauterize with the same 30% at the end of P6 (no invulns), making P6 even less forgiving\n"
     "It also opens new errors: H2 / D2 / D4 or a tank in the wrong tower on the wrong Akh Morn's Edge / 'less healing' isn't 'no healing'\n"
     "This plan always does 3-3-2 (the picture only shows 1-1-6 for reference)",
     strict=False, pic="07/akh_morn_116.jpg", scene=S.akh_116())
step(P7, "Gigaflare's Edge", "AoE 3 จุดวนรอบ Thordan", "Three AoEs round Thordan",
     "raid-wide 3 ครั้ง แต่ละครั้งมีจุดศูนย์กลางเป็นสามเหลี่ยม วนตามเข็มหรือทวนเข็มรอบ Thordan\n"
     "ดาเมจลดตามระยะแบบชัน จึงเหมือน AoE: อยู่ในเขตที่ทำเครื่องหมาย = ตายทันที / อยู่นอก = แค่เจ็บหนัก (ภาพ: Gigaflare ลูกใต้)\n"
     "ลดราว 11k ต่อ 1 yalm\n\n"
     "จากนั้น auto-attack 2 ครั้ง: Tank 2 คน + H1 แล้ว H2\n"
     "หลัง Gigaflare's Edge Tank ที่ถือ hate หัน Thordan ไปเหนือหรือใต้ตรงๆ เตรียม Exaflare's Edge แล้ววนรอบใหม่\n"
     "บัฟ/potion รอบแรก: หลัง Gigaflare's Edge ครั้งที่ 1 (P7 ยาวราว 3:45 ไม่พอสำหรับ burst 2 นาทีรอบที่ 3 และบางคนใช้ burst ไปท้าย P6)",
     "Three raid-wides, each centred on a point of a triangle going clockwise or anti-clockwise round Thordan\n"
     "The damage falls off so steeply it acts like an AoE: inside the marked area = one-shot / outside = just heavy damage (picture: a south Gigaflare)\n"
     "About 11k less per yalm\n\n"
     "Then two auto-attacks: the tanks plus H1, then H2\n"
     "After Gigaflare's Edge the tank with aggro faces Thordan directly north or south for Exaflare's Edge, and the loop repeats\n"
     "The first buff / potion window: after Gigaflare's Edge 1 (P7 lasts about 3:45, too short for a third 2-minute burst, and some players burst at the end of P6)",
     strict=False, pic="07/gigaflare.jpg", scene=S.gigaflare(),
     refs=[FR("p7-gigaflare", "pRkdxw9YOLo", 210, "Gigaflare's Edge: จุดศูนย์กลาง AoE ลูกแรก ออกห่างแล้ววนตามลำดับ", "Gigaflare's Edge: the first epicentre; move away, then follow the order round")])
step(P7, "Morn Afah's Edge", "tower ต่อเนื่อง = enrage", "Continuous towers = the enrage",
     "รอบที่ 3 แทน Gigaflare's Edge: Thordan วาง tower 3 อันแล้วตีรัวๆ แต่ละชุดฆ่า 3 คน ปาร์ตี้รับได้แค่ 2 ชุด (คนไม่พอสำหรับชุดที่ 3)\n"
     "tower ตรงกับกลุ่มของ Akh Morn's Edge\n"
     "ลำดับตาย:\ntower ชุดแรก: H1, H2, MT\ntower ชุดที่ 2: D3, D4, ST\ntower ชุดที่ 3: ไม่ต้องเข้า (ปล่อยให้ tower fail wipe ดีกว่าให้ D1 D2 ตายใน tower)\n\n"
     "หลังครั้งแรก Morn Afah's Edge ตี tower ทุก 3 วินาที: ถ้าไม่ใช่ชุดแรก ยืนรอใกล้ tower ของตัวเอง ห้ามรอจนถึงตาแล้วค่อยเดิน",
     "On the third loop, in place of Gigaflare's Edge: Thordan places three towers and hits them in quick order; each set kills three, so the party can take only two rounds (not enough players for a third)\n"
     "The towers match the Akh Morn's Edge groups\n"
     "Kill order:\nFirst towers: H1, H2, MT\nSecond towers: D3, D4, ST\nThird towers: ignore (let the tower failure wipe the party rather than have D1 and D2 killed by the towers)\n\n"
     "After the first hit it strikes the towers every 3 seconds: if you're not in the first set, stand by near your tower; don't wait for your turn to walk in",
     strict=False)
