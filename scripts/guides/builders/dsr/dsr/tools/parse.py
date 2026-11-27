"""Tuufless's page source (markdown with HTML tables) to plain text with [[IMG path]] markers in place.
usage: python3 parse.py <page.en.md>  (from the repo clone in .work/dsr/repo)"""
import sys, re, html
src = open(sys.argv[1], encoding="utf-8").read()
src = re.sub(r"^---.*?---", "", src, flags=re.S)
src = re.sub(r"<script.*?</script>", "", src, flags=re.S)
src = re.sub(r'<img src="\{\{site.baseurl\}\}/images/ultimates/dsr/([^"]+)"[^>]*>', lambda m: f"\n[[IMG {m.group(1)}]]\n", src)
src = re.sub(r"!\[\]\(\{\{site.baseurl\}\}/images/ultimates/dsr/([^)]+)\)", lambda m: f"\n[[IMG {m.group(1)}]]\n", src)
src = re.sub(r"<summary>", "\n#### ", src)
src = re.sub(r"<li>", "\n- ", src)
src = re.sub(r"<(b|strong)>(.*?)</\1>", r"**\2**", src, flags=re.S)
src = re.sub(r"<em>(.*?)</em>", r"*\1*", src, flags=re.S)
src = re.sub(r"</(p|td|tr|ul|li|table|summary|details)>", "\n", src)
src = re.sub(r"<br\s*/?>", "\n", src)
src = re.sub(r"<[^>]+>", " ", src)
src = html.unescape(src)
out = []
for para in re.split(r"\n", src):
    l = re.sub(r"\s+", " ", para).strip()
    if l: out.append(l)
# join wrapped lines: a line that does not start a new item continues the last
res = []
for l in out:
    if res and not re.match(r"^(\[\[IMG|#|- |\*\*\d|\d+\.|\||```)", l) and not res[-1].startswith(("[[IMG", "#")) and not res[-1].endswith(":"):
        res[-1] += " " + l
    else:
        res.append(l)
print("\n".join(res))
