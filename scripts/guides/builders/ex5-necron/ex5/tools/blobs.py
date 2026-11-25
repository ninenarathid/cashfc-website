"""blobs.py kind img...: centres/radii of colour blobs in percent. kind: green (puddles), orb (blue orbs), pink (towers)"""
import sys
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
kind = sys.argv[1]
def ok(c):
    r, g, b = c
    if kind == "green": return g > 50 and g - r > 15 and g - b > 12 and r < 70
    if kind == "orb": return b > 150 and b - r > 70 and g > 110
    if kind == "pink": return r > 200 and b > 150 and g < 170 and r - g > 60
    if kind == "gold": return r > 140 and r - b > 90 and g > 80 and g < 140
    if kind == "red": return r > 170 and g < 90 and b < 100
for f in sys.argv[2:]:
    im = Image.open(f).convert("RGB"); W, H = im.size; px = im.load()
    seen = [[False] * W for _ in range(H)]; out = []
    for y in range(H):
        for x in range(W):
            if seen[y][x] or not ok(px[x, y]): continue
            st = [(x, y)]; seen[y][x] = True; pts = []
            while st:
                a, b = st.pop(); pts.append((a, b))
                for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    u, v = a + da, b + db
                    if 0 <= u < W and 0 <= v < H and not seen[v][u] and ok(px[u, v]): seen[v][u] = True; st.append((u, v))
            if len(pts) > 150:
                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                out.append(((min(xs) + max(xs)) / 2 / W * 100, (min(ys) + max(ys)) / 2 / H * 100, (max(xs) - min(xs)) / 2 / W * 100, (max(ys) - min(ys)) / 2 / H * 100, len(pts)))
    out.sort(key=lambda o: (round(o[1] / 5), o[0]))
    print(f[:2], " ".join(f"({x:.1f},{y:.1f} r{rx:.1f}/{ry:.1f} n{n})" for x, y, rx, ry, n in out))
