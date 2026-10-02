"""Pack the traced pieces into one JSON for the vector doll, every path tagged
with the colour group it belongs to (what the wardrobe recolours).

    python pack_parts.py      -> doll-vector.json
"""
import colorsys, json, re

PIECES = ["hairBack", "legL", "legR", "armL", "armR", "torso", "head", "blushL", "blushR",
          "eyeOpenL", "eyeOpenR", "eyeClosedL", "eyeClosedR", "eyeHappyL", "eyeHappyR",
          "browL", "browR", "mouthSmile", "mouthOpen", "mouthSad", "mouthGrin",
          "hairFront", "tailL", "tailR", "hatChef", "hatWizard", "hatBeret", "crownFlower", "cloak"]


def hsl(hexc):
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, s, l, max(r, g, b) - min(r, g, b)


def kind(hexc):
    h, s, l, ch = hsl(hexc)
    if l < 0.22: return "dark"
    if 185 <= h <= 245 and ch > 0.08: return "blue"
    if (h >= 330 or h <= 14) and ch > 0.12 and l > 0.45: return "pink"
    if (h >= 340 or h <= 14) and ch > 0.12 and l <= 0.45: return "red"
    if 10 <= h <= 42 and ch > 0.1 and 0.45 <= l <= 0.86: return "skin"
    if 5 <= h <= 40 and 0.22 <= l < 0.45 and ch > 0.06: return "brown"
    if 25 <= h <= 62 and l >= 0.78: return "cream"
    if 40 <= h <= 60 and ch > 0.3: return "gold"
    return "other"


def group(piece, k):
    if piece in ("hairBack", "hairFront", "tailL", "tailR"):
        # Everything but the outline and the ribbons: shades and soft edges included.
        return "hair" if k not in ("dark", "brown") else None
    if piece == "head":
        return "skin" if k != "dark" else None
    if piece in ("legL", "legR"):
        return "skin" if k == "skin" else None
    if piece in ("torso", "armL", "armR"):
        return "outfit" if k == "blue" else "skin" if k == "skin" else None
    if piece.startswith("brow"):
        return "brow"
    if piece == "hatWizard":
        return "hat" if k == "blue" else None
    if piece == "hatBeret":
        return "hat" if k in ("brown", "red", "skin") else None
    if piece == "cloak":
        return "hat" if k in ("red", "pink") else None
    return None


def bbox(d):
    nums = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", d)]
    xs, ys = nums[0::2], nums[1::2]
    return min(xs), min(ys), max(xs), max(ys)


out = {}
for name in PIECES:
    svg = open(f"pieces/{name}.svg", encoding="utf-8").read()
    W = int(re.search(r'width="(\d+)"', svg).group(1)); H = int(re.search(r'height="(\d+)"', svg).group(1))
    paths = []
    for m in re.finditer(r'<path d="([^"]+)" fill="(#[0-9A-Fa-f]{6})"(?: transform="translate\(([-\d.]+),([-\d.]+)\)")?', svg):
        d, fill = m.group(1), m.group(2).lower()
        tx, ty = float(m.group(3) or 0), float(m.group(4) or 0)
        x0, y0, x1, y1 = bbox(d)
        g = group(name, kind(fill))
        paths.append({"d": d, "f": fill, "g": g, "t": [tx, ty], "a": round((x1 - x0) * (y1 - y0))})
    if name.startswith("eyeOpen"):
        # The iris: the largest dark shape of an open eye; the lashes stay dark.
        darks = [p for p in paths if kind(p["f"]) == "dark"]
        if darks: max(darks, key=lambda p: p["a"])["g"] = "iris"
    # Each group's own colour, the one the others are shades of: its largest
    # mid-tone shape (not a dark base layer under the others, not a highlight).
    bases = {}
    for p in paths:
        if not p["g"]: continue
        l = hsl(p["f"])[2]
        score = p["a"] * (1 if 0.35 <= l <= 0.88 or p["g"] in ("iris", "brow") else 0.001)
        if p["g"] not in bases or score > bases[p["g"]][1]: bases[p["g"]] = (p["f"], score)
    out[name] = {"w": W, "h": H, "base": {g: f for g, (f, _) in bases.items()},
                 "p": [[p["d"], p["f"], p["g"], p["t"][0], p["t"][1]] for p in paths]}
json.dump(out, open("doll-vector.json", "w"), separators=(",", ":"))
tot = sum(len(v["p"]) for v in out.values())
print(f"{len(out)} pieces, {tot} paths, {len(json.dumps(out, separators=(',', ':'))) / 1024:.0f} KB")
for n, v in out.items():
    gs = {}
    for p in v["p"]:
        gs[p[2]] = gs.get(p[2], 0) + 1
    print(f"  {n}: {gs} base {v['base']}")
