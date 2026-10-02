"""Build the LPC character-customisation prototype.

    python build_proto.py fetch      # resolve the curated items, fetch exactly the files they need (git sparse checkout)
    python build_proto.py page       # pack them into atlases and write proto/lpc-dressing-room.html

Run from scratchpad/lpc, with the sparse clone in ./ulpc and Pillow on PYTHONPATH.
"""
import base64, io, json, os, re, subprocess, sys
from collections import OrderedDict

ROOT = "ulpc"
DEFS = os.path.join(ROOT, "sheet_definitions")
BODIES = ["male", "female", "child"]
ANIMS = ["walk", "idle", "sit", "run"]
ALL = set(open("all-sprites.txt", encoding="utf-8").read().split("\n"))

# The curated wardrobe: (category, id, Thai label, definition file, max variants for old-style items).
ITEMS = [
    ("body", "body", "ตัว", "body/body.json", 0),
    ("head", "human", "มนุษย์", "head/heads/human/heads_human_{H}.json", 0),
    ("head", "wolf", "หมาป่า (Hrothgar)", "head/heads/beast/heads_wolf_{W}.json", 0),
    ("face", "happy", "ยิ้ม", "head/faces/face_happy.json", 0),
    ("face", "happy2", "ยิ้มกว้าง", "head/faces/face_happy2.json", 0),
    ("face", "sad", "เศร้า", "head/faces/face_sad.json", 0),
    ("face", "angry", "โกรธ", "head/faces/face_angry.json", 0),
    ("face", "shock", "ตกใจ", "head/faces/face_shock.json", 0),
    ("face", "closed", "หลับตา", "head/faces/face_closed.json", 0),
    ("face", "blush", "เขิน", "head/faces/face_blush.json", 0),
    ("face", "eyeroll", "กลอกตา", "head/faces/face_eyeroll.json", 0),
    ("brows", "thin", "คิ้วบาง", "head/eyebrows/eyebrows_thin.json", 0),
    ("brows", "thick", "คิ้วหนา", "head/eyebrows/eyebrows_thick.json", 0),
    ("ears", "elven", "หูเอลฟ์", "head/ears/head_ears_elven.json", 0),
    ("ears", "long", "หูยาว", "head/ears/head_ears_long.json", 0),
    ("ears", "medium", "หูกลาง", "head/ears/head_ears_medium.json", 0),
    ("ears", "hang", "หูห้อย", "head/ears/head_ears_hang.json", 0),
    ("ears", "down", "หูลู่", "head/ears/head_ears_down.json", 0),
    ("ears", "cat", "หูแมว (Miqo'te)", "head/furry_ears/top/head_ears_cat.json", 0),
    ("ears", "wolfears", "หูหมาป่า", "head/furry_ears/top/head_ears_wolf.json", 0),
    ("horns", "backwards", "เขาลู่หลัง (Au Ra)", "head/appendages/head_horns_backwards.json", 0),
    ("horns", "curled", "เขาม้วน", "head/appendages/head_horns_curled.json", 0),
    ("tail", "cat", "หางแมว", "body/tails/tail_cat.json", 8),
    ("tail", "wolf", "หางหมาป่า", "body/tails/tail_wolf_fluffy.json", 8),
    ("tail", "lizard", "หางกิ้งก่า", "body/tails/tail_lizard_alt.json", 8),
    ("hair", "relm_short", "บ็อบสั้น", "hair/bob/hair_relm_short.json", 0),
    ("hair", "relm_ponytail", "หางม้า + หน้าม้า", "hair/braids/hair_relm_ponytail.json", 0),
    ("hair", "pigtails", "แกละ", "hair/pigtails/hair_pigtails.json", 0),
    ("hair", "bunches", "แกละสูง", "hair/pigtails/hair_bunches.json", 0),
    ("hair", "ponytail", "หางม้า", "hair/braids/hair_ponytail.json", 0),
    ("hair", "high_ponytail", "หางม้าสูง", "hair/braids/hair_high_ponytail.json", 0),
    ("hair", "bangs_bun", "มวย", "hair/braids/hair_bangs_bun.json", 0),
    ("hair", "long", "ยาว", "hair/long/hair_long.json", 0),
    ("hair", "long_straight", "ยาวตรง", "hair/long/hair_long_straight.json", 0),
    ("hair", "bob", "บ็อบ", "hair/bob/hair_bob.json", 0),
    ("hair", "pixie", "พิกซี่", "hair/short/hair_pixie.json", 0),
    ("hair", "idol", "ไอดอล", "hair/short/hair_idol.json", 0),
    ("hair", "messy", "ยุ่ง", "hair/short/hair_messy.json", 0),
    ("hair", "messy1", "ยุ่ง 2", "hair/short/hair_messy1.json", 0),
    ("hair", "parted_side_bangs", "แสกข้าง", "hair/short/hair_parted_side_bangs.json", 0),
    ("hair", "spiked", "ตั้งชี้", "hair/spiky/hair_spiked.json", 0),
    ("hair", "curly_short", "หยิกสั้น", "hair/curly/hair_curly_short.json", 0),
    ("hair", "wavy_child", "ลอนยาว", "hair/long/hair_wavy_child.json", 0),
    ("top", "tshirt", "เสื้อยืด", "torso/shirts/shortsleeve/torso_clothes_tshirt.json", 0),
    ("top", "tshirt_vneck", "เสื้อยืดคอวี", "torso/shirts/shortsleeve/torso_clothes_tshirt_vneck.json", 0),
    ("top", "cardigan_s", "คาร์ดิแกนแขนสั้น", "torso/shirts/shortsleeve/torso_clothes_shortsleeve_cardigan.json", 0),
    ("top", "longsleeve", "แขนยาว", "torso/shirts/longsleeve/torso_clothes_longsleeve.json", 0),
    ("top", "polo", "โปโลแขนยาว", "torso/shirts/longsleeve/torso_clothes_longsleeve2_polo.json", 0),
    ("top", "sleeveless", "แขนกุด", "torso/shirts/sleeveless/torso_clothes_sleeveless2.json", 0),
    ("top", "child_shirt", "เสื้อเด็ก", "torso/shirts/torso_clothes_child_shirt.json", 10),
    ("bottom", "pants", "กางเกง", "legs/pants/legs_pants.json", 0),
    ("bottom", "cuffed", "กางเกงพับขา", "legs/pants/legs_cuffed.json", 0),
    ("bottom", "pantaloons", "กางเกงพอง", "legs/pants/legs_pantaloons.json", 0),
    ("bottom", "skirt", "กระโปรง", "legs/skirts/legs_skirts_plain.json", 0),
    ("bottom", "belle", "กระโปรงบาน", "legs/skirts/legs_skirt_belle.json", 0),
    ("bottom", "child_pants", "กางเกงเด็ก", "legs/pants/legs_childpants.json", 9),
    ("bottom", "child_skirt", "กระโปรงเด็ก", "legs/skirts/legs_childskirts.json", 10),
    ("feet", "shoes", "รองเท้า", "feet/shoes/feet_shoes_basic.json", 0),
    ("feet", "boots", "บูท", "feet/boots/feet_boots_basic.json", 0),
    ("hat", "wizard", "หมวกพ่อมด", "headwear/hats/magic/hat_magic_wizard.json", 6),
    ("hat", "bowler", "หมวกโบว์เลอร์", "headwear/hats/formal/hat_formal_bowler.json", 5),
    ("hat", "tophat", "หมวกทรงสูง", "headwear/hats/formal/hat_formal_tophat.json", 5),
    ("hat", "christmas", "หมวกคริสต์มาส", "headwear/hats/holiday/hat_holiday_christmas.json", 4),
    ("hat", "crown", "มงกุฎ", "headwear/hats/formal/hat_formal_crown.json", 3),
    ("hat", "bandana", "ผ้าโพก", "headwear/coverings/bandana/hat_bandana.json", 0),
    ("hat", "hood", "ฮู้ด", "headwear/coverings/hoods/hat_hood_cloth.json", 0),
    ("hat", "hairtie", "ที่คาดผม", "headwear/coverings/headbands/hat_headband_hairtie.json", 0),
    ("hat", "headband", "ผ้าคาดหัว", "headwear/coverings/headbands/hat_headband_thick.json", 0),
    ("acc", "glasses_round", "แว่นกลม", "headwear/accessories/glasses/facial_glasses_round.json", 5),
    ("acc", "glasses", "แว่น", "headwear/accessories/glasses/facial_glasses.json", 5),
]
# Old-style items whose sheet in one variant is drawn exactly in a palette's base
# ramp (checked pixel by pixel): one sheet, recoloured to any colour of that palette.
AS_RECOLOR = {"tail": ("orange", "hair"), "wizard": ("white", "cloth"), "bowler": ("white", "cloth"), "tophat": ("white", "cloth"), "christmas": ("white", "cloth")}
# For the rest, the colours to keep first.
PREFER = {"child_shirt": ["lightblue", "white", "pink", "red", "green", "lavender", "blue", "brown", "gray", "black"],
          "child_pants": ["brown", "blue", "darkblue", "black", "green", "lightblue", "maroon", "red", "white"],
          "child_skirt": ["pink", "red", "lavender", "blue", "lightblue", "green", "white", "black", "maroon", "darkblue"],
          "glasses_round": ["base", "black", "brown", "gold", "silver"], "glasses": ["base", "black", "brown", "gold", "silver"]}

# Which head file each body uses, and the folder faces live in for it.
HEAD_OF = {"male": "male", "female": "female", "child": "child"}
WOLF_OF = {"male": "male", "female": "female", "child": "child"}


def load_def(path):
    return json.load(open(os.path.join(DEFS, path), encoding="utf-8"))


def exists(p):
    return ("spritesheets/" + p) in ALL


def norm_variant(v):
    return v.replace(" ", "_")


def resolve():
    """Every item's layers per body: which animations exist, and the files they need."""
    catalog, files = [], set()
    for cat, iid, label, dpath, maxvar in ITEMS:
        entry = {"cat": cat, "id": iid, "label": label, "layers": [], "bodies": {}, "recolors": None, "variants": None, "credits": []}
        for body in BODIES:
            p = dpath.replace("{H}", HEAD_OF[body]).replace("{W}", WOLF_OF[body])
            if not os.path.exists(os.path.join(DEFS, p)):
                continue
            d = load_def(p)
            if not entry["recolors"] and d.get("recolors"): entry["recolors"] = d["recolors"]
            if d.get("credits"):
                for c in d["credits"]:
                    if c not in entry["credits"]: entry["credits"].append(c)
            variants = d.get("variants")
            layer_keys = sorted((k for k in d if re.fullmatch(r"layer_\d+", k)), key=lambda k: int(k.split("_")[1]))
            body_layers = []
            for lk in layer_keys:
                L = d[lk]
                if body not in L: continue
                prefix = L[body]
                if "${head}" in prefix:
                    prefix = prefix.replace("${head}", HEAD_OF[body])
                anims = {}
                for a in ANIMS:
                    if a not in d.get("animations", []): continue
                    if variants:
                        have = [v for v in variants if exists(f"{prefix}{a}/{norm_variant(v)}.png")]
                        if have: anims[a] = have
                    elif exists(f"{prefix}{a}.png"):
                        anims[a] = True
                if anims:
                    body_layers.append({"z": L.get("zPos", 0), "prefix": prefix, "anims": anims})
            if not body_layers:
                continue
            # Variants every layer has, limited, for old-style items.
            ar = AS_RECOLOR.get(iid) or (AS_RECOLOR["tail"] if cat == "tail" else None)
            if variants and ar and ar[0] in variants:
                variants = [ar[0]]
                entry["recolors"] = {"material": ar[1]}
            elif variants and iid in PREFER:
                variants = [v for v in PREFER[iid] if v in variants] + [v for v in variants if v not in PREFER[iid]]
            if variants:
                common = None
                for bl in body_layers:
                    for a, have in bl["anims"].items():
                        common = set(have) if common is None else common & set(have)
                keep = [v for v in variants if v in (common or set())][:maxvar or 8]
                entry["variants"] = keep if entry["variants"] is None else [v for v in entry["variants"] if v in keep] or keep
            anim_ok = sorted(set.intersection(*[set(bl["anims"]) for bl in body_layers]), key=ANIMS.index)
            entry["bodies"][body] = {"layers": [{"z": bl["z"], "prefix": bl["prefix"]} for bl in body_layers], "anims": anim_ok}
        if not entry["bodies"]:
            print("  (no body has", iid, ")")
            continue
        # The files to fetch.
        for body, b in entry["bodies"].items():
            for L in b["layers"]:
                for a in b["anims"]:
                    if entry["variants"]:
                        for v in entry["variants"]:
                            f = f"{L['prefix']}{a}/{norm_variant(v)}.png"
                            if exists(f): files.add(f)
                    else:
                        files.add(f"{L['prefix']}{a}.png")
        catalog.append(entry)
    return catalog, files


def fetch(files):
    pats = ["/sheet_definitions/", "/palette_definitions/"] + ["/spritesheets/" + f for f in sorted(files)]
    subprocess.run(["git", "-C", ROOT, "sparse-checkout", "set", "--no-cone", "--stdin"], input="\n".join(pats) + "\n", text=True, check=True)


def palettes():
    out = {}
    for mat in ("body", "hair", "cloth", "eye"):
        meta = json.load(open(os.path.join(ROOT, "palette_definitions", mat, f"meta_{mat}.json"), encoding="utf-8"))
        ulpc = json.load(open(os.path.join(ROOT, "palette_definitions", mat, f"{mat}_ulpc.json"), encoding="utf-8"))
        lp = os.path.join(ROOT, "palette_definitions", mat, f"{mat}_lpcr.json")
        lpcr = json.load(open(lp, encoding="utf-8")) if os.path.exists(lp) else {}
        out[mat] = {"base": meta["base"], "ulpc": ulpc, "lpcr": lpcr}
    return out


def detect_sources(catalog, pal):
    """Which ramp of its palette each recoloured item is really drawn in (most pixels covered)."""
    from PIL import Image
    for e in catalog:
        rc = e.get("recolors")
        if not rc: continue
        chans = [rc] if "material" in rc else list(rc.values())
        body = next(iter(e["bodies"]))
        b = e["bodies"][body]
        anim = "walk" if "walk" in b["anims"] else b["anims"][0]
        counts = {}
        for L in b["layers"]:
            f = f"{L['prefix']}{anim}/{norm_variant(e['variants'][0])}.png" if e.get("variants") else f"{L['prefix']}{anim}.png"
            path = os.path.join(ROOT, "spritesheets", f)
            if not os.path.exists(path): continue
            for px in Image.open(path).convert("RGBA").get_flattened_data():
                if px[3]: k = "#%02x%02x%02x" % px[:3]; counts[k] = counts.get(k, 0) + 1
        src = {}
        for ch in chans:
            mat = ch.get("material")
            if mat not in pal or ch.get("source"): continue
            best, score = None, -1
            for s_ in ("ulpc", "lpcr"):
                for name, ramp in pal[mat][s_].items():
                    rs = {c.lower() for c in ramp}
                    sc = sum(n for k, n in counts.items() if k in rs)
                    if sc > score: best, score = f"{s_}:{name}", sc
            base = {c.lower() for c in pal[mat]["ulpc"][pal[mat]["base"]]}
            base_sc = sum(n for k, n in counts.items() if k in base)
            total = sum(counts.values()) or 1
            # Only when another ramp clearly is the one drawn: most of the pixels, and more than the base.
            if best and best != f"ulpc:{pal[mat]['base']}" and score >= 0.5 * total and score > base_sc: src[mat] = best
        if src: e["src"] = src


def pack(catalog):
    from PIL import Image
    sheets = {}
    for e in catalog:
        for body, b in e["bodies"].items():
            for li, L in enumerate(b["layers"]):
                for v in (e["variants"] or [None]):
                    key = f"{e['id']}|{body}|{li}|{v or ''}"
                    rows, y = {}, 0
                    parts = []
                    for a in b["anims"]:
                        f = f"{L['prefix']}{a}/{norm_variant(v)}.png" if v else f"{L['prefix']}{a}.png"
                        path = os.path.join(ROOT, "spritesheets", f)
                        if not os.path.exists(path): continue
                        im = Image.open(path).convert("RGBA")
                        parts.append((a, im, y))
                        rows[a] = [y, im.width // 64]
                        y += im.height
                    if not parts: continue
                    W = max(im.width for _, im, _ in parts)
                    atlas = Image.new("RGBA", (W, y), (0, 0, 0, 0))
                    for a, im, yy in parts: atlas.paste(im, (0, yy))
                    buf = io.BytesIO(); atlas.save(buf, "PNG", optimize=True)
                    sheets[key] = {"rows": rows, "src": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()}
    return sheets


if __name__ == "__main__":
    catalog, files = resolve()
    print(f"{len(catalog)} items, {len(files)} files")
    for e in catalog:
        print(f"  {e['cat']:6s} {e['id']:18s} " + " ".join(f"{b}:{'/'.join(x['anims'])}" for b, x in e["bodies"].items()) + (f" variants={len(e['variants'])}" if e["variants"] else ""))
    if "fetch" in sys.argv:
        fetch(files)
        missing = [f for f in files if not os.path.exists(os.path.join(ROOT, "spritesheets", f))]
        print("fetched; missing on disk:", len(missing))
    if "page" in sys.argv:
        pal = palettes()
        detect_sources(catalog, pal)
        for e in catalog:
            if e.get("src"): print("  drawn in another ramp:", e["id"], e["src"])
        sheets = pack(catalog)
        data = {"items": [{k: v for k, v in e.items()} for e in catalog], "sheets": sheets, "palettes": pal}
        os.makedirs("proto", exist_ok=True)
        js = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
        open("proto/catalog.json", "w", encoding="utf-8").write(js)
        print(f"catalog {len(js) / 1024:.0f} KB, {len(sheets)} atlases")
