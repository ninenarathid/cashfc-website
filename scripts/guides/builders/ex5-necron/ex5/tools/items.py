"""items.py a b: Item rows a..b-1 with name, JA name, ilvl, job category, UI category and icon."""
import sys, json, urllib.request
sys.stdout.reconfigure(encoding="utf-8")
a, b = int(sys.argv[1]), int(sys.argv[2])
ids = ",".join(str(i) for i in range(a, b))
u = f"https://v2.xivapi.com/api/sheet/Item?rows={ids}&fields=Name,Name@ja,Icon,LevelItem,ClassJobCategory.Name,ItemUICategory.Name"
d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})))
for r in d["rows"]:
    f = r["fields"]
    li = f.get("LevelItem")
    li = li.get("value") if isinstance(li, dict) else li
    cj = (f.get("ClassJobCategory") or {}).get("fields", {}).get("Name", "")
    ui = (f.get("ItemUICategory") or {}).get("fields", {}).get("Name", "")
    ic = (f.get("Icon") or {}).get("path_hr1", "")
    print(r["row_id"], li, "|", f["Name"], "|", f["Name@ja"], "|", cj, "|", ui, "|", ic)
