"""Full-res frames: python3 grab.py <video id> <sec> [<sec> ...] -> .work/tea/cand/<vid>-<sec>.png
   with 'grid' as the first argument, also writes a 1280x720 copy with a 50 px grid to .work/tea/cand/g-<vid>-<sec>.png"""
import sys, subprocess, os
W = "scripts/guides/.work/tea"
args = sys.argv[1:]
grid = args[0] == "grid"
if grid: args = args[1:]
vid, secs = args[0], args[1:]
ff = subprocess.run(["node", "-e", "console.log(require('./scripts/guides/tools/paths.cjs').ffmpeg())"], capture_output=True, text=True).stdout.strip()
os.makedirs(f"{W}/cand", exist_ok=True)
for s in secs:
    out = f"{W}/cand/{vid}-{s}.png"
    if not os.path.exists(out):
        subprocess.run([ff, "-loglevel", "error", "-y", "-ss", s, "-i", f"{W}/vid/{vid}.mp4", "-frames:v", "1", out], check=True)
    if grid:
        js = f"""const sharp=require('sharp');(async()=>{{let s='<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">';
for(let x=0;x<=1280;x+=50){{s+=`<line x1="${{x}}" y1="0" x2="${{x}}" y2="720" stroke="${{x%100?'#f0f':'#0ff'}}" stroke-opacity="0.6"/>`;if(x%100==0)s+=`<text x="${{x+2}}" y="12" fill="#0ff" font-size="12" stroke="#000" stroke-width="2" paint-order="stroke">${{x}}</text>`}}
for(let y=0;y<=720;y+=50){{s+=`<line x1="0" y1="${{y}}" x2="1280" y2="${{y}}" stroke="${{y%100?'#f0f':'#0ff'}}" stroke-opacity="0.6"/>`;if(y%100==0)s+=`<text x="2" y="${{y-2}}" fill="#0ff" font-size="12" stroke="#000" stroke-width="2" paint-order="stroke">${{y}}</text>`}}
s+='</svg>';await sharp('{out}').composite([{{input:Buffer.from(s)}}]).png().toFile('{W}/cand/g-{vid}-{s}.png')}})()"""
        subprocess.run(["node", "-e", js], check=True)
    print(out)
