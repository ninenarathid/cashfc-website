"""Tuufless's Notes page (just-the-docs) to plain text, pictures as [[IMG url | alt]].
usage: python3 parse.py <page.html>"""
import sys, re, html
src = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r'<main[^>]*>(.*)</main>', src, re.S)
body = m.group(1) if m else src
body = re.sub(r'<script.*?</script>', '', body, flags=re.S)
body = re.sub(r'<svg.*?</svg>', '', body, flags=re.S)
def img(m):
    t = m.group(0)
    u = re.search(r'src="([^"]+)"', t)
    a = re.search(r'alt="([^"]*)"', t)
    url = u.group(1) if u else "?"
    if url.startswith("/"): url = "https://ffxiv.tuufless.com" + url
    return f'\n[[IMG {url} | {a.group(1) if a else ""}]]\n'
body = re.sub(r'<img[^>]*>', img, body)
def link(m):
    href = re.search(r'href="([^"]+)"', m.group(1))
    return f'{m.group(2)} <{href.group(1) if href else ""}>'
body = re.sub(r'<a([^>]*)>(.*?)</a>', link, body, flags=re.S)
body = re.sub(r'<(h[1-6])[^>]*>', lambda m: f'\n#{m.group(1)} ', body)
body = re.sub(r'<li[^>]*>', '\n- ', body)
body = re.sub(r'<(pre|code)[^>]*>', '\n```', body)
body = re.sub(r'</(pre)>', '```\n', body)
body = re.sub(r'<br\s*/?>', '\n', body)
body = re.sub(r'<t[dh][^>]*>', ' | ', body)
body = re.sub(r'</(p|tr|div|h[1-6]|table|ul|ol|blockquote)>', '\n', body)
body = re.sub(r'<[^>]+>', '', body)
body = html.unescape(body)
out = []
for l in body.split('\n'):
    l = l.rstrip()
    if not l.strip(): continue
    out.append(l)
print('\n'.join(out))
