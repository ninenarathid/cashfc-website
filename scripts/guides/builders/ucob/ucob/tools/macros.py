"""The English and Japanese macro blocks, exactly as Tuufless's overview page has them -> .work/ucob/macros.json.
usage (repo root): python3 macros.py"""
import re, html, json
src = open("scripts/guides/.work/ucob/dl/overview.html", encoding="utf-8").read()
pres = [html.unescape(re.sub(r"<[^>]+>", "", m)) for m in re.findall(r"<pre[^>]*>(.*?)</pre>", src, re.S)]
en, ja = pres[0].rstrip("\n"), pres[1].rstrip("\n")
assert en.startswith("―《Twintania》") and ja.startswith("―《ツインタニア》"), (en[:20], ja[:20])
json.dump({"macro_en": en, "macro_ja": ja}, open("scripts/guides/.work/ucob/macros.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(en), len(ja))
