"""detect2.py img...: game8's role badges on Necron's pictures (dark maroon D, dark blue T, olive H with a light rim), in percent."""
import sys
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
def role(c):
    r, g, b = c[:3]
    if 45 < r < 120 and r - g > 14 and r - b > 14 and g < 70 and b < 70: return "D"
    if b > 70 and b - r > 40 and r < 60 and g < 90 and b < 150: return "T"
    if g > 72 and g - r > 12 and g - b > 22 and r > 48 and r < 110: return "H"
    return None
for f in sys.argv[1:]:
    im = Image.open(f).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    im = Image.alpha_composite(bg, im).convert("RGB")
    W, H = im.size; px = im.load()
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
            if len(pts) > 90:
                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                bw, bh = max(xs) - min(xs), max(ys) - min(ys)
                if 14 < bw < 34 and 14 < bh < 34 and len(pts) > 0.35 * bw * bh:
                    comps.append((k, (min(xs) + max(xs)) / 2 / W * 100, (min(ys) + max(ys)) / 2 / H * 100, bw, len(pts)))
    comps.sort(key=lambda c: (round(c[2] / 4), c[1]))
    print(f.split("/")[-1].split("\\")[-1][:2], " ".join(f"{k}({x:.1f},{y:.1f}|{w})" for k, x, y, w, n in comps))
