import sys, json, urllib.request, urllib.parse
sys.stdout.reconfigure(encoding="utf-8")
names = sys.argv[1:]
for n in names:
    q = f'Name@ja~"{n}"'
    u = "https://v2.xivapi.com/api/search?" + urllib.parse.urlencode({"sheets": "Action", "query": q, "fields": "Name,Name@ja,ClassJob@as(raw),IsPlayerAction", "limit": 60})
    d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})))
    seen = {}
    for r in d["results"]:
        f = r["fields"]
        if f.get("IsPlayerAction"): continue
        k = (f["Name"], f["Name@ja"])
        seen.setdefault(k, []).append(r["row_id"])
    print("==", n)
    for (en, ja), ids in seen.items():
        print("  ", ids[:8], "|", en, "|", ja)
