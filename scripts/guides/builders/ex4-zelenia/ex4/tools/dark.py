"""dark.py img cx cy r [thr]: angles (0 = up, clockwise) where the circle crosses a dark line."""
import sys, math
from PIL import Image
f = sys.argv[1]; cx, cy, r = map(float, sys.argv[2:5]); thr = float(sys.argv[5]) if len(sys.argv) > 5 else 120
im = Image.open(f).convert("RGBA"); bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
im = Image.alpha_composite(bg, im).convert("RGB"); W, H = im.size; px = im.load()
hits = []; a = 0.0
while a < 360:
    t = math.radians(a); x = round((cx + r * math.sin(t)) / 100 * W); y = round((cy - r * math.cos(t)) / 100 * W)
    if 0 <= x < W and 0 <= y < H and sum(px[x, y]) < thr: hits.append(a)
    a += 0.25
groups = []
for h in hits:
    if groups and h - groups[-1][-1] <= 0.6: groups[-1].append(h)
    else: groups.append([h])
print(" ".join(f"{(g[0] + g[-1]) / 2:.1f}" for g in groups))
