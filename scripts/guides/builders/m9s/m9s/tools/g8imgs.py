import sys, re, os, urllib.request
sys.stdout.reconfigure(encoding="utf-8")
HERE = sys.argv[1]
txt = open(HERE + "/g8.txt", encoding="utf-8").read()
txt = txt[:txt.find("##h2 関連リンク")]
seen, urls = set(), []
for m in re.finditer(r"\[\[IMG (\S+) \| ([^|]*) \|", txt):
    u, alt = m.group(1), m.group(2).strip()
    iid = u.split("/")[3]
    if iid in seen or iid in ("5365350", "10184914", "12188743"):
        continue
    seen.add(iid); urls.append((u, alt))
os.makedirs(HERE + "/dl/img", exist_ok=True)
with open(HERE + "/imgs.txt", "w", encoding="utf-8") as f:
    for i, (u, alt) in enumerate(urls, 1):
        f.write(u + "\n")
        p = f"{HERE}/dl/img/{i:02d}_{u.split('/')[3]}.webp"
        if not os.path.exists(p):
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://game8.jp/"})
            open(p, "wb").write(urllib.request.urlopen(req).read())
        print(i, u.split("/")[3], alt)
