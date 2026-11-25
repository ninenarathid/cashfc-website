"""hough.py img [rmin rmax] -> circles (cx% of W, cy% of H, r% of W) from bright rim pixels."""
import sys, math
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
f = sys.argv[1]
rmin, rmax = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (35, 160)
thr = sys.argv[4] if len(sys.argv) > 4 else "rim"
im = Image.open(f).convert("RGB")
W, H = im.size
px = im.load()
pts = []
for y in range(H):
    for x in range(W):
        r, g, b = px[x, y]
        if thr == "rim" and r > 235 and g > 205 and b > 120 and (r - b) < 120:
            pts.append((x, y))
print("rim px", len(pts), file=sys.stderr)
acc = {}
angs = [(math.cos(t * math.pi / 60), math.sin(t * math.pi / 60)) for t in range(120)]
for (x, y) in pts:
    for r in range(rmin, rmax + 1, 2):
        for c, s in angs:
            cx, cy = int(round(x - r * c)) // 3, int(round(y - r * s)) // 3
            k = (cx, cy, r)
            acc[k] = acc.get(k, 0) + 1
best = sorted(acc.items(), key=lambda kv: -kv[1])
out = []
for (cx, cy, r), v in best:
    X, Y = cx * 3 + 1, cy * 3 + 1
    if any(abs(X - a) < 14 and abs(Y - b) < 14 and abs(r - c) < 14 for a, b, c, _ in out):
        continue
    out.append((X, Y, r, v))
    if len(out) >= 14: break
for X, Y, r, v in out:
    print(f"{X/W*100:.1f},{Y/H*100:.1f},{r/W*100:.1f}  votes={v}")
