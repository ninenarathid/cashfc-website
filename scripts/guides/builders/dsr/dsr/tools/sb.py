"""Scouting from YouTube storyboards (no video download): tiles at ~2-5 s steps into .work/dsr/sb/<id>/<sec>.jpg.
usage (repo root): python3 .../sb.py fetch <id> [...]   |   python3 .../sb.py sheet <id> <from> <to> <out.png> [cols] [width]"""
import sys, json, subprocess, os, urllib.request, io
W = "scripts/guides/.work/dsr/sb"
cmd = sys.argv[1]
if cmd == "fetch":
    for vid in sys.argv[2:]:
        o = f"{W}/{vid}"
        if os.path.isdir(o) and os.listdir(o):
            print("have", vid); continue
        os.makedirs(o, exist_ok=True)
        d = json.loads(subprocess.run(["node", "scripts/guides/tools/yt.mjs", "-q", "--no-warnings", "-j", f"https://youtu.be/{vid}"],
                                      capture_output=True, text=True).stdout)
        f = next(x for x in d["formats"] if x["format_id"] == "sb0")
        step = 1 / f["fps"]; r, c, w, h = f["rows"], f["columns"], f["width"], f["height"]
        i = 0
        for fr in f["fragments"]:
            subprocess.run(["curl", "-s", "-o", f"{o}/_m.jpg", fr["url"]])
            n = int(round(fr["duration"] / step))
            jobs = []
            for k in range(min(n, r * c)):
                t = int(round(i * step)); i += 1
                jobs.append(((k % c) * w, (k // c) * h, f"{o}/{t:05d}.jpg"))
            subprocess.run(["node", "-e", 'const s=require("sharp");(async()=>{for(const [x,y,f] of %s)await s("%s/_m.jpg").extract({left:x,top:y,width:%d,height:%d}).toFile(f)})()' % (json.dumps(jobs), o, w, h)])
        os.remove(f"{o}/_m.jpg")
        print("fetched", vid, i, "tiles every", round(step, 2), "s", d.get("duration"))
else:
    vid, a, b, out = sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
    cols = int(sys.argv[6]) if len(sys.argv) > 6 else 5
    width = int(sys.argv[7]) if len(sys.argv) > 7 else 380
    fs = sorted(x for x in os.listdir(f"{W}/{vid}") if x.endswith(".jpg") and a <= int(x[:5]) <= b)
    js = f'''const sharp=require("sharp");(async()=>{{const fs={json.dumps(fs)};const W={width};
const m=await sharp("{W}/{vid}/"+fs[0]).metadata();const H=Math.round(W*m.height/m.width)+18;
const comp=[];for(let i=0;i<fs.length;i++){{const b=await sharp("{W}/{vid}/"+fs[i]).resize(W).toBuffer();
comp.push({{input:b,left:(i%{cols})*(W+4),top:Math.floor(i/{cols})*(H+4)+18}});
comp.push({{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${{W}}" height="18"><text x="2" y="14" font-size="14" fill="#fc0" font-family="Arial">${{+fs[i].slice(0,5)}}s</text></svg>`),left:(i%{cols})*(W+4),top:Math.floor(i/{cols})*(H+4)}});}}
await sharp({{create:{{width:{cols}*(W+4),height:Math.ceil(fs.length/{cols})*(H+4)+18,channels:3,background:"#111"}}}}).composite(comp).png().toFile("{out}");console.log(fs.length)}})()'''
    subprocess.run(["node", "-e", js])
