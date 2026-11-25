"""shop.py <id>: SpecialShop items -> received item and cost."""
import sys, json, urllib.request
sys.stdout.reconfigure(encoding="utf-8")
sid = sys.argv[1]
u = f"https://v2.xivapi.com/api/sheet/SpecialShop/{sid}?fields=Name,Item[].Item[].Name,Item[].ReceiveCount,Item[].ItemCost[].Name,Item[].CurrencyCost"
d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})))
f = d["fields"]
print("shop", sid, f.get("Name"))
for it in f.get("Item", []):
    names = [x.get("fields", {}).get("Name", "") for x in it.get("Item", [])]
    cnt = it.get("ReceiveCount", [])
    cn = [x.get("fields", {}).get("Name", "") for x in it.get("ItemCost", [])]
    cc = it.get("CurrencyCost", [])
    rec = [(n, c) for n, c in zip(names, cnt) if n]
    cost = [(n, c) for n, c in zip(cn, cc) if n]
    if rec: print(rec, "<-", cost)
