"""isearch.py <query>: Item search with name, JA, ilvl, job category, UI category, icon."""
import sys, json, urllib.request, urllib.parse
sys.stdout.reconfigure(encoding="utf-8")
q = sys.argv[1]
u = "https://v2.xivapi.com/api/search?" + urllib.parse.urlencode({"sheets": "Item", "query": q, "limit": 100,
    "fields": "Name,Name@ja,Icon,LevelItem@as(raw),ClassJobCategory.Name,ItemUICategory.Name"})
d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})))
for r in d["results"]:
    f = r["fields"]
    cj = (f.get("ClassJobCategory") or {}).get("fields", {}).get("Name", "")
    ui = (f.get("ItemUICategory") or {}).get("fields", {}).get("Name", "")
    ic = (f.get("Icon") or {}).get("path_hr1", "")
    print(r["row_id"], f.get("LevelItem@as(raw)"), "|", f["Name"], "|", f["Name@ja"], "|", cj, "|", ui, "|", ic)
