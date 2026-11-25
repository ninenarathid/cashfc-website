"""tiles.py img cx cy rin R [off]: the colour at the middle of each of the 16 floor tiles
(8 inner, 8 outer, spokes at off + 45k degrees, 0 = up, clockwise), sampled at three radii each."""
import sys, math
from PIL import Image
f = sys.argv[1]
cx, cy, rin, R = map(float, sys.argv[2:6])
off = float(sys.argv[6]) if len(sys.argv) > 6 else 0
im = Image.open(f).convert("RGBA")
bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
im = Image.alpha_composite(bg, im).convert("RGB")
W, H = im.size
px = im.load()
def at(a, r):
    t = math.radians(a)
    x = min(W - 1, max(0, round((cx + r * math.sin(t)) / 100 * W)))
    y = min(H - 1, max(0, round((cy - r * math.cos(t)) / 100 * W)))
    return "#%02x%02x%02x" % px[x, y]
for k in range(8):
    a = off + 22.5 + 45 * k
    inner = [at(a + d, r) for d in (-12, 0, 12) for r in (rin * 0.45, rin * 0.75)]
    outer = [at(a + d, r) for d in (-12, 0, 12) for r in (rin + (R - rin) * 0.3, rin + (R - rin) * 0.7)]
    print(f"{a:6.1f}  in: {' '.join(inner)}   out: {' '.join(outer)}")
