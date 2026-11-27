"""Tuufless's Notes page (HTML) to plain text: headings, lists, code blocks kept as they are, images as [[IMG url | alt]].
usage: python3 parse_tuuf.py <page.html>"""
import sys, re, html
src = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r"<main>(.*?)</main>", src, re.S)
body = m.group(1) if m else src
pres = []
def keep_pre(m):
    t = re.sub(r"<[^>]+>", "", m.group(1))
    pres.append(html.unescape(t))
    return f"\n@@PRE{len(pres)-1}@@\n"
body = re.sub(r"<pre[^>]*>(.*?)</pre>", keep_pre, body, flags=re.S)
def imgrep(m):
    t = m.group(0)
    u = re.search(r'src="([^"]+)"', t)
    a = re.search(r'alt="([^"]*)"', t)
    return f"\n[[IMG {u.group(1) if u else '?'} | {a.group(1) if a else ''}]]\n"
body = re.sub(r"<img[^>]*>", imgrep, body)
body = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: (m.group(2) + (f" <{m.group(1)}>" if not m.group(1).startswith("#") else "")), body, flags=re.S)
body = re.sub(r"<svg.*?</svg>", "", body, flags=re.S)
body = re.sub(r"<(h[1-6])[^>]*>", lambda m: "\n" + "#" * int(m.group(1)[1]) + " ", body)
body = re.sub(r"<li[^>]*>", "\n- ", body)
body = re.sub(r"<summary[^>]*>", "\n[summary] ", body)
body = re.sub(r"<br\s*/?>", "\n", body)
body = re.sub(r"<(strong|b)>", "**", body); body = re.sub(r"</(strong|b)>", "**", body)
body = re.sub(r"<(em|i)>", "_", body); body = re.sub(r"</(em|i)>", "_", body)
body = re.sub(r"<code[^>]*>", "`", body); body = re.sub(r"</code>", "`", body)
body = re.sub(r"</(p|td|th|tr|li|div|h[1-6]|table|ul|ol|details|summary|blockquote)>", "\n", body)
body = re.sub(r"<(td|th)[^>]*>", " | ", body)
body = re.sub(r"<script.*?</script>", "", body, flags=re.S)
body = re.sub(r"<[^>]+>", "", body)
body = html.unescape(body)
lines = [l.rstrip() for l in body.split("\n")]
out = []
for l in lines:
    if not l.strip():
        continue
    mm = re.match(r"\s*@@PRE(\d+)@@\s*$", l)
    if mm:
        out.append("```\n" + pres[int(mm.group(1))].rstrip("\n") + "\n```")
    else:
        out.append(re.sub(r"\s+", " ", l).strip() if not l.strip().startswith("- ") else l.strip())
print("\n".join(out))
