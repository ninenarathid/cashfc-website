"""detect.py img...: centres of game8's role badges (blue tank, green healer, maroon DPS), in percent.
A badge is a solid square of its colour, about 25-35 px on a 440 px picture."""
import sys
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")

def role(c):
    r, g, b = c[:3]
    if b > 95 and b > r + 45 and b > g + 25 and r < 90 and g < 110: return "T"
    if g > 60 and g > r + 18 and g > b + 15 and r < 90 and b < 90: return "H"
    if r > 70 and r > g + 28 and r > b + 20 and g < 70 and b < 80 and r < 150: return "D"
    return None

for f in sys.argv[1:]:
    im = Image.open(f).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    im = Image.alpha_composite(bg, im).convert("RGB")
    W, H = im.size
    px = im.load()
    lab = [[None] * W for _ in range(H)]
    seen = [[False] * W for _ in range(H)]
    comps = []
    for y in range(H):
        for x in range(W):
            if seen[y][x]: continue
            k = role(px[x, y])
            if not k: continue
            st = [(x, y)]; seen[y][x] = True; pts = []
            while st:
                a, b = st.pop(); pts.append((a, b))
                for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    u, v = a + da, b + db
                    if 0 <= u < W and 0 <= v < H and not seen[v][u] and role(px[u, v]) == k:
                        seen[v][u] = True; st.append((u, v))
            if len(pts) > 120:
                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                bw, bh = max(xs) - min(xs), max(ys) - min(ys)
                if 12 < bw < 60 and 12 < bh < 60:
                    comps.append((k, (min(xs) + max(xs)) / 2 / W * 100, (min(ys) + max(ys)) / 2 / H * 100, bw / W * 100, len(pts)))
    comps.sort(key=lambda c: (round(c[2] / 4), c[1]))
    print(f.split("/")[-1].split("\\")[-1], " ".join(f"{k}({x:.1f},{y:.1f}|{w:.1f})" for k, x, y, w, n in comps))
