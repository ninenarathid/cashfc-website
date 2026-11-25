"""polar.py img cx cy r [tol] [step]: colour runs along a circle centred (cx, cy), radius r (percent of width),
angle 0 = up, clockwise, in degrees. Transparent pixels are flattened onto white."""
import sys, math
from PIL import Image
f = sys.argv[1]
cx, cy, r = float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
tol = float(sys.argv[5]) if len(sys.argv) > 5 else 60
step = float(sys.argv[6]) if len(sys.argv) > 6 else 0.5
im = Image.open(f).convert("RGBA")
bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
im = Image.alpha_composite(bg, im).convert("RGB")
W, H = im.size
px = im.load()
seq = []
a = 0.0
while a < 360:
    t = math.radians(a)
    x = (cx + r * math.sin(t)) / 100 * W
    y = (cy - r * math.cos(t)) / 100 * W
    x = min(W - 1, max(0, round(x))); y = min(H - 1, max(0, round(y)))
    seq.append((a, px[x, y]))
    a += step
runs = []
s = 0
for i in range(1, len(seq) + 1):
    if i == len(seq) or sum(abs(p - q) for p, q in zip(seq[i][1], seq[s][1])) > tol:
        runs.append((seq[s][0], seq[i - 1][0], seq[(s + i - 1) // 2][1]))
        s = i
print(" ".join(f"{a:.1f}-{b:.1f}:#{c[0]:02x}{c[1]:02x}{c[2]:02x}" for a, b, c in runs if b - a >= step))
