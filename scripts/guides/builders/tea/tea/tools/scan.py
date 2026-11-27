"""Contact sheet of a video segment: python3 scan.py <video id> <start s> <end s> <step s> [width]
Writes .work/tea/scan/<id>-<start>.png, 4 across, each tile labelled with its second."""
import sys, subprocess, os, json
WT = "."
W = "scripts/guides/.work/tea"
vid, a, b, st = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
w = int(sys.argv[5]) if len(sys.argv) > 5 else 400
ff = subprocess.run(["node", "-e", "console.log(require('./scripts/guides/tools/paths.cjs').ffmpeg())"], capture_output=True, text=True).stdout.strip()
d = f"{W}/scan/{vid}-{a}"
os.makedirs(d, exist_ok=True)
subprocess.run([ff, "-loglevel", "error", "-y", "-ss", str(a), "-t", str(b - a), "-i", f"{W}/vid/{vid}.mp4", "-vf", f"fps=1/{st},scale={w}:-1", f"{d}/f%03d.png"], check=True)
files = sorted(f for f in os.listdir(d) if f.startswith("f"))
labels = [a + i * st for i in range(len(files))]
js = f"""
const sharp=require('sharp');const fs=require('fs');
const files={json.dumps(files)},labels={json.dumps(labels)},d={json.dumps(d)},W={w};
(async()=>{{const m=await sharp(d+'/'+files[0]).metadata();const H=m.height,cols=4,T=18;
const comp=[];for(let i=0;i<files.length;i++){{const x=(i%cols)*(W+4),y=Math.floor(i/cols)*(H+T+4);
comp.push({{input:Buffer.from(`<svg width="${{W}}" height="${{T}}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="14" fill="#ff0" font-size="14" font-family="Arial">${{labels[i]}}s</text></svg>`),left:x,top:y}});
comp.push({{input:d+'/'+files[i],left:x,top:y+T}});}}
const rows=Math.ceil(files.length/cols);
await sharp({{create:{{width:cols*(W+4),height:rows*(H+T+4),channels:3,background:'#222'}}}}).composite(comp).png().toFile('{W}/scan/{vid}-{a}.png');
for(const f of files)fs.unlinkSync(d+'/'+f);console.log('{W}/scan/{vid}-{a}.png',files.length)}})()"""
subprocess.run(["node", "-e", js], check=True)
