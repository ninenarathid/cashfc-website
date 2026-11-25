import sys, json, re
sys.stdout.reconfigure(encoding="utf-8")
d = json.load(open(r"scripts/guides/data/ex3-queen-eternal.json", encoding="utf-8"))
KANA_KANJI = re.compile(r"[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uff66-\uff9f]")
CJK_PUNCT = re.compile(r"[\u3000-\u303f\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65\u2460-\u24ff]")
bad, punct = [], []
def walk(v, path):
    if isinstance(v, dict):
        for k, x in v.items():
            if k == "scene": continue
            walk(x, path + [k])
    elif isinstance(v, list):
        for i, x in enumerate(v): walk(x, path + [i])
    elif isinstance(v, str):
        if path[-1] == "macro_ja": return
        m = KANA_KANJI.findall(v)
        if m: bad.append((".".join(map(str, path)), "".join(m)[:40]))
        p = CJK_PUNCT.findall(v)
        if p: punct.append((".".join(map(str, path)), "".join(sorted(set(p)))))
walk(d, [])
# scene text shapes too
for i, s in enumerate(d["steps"]):
    for sh in (s.get("scene") or {}).get("shapes", []):
        if sh.get("t") == "text":
            if KANA_KANJI.search(sh["s"]) or CJK_PUNCT.search(sh["s"]): bad.append((f"steps.{i}.scene.text", sh["s"]))
print("kana/kanji outside macro_ja:", len(bad), bad[:10])
print("CJK punctuation outside macro_ja (where):", sorted({(p.split('.')[0] if not p.startswith('steps') else re.sub(r'\.\d+\.', '.N.', p), c) for p, c in punct}))
probs = []
for i, s in enumerate(d["steps"]):
    for k, lim in (("note", 1000), ("name", 80), ("mech", 80), ("phase", 80)):
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
    if s.get("scene") and not s.get("game8"): probs.append((i, "scene without game8", 0))
for r in d["rewards"]:
    for q in r.get("pics", []):
        for k in ("say", "say_en"):
            if len(q.get(k, "")) > 160: probs.append(("reward", r["name"], k, len(q[k])))
    if len(r["name"]) > 80: probs.append(("reward name", r["name"]))
for q in d["guide"]["req"]["unlock_pics"]:
    for k in ("say", "say_en"):
        if len(q.get(k, "")) > 160: probs.append(("unlock pic", k))
print("length/shape problems:", probs)
print("max note", max(len(s["note"]) for s in d["steps"]), "max en note", max(len(s["en"]["note"]) for s in d["steps"]))
print("guide note", len(d["guide"]["note"]), len(d["guide"]["en"]["note"]))
print("max says", max((len(t) for s in d["steps"] for t in (s.get("says") or {}).values()), default=0),
      max((len(t) for s in d["steps"] for t in ((s.get("en") or {}).get("says") or {}).values()), default=0))
print("max name", max(len(s["name"]) for s in d["steps"]), max(len(s["en"]["name"]) for s in d["steps"]), "max mech", max(len(s["mech"]) for s in d["steps"]))
# Thai role words that are not allowed
for w in ("แทงค์", "แทงก์", "เมเล", "เรนจ์", "ฮีล", "หมอ"):
    hits = [i for i, s in enumerate(d["steps"]) if w in json.dumps({k: s.get(k) for k in ("note", "says", "name", "phase")}, ensure_ascii=False)]
    if w in d["guide"]["note"]: hits.append("guide")
    if hits: print("forbidden word", w, hits)
print("phases", list(dict.fromkeys(s["phase"] for s in d["steps"])))
print("mechs", list(dict.fromkeys(s["mech"] for s in d["steps"])))
