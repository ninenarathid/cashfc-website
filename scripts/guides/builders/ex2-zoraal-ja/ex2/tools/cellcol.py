"""Average colour of each tile of a diamond floor: python cellcol.py img cx cy d n"""
import sys, subprocess, json
sys.stdout.reconfigure(encoding="utf-8")
img, cx, cy, d, n = sys.argv[1], *map(float, sys.argv[2:5]), int(sys.argv[5])
js = r"""
const sharp=require('sharp');
(async()=>{const {data,info}=await sharp(process.argv[1]).removeAlpha().raw().toBuffer({resolveWithObject:true});
const pts=JSON.parse(process.argv[2]);const W=info.width,H=info.height;
console.log(JSON.stringify(pts.map(([x,y])=>{let s=[0,0,0],k=0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){if(Math.abs(dx)+Math.abs(dy)>5)continue;const X=Math.round(x/100*W)+dx,Y=Math.round(y/100*H)+dy;const i=(Y*W+X)*3;s[0]+=data[i];s[1]+=data[i+1];s[2]+=data[i+2];k++;}return s.map(v=>Math.round(v/k));})));})();
"""
step = 2 * d / n
pts, keys = [], []
for a in range(n):
    for b in range(n):
        s = cx + cy - d + (a + .5) * step
        t = cx - cy + d - (b + .5) * step
        pts.append([(s + t) / 2, (s - t) / 2]); keys.append((a, b))
out = subprocess.run(["node", "-e", js, img, json.dumps(pts)], capture_output=True, text=True).stdout
cols = json.loads(out)
def name(c):
    r, g, b = c
    if r < 70 and g < 70 and b < 70: return "dark"
    if r > 120 and g < 80: return "RED"
    if r - b > 40: return "orng" if g > 95 else "brwn"
    if g - r > 20: return "GRN"
    return "?%d,%d,%d" % (r, g, b)
print(img.split('/')[-1], f"floor ({cx},{cy}) d{d}")
for b in range(n):
    print("  b=%d: " % b + "  ".join("a%d:%-5s" % (a, name(cols[a * n + b])) for a in range(n)))
