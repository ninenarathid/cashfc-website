"""Which tiles of a diamond floor are orange in a game8 picture: python cells.py img cx cy d n"""
import sys, subprocess, json
sys.stdout.reconfigure(encoding="utf-8")
img, cx, cy, d, n = sys.argv[1], *map(float, sys.argv[2:5]), int(sys.argv[5])
js = r"""
const sharp=require('sharp');
(async()=>{const {data,info}=await sharp(process.argv[1]).removeAlpha().raw().toBuffer({resolveWithObject:true});
const pts=JSON.parse(process.argv[2]);const W=info.width,H=info.height;
console.log(JSON.stringify(pts.map(([x,y])=>{let o=0,k=0;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const X=Math.round(x/100*W)+dx,Y=Math.round(y/100*H)+dy;const i=(Y*W+X)*3;const R=data[i],G=data[i+1],B=data[i+2];k++;if(R-B>45&&R>90)o++;}return o/k;})));})();
"""
step = 2 * d / n
pts, keys = [], []
for a in range(n):
    for b in range(n):
        s = cx + cy - d + (a + .5) * step
        t = cx - cy + d - (b + .5) * step
        pts.append([(s + t) / 2, (s - t) / 2]); keys.append((a, b))
out = subprocess.run(["node", "-e", js, img, json.dumps(pts)], capture_output=True, text=True).stdout
fr = json.loads(out)
grid = [[" "] * n for _ in range(n)]
on = []
for (a, b), f in zip(keys, fr):
    if f > 0.5: on.append((a, b))
print(img.split('/')[-1], "orange tiles (a=down-right, b=down-left):", on)
