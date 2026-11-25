import sys, json, urllib.request, urllib.parse
sys.stdout.reconfigure(encoding="utf-8")
# acts2.py lo hi word...: non-player actions with id in [lo,hi] whose Name@ja contains word
lo, hi = int(sys.argv[1]), int(sys.argv[2])
for n in sys.argv[3:]:
    q = f'Name@ja~"{n}" +RowId>={lo} +RowId<={hi}'
    u = "https://v2.xivapi.com/api/search?" + urllib.parse.urlencode({"sheets": "Action", "query": q, "fields": "Name,Name@ja", "limit": 100})
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})))
    except Exception as e:
        print("ERR", n, e); continue
    seen = {}
    for r in d["results"]:
        f = r["fields"]; seen.setdefault((f["Name"], f["Name@ja"]), []).append(r["row_id"])
    print("==", n)
    for (en, ja), ids in seen.items(): print("  ", ids[:8], "|", en, "|", ja)
