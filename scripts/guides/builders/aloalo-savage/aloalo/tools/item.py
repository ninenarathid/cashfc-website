"""item.py id...: name, JA, UI category, icon, description."""
import sys, json, urllib.request
sys.stdout.reconfigure(encoding="utf-8")
for i in sys.argv[1:]:
    u = f"https://v2.xivapi.com/api/sheet/Item/{i}?fields=Name,Name@ja,Description,Icon,ItemUICategory.Name,LevelItem@as(raw)"
    d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})))
    f = d["fields"]
    print(d["row_id"], f["Name"], "|", f["Name@ja"], "|", f["ItemUICategory"]["fields"]["Name"], "|", f.get("LevelItem@as(raw)"), "|", f["Icon"].get("path_hr1"), "|", f["Description"].replace("\n", " ")[:400])
