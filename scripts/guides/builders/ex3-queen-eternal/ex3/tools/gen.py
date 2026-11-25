"""Builds scripts/guides/data/ex3-queen-eternal.json (EX3 Queen Eternal, game8's Hamukatsu plan)."""
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/ex3"
sys.path.insert(0, HERE + "/tools")
from scenes import *  # noqa

OUT = r"scripts/guides/data/ex3-queen-eternal.json"
macros = json.load(open(HERE + "/macros.json", encoding="utf-8"))
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
XJ = "https://xivjpraids.com/images/7.0_dawntrail/sphene/"

P0, P0E = "เตรียมตัว", "Setup"
P1, P1E = "ช่วงแรก (สนามปกติ)", "First phase (normal arena)"
V1, V1E = "Virtual Shift ครั้งที่ 1 (ลม)", "Virtual Shift 1 (wind)"
N2, N2E = "สนามปกติ ครั้งที่ 2", "Normal arena 2"
V2, V2E = "Virtual Shift ครั้งที่ 2 (ดิน)", "Virtual Shift 2 (earth)"
N3, N3E = "สนามปกติ ครั้งที่ 3", "Normal arena 3"
V3, V3E = "Virtual Shift ครั้งที่ 3 (น้ำแข็ง)", "Virtual Shift 3 (ice)"
N4, N4E = "สนามปกติ ครั้งที่ 4", "Normal arena 4"
P2, P2E = "ช่วงหลัง", "Second phase"

steps = []
IMG = {
    "ae1": (10718476, "022e24a2e7fc5205c6cf069d566c1bd7.png"), "ae2": (10718475, "98def88a4b9ba44f00e2107d2de1cf0c.png"),
    "ae3": (10718474, "d242167ef6e9845e99bf1c1149f0c202.png"),
    "vs1_1": (10718741, "32ad240087315bc4e1cbb5552b9f847b.png"), "vs1_2": (10718746, "c08bbbaefef537b0472f4ddd4bde5685.png"),
    "vs1_3": (10718742, "b85244970a41c46e26a83498003ea078.png"), "vs1_4": (10718743, "98595a9db73e103784c2fd56456cace0.png"),
    "vs1_5": (10718748, "06d91922e81f9050a63a40b2d879779d.png"), "vs1_6": (10718747, "b5e66912e0286ddfbaf346ebe5ca4ec0.png"),
    "vs1_7": (10718744, "88f97bd699ff21131f297c5507028ac7.png"),
    "dc1": (10718788, "c0de42e3f515653191fee47748c6edec.png"), "dc2": (10718787, "cd34bb9671b053f54b78480981f7e462.png"),
    "es1": (10719365, "e1ed56a9d390281eefadbf4f12a869dc.png"), "es2": (10719368, "b951eb0208968b5bfc23dea4b52b90de.png"),
    "es3": (10719371, "a10b62133dd1fc9914f35fc752a98a72.png"),
    "ge1": (10719367, "b6ebde693c62c5b8061012fd6deab908.png"), "ge2": (10719370, "f1b3437723ceab4f6579f1b6e100a075.png"),
    "mt1": (10719372, "369d085a1bd472471515f4bd2336661a.png"), "mt2": (10719369, "d6815dea03193ea8659f84d046379ecf.png"),
    "mt3": (10719373, "2d0b2ecb74d4b379cbbc3a649b7856b2.png"), "mt4": (10719366, "fcfde5de4a1930c2d7cc310a29c06b0e.png"),
    "cor": (10719443, "e3093a74fd00ec848757e955cf403bf6.png"),
    "aa1": (10719459, "5117e6ba8dc5027bd34670540cbf30e1.png"), "aa2": (10719457, "0cbacca02eaf8dd692872ae706175587.png"),
    "aa3": (10719456, "edb6b434b0adde2e04d16427c7f779e7.png"), "aa4": (10719455, "528365839f92433e2ed08a5e6750b16a.png"),
    "aa5": (10719458, "a00d78c62dcf9891d052b1b6ce4082e1.png"), "aa6": (10719454, "f3282e2fbaa066ba01fbf666ef09359f.png"),
    "aa7": (10719461, "30850de9043396b30b5077e96d659010.jpeg"),
    "ice1": (10719501, "bc6dd48ffdc80988e52273d1f60104c8.png"), "ice2": (10719502, "b90d42890ac9a46d57eca4cee0bb017d.png"),
    "ice3": (10719506, "d0ba172f072944c5987a1e1a54c28bd4.png"), "ice4": (10719503, "6649fb3f1082e5a32948ba3059f37516.png"),
    "ice5": (10719505, "ce8250ad581d7f5ef5b5e48201a748e0.png"), "ice6": (10719508, "e79511ed9ee93d7295d5a7552faaad02.png"),
    "ice7": (10719507, "0dbb64b4408e20a228f079b5515c4359.png"), "ice8": (10719504, "13c4d5381f4ca3007df87b2cf9bf076c.png"),
    "table": (10719652, "337f62ababa524f5c2a559655059ce73.jpeg"),
    "il1": (10719725, "fcfa742db50d942d808ec70e5614e0d5.png"), "il2": (10719724, "4d6ed05f689102d2831cf8a25a7a3f42.png"),
    "il3": (10719723, "b0505d5376c9f2dc6b6d8dfbc2248152.png"), "il4": (10719726, "b24dd1e3dc16d6ae3fdd838e82799a58.png"),
    "rs_g": (10719661, "e9a68e637b1e88142e5c541fc8f8784d.png"), "rs_b": (10719659, "3cd28b9839040c98f583917cbce3fe06.png"),
    "rs_y": (10719660, "8a7cacadd579342d1e8f0f0b499c7353.png"),
    "dd1": (10719674, "0876be8a620d32af357cf6acbeb6d10d.png"), "dd2": (10719675, "6cbffd538ab1c36a5521b2ce2f2175cc.png"),
    "dd3": (10719676, "83202d4392848fa3c5ee861d19bb1fa2.png"), "dd4": (10719677, "a098a54d3b5f73857e9f0c5982b7cd32.png"),
    "dd5": (10719678, "c6bb2fa8f770ecfce74e9c2992960721.png"),
}


def step(phase, phase_en, mech, name, name_en, note, note_en, strict=False, pic=None,
         says=None, says_en=None, refs=None, mech_en=None):
    s = {"phase": phase, "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        n, h = IMG[pic]
        s["game8"] = [G8(n, h)]
    if refs:
        s["refs"] = [{"src": r[0], "say": r[1]} for r in refs]
    if pic:
        scene = globals()[pic]()
        s["scene"] = scene
        s["ring"] = round(max(4.2, scene.get("iconSize", 7.4) * 0.85 + 1.0), 1)
    else:
        s["scene"] = None
    en = {"phase": phase_en, "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)


def seats(groups):
    """{"text": [seats]} -> {seat: text}"""
    out = {}
    for text, ss in groups.items():
        for k in ss:
            out[k] = text
    return out


MTG, STG = ("MT", "H1", "D1", "D3"), ("ST", "H2", "D2", "D4")

# ======================================================================= setup
step(P0, P0E, "Waymarks", "Marker ชุด Hamukatsu", "Hamukatsu's waymarks",
     "game8 ไม่มีหัวข้อ Marker แยก ชุดนี้คือ Marker ของ Hamukatsu จาก xivjpraids.com\n\n"
     "ตัวอักษรอยู่กลางขอบ:\n"
     "A เหนือ\n"
     "B ตะวันออก\n"
     "C ใต้\n"
     "D ตะวันตก\n\n"
     "ตัวเลขอยู่ที่มุม:\n"
     "1 ตะวันออกเฉียงเหนือ\n"
     "2 ตะวันออกเฉียงใต้\n"
     "3 ตะวันตกเฉียงใต้\n"
     "4 ตะวันตกเฉียงเหนือ\n\n"
     "ทุกตัววางชิดขอบสนาม\n"
     "เป็นจุดยืนของทั้ง 8 คนตอน Coronation\n"
     "สีที่คู่กันบอกที่วางลำแสงของอุปกรณ์: ระหว่าง 1 กับ A / 2 กับ B / 3 กับ C / 4 กับ D\n"
     "ตอน Absolute Authority คนที่ได้ flare ใช้ Marker เป็นจุดยืน",
     "game8 has no waymark section; this is Hamukatsu's set from xivjpraids.com\n\n"
     "Letters in the middle of each edge:\n"
     "A north\n"
     "B east\n"
     "C south\n"
     "D west\n\n"
     "Numbers in the corners:\n"
     "1 north-east\n"
     "2 south-east\n"
     "3 south-west\n"
     "4 north-west\n\n"
     "All placed close to the edge\n"
     "They are the 8 spots the party stands on for Coronation\n"
     "Matching colours show where each device's beam goes: between 1 and A / 2 and B / 3 and C / 4 and D\n"
     "In Absolute Authority the flares use the waymarks as their spots",
     refs=[(XJ + "markers.jpg", "Marker ชุด Hamukatsu ในเกม มองจากทางใต้ (ภาพจาก xivjpraids.com)",
            "Hamukatsu's waymarks in game, seen from the south (picture from xivjpraids.com)")])

# ======================================================================= first phase
AER = "Aethertithe + Retribute"
step(P1, P1E, AER, "raid-wide + AoE รูปพัด 3 ครั้ง", "Raid-wide + 3 cones",
     "Aethertithe: AoE เวททั้งปาร์ตี้ (raid-wide) ใช้ท่าลดดาเมจและ barrier\n"
     "หลังจากนั้นโดนดาเมจต่อเนื่อง (DoT) ไปพร้อมกับที่สนามเปลี่ยน\n"
     "มี AoE รูปพัดออกจากจุดที่บิดเบี้ยว\n"
     "แล้วตามด้วย Retribute: line stack ที่ Healer\n\n"
     "แยก 2 กลุ่มรับ line stack:\n"
     "กลุ่ม MT: MT H1 D1 D3\n"
     "กลุ่ม ST: ST H2 D2 D4\n\n"
     "AoE รูปพัดมา 3 ครั้ง ครั้งละที่: ฝั่งตะวันตก ตรงกลาง ฝั่งตะวันออก\n"
     "จึงต้องหลบ 3 รอบ (ดู 3 ขั้นถัดไป)",
     "Aethertithe: a magic raid-wide; use mitigation and barriers\n"
     "Then a damage-over-time ticks while the arena changes\n"
     "A cone AoE comes out of a warped spot\n"
     "followed by Retribute: line stacks on the healers\n\n"
     "Take the line stacks in 2 groups:\n"
     "MT group: MT H1 D1 D3\n"
     "ST group: ST H2 D2 D4\n\n"
     "The cone comes 3 times, one place each time: west, middle, east\n"
     "So you dodge it 3 times (the next 3 steps)",
     says={"H1": "เป้า line stack ของกลุ่ม MT", "H2": "เป้า line stack ของกลุ่ม ST",
           **seats({"รับ line stack กับกลุ่ม MT (ที่ H1)": ("MT", "D1", "D3"), "รับ line stack กับกลุ่ม ST (ที่ H2)": ("ST", "D2", "D4")})},
     says_en={"H1": "The MT group's line stack target", "H2": "The ST group's line stack target",
              **seats({"Take the line stack with the MT group (on H1)": ("MT", "D1", "D3"), "Take the line stack with the ST group (on H2)": ("ST", "D2", "D4")})})

step(P1, P1E, AER, "แบบที่ 1: AoE ฝั่งตะวันตก", "Pattern 1: the cone on the west",
     "AoE รูปพัดลงฝั่งตะวันตก ฝั่งตะวันออกปลอดภัย\n"
     "ภาพนี้: กลุ่ม MT อยู่กลางสนาม / กลุ่ม ST อยู่ทางตะวันออกเฉียงเหนือของกลุ่ม MT\n"
     "แต่ละกลุ่มรวมกันรับ line stack ของ Healer กลุ่มตัวเอง",
     "The cone covers the west, so the east is safe\n"
     "In this picture: the MT group in the middle / the ST group north-east of it\n"
     "Each group gathers for its own healer's line stack", pic="ae1")

step(P1, P1E, AER, "แบบที่ 2: AoE ฝั่งตะวันออก", "Pattern 2: the cone on the east",
     "AoE รูปพัดลงฝั่งตะวันออก ฝั่งตะวันตกปลอดภัย\n"
     "ภาพนี้: กลุ่ม MT อยู่ทางตะวันตกเฉียงเหนือ / กลุ่ม ST อยู่กลางสนาม",
     "The cone covers the east, so the west is safe\n"
     "In this picture: the MT group in the north-west / the ST group in the middle", pic="ae2")

step(P1, P1E, AER, "แบบที่ 3: AoE ตรงกลาง", "Pattern 3: the cone in the middle",
     "AoE รูปพัดลงตรงกลาง กินกลางสนามลงไปถึงขอบใต้\n"
     "ที่ปลอดภัยเหลือมุมเหนือ 2 ข้าง\n"
     "ภาพนี้: กลุ่ม MT มุมตะวันตกเฉียงเหนือ / กลุ่ม ST มุมตะวันออกเฉียงเหนือ",
     "The cone covers the middle, down to the south edge\n"
     "Only the two north corners are safe\n"
     "In this picture: the MT group in the north-west corner / the ST group in the north-east corner", pic="ae3")

# ======================================================================= Virtual Shift 1 (wind)
VW = "Laws of Wind + Missing Link + Legitimate Force + East/West Wind of Change"
step(V1, V1E, "Virtual Shift", "raid-wide + สนามรูปตัว X", "Raid-wide + an X-shaped arena",
     "AoE เวททั้งปาร์ตี้ (raid-wide) แล้วสนามเปลี่ยนเป็นรูปตัว X (ช่วงลม)\n\n"
     "จากนั้นมาหลายอย่างพร้อมกัน:\n"
     "stack ที่ Healer\n"
     "โซ่ Missing Link\n"
     "debuff ลม (East/West Wind of Change) ที่จะผลักไปซ้ายหรือขวา\n"
     "Legitimate Force: บอสตีครึ่งสนาม 2 ครั้ง\n\n"
     "หลบครึ่งสนามได้แล้ว ลมจะผลักเรา ยืนชิดฝั่งให้ถูก จะได้ไม่ตกสนาม",
     "A magic raid-wide, then the arena turns into an X (the wind arena)\n\n"
     "Then several things at once:\n"
     "stacks on the healers\n"
     "Missing Link chains\n"
     "wind debuffs (East/West Wind of Change) that throw you left or right\n"
     "Legitimate Force: the boss hits half the arena twice\n\n"
     "After dodging the halves the wind throws you, so stand on the right side to stay on the floor")

step(V1, V1E, VW, "① stack ที่ Healer แยก 2 กลุ่ม", "① Healer stacks in 2 groups",
     "① Healer ทั้ง 2 คนได้ stack\n"
     "กลุ่ม MT ไปตะวันตกเฉียงเหนือ\n"
     "กลุ่ม ST ไปตะวันออกเฉียงใต้\n"
     "รวมกันรับ stack ในกลุ่มตัวเอง",
     "① Both healers get a stack\n"
     "The MT group goes north-west\n"
     "The ST group goes south-east\n"
     "Each group shares its own stack", pic="vs1_1",
     says=seats({"stack กับกลุ่ม MT ฝั่งตะวันตกเฉียงเหนือ": MTG, "stack กับกลุ่ม ST ฝั่งตะวันออกเฉียงใต้": STG}),
     says_en=seats({"Stack with the MT group in the north-west": MTG, "Stack with the ST group in the south-east": STG}))

step(V1, V1E, VW, "② รวมกลาง: ได้โซ่และ debuff ลม", "② Gather in the middle: chains and wind debuffs",
     "② stack เสร็จแล้วทุกคนกลับมารวมกลางสนาม\n"
     "ตอนนี้มีเครื่องหมายเตือนโซ่ (Missing Link)\n"
     "และทุกคนได้ debuff ลมที่จะผลักไปทางซ้ายหรือขวา",
     "② After the stacks everyone gathers in the middle\n"
     "Now the chain telegraphs (Missing Link) appear\n"
     "and everyone gets a wind debuff that will throw them left or right", pic="vs1_2")

step(V1, V1E, VW, "③ บอสเตรียม Legitimate Force + โซ่ทำงาน", "③ Legitimate Force telegraphs, the chains go live",
     "③ บอสเตรียมตีครึ่งสนาม (Legitimate Force) พร้อมกันนั้นโซ่ทำงาน\n\n"
     "เคล็ดลับ: บอสตีฝั่งที่ยกมือขึ้นก่อน\n"
     "ถ้าจำไม่ได้ว่าฝั่งซ้ายหรือขวามาก่อน ให้ดูว่ามือข้างไหนยกอยู่",
     "③ The boss telegraphs a half-arena hit (Legitimate Force), and the chains go live\n\n"
     "Tip: the boss hits the side of its raised hand first\n"
     "If you lose track of which side comes first, look for the raised hand", pic="vs1_3")

step(V1, V1E, VW, "④ ยืดโซ่ให้ขาด", "④ Stretch the chains to break them",
     "④ คนที่ติดโซ่วิ่งห่างจากคู่จนโซ่ขาด\n"
     "ตาม macro:\n"
     "Tank/Healer ที่ติดโซ่ ไปตะวันตกเฉียงใต้\n"
     "DPS ที่ติดโซ่ ไปตะวันออกเฉียงเหนือ",
     "④ The chained players run apart until the chain breaks\n"
     "By the macro:\n"
     "chained tanks/healers go south-west\n"
     "chained DPS go north-east", pic="vs1_4",
     says=seats({"ถ้าติดโซ่: ไปตะวันตกเฉียงใต้": ("MT", "ST", "H1", "H2"), "ถ้าติดโซ่: ไปตะวันออกเฉียงเหนือ": ("D1", "D2", "D3", "D4")}),
     says_en=seats({"If chained: go south-west": ("MT", "ST", "H1", "H2"), "If chained: go north-east": ("D1", "D2", "D3", "D4")}))

step(V1, V1E, VW, "⑤ Legitimate Force ครั้งที่ 1", "⑤ Legitimate Force, 1st hit",
     "⑤ ครึ่งแรกโดน (ภาพนี้คือครึ่งตะวันออก) ยืนครึ่งที่ปลอดภัย\n"
     "ภาพนี้: คนที่จะกระเด็นไปทางซ้าย ไปยืนชิดขอบขวาของฝั่งที่ปลอดภัยไว้ก่อน เตรียมรับลม",
     "⑤ The first half is hit (here the east half); stand in the safe half\n"
     "In this picture: whoever will be thrown left waits at the right edge of the safe side, ready for the wind", pic="vs1_5")

step(V1, V1E, VW, "⑥ Legitimate Force ครั้งที่ 2", "⑥ Legitimate Force, 2nd hit",
     "⑥ อีกครึ่งโดนต่อ (ภาพนี้คือครึ่งตะวันตก) ย้ายข้ามไปครึ่งที่ปลอดภัย",
     "⑥ The other half is hit next (here the west half); cross to the safe half", pic="vs1_6")

step(V1, V1E, VW, "⑦ debuff ลมทำงาน", "⑦ The wind debuffs go off",
     "⑦ debuff ลมทำงาน ผลักไปซ้ายหรือขวาตามลูกศรบนหัว\n"
     "คนที่จะกระเด็นไปทางตะวันออก ยืนชิดขอบตะวันตก\n"
     "คนที่จะกระเด็นไปทางตะวันตก ยืนชิดขอบตะวันออก\n"
     "ให้ตกลงบนพื้น ไม่หลุดสนาม แล้วจบท่า",
     "⑦ The wind debuffs throw you left or right, as the arrows over your head show\n"
     "Whoever is thrown east stands at the west edge\n"
     "Whoever is thrown west stands at the east edge\n"
     "so you land on the floor, not off it, and it ends", pic="vs1_7")

step(V1, V1E, "World Shatter", "raid-wide + สนามกลับแบบเดิม", "Raid-wide + the arena returns",
     "AoE ทั้งปาร์ตี้ที่มาตอนจบท่าเปลี่ยนสนามทุกครั้ง ใช้ท่าลดดาเมจให้ดี\n"
     "โดนแล้วสนามกลับเป็นสี่เหลี่ยมแบบเดิม",
     "The raid-wide that always ends an arena change; mitigate it well\n"
     "Then the arena returns to the square")

# ======================================================================= normal arena 2
step(N2, N2E, "Prosecution of War", "Tank buster 2 ครั้ง: สลับ Tank", "2-hit tank buster: tank swap",
     "โจมตีแรงใส่คนที่ aggro อันดับ 1 ติดกัน 2 ครั้ง\n"
     "ครั้งแรกทิ้ง debuff ลดค่าต้านทานดาเมจแบบทุบ (blunt)\n"
     "ระหว่างบอสร่าย ST ใช้ Provoke ดึงบอส แล้วรับครั้งที่ 2",
     "Two heavy hits in a row on the top of the enmity list\n"
     "The first leaves a blunt resistance down debuff\n"
     "While the boss casts, ST Provokes and takes the 2nd hit",
     says={"MT": "รับครั้งแรก แล้วให้ ST ดึงบอส", "ST": "Provoke ระหว่างบอสร่าย แล้วรับครั้งที่ 2"},
     says_en={"MT": "Take the 1st hit, then let ST take the boss", "ST": "Provoke during the cast, then take the 2nd hit"})

DCQ = "Divide and Conquer"
DC_TH = {"MT": "ฝั่งตะวันตก แถวที่ 1 (เหนือสุด)", "D1": "ฝั่งตะวันตก แถวที่ 2", "D3": "ฝั่งตะวันตก แถวที่ 3", "H1": "ฝั่งตะวันตก แถวที่ 4 (ใต้สุด)",
         "ST": "ฝั่งตะวันออก แถวที่ 1 (เหนือสุด)", "D2": "ฝั่งตะวันออก แถวที่ 2", "D4": "ฝั่งตะวันออก แถวที่ 3", "H2": "ฝั่งตะวันออก แถวที่ 4 (ใต้สุด)"}
DC_EN = {"MT": "West side, row 1 (northmost)", "D1": "West side, row 2", "D3": "West side, row 3", "H1": "West side, row 4 (southmost)",
         "ST": "East side, row 1 (northmost)", "D2": "East side, row 2", "D4": "East side, row 3", "H2": "East side, row 4 (southmost)"}
step(N2, N2E, DCQ, "① ยืนรับลำแสงตามตำแหน่ง", "① Stand on your beam spot",
     "① ลำแสงเส้นตรงยิงใส่ผู้เล่นทีละคนจนครบ 8 คน (ลำดับสุ่ม)\n"
     "ครบแล้ว ลำแสงยิงซ้ำตรงที่เดิมพร้อมกันทั้งหมดอีกครั้ง\n\n"
     "แยกฝั่งตามกลุ่ม แล้วเรียงจากเหนือลงใต้:\n"
     "ฝั่งตะวันตก (กลุ่ม MT): MT > D1 > D3 > H1\n"
     "ฝั่งตะวันออก (กลุ่ม ST): ST > D2 > D4 > H2",
     "① A line beam hits each player in turn until all 8 are hit (random order)\n"
     "Then all 8 beams fire again together, along the same lines\n\n"
     "Split by group, then line up north to south:\n"
     "west side (MT group): MT > D1 > D3 > H1\n"
     "east side (ST group): ST > D2 > D4 > H2", strict=True, pic="dc1", says=DC_TH, says_en=DC_EN)

step(N2, N2E, DCQ, "② ลำแสงลงแล้วกลับเข้ากลาง", "② After your beam, back to the middle",
     "② รับลำแสงของตัวเองแล้ว กลับเข้ากลางสนาม พ้นแนวลำแสงที่ยิงซ้ำ\n"
     "Tank บางครั้งอยู่ไกลกลางสนามกว่าคนอื่น จะยืนรอในช่องว่างระหว่างลำแสงแทนก็ได้",
     "② Once your beam has fired, go back to the middle, out of the lines that fire again\n"
     "Tanks are sometimes further from the middle than the rest; they may wait in a gap between beams instead", pic="dc2",
     says={"MT": "ถ้ากลับกลางไม่ทัน รอในช่องว่างระหว่างลำแสงได้", "ST": "ถ้ากลับกลางไม่ทัน รอในช่องว่างระหว่างลำแสงได้"},
     says_en={"MT": "If the middle is too far, wait in a gap between beams", "ST": "If the middle is too far, wait in a gap between beams"})

step(N2, N2E, "Royal Domain", "raid-wide", "Raid-wide",
     "AoE ทั้งปาร์ตี้ (raid-wide)\n"
     "ตาม timeline ของ game8 มาหลัง Divide and Conquer ก่อน Virtual Shift ครั้งที่ 2",
     "A raid-wide\n"
     "game8's timeline puts it after Divide and Conquer, before the 2nd Virtual Shift")

# ======================================================================= Virtual Shift 2 (earth)
LE = "Legitimate Force + Laws of Earth"
step(V2, V2E, LE, "① ลอยขึ้นแล้วรวมกลาง", "① Float up and gather in the middle",
     "Virtual Shift ครั้งที่ 2: AoE ทั้งปาร์ตี้ แล้วสนามเหลือเกาะ 2 เกาะ (ตะวันตก ตะวันออก)\n"
     "กลางเกาะมีอุปกรณ์แรงโน้มถ่วง (จุดสีม่วง) แตะแล้วลอยขึ้นฟ้า ถ้าลอยอยู่แล้วแตะอีกครั้งจะลงพื้น\n"
     "ลำดับ: Legitimate Force (ครึ่งสนาม) แล้วตามด้วย tower\n"
     "ลอยขึ้นหลบครึ่งสนาม แล้วลงพื้นไปเหยียบ tower\n\n"
     "① แตะอุปกรณ์บนเกาะให้ลอยขึ้น แล้วไปรวมกันตรงกลางระหว่าง 2 เกาะ",
     "Virtual Shift 2: a raid-wide, then only 2 islands are left (west and east)\n"
     "Each island has a gravity device in the middle (the purple dot): touch it to float up; touch it again while floating to land\n"
     "Order: Legitimate Force (half the arena), then towers\n"
     "Float to dodge the halves, then land to take the towers\n\n"
     "① Touch a device to float up, then gather in the middle between the 2 islands", pic="es1")

step(V2, V2E, LE, "② หลบ Legitimate Force ทั้ง 2 ครั้ง", "② Dodge both Legitimate Force hits",
     "② บอสตีครึ่งสนาม 2 ครั้ง หลบให้พ้นทั้ง 2 ครั้ง\n"
     "ภาพนี้: ครึ่งตะวันออกโดนก่อน ทุกคนอยู่ชิดเส้นกลางฝั่งตะวันตก",
     "② The boss hits half the arena twice; dodge both\n"
     "In this picture the east half is hit first, and everyone waits just west of the centre line", pic="es2")

ES3_TH = {"D1": "เกาะตะวันตก tower มุมบนซ้าย", "MT": "เกาะตะวันตก tower มุมบนขวา", "D3": "เกาะตะวันตก tower มุมล่างซ้าย", "H1": "เกาะตะวันตก tower มุมล่างขวา",
          "ST": "เกาะตะวันออก tower มุมบนซ้าย", "D2": "เกาะตะวันออก tower มุมบนขวา", "H2": "เกาะตะวันออก tower มุมล่างซ้าย", "D4": "เกาะตะวันออก tower มุมล่างขวา"}
ES3_EN = {"D1": "West island, top-left tower", "MT": "West island, top-right tower", "D3": "West island, bottom-left tower", "H1": "West island, bottom-right tower",
          "ST": "East island, top-left tower", "D2": "East island, top-right tower", "H2": "East island, bottom-left tower", "D4": "East island, bottom-right tower"}
step(V2, V2E, LE, "③ ลงพื้นแล้วเข้า tower", "③ Land and take the towers",
     "③ หลบครึ่งสนามได้แล้ว รีบลงไปเหยียบ tower ทันที\n"
     "เกาะตะวันตก = กลุ่ม MT / เกาะตะวันออก = กลุ่ม ST\n"
     "ฝั่งเหนือ = Melee กับ Tank / ฝั่งใต้ = Range กับ Healer\n\n"
     "เกาะตะวันตก: D1·MT (เหนือ) / D3·H1 (ใต้)\n"
     "เกาะตะวันออก: ST·D2 (เหนือ) / H2·D4 (ใต้)\n\n"
     "เคล็ดลับ: คนที่ tower อยู่ไกล มีเวลาน้อยมากหลังครึ่งสนามครั้งที่ 2 ใช้ Sprint ได้",
     "③ Once the halves are dodged, land at once and step into your tower\n"
     "West island = MT group / east island = ST group\n"
     "North side = Melees and tanks / south side = Ranges and healers\n\n"
     "West island: D1·MT (north) / D3·H1 (south)\n"
     "East island: ST·D2 (north) / H2·D4 (south)\n\n"
     "Tip: whoever has a far tower has very little time after the 2nd half; Sprint helps", strict=True, pic="es3",
     says=ES3_TH, says_en=ES3_EN)

GE = "Gravitational Empire"
step(V2, V2E, GE, "① แยกหน้าที่: สาย / วงใหญ่ / tower", "① Jobs: tethers / big circles / towers",
     "① ท่าผสม: สาย 2 เส้นจากบอส, เครื่องหมาย AoE วงใหญ่ 2 คน และ tower เกาะละ 2 (รวม 4)\n"
     "คนที่ได้สาย: ลอยขึ้น ไปทางบอส\n"
     "คนที่ได้วงใหญ่: ลอยขึ้น ไปที่ที่วงไม่โดนใคร และไม่โดน AoE รูปพัดของสาย\n"
     "คนที่ไม่ได้อะไร: อยู่บนพื้น เข้า tower\n\n"
     "tower: Melee กับ Tank อยู่หน้า (เหนือ) / Range กับ Healer อยู่หลัง (ใต้)\n"
     "ลำดับตาม macro จากเหนือลงใต้: Melee > Tank > Range > Healer\n\n"
     "game8 วาดตามที่ Hamukatsu ทำจริงในวิดีโอ ส่วนในคำอธิบายของวิดีโอ เขาแนะนำลำดับจากเหนือ Tank > Healer > DPS > DPS",
     "① A mix: 2 tethers from the boss, big circle AoE markers on 2 players, and 2 towers on each island (4 in all)\n"
     "Tethered: float up and go towards the boss\n"
     "Big circle: float up, to where your circle hits nobody and the tethers' cones miss you\n"
     "Nothing: stay on the ground and take a tower\n\n"
     "Towers: Melees and tanks in front (north) / Ranges and healers behind (south)\n"
     "The macro's order, north to south: Melee > Tank > Range > Healer\n\n"
     "game8 draws what Hamukatsu actually did in his video; in the video's commentary he suggests Tank > Healer > DPS > DPS from the north",
     pic="ge1")

step(V2, V2E, GE, "② ทุกท่าออก", "② Everything goes off",
     "② AoE รูปพัดตามสาย วงใหญ่ และ tower ออกพร้อมกัน\n"
     "ภาพนี้: คนถือสายลอยอยู่เหนือสนาม ซ้ายและขวาของบอส / คนถือวงใหญ่ลอยออกไปไกล ทางตะวันตกและทางตะวันออกเฉียงใต้",
     "② The tethers' cones, the big circles and the towers all go off\n"
     "In this picture: the tethered float north of the arena, left and right of the boss / the big circles float far out, west and south-east",
     pic="ge2")

MW = "Meteor Impact + Weighty Blow"
step(V2, V2E, MW, "① ทุกคนได้เครื่องหมายอุกกาบาต", "① Meteor markers on everyone",
     "① ทุกคนได้เครื่องหมายอุกกาบาต (วงเขียวบนหัว) หินจะตกตรงที่ยืน 2 ครั้ง\n"
     "Melee กับ Tank เป็นคนวางหินบนเกาะ\n"
     "คนอื่น (Range, Healer) ลอยขึ้น ไปรับตรงที่ไม่ขวางใคร\n\n"
     "วางหินตาม macro: แถวหน้า (เหนือ) Melee / แถวหลัง (ใต้) Tank\n"
     "ภาพนี้: D1 กับ D2 แถวหน้า MT กับ ST แถวหลัง เริ่มจากขอบตะวันตกของเกาะ",
     "① Everyone gets a meteor marker (the green disc overhead); a rock drops where you stand, twice\n"
     "Melees and tanks place the rocks on the islands\n"
     "Everyone else (Ranges, healers) floats up and takes theirs out of the way\n\n"
     "Rocks by the macro: front row (north) Melees / back row (south) tanks\n"
     "In this picture D1 and D2 are in front and MT and ST behind, starting at each island's west edge",
     strict=["MT", "ST", "D1", "D2"], pic="mt1",
     says={"D1": "วางหินแถวหน้า เกาะตะวันตก", "D2": "วางหินแถวหน้า เกาะตะวันออก", "MT": "วางหินแถวหลัง เกาะตะวันตก", "ST": "วางหินแถวหลัง เกาะตะวันออก",
           **seats({"ลอยขึ้น ไปรับหินตรงที่ไม่ขวางใคร": ("H1", "H2", "D3", "D4")})},
     says_en={"D1": "Front-row rocks, west island", "D2": "Front-row rocks, east island", "MT": "Back-row rocks, west island", "ST": "Back-row rocks, east island",
              **seats({"Float up and take your rocks out of the way": ("H1", "H2", "D3", "D4")})})

step(V2, V2E, MW, "② หินลูกแรกตก", "② The first rocks land",
     "② หินลูกแรกตกตรงที่แต่ละคนยืน",
     "② The first rocks land where each player stands", strict=["MT", "ST", "D1", "D2"], pic="mt2")

step(V2, V2E, MW, "③ หินลูกที่ 2 ตก", "③ The second rocks land",
     "③ หินลูกที่ 2 ตก\n"
     "ภาพนี้: คนวางหินขยับไปฝั่งตะวันออกของเกาะก่อน จึงได้หินเกาะละ 4 ก้อน เรียงเป็นสี่เหลี่ยม\n\n"
     "เคล็ดลับ: Tank ที่วางหินแถวหลัง วางให้ชิดคนแถวหน้ามากที่สุด\n"
     "ถ้าไปวางทางขอบ ตอนหลบ Weighty Blow จะไกลจนวิ่งไม่ทัน",
     "③ The second rocks land\n"
     "In this picture the placers first stepped to the island's east side, so each island now has 4 rocks in a square\n\n"
     "Tip: tanks placing the back row, keep as close to the front row as you can\n"
     "Dropped out by the edge, they are too far to reach in time for Weighty Blow",
     strict=["MT", "ST", "D1", "D2"], pic="mt3",
     says={"MT": "วางหินแถวหลังให้ชิดแถวหน้าที่สุด", "ST": "วางหินแถวหลังให้ชิดแถวหน้าที่สุด"},
     says_en={"MT": "Keep your back-row rocks close to the front row", "ST": "Keep your back-row rocks close to the front row"})

step(V2, V2E, MW, "④ Weighty Blow 4 ครั้ง: หลบหลังหิน", "④ 4 Weighty Blows: hide behind the rocks",
     "④ บอสยิง Weighty Blow 4 ครั้ง หลบหลังหินให้หินบังบอสทุกครั้ง\n"
     "ตาม macro: เริ่มที่หินซ้ายบน แล้ววนตามเข็มนาฬิกา\n"
     "ซ้ายบน > ขวาบน > ขวาล่าง > ซ้ายล่าง\n"
     "คนที่ลอยอยู่ อย่าลืมลงพื้น",
     "④ The boss fires Weighty Blow 4 times; hide behind a rock each time\n"
     "By the macro: start at the top-left rock and go clockwise\n"
     "top-left > top-right > bottom-right > bottom-left\n"
     "If you are floating, remember to land", pic="mt4")

step(V2, V2E, "World Shatter", "raid-wide + สนามกลับแบบเดิม", "Raid-wide + the arena returns",
     "เหมือนตอนจบ Virtual Shift ครั้งที่ 1: AoE ทั้งปาร์ตี้ แล้วสนามกลับเป็นสี่เหลี่ยม",
     "As at the end of Virtual Shift 1: a raid-wide, then the arena returns to the square")

# ======================================================================= normal arena 3
step(N3, N3E, "Prosecution of War", "Tank buster 2 ครั้ง อีกรอบ", "The 2-hit tank buster again",
     "เหมือนครั้งแรก (ดูสนามปกติ ครั้งที่ 2): สลับ Tank ระหว่างบอสร่าย ให้อีกคนรับครั้งที่ 2\n"
     "ตาม timeline ของ game8 มาหลัง World Shatter ทุกครั้ง",
     "As the first time (see Normal arena 2): swap tanks during the cast so the other tank takes the 2nd hit\n"
     "game8's timeline has it after every World Shatter")

step(N3, N3E, "Coronation", "ลากอุปกรณ์ไปตามตำแหน่ง", "Drag the devices into place",
     "มีอุปกรณ์ 4 ตัวที่ขอบทั้ง 4 ด้าน ยิงลำแสงเส้นตรงข้ามสนาม\n"
     "อุปกรณ์แต่ละตัวมีสายต่อกับผู้เล่น และเลื่อนตามคนที่ถือสาย\n"
     "ดูว่าเราต่อกับอุปกรณ์ตัวไหน แล้วพาอุปกรณ์ไปที่ตำแหน่งในภาพ\n"
     "คิดว่าเลื่อนอุปกรณ์ไปตามเข็มนาฬิกา จะพลาดน้อย\n"
     "Marker ช่วยบอกจุดยืนได้ (ดูขั้นแรก)\n\n"
     "ภาพนี้:\n"
     "อุปกรณ์ทางเหนืออยู่ระหว่าง A กับ 1\n"
     "ทางตะวันออกระหว่าง B กับ 2\n"
     "ทางใต้ระหว่าง C กับ 3\n"
     "ทางตะวันตกระหว่าง D กับ 4\n"
     "ทุกคนยืนตรง Marker รอบขอบ ซึ่งลำแสงไม่ผ่าน",
     "Four devices on the 4 edges fire line beams across the arena\n"
     "Each device is tethered to a player and follows them\n"
     "See which device is yours, then lead it to its place in the picture\n"
     "Think of moving the devices clockwise and you will slip up less\n"
     "The waymarks help you find your spot (see the first step)\n\n"
     "In this picture:\n"
     "the north device sits between A and 1\n"
     "the east one between B and 2\n"
     "the south one between C and 3\n"
     "the west one between D and 4\n"
     "Everyone stands on a waymark round the edge, where no beam passes", pic="cor")

AA = "Absolute Authority"
step(N3, N3E, AA, "① รวมมุมตะวันออกเฉียงเหนือ", "① Gather in the north-east corner",
     "มาต่อกันเป็นชุด:\n"
     "AoE ตามตัว 4 ครั้ง\n"
     "flare (ดาเมจลดตามระยะ) 4 คน และ stack 1 คน\n"
     "debuff ที่ระเบิดถ้าอยู่คนเดียว\n"
     "ปิดท้ายด้วย knockback จากเหนือลงใต้\n\n"
     "① ทุกคนรวมกันที่มุมตะวันออกเฉียงเหนือ วงขึ้นแล้วเริ่มเดิน\n"
     "ตอนนี้คนที่จะได้ flare มี debuff ติดแล้ว เตรียมตัวไว้",
     "It comes as a chain:\n"
     "4 AoEs that follow you\n"
     "flares (damage falls off with distance) on 4 players and a stack on 1\n"
     "a debuff that explodes if you are alone\n"
     "and last, a knockback from north to south\n\n"
     "① Everyone gathers in the north-east corner; start moving once the circle appears\n"
     "The flare players already have their debuff now, so be ready", pic="aa1")

step(N3, N3E, AA, "② ทิ้ง AoE ไปทางกลาง", "② Drop the AoEs on the way to the middle",
     "② เดินมุ่งไปกลางสนาม ทิ้ง AoE ไว้ข้างหลังทีละวง\n"
     "ภาพนี้: วงที่ 2 แล้วเดินไปทางตะวันตกตามแนวขอบเหนือ",
     "② Head for the middle, leaving the AoEs behind one at a time\n"
     "In this picture: the 2nd one, then walk west along the north edge", pic="aa2")

step(N3, N3E, AA, "③ วงที่ 3 กลางขอบเหนือ แล้วลงกลางสนาม", "③ The 3rd at the north middle, then down to the middle",
     "③ ทิ้งวงที่ 3 ตรงกลางขอบเหนือ แล้วเดินลงไปกลางสนาม",
     "③ Drop the 3rd at the middle of the north edge, then walk down into the middle", pic="aa3")

FLARE_SAY_TH = {"MT": "ถ้าได้ flare: มุมตะวันตกเฉียงเหนือ (Marker 4)", "ST": "ถ้าได้ flare: มุมตะวันออกเฉียงเหนือ (Marker 1)",
                "H1": "ถ้าได้ flare: กลางขอบตะวันตก (Marker D)", "H2": "ถ้าได้ flare: กลางขอบตะวันออก (Marker B)",
                "D1": "ถ้าได้ flare: มุมตะวันตกเฉียงเหนือ (Marker 4)", "D2": "ถ้าได้ flare: มุมตะวันออกเฉียงเหนือ (Marker 1)",
                "D3": "ถ้าได้ flare: กลางขอบตะวันตก (Marker D)", "D4": "ถ้าได้ flare: กลางขอบตะวันออก (Marker B)"}
FLARE_SAY_EN = {"MT": "With a flare: north-west corner (waymark 4)", "ST": "With a flare: north-east corner (waymark 1)",
                "H1": "With a flare: middle of the west edge (waymark D)", "H2": "With a flare: middle of the east edge (waymark B)",
                "D1": "With a flare: north-west corner (waymark 4)", "D2": "With a flare: north-east corner (waymark 1)",
                "D3": "With a flare: middle of the west edge (waymark D)", "D4": "With a flare: middle of the east edge (waymark B)"}
step(N3, N3E, AA, "④ flare แยกไปขอบ stack กลาง (Tank/Healer ได้ flare)", "④ Flares to the edges, stack in the middle (tanks/healers flare)",
     "④ คนที่ได้ flare แยกไปตาม Marker ตามภาพ คนที่เหลือ stack กลางสนาม\n"
     "ภาพนี้: Tank กับ Healer ได้ flare / DPS stack\n\n"
     "จุด flare ตาม macro (คู่ใช้จุดเดียวกัน ใครได้ flare คนนั้นไป):\n"
     "MT·D1 มุมตะวันตกเฉียงเหนือ (Marker 4)\n"
     "ST·D2 มุมตะวันออกเฉียงเหนือ (Marker 1)\n"
     "H1·D3 กลางขอบตะวันตก (Marker D)\n"
     "H2·D4 กลางขอบตะวันออก (Marker B)",
     "④ The flares spread to the waymarks as pictured; everyone else stacks in the middle\n"
     "In this picture the tanks and healers have the flares and the DPS stack\n\n"
     "Flare spots by the macro (a pair shares a spot; whoever has the flare goes):\n"
     "MT·D1 north-west corner (waymark 4)\n"
     "ST·D2 north-east corner (waymark 1)\n"
     "H1·D3 middle of the west edge (waymark D)\n"
     "H2·D4 middle of the east edge (waymark B)",
     strict=["MT", "ST", "H1", "H2"], pic="aa4",
     says={**{k: FLARE_SAY_TH[k] for k in ("MT", "ST", "H1", "H2")}, **seats({"stack กลางสนาม (ภาพนี้)": ("D1", "D2", "D3", "D4")})},
     says_en={**{k: FLARE_SAY_EN[k] for k in ("MT", "ST", "H1", "H2")}, **seats({"Stack in the middle (this picture)": ("D1", "D2", "D3", "D4")})})

step(N3, N3E, AA, "⑤ ถ้า DPS ได้ flare", "⑤ If the DPS have the flares",
     "⑤ อีกแบบ: Tank กับ Healer stack กลางสนาม DPS ได้ flare แยกไปตาม Marker\n"
     "D1 มุมตะวันตกเฉียงเหนือ (4) / D2 มุมตะวันออกเฉียงเหนือ (1)\n"
     "D3 กลางขอบตะวันตก (D) / D4 กลางขอบตะวันออก (B)",
     "⑤ The other case: the tanks and healers stack in the middle and the DPS flare to the waymarks\n"
     "D1 north-west corner (4) / D2 north-east corner (1)\n"
     "D3 middle of the west edge (D) / D4 middle of the east edge (B)",
     strict=["D1", "D2", "D3", "D4"], pic="aa5",
     says={**{k: FLARE_SAY_TH[k] for k in ("D1", "D2", "D3", "D4")}, **seats({"stack กลางสนาม (ภาพนี้)": ("MT", "ST", "H1", "H2")})},
     says_en={**{k: FLARE_SAY_EN[k] for k in ("D1", "D2", "D3", "D4")}, **seats({"Stack in the middle (this picture)": ("MT", "ST", "H1", "H2")})})

step(N3, N3E, AA, "⑥ debuff ห้ามอยู่คนเดียว: จับคู่กับคนใกล้", "⑥ The never-alone debuff: pair up close by",
     "⑥ จบ flare กับ stack แล้ว รีบจัดการ debuff ที่ระเบิดถ้าอยู่คนเดียว (สามเหลี่ยมแดงบนหัว) ตามภาพ\n"
     "ตาม macro: คน flare ที่อยู่ใกล้กันจับคู่กัน\n"
     "ภาพนี้ (DPS ได้ flare): D1·D3 ฝั่งตะวันตก / D2·D4 ฝั่งตะวันออก / MT ST H1 H2 อยู่กลางด้วยกัน",
     "⑥ Right after the flares and the stack, deal with the debuff that explodes if alone (the red triangle overhead), as pictured\n"
     "By the macro, flares that are close to each other pair up\n"
     "In this picture (DPS flared): D1·D3 on the west / D2·D4 on the east / MT ST H1 H2 together in the middle", pic="aa6")

step(N3, N3E, AA, "⑦ knockback จากทิศเหนือ", "⑦ Knockback from the north",
     "⑦ สุดท้ายมี knockback จากทิศเหนือผลักลงใต้ ไปยืนฝั่งเหนือแล้วรับ\n"
     "กันได้ด้วย Arm's Length / Surecast",
     "⑦ Last, a knockback from the north pushes south; go to the north side and take it\n"
     "Arm's Length / Surecast stop it", pic="aa7")

# ======================================================================= Virtual Shift 3 (ice)
LI = "Laws of Ice + Rush + Legitimate Force"
step(V3, V3E, LI, "① สายจากแท่งน้ำแข็งทางใต้ 4 คน", "① Tethers from the 4 south icicles",
     "Virtual Shift ครั้งที่ 3: AoE ทั้งปาร์ตี้ แล้วสนามแตกเป็นเกาะ 3 เกาะ มีสะพานเชื่อม\n"
     "Laws of Ice: ขยับตัวตลอด ถ้ายืนนิ่งจะโดนแช่แข็ง\n"
     "จากนั้นแท่งน้ำแข็งโผล่ และมีสายแบบดาเมจลดตามระยะ จากแท่งน้ำแข็งมาที่ผู้เล่นทีละ 4 คน\n"
     "ดึงสายไปให้ไกล แท่งน้ำแข็งจะพุ่งชน (Rush) แล้วบอสตีครึ่งสนาม ให้กลับไปหลบบนเกาะกลาง\n\n"
     "① มีสายจากแท่งน้ำแข็งทางใต้ 4 แท่ง มาที่ผู้เล่น 4 คน (ภาพนี้คือ DPS)",
     "Virtual Shift 3: a raid-wide, then the arena breaks into 3 islands linked by bridges\n"
     "Laws of Ice: keep moving, or you freeze\n"
     "Then icicles appear, with distance-falloff tethers to 4 players at a time\n"
     "Pull the tethers far; the icicles charge (Rush), then the boss hits half the arena, dodged back on the middle island\n\n"
     "① The 4 south icicles tether 4 players (here, the DPS)", pic="ice1")

step(V3, V3E, LI, "② คนถือสายข้ามสะพานทันที", "② The tethered cross the bridges at once",
     "② คนที่ถือสายรีบข้ามสะพาน ข้ามสะพานไหนดูกฎในขั้น \"ตารางแท่งน้ำแข็ง\"\n"
     "ข้ามไปเกาะฝั่งทแยงกับแท่งของตัวเอง: แท่งฝั่งตะวันตก 2 แท่งไปเกาะตะวันออก / แท่งฝั่งตะวันออก 2 แท่งไปเกาะตะวันตก",
     "② The tethered cross the bridges straight away; which bridge is in \"The icicle table\"\n"
     "Cross to the island diagonal from your icicle: the 2 west icicles go to the east island / the 2 east icicles to the west island", pic="ice2")

step(V3, V3E, LI, "③ ไปหัวเกาะให้ไกลแท่งน้ำแข็ง", "③ Go far from your icicle, to the island's north end",
     "③ ไปให้ไกลจากแท่งน้ำแข็งของตัวเองในแนวทแยง จนดาเมจลดพอปลอดภัย\n"
     "ภาพนี้: ทั้ง 4 คนไปหัวเกาะทางเหนือ",
     "③ Move diagonally far from your icicle until the falloff makes it safe\n"
     "In this picture all 4 go to the north ends of the islands", pic="ice3")

step(V3, V3E, LI, "④ สายจากแท่งน้ำแข็งตะวันตกและตะวันออกอีก 4 คน", "④ 4 more tethers from the west and east icicles",
     "④ มีแท่งน้ำแข็งโผล่ทางตะวันตกและตะวันออก และมีสายมาที่ผู้เล่นอีก 4 คน\n"
     "ภาพนี้คือ Tank กับ Healer",
     "④ Icicles appear on the west and east, tethering the other 4 players\n"
     "In this picture, the tanks and healers", pic="ice4")

step(V3, V3E, LI, "⑤ ข้ามสะพานหลังคนกลุ่มแรก", "⑤ Cross after the first group",
     "⑤ รอให้คนที่ถือสายจากทางใต้ข้ามไปก่อน แล้วค่อยข้ามสะพาน\n"
     "แท่งฝั่งตะวันตกข้ามไปเกาะตะวันออก / แท่งฝั่งตะวันออกข้ามไปเกาะตะวันตก",
     "⑤ Wait until the south-tethered players have crossed, then cross\n"
     "West icicles cross to the east island / east icicles to the west island", pic="ice5")

step(V3, V3E, LI, "⑥ ดึงสายจนปลอดภัย แล้วแท่งน้ำแข็งพุ่งชน", "⑥ Pull to safety, then the icicles charge",
     "⑥ ดึงสายไปจนดาเมจลดพอปลอดภัย แล้วแท่งน้ำแข็งพุ่งชน\n"
     "ภาพนี้: แท่งบนไปท้ายเกาะทางใต้ / แท่งล่างไปกลางเกาะค่อนไปทางเหนือ",
     "⑥ Pull the tether until the falloff is safe, then the icicles charge\n"
     "In this picture: the upper icicles' players go to the south end / the lower ones' to just north of the island's middle", pic="ice6")

step(V3, V3E, LI, "⑦ Legitimate Force: กลับเกาะกลาง", "⑦ Legitimate Force: back to the middle island",
     "⑦ บอสเตรียมตีครึ่งสนาม รีบกลับเกาะกลาง\n"
     "คนที่ข้ามรอบ 2 อยู่ใกล้สะพานกว่า ข้ามกลับก่อน\n"
     "คนที่ข้ามรอบแรก (อยู่หัวเกาะทางเหนือ) ข้ามกลับทีหลัง\n"
     "กลับด้วยสะพานเดิมที่ใช้ตอนข้ามมา",
     "⑦ The boss telegraphs a half-arena hit; get back to the middle island\n"
     "The second crossers are nearer the bridges, so they go back first\n"
     "The first crossers (at the north ends) go back after them\n"
     "Return over the same bridge you used", pic="ice7")

step(V3, V3E, LI, "⑧ หลบครึ่งสนาม จบท่า", "⑧ Dodge the half, and it ends",
     "⑧ Legitimate Force ออก ยืนครึ่งที่ปลอดภัยบนเกาะกลาง แล้วจบท่า\n"
     "ภาพนี้: ครึ่งตะวันออกโดน ทุกคนอยู่ฝั่งตะวันตกของเกาะกลาง",
     "⑧ Legitimate Force goes off; stand in the safe half of the middle island, and it ends\n"
     "In this picture the east half is hit, and everyone is on the middle island's west side", pic="ice8")

step(V3, V3E, LI, "ตารางแท่งน้ำแข็ง (แบบ Hamukatsu)", "The icicle table (Hamukatsu)",
     "แท่งทางใต้ 1–4 (นับจากตะวันตก) ข้ามก่อน กลับเกาะกลางทีหลัง:\n"
     "แท่งริม 1 กับ 4 → สะพานเหนือ ไปหัวเกาะฝั่งใน\n"
     "แท่งใน 2 กับ 3 → สะพานใต้ ไปหัวเกาะฝั่งนอก\n\n"
     "แท่งข้าง 5–8 (5 กับ 7 ทางตะวันตก / 6 กับ 8 ทางตะวันออก) ข้ามทีหลัง กลับเกาะกลางก่อน:\n"
     "แท่งบน 5 กับ 6 → สะพานใต้ ไปท้ายเกาะทางใต้\n"
     "แท่งล่าง 7 กับ 8 → สะพานเหนือ ไปกลางเกาะค่อนไปทางเหนือ\n\n"
     "ทุกแท่ง: ข้ามไปเกาะฝั่งทแยง\n"
     "แท่งฝั่งตะวันตก → เกาะตะวันออก / แท่งฝั่งตะวันออก → เกาะตะวันตก\n\n"
     "คำจำของ game8: สายจากใต้ \"ริมไปเหนือ\" / สายจากข้าง \"บนไปใต้\"",
     "South icicles 1–4 (counted from the west) cross first and return to the middle last:\n"
     "end icicles 1 and 4 → north bridge, to the inner north end\n"
     "inner icicles 2 and 3 → south bridge, to the outer north end\n\n"
     "Side icicles 5–8 (5 and 7 west / 6 and 8 east) cross later and return first:\n"
     "upper icicles 5 and 6 → south bridge, to the south end\n"
     "lower icicles 7 and 8 → north bridge, to just north of the island's middle\n\n"
     "Every icicle: cross to the diagonal island\n"
     "west icicles → east island / east icicles → west island\n\n"
     "game8's way to remember: south tether \"ends go north\" / side tether \"upper goes south\"", pic="table")

LI2 = "Laws of Ice + Ice Dart"
step(V3, V3E, LI2, "① Melee รับสายทันที", "① The Melees grab the tethers at once",
     "Laws of Ice อีกครั้ง: ขยับตัวตลอด อย่ายืนนิ่ง\n"
     "แล้วมาพร้อมกัน 2 อย่าง: สายของ Ice Dart (ก้อนน้ำแข็ง) และ stack\n"
     "สายรับโดย Melee และ Tank (ใช้ invuln) / คนอื่น stack บนเกาะกลาง\n"
     "ลำดับรับสายตาม macro: ก้อนที่ 1 D1·D2 > ก้อนที่ 2 MT·ST รับตัวเปล่า > ก้อนที่ 3–4 MT·ST ใช้ invuln\n\n"
     "① ระหว่างวิ่งหลบ Laws of Ice ให้ Melee ไปยืนหน้าสุดไว้ แล้วรับสายทันที เวลาค่อนข้างน้อย",
     "Laws of Ice again: keep moving, never stand still\n"
     "Then 2 things together: Ice Dart tethers (blocks of ice) and a stack\n"
     "The Melees and tanks (with invulns) take the tethers / everyone else stacks on the middle island\n"
     "Tether order by the macro: hit 1 D1·D2 > hit 2 MT·ST without invuln > hits 3–4 MT·ST with invuln\n\n"
     "① While moving for Laws of Ice, the Melees wait at the very front and grab the tethers at once; there is little time",
     pic="il1",
     says={"D1": "ไปหน้าสุด รับสายทันที", "D2": "ไปหน้าสุด รับสายทันที"},
     says_en={"D1": "Wait at the front, grab a tether at once", "D2": "Wait at the front, grab a tether at once"})

step(V3, V3E, LI2, "② ไปหัวเกาะทางเหนือ คนอื่น stack เกาะกลาง", "② To the north ends; everyone else stacks in the middle",
     "② รับสายแล้วรีบไปหัวเกาะทางเหนือของเกาะตะวันตกและตะวันออก รับก้อนน้ำแข็งตรงนั้น\n"
     "คนที่ไม่ได้รับสาย stack กันบนเกาะกลาง",
     "② With a tether, hurry to the north end of the west or east island and take the ice there\n"
     "Everyone without a tether stacks on the middle island",
     strict=["D1", "D2"], pic="il2",
     says={"D1": "พาสายไปหัวเกาะตะวันตก (เหนือ)", "D2": "พาสายไปหัวเกาะตะวันออก (เหนือ)",
           **seats({"stack บนเกาะกลาง": ("MT", "ST", "H1", "H2", "D3", "D4")})},
     says_en={"D1": "Take the tether to the west island's north end", "D2": "Take the tether to the east island's north end",
              **seats({"Stack on the middle island": ("MT", "ST", "H1", "H2", "D3", "D4")})})

step(V3, V3E, LI2, "③ ก้อนแรกจบ Tank รับสายต่อ", "③ After the first hit, the tanks take over",
     "③ ก้อนแรกจบแล้ว Tank กับ Melee สลับกันรับสายทันที\n"
     "ตอนสลับระวังสะพานพัง",
     "③ Right after the first hit, the tanks take the tethers from the Melees\n"
     "Watch for the bridges breaking while you swap", pic="il3",
     says={"MT": "รับสายต่อจาก D1 ฝั่งเกาะตะวันตก", "ST": "รับสายต่อจาก D2 ฝั่งเกาะตะวันออก", "D1": "ส่งสายให้ MT แล้วกลับเกาะกลาง", "D2": "ส่งสายให้ ST แล้วกลับเกาะกลาง"},
     says_en={"MT": "Take the tether from D1, west island side", "ST": "Take the tether from D2, east island side", "D1": "Hand the tether to MT, then back to the middle", "D2": "Hand the tether to ST, then back to the middle"})

step(V3, V3E, LI2, "④ Tank รับก้อนที่ 2–4 พร้อม invuln", "④ Tanks take hits 2–4 with an invuln",
     "④ Tank รับสายแล้วรีบไปหัวเกาะทางเหนือ รับก้อนที่ 2 ถึง 4 โดยใช้ invuln\n"
     "ตาม macro: ก้อนที่ 2 รับตัวเปล่า / ก้อนที่ 3 กับ 4 ใช้ invuln\n"
     "Melee กลับมา stack บนเกาะกลาง",
     "④ With the tether, tanks hurry to the north end and take hits 2 to 4 using an invuln\n"
     "By the macro: hit 2 without it / hits 3 and 4 under the invuln\n"
     "The Melees come back to the stack on the middle island",
     strict=["MT", "ST"], pic="il4",
     says={"MT": "หัวเกาะตะวันตก: ก้อนที่ 2 ตัวเปล่า ก้อนที่ 3–4 invuln", "ST": "หัวเกาะตะวันออก: ก้อนที่ 2 ตัวเปล่า ก้อนที่ 3–4 invuln"},
     says_en={"MT": "West island's north end: hit 2 bare, hits 3–4 under an invuln", "ST": "East island's north end: hit 2 bare, hits 3–4 under an invuln"})

step(V3, V3E, "World Shatter", "raid-wide + สนามกลับแบบเดิม", "Raid-wide + the arena returns",
     "เหมือนตอนจบ Virtual Shift ครั้งที่ 1: AoE ทั้งปาร์ตี้ แล้วสนามกลับเป็นสี่เหลี่ยม",
     "As at the end of Virtual Shift 1: a raid-wide, then the arena returns to the square")

# ======================================================================= normal arena 4
step(N4, N4E, "Authority Eternal", "จบช่วงแรก: ต้องลดเลือดบอสให้ทัน", "End of the first phase: push the boss in time",
     "ถ้าตีเร็วมาก Authority Eternal มาทันทีหลัง Virtual Shift ครั้งที่ 3\n"
     "ร่ายจบแล้วบอสยังมีเลือดเกิน 0.1% = wipe ตีให้เต็มที่\n"
     "ท่านี้แรงมาก ใช้ท่าลดดาเมจและ barrier ให้ครบ จบแล้วเข้าช่วงหลัง\n\n"
     "ถ้าตีปกติ ลำดับจะเป็น:\n"
     "Prosecution of War (Tank buster) > Royal Domain (raid-wide) > Legitimate Force (ครึ่งสนาม) > Royal Domain > Authority Eternal",
     "With very fast damage, Authority Eternal comes straight after Virtual Shift 3\n"
     "If the boss still has more than 0.1% HP when the cast ends, it is a wipe; go all out\n"
     "The hit itself is very heavy, so use full mitigation and barriers; then the second phase starts\n\n"
     "With normal damage the order is:\n"
     "Prosecution of War (tank buster) > Royal Domain (raid-wide) > Legitimate Force (half the arena) > Royal Domain > Authority Eternal")

# ======================================================================= second phase
RS = "Radical Shift"
step(P2, P2E, RS, "ภาพรวม: ดูทิศที่ฉากหลังหมุน", "Overview: read which way the background turns",
     "บนพื้นมีลายกรอบสีเขียว ฟ้า หรือเหลือง และทางตะวันตกกับตะวันออกมีเกาะกรอบสีเดียวกับลายบนพื้นโผล่ขึ้นมา\n"
     "กรอบเขียว = พื้นรูปตัว X (แบบช่วงลม) / ฟ้า = เกาะ 3 เกาะ (แบบช่วงน้ำแข็ง) / เหลือง = เกาะ 2 เกาะ (แบบช่วงดิน)\n\n"
     "ระหว่างบอสร่าย Radical Shift ฉากหลังจะเริ่มหมุนตามหรือทวนเข็มนาฬิกา\n"
     "ดูทิศที่หมุน แล้วตัดสินว่าเกาะฝั่งตะวันตกหรือตะวันออกจะสลับเข้ามาเป็นพื้นกลาง\n"
     "ไปยืนในลายสีเดียวกับเกาะที่จะสลับเข้ามา\n"
     "พื้นสลับเสร็จแล้วมี AoE ตามตัว แยกยืนอย่าทับกัน\n"
     "แนะนำ: กลุ่ม MT ใช้ที่ปลอดภัยฝั่งตะวันตก / กลุ่ม ST ฝั่งตะวันออก\n\n"
     "Radical Shift มา 2 ครั้งติดกัน: ครั้งแรกลาย 2 แบบ ครั้งที่ 2 ลาย 3 แบบ ดูให้ดี",
     "Patterns framed in green, blue or yellow show on the floor, and islands framed in the same colours rise on the west and east\n"
     "Green = the X floor (as in the wind part) / blue = 3 islands (as in the ice part) / yellow = 2 islands (as in the earth part)\n\n"
     "While the boss casts Radical Shift, the background starts turning clockwise or anticlockwise\n"
     "Read the turn to tell whether the west or the east island swaps in as the middle floor\n"
     "Stand inside the floor pattern of the colour that is swapping in\n"
     "After the swap, AoEs land on everyone; spread without overlapping\n"
     "Suggested: the MT group uses the west safe area / the ST group the east\n\n"
     "Radical Shift comes twice in a row: 2 patterns the first time, 3 the second, so read carefully",
     says=seats({"กลุ่ม MT: spread ฝั่งตะวันตก": MTG, "กลุ่ม ST: spread ฝั่งตะวันออก": STG}),
     says_en=seats({"MT group: spread on the west": MTG, "ST group: spread on the east": STG}))

step(P2, P2E, RS, "ตัวอย่าง spread: พื้นกรอบเขียว (ตัว X)", "Spread example: the green frame (the X)",
     "ตัวอย่างการ spread ถ้าพื้นกรอบเขียว (รูปตัว X) สลับเข้ามา ไม่จำเป็นต้องตามนี้เป๊ะ แค่อย่าทับกัน\n"
     "ฝั่งตะวันตก (กลุ่ม MT) จากเหนือลงใต้: MT > D1 > H1 > D3\n"
     "ฝั่งตะวันออก (กลุ่ม ST) จากเหนือลงใต้: ST > D2 > H2 > D4",
     "A spread example if the green frame (the X) swaps in; it need not be exact, just don't overlap\n"
     "West (MT group), north to south: MT > D1 > H1 > D3\n"
     "East (ST group), north to south: ST > D2 > H2 > D4", pic="rs_g")

step(P2, P2E, RS, "ตัวอย่าง spread: พื้นกรอบฟ้า (3 เกาะ)", "Spread example: the blue frame (3 islands)",
     "ถ้าพื้นกรอบฟ้า (เกาะ 3 เกาะ) สลับเข้ามา ไม่ต้องเป๊ะ แค่อย่าทับกัน\n"
     "เกาะตะวันตก จากเหนือลงใต้: MT > D1 > D3 > H1\n"
     "เกาะตะวันออก จากเหนือลงใต้: ST > D2 > D4 > H2",
     "If the blue frame (3 islands) swaps in; it need not be exact, just don't overlap\n"
     "West island, north to south: MT > D1 > D3 > H1\n"
     "East island, north to south: ST > D2 > D4 > H2", pic="rs_b")

step(P2, P2E, RS, "ตัวอย่าง spread: พื้นกรอบเหลือง (2 เกาะ)", "Spread example: the yellow frame (2 islands)",
     "ถ้าพื้นกรอบเหลือง (เกาะ 2 เกาะ) สลับเข้ามา ไม่ต้องเป๊ะ แค่อย่าทับกัน\n"
     "เกาะตะวันตก: MT ขวาบน / D1 ซ้ายบน / H1 ขวาล่าง / D3 ซ้ายล่าง\n"
     "เกาะตะวันออก: ST ซ้ายบน / D2 ขวาบน / H2 ซ้ายกลาง / D4 ขวาล่าง",
     "If the yellow frame (2 islands) swaps in; it need not be exact, just don't overlap\n"
     "West island: MT top-right / D1 top-left / H1 bottom-right / D3 bottom-left\n"
     "East island: ST top-left / D2 top-right / H2 middle-left / D4 bottom-right", pic="rs_y")

step(P2, P2E, RS, "จุดที่ปลอดภัยเสมอ (ดูน้อยลง)", "Spots that are always safe (less to read)",
     "มีวิธีที่ไม่ต้องดูทิศหมุนหรือเกาะเลย\n"
     "บางจุดเป็นพื้นของทั้ง 3 แบบซ้อนกัน (เขียว ฟ้า เหลือง) ยืนตรงนั้นไม่ตกไม่ว่าพื้นสีไหนสลับเข้ามา\n"
     "game8 วงไว้เป็นจุดเล็กทางเหนือ 2 จุด (ตะวันตกและตะวันออก) และจุดทางใต้ 2 จุด\n"
     "Melee กับ Tank ใช้จุดเล็กทางเหนือ / Range กับ Healer ใช้จุดทางใต้ แล้ว spread ต่อได้ง่าย\n"
     "ใครอยากคิดน้อยลงลองใช้วิธีนี้",
     "There is a way that needs neither the turn nor the islands\n"
     "Some spots are floor in all 3 patterns at once (green, blue and yellow); stand there and you never fall, whichever swaps in\n"
     "game8 rings 2 small spots in the north (west and east) and 2 in the south\n"
     "Melees and tanks use the small north spots / Ranges and healers the south ones, which also makes the spread easy\n"
     "Try it if you want less to think about",
     says=seats({"ใช้จุดเล็กทางเหนือ": ("MT", "ST", "D1", "D2"), "ใช้จุดทางใต้": ("H1", "H2", "D3", "D4")}),
     says_en=seats({"Use a small north spot": ("MT", "ST", "D1", "D2"), "Use a south spot": ("H1", "H2", "D3", "D4")}))

step(P2, P2E, "World Shatter", "raid-wide + สนามกลับแบบเดิม", "Raid-wide + the arena returns",
     "หลัง Radical Shift 2 ครั้ง: AoE ทั้งปาร์ตี้ แล้วสนามกลับเป็นสี่เหลี่ยม (เหมือน Virtual Shift ครั้งที่ 1)",
     "After the two Radical Shifts: a raid-wide, then the arena returns to the square (as after Virtual Shift 1)")

DT = "Dimensional Distortion + Tyranny's Grasp"
step(P2, P2E, DT, "① วงเคลื่อนที่จากเหนือ: รอในช่องว่าง", "① Moving circles from the north: wait in a gap",
     "Dimensional Distortion: AoE วงกลมที่เคลื่อนจากเหนือลงใต้\n"
     "แล้วพื้นครึ่งเหนือพัง มี tower โผล่ฝั่งตะวันตกและตะวันออก\n\n"
     "① เครื่องหมาย AoE ที่จะเคลื่อนลงมาโผล่ทางเหนือ ไปรอในช่องที่ไม่มีอะไร",
     "Dimensional Distortion: circle AoEs that travel from north to south\n"
     "then the north half of the floor breaks, and towers appear on the west and east\n\n"
     "① The markers of the travelling AoEs appear in the north; wait in a gap with nothing in it", pic="dd1")

step(P2, P2E, DT, "② เครื่องหมายชุดที่ 2 โผล่", "② The second set appears",
     "② มีเครื่องหมาย AoE ชุดถัดไปโผล่ตามมา",
     "② The next set of AoE markers appears", pic="dd2")

step(P2, P2E, DT, "③ วิ่งเข้าจุดที่ชุดแรกตีไปแล้ว แล้วลงครึ่งใต้", "③ Step where the first set already hit, then go south",
     "③ วิ่งเข้าไปตรงที่ชุดแรกตีครั้งแรกไปแล้ว\n"
     "หลังจากนั้นพื้นครึ่งเหนือจะพัง รีบลงไปครึ่งใต้ทันที",
     "③ Run into the spot the first set's first hit has just left\n"
     "Then the north half breaks, so move to the south half at once", pic="dd3")

step(P2, P2E, DT, "④ ครึ่งเหนือพัง: Tank เข้า tower", "④ North half gone: the tanks take the towers",
     "④ พื้นครึ่งเหนือพัง มี tower โผล่ฝั่งตะวันตกและตะวันออก\n"
     "MT เข้า tower ตะวันตก / ST เข้า tower ตะวันออก\n"
     "จากนั้นมี stack ดาเมจกายภาพทั้งปาร์ตี้",
     "④ The north half breaks, and towers appear west and east\n"
     "MT takes the west tower / ST the east tower\n"
     "Then comes a physical party-wide stack",
     strict=["MT", "ST"], pic="dd4",
     says={"MT": "เข้า tower ตะวันตก", "ST": "เข้า tower ตะวันออก"},
     says_en={"MT": "Take the west tower", "ST": "Take the east tower"})

step(P2, P2E, "Dying Memory + Royal Banishment", "stack 8 ครั้ง 2 ชุด: กายภาพ แล้วเวท", "Two sets of 8 stacks: physical, then magic",
     "หลัง tower: Dying Memory (โขกหัว) เป็น stack ดาเมจกายภาพทั้งปาร์ตี้ 8 ครั้ง\n"
     "ตามด้วย Royal Banishment (ลำแสง) เป็น stack ดาเมจเวท 8 ครั้ง ทุกคนรวมในแนวเส้นตามภาพ\n"
     "โดนติดกันหลายครั้งมาก ใช้ท่าลดดาเมจ barrier และ heal ให้ครบ\n\n"
     "Dying Memory เป็นกายภาพ: Melee ใช้ Feint\n"
     "Royal Banishment เป็นเวท: Caster ใช้ Addle",
     "After the towers: Dying Memory (a headbutt), a physical party-wide stack, 8 times\n"
     "then Royal Banishment (a beam), a magic stack, 8 times; everyone in the line as pictured\n"
     "That is a lot of hits in a row; use mitigation, barriers and heals fully\n\n"
     "Dying Memory is physical: Melees use Feint\n"
     "Royal Banishment is magic: casters use Addle", pic="dd5",
     says=seats({"ใช้ Feint ช่วง Dying Memory": ("D1", "D2"), "ถ้าเป็น Caster ใช้ Addle ช่วง Royal Banishment": ("D3", "D4")}),
     says_en=seats({"Feint during Dying Memory": ("D1", "D2"), "If you are a caster, Addle during Royal Banishment": ("D3", "D4")}))

step(P2, P2E, RS, "ครั้งที่ 2: เหมือนครั้งแรก", "The second time: as the first",
     "เหมือน Radical Shift ครั้งแรกทุกอย่าง (ดูต้นช่วงหลัง)\n"
     "ดูทิศที่ฉากหลังหมุนและเกาะที่จะสลับเข้ามาให้แน่ แล้วทำใจเย็นๆ",
     "Exactly as the first Radical Shift (see the start of the second phase)\n"
     "Read the turn and the island that swaps in carefully, and stay calm")

step(P2, P2E, "World Shatter + Preservation", "raid-wide แล้วหมดเวลา (enrage)", "Raid-wide, then time is up (enrage)",
     "ตาม timeline ของ game8: World Shatter (AoE ทั้งปาร์ตี้) แล้วตามด้วย Preservation ซึ่งเป็นท่าหมดเวลา (enrage)\n"
     "ตีบอสให้ตายก่อนร่ายจบ",
     "By game8's timeline: World Shatter (a raid-wide), then Preservation, the time-up cast (enrage)\n"
     "Kill the boss before it finishes")

# ======================================================================= the guide
WEAPONS = [("Sword Eternal", "PLD", "030000/030688"), ("Knuckles Eternal", "MNK", "030000/030852"), ("War Axe Eternal", "WAR", "031000/031262"),
           ("Spear Eternal", "DRG", "031000/031664"), ("Bow Eternal", "BRD", "032000/032052"), ("Staff Eternal", "WHM", "032000/032482"),
           ("Rod Eternal", "BLM", "032000/032897"), ("Index Eternal", "SMN", "037000/037826"), ("Codex Eternal", "SCH", "037000/037827"),
           ("Knives Eternal", "NIN", "033000/033638"), ("Greatsword Eternal", "DRK", "034000/034017"), ("Pistol Eternal", "MCH", "034000/034511"),
           ("Torquetum Eternal", "AST", "034000/034710"), ("Samurai Blade Eternal", "SAM", "036000/036566"), ("Rapier Eternal", "RDM", "036000/036865"),
           ("Bayonet Eternal", "GNB", "036000/036108"), ("War Quoits Eternal", "DNC", "036000/036307"), ("War Scythe Eternal", "RPR", "037000/037277"),
           ("Wings Eternal", "SGE", "037000/037074"), ("Twinfangs Eternal", "VPR", "037000/037441"), ("Paintbrush Eternal", "PCT", "037000/037651"),
           ("Shield Eternal", "PLD", "030000/030276")]
pieces = [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for n, j, p in WEAPONS]

fight = {
    "guide": {
        "slug": "ex3-queen-eternal", "short": "EX3",
        "name": "Queen Eternal · The Minstrel's Ballad: Sphene's Burden",
        "category": "extreme", "expansion": "Dawntrail", "patch": "7.1",
        "source_name": "game8", "source_url": "https://game8.jp/ff14/641571",
        "content_key": "ex:Queen Eternal",
        "note": ("แผนตาม game8 (แผนของ Hamukatsu)\n"
                 "Marker ชุด Hamukatsu: ตัวอักษรกลางขอบ ตัวเลขที่มุม (ดูขั้นแรก)\n\n"
                 "กลุ่ม 4:4\n"
                 "กลุ่ม MT: MT H1 D1 D3 (ฝั่งตะวันตก)\n"
                 "กลุ่ม ST: ST H2 D2 D4 (ฝั่งตะวันออก)\n\n"
                 "Virtual Shift 1 (ลม): stack กลุ่ม MT ตะวันตกเฉียงเหนือ / กลุ่ม ST ตะวันออกเฉียงใต้\n"
                 "โซ่: Tank/Healer ไปตะวันตกเฉียงใต้ / DPS ไปตะวันออกเฉียงเหนือ\n\n"
                 "Virtual Shift 2 (ดิน) tower: เกาะตะวันตก D1·MT / D3·H1 เกาะตะวันออก ST·D2 / H2·D4 (คู่แรกฝั่งเหนือ)\n"
                 "tower ชุดที่ 2 จากเหนือ: Melee > Tank > Range > Healer\n"
                 "วางหิน: แถวหน้า Melee / แถวหลัง Tank\n"
                 "Weighty Blow: เริ่มหินซ้ายบน วนตามเข็มนาฬิกา\n\n"
                 "Absolute Authority (คู่ใช้จุดเดียวกัน ใครได้ flare คนนั้นไป):\n"
                 "MT·D1 ตะวันตกเฉียงเหนือ / ST·D2 ตะวันออกเฉียงเหนือ / H1·D3 ตะวันตก / H2·D4 ตะวันออก / stack กลาง\n\n"
                 "Virtual Shift 3 (น้ำแข็ง) รับสาย Ice Dart: D1·D2 > MT·ST > MT·ST (invuln)"),
        "en": {"note": ("Plan follows game8 (Hamukatsu's strat)\n"
                        "Hamukatsu's waymarks: letters mid-edge, numbers in the corners (see the first step)\n\n"
                        "4:4 groups\n"
                        "MT group: MT H1 D1 D3 (west)\n"
                        "ST group: ST H2 D2 D4 (east)\n\n"
                        "Virtual Shift 1 (wind): MT group stacks north-west / ST group south-east\n"
                        "Chains: tanks/healers go south-west / DPS go north-east\n\n"
                        "Virtual Shift 2 (earth) towers: west island D1·MT / D3·H1, east island ST·D2 / H2·D4 (first pair north)\n"
                        "2nd towers, from the north: Melee > Tank > Range > Healer\n"
                        "Rocks: front row Melees / back row tanks\n"
                        "Weighty Blow: start at the top-left rock, go clockwise\n\n"
                        "Absolute Authority (a pair shares a spot; whoever has the flare goes):\n"
                        "MT·D1 north-west / ST·D2 north-east / H1·D3 west / H2·D4 east / stack in the middle\n\n"
                        "Virtual Shift 3 (ice) Ice Dart tethers: D1·D2 > MT·ST > MT·ST (invuln)")},
        "req": {
            "level": 100, "ilvl": 710, "party": 8, "minutes": 60,
            "unlock": ("เคลียร์ Main Quest ของ Dawntrail (7.0) ให้จบก่อน\n"
                       "แล้วคุยกับ Wandering Minstrel ที่ Tuliyollal (X: 11.1 Y: 14.6) เพื่อปลดล็อก\n"
                       "Extreme ของ Dawntrail ปลดล็อกที่ NPC คนนี้ทั้งหมด"),
            "unlock_en": ("Finish the Dawntrail (7.0) main scenario first\n"
                          "then talk to the Wandering Minstrel in Tuliyollal (X: 11.1 Y: 14.6) to unlock it\n"
                          "Every Dawntrail Extreme is unlocked from this NPC"),
            "unlock_pics": [{"map": {"map": "y6t1/00", "size": 180, "x": 11.1, "y": 14.6, "label": "Wandering Minstrel"},
                             "say": "Tuliyollal (X: 11.1 Y: 14.6) — Wandering Minstrel",
                             "say_en": "Tuliyollal (X: 11.1 Y: 14.6) — the Wandering Minstrel"}],
        },
        "macro_en": macros["en"].rstrip("\n"), "macro_ja": macros["ja"].rstrip("\n"),
        "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/extreme_trials/sphene/",
    },
    "defaults": {
        "frame": [1, 1], "bg": "#5f6166", "waymarks": {},
        "iconSize": 7.4, "markSize": 6, "bossSize": 9.2, "ring": 7.3,
    },
    "steps": steps,
    "rewards": [
        {"kind": "token", "name": "Totem Eternal", "icon_src": ICON("ui/icon/026000/026671_hr1.tex"),
         "say": ("ได้ 2 ชิ้นทุกครั้งที่เคลียร์ (การันตี)\n\n"
                 "แลกที่ Uah'shepya ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                 "อาวุธ IL725: 10 ชิ้น ต่ออาวุธ 1 ชิ้น\n"
                 "Wings of Eternity: 99 ชิ้น"),
         "say_en": ("Every clear gives 2 (guaranteed).\n\n"
                    "Exchange them with Uah'shepya in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                    "IL725 weapon: 10 per weapon\n"
                    "Wings of Eternity: 99"),
         "pics": [{"map": {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.5, "label": "Uah'shepya"},
                   "say": "จุดแลก: Uah'shepya, Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)",
                   "say_en": "Where to exchange: Uah'shepya, Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)"}]},
        {"kind": "weapon", "name": "Weapons Eternal", "ilvl": 725, "icon_src": ICON("ui/icon/030000/030688_hr1.tex"),
         "say": ("แลกด้วย Totem Eternal 10 ชิ้น ต่ออาวุธ 1 ชิ้น\n"
                 "PLD ได้ Sword Eternal กับ Shield Eternal คู่กันในการแลกครั้งเดียว\n"
                 "มีครบทุกอาชีพ แตะไอคอนเพื่อดูชื่ออาวุธ"),
         "say_en": ("10 Totems Eternal per weapon\n"
                    "PLD gets the Sword Eternal and the Shield Eternal together in one exchange\n"
                    "One for every job; tap an icon for the weapon's name"),
         "pieces": pieces},
        {"kind": "mount", "name": "Wings of Eternity", "icon_src": ICON("ui/icon/004000/004301_hr1.tex"),
         "say": "ของ rare ดรอปจากหีบ อัตราดรอปต่ำมาก\nหรือแลกด้วย Totem Eternal 99 ชิ้น",
         "say_en": "A rare drop from the chest, with a very low drop rate\nor 99 Totems Eternal",
         "pics": [{"src": ICON("ui/icon/068000/068301_hr1.tex"),
                   "say": "หน้าตา Wings of Eternity (ภาพจาก Mount Guide ในเกม)",
                   "say_en": "Wings of Eternity, as the in-game Mount Guide shows it"}]},
    ],
}

json.dump(fight, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(steps), "steps,", sum(1 for s in steps if s.get("scene")), "pictures,", sum(len(s.get("refs", [])) for s in steps), "refs,",
      len({s["mech"] for s in steps}), "mechs,", len(dict.fromkeys(s["phase"] for s in steps)), "phases")
