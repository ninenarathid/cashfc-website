"""Cut the parts sheet into pieces with a clear background, and trace each into an SVG.

    python cut_parts.py            (run from scratchpad/vec, with pylib on PYTHONPATH)

Writes pieces/<name>.png (the cut) and pieces/<name>.svg (the vector), and
pieces/index.json with each piece's box on the sheet.
"""
import json, os, re
from collections import deque
from PIL import Image
import vtracer

SHEET = "parts-sheet.png"
OUT = "pieces"
os.makedirs(OUT, exist_ok=True)

# Boxes on the sheet (x0, y0, x1, y1), from the component scan, grouped by what they are.
PIECES = {
    "head":        (25, 111, 358, 344),
    "hairBack":    (357, 53, 751, 363),
    "hairFront":   (768, 67, 1026, 353),
    "tailL":       (1049, 87, 1194, 366),
    "tailR":       (1293, 87, 1435, 367),
    "torso":       (137, 376, 456, 601),
    "armL":        (489, 415, 596, 561),
    "armR":        (701, 415, 808, 561),
    "legL":        (860, 414, 950, 578),
    "legR":        (1011, 414, 1100, 578),
    "eyeOpenL":    (59, 642, 133, 722),
    "eyeOpenR":    (196, 642, 269, 722),
    "blushL":      (65, 718, 96, 739),
    "blushR":      (231, 718, 262, 739),
    "eyeClosedL":  (342, 685, 419, 713),
    "eyeClosedR":  (482, 685, 560, 713),
    "eyeHappyL":   (635, 664, 719, 704),
    "eyeHappyR":   (775, 663, 858, 703),
    "browL":       (1053, 630, 1121, 655),
    "browR":       (1181, 630, 1250, 653),
    "mouthSmile":  (944, 705, 1008, 729),
    "mouthOpen":   (1053, 693, 1115, 743),
    "mouthSad":    (1168, 705, 1221, 730),
    "mouthGrin":   (1275, 690, 1361, 743),
    "hatChef":     (25, 794, 318, 1005),
    "hatWizard":   (277, 791, 591, 1035),
    "hatBeret":    (588, 855, 835, 1012),
    "crownFlower": (835, 868, 1096, 996),
    "cloak":       (1087, 763, 1426, 1056),
}
# Pieces whose box also catches a neighbour's edge: keep only the shapes inside the core box.
ONLY_TOUCHING_CENTRE = {"hatChef", "hatWizard", "hatBeret", "crownFlower", "eyeOpenL", "eyeOpenR"}

sheet = Image.open(SHEET).convert("RGB")
SW, SH = sheet.size


def is_bg(c):
    r, g, b = c[:3]
    return r > 232 and g > 232 and b > 232 and max(r, g, b) - min(r, g, b) < 18


index = {}
for name, (x0, y0, x1, y1) in PIECES.items():
    m = 4
    bx0, by0, bx1, by1 = max(0, x0 - m), max(0, y0 - m), min(SW, x1 + m), min(SH, y1 + m)
    crop = sheet.crop((bx0, by0, bx1, by1)).convert("RGBA")
    W, H = crop.size
    px = crop.load()
    # The background: near-white reached from the edge of the box. White inside an
    # outline (a highlight, a collar, the chef's hat) is not reached and stays.
    outside = [[False] * W for _ in range(H)]
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if is_bg(px[x, y]): outside[y][x] = True; q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            if is_bg(px[x, y]) and not outside[y][x]: outside[y][x] = True; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and not outside[ny][nx] and is_bg(px[nx, ny]):
                outside[ny][nx] = True; q.append((nx, ny))
    for y in range(H):
        for x in range(W):
            if outside[y][x]: px[x, y] = (255, 255, 255, 0)
    # The soft rim between the outline and the background: pale pixels touching the
    # background go too (twice round), or they trace as a speckled halo. A pale part
    # of the drawing (a collar, a highlight, the chef's hat) sits inside the outline
    # and never touches the background.
    for _ in range(2):
        rim = []
        for y in range(H):
            for x in range(W):
                if outside[y][x]: continue
                r, g, b, a = px[x, y]
                light = (r * 299 + g * 587 + b * 114) / 1000
                sat = (max(r, g, b) - min(r, g, b)) / 255
                if light > 140 and sat < 0.25 and any(
                        0 <= x + dx < W and 0 <= y + dy < H and outside[y + dy][x + dx]
                        for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                    rim.append((x, y))
        for x, y in rim:
            outside[y][x] = True
            px[x, y] = (255, 255, 255, 0)
    # A neighbour's edge caught in the box: keep only the shapes wholly inside this
    # piece's own box (from the component scan), drop what runs out of it.
    lab = [[-1] * W for _ in range(H)]
    comps = []
    for sy in range(H):
        for sx in range(W):
            if px[sx, sy][3] == 0 or lab[sy][sx] >= 0: continue
            cid = len(comps); q = deque([(sx, sy)]); lab[sy][sx] = cid
            cx0 = cx1 = sx; cy0 = cy1 = sy; members = []
            while q:
                x, y = q.popleft(); members.append((x, y))
                cx0 = min(cx0, x); cx1 = max(cx1, x); cy0 = min(cy0, y); cy1 = max(cy1, y)
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < W and 0 <= ny < H and lab[ny][nx] < 0 and px[nx, ny][3] > 0:
                            lab[ny][nx] = cid; q.append((nx, ny))
            comps.append((cx0 + bx0, cy0 + by0, cx1 + bx0, cy1 + by0, members))
    for (gx0, gy0, gx1, gy1, members) in comps:
        if gx0 >= x0 - 2 and gy0 >= y0 - 2 and gx1 <= x1 + 2 and gy1 <= y1 + 2: continue
        for x, y in members: px[x, y] = (255, 255, 255, 0)
    crop.save(f"{OUT}/{name}.png")
    vtracer.convert_image_to_svg_py(f"{OUT}/{name}.png", f"{OUT}/{name}.svg",
        colormode="color", hierarchical="stacked", mode="spline",
        filter_speckle=6, color_precision=6, layer_difference=24,
        corner_threshold=60, length_threshold=3.5, max_iterations=10,
        splice_threshold=45, path_precision=2)
    svg = open(f"{OUT}/{name}.svg", encoding="utf-8").read()
    index[name] = {"box": [bx0, by0, bx1, by1], "w": W, "h": H,
                   "paths": len(re.findall(r"<path", svg)), "kb": round(len(svg) / 1024, 1)}
json.dump(index, open(f"{OUT}/index.json", "w"), indent=1)
print(f"{len(index)} pieces;", ", ".join(f"{k} {v['paths']}p {v['kb']}KB" for k, v in index.items()))
