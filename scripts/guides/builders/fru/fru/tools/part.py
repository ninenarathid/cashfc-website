"""part.py <phase-prefix> : writes .work/fru/part.json with only the steps whose phase starts with the prefix (for check sheets)."""
import sys, json
d = json.load(open("scripts/guides/data/fru.json", encoding="utf-8"))
d["steps"] = [s for s in d["steps"] if s["phase"].startswith(sys.argv[1])]
d["rewards"] = []
d["guide"] = dict(d["guide"], req={k: v for k, v in d["guide"]["req"].items() if k != "unlock_pics"})
json.dump(d, open("scripts/guides/.work/fru/part.json", "w", encoding="utf-8"), ensure_ascii=False)
print(len(d["steps"]))
