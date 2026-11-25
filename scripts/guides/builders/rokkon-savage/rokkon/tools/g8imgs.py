"""g8imgs.py <dl dir>: every game8 picture of the three boss pages (+ overview), numbered per page, downloaded once."""
import sys, re, os, urllib.request, json
sys.stdout.reconfigure(encoding="utf-8")
D = sys.argv[1]
pages = [("ov", "520812"), ("b1", "541961"), ("b2", "542124"), ("b3", "542626")]
os.makedirs(D + "/img", exist_ok=True)
out = {}
for tag, pid in pages:
    txt = open(f"{D}/g8-{pid}.txt", encoding="utf-8").read()
    txt = txt[:txt.find("##h2 関連リンク")]
    seen, k = set(), 0
    for m in re.finditer(r"\[\[IMG (\S+) \| ([^|]*) \| (\S+)\]\]", txt):
        u, alt, sz = m.group(1), m.group(2).strip(), m.group(3)
        iid = u.split("/")[3]
        if iid in seen:
            continue
        seen.add(iid); k += 1
        ext = u.split("/")[4].split(".")[-1]
        p = f"{D}/img/{tag}-{k:02d}_{iid}.{ext}"
        if not os.path.exists(p):
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://game8.jp/"})
            open(p, "wb").write(urllib.request.urlopen(req).read())
        out[f"{tag}-{k:02d}"] = u
        print(f"{tag}-{k:02d}", iid, sz, alt)
json.dump(out, open(D + "/../imgs.json", "w", encoding="utf-8"), indent=0, ensure_ascii=False)
