import sys, json, re
sys.stdout.reconfigure(encoding="utf-8")
d = json.load(open(r"scripts/guides/data/ex2-zoraal-ja.json", encoding="utf-8"))
JP = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff66-\uff9f\u3000-\u303f\uff01-\uff0f\uff1a-\uff20]")
bad = []
def walk(v, path):
    if isinstance(v, dict):
        for k, x in v.items():
            walk(x, path + [k])
    elif isinstance(v, list):
        for i, x in enumerate(v):
            walk(x, path + [i])
    elif isinstance(v, str):
        if path[-1] == "macro_ja":
            return
        m = JP.findall(v)
        if m:
            bad.append((".".join(map(str, path)), "".join(m)[:40], v[:80]))
walk(d, [])
print("Japanese characters outside macro_ja:", len(bad))
for b in bad: print("  ", b)
# lengths
probs = []
for i, s in enumerate(d["steps"]):
    for k, lim in (("note", 1000), ("name", 80)):
        if len(s.get(k) or "") > lim: probs.append((i, k, len(s[k])))
        if len((s.get("en") or {}).get(k) or "") > lim: probs.append((i, "en." + k, len(s["en"][k])))
    for seat, t in (s.get("says") or {}).items():
        if len(t) > 200: probs.append((i, "says." + seat, len(t)))
    for seat, t in ((s.get("en") or {}).get("says") or {}).items():
        if len(t) > 200: probs.append((i, "en.says." + seat, len(t)))
    for r in s.get("refs") or []:
        if len(r.get("say", "")) > 160: probs.append((i, "ref", len(r["say"])))
    for t in (s.get("en") or {}).get("refs") or []:
        if len(t) > 160: probs.append((i, "en.ref", len(t)))
    if not s.get("en"): probs.append((i, "no en", 0))
    for k in ("phase", "mech", "name", "note"):
        if s.get(k) and not s["en"].get(k): probs.append((i, "missing en." + k, 0))
    if set((s.get("says") or {}).keys()) != set(((s.get("en") or {}).get("says") or {}).keys()): probs.append((i, "says/en mismatch", 0))
    if len(s.get("refs") or []) != len((s.get("en") or {}).get("refs") or []): probs.append((i, "refs/en mismatch", 0))
    if "strict" not in s: probs.append((i, "no strict", 0))
for r in d["rewards"]:
    for q in r.get("pics", []):
        for k in ("say", "say_en"):
            if len(q.get(k, "")) > 160: probs.append(("reward", r["name"], k, len(q[k])))
print("length/shape problems:", probs)
print("max note", max(len(s["note"]) for s in d["steps"]), "max en note", max(len(s["en"]["note"]) for s in d["steps"]))
print("guide note", len(d["guide"]["note"]), len(d["guide"]["en"]["note"]))
