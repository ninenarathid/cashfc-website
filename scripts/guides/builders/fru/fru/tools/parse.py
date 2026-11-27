"""Tuufless's Notes page (just-the-docs) -> plain text with [[IMG url | alt]] markers, tables as rows.
usage: python3 parse.py <page.html>"""
import sys, re, html
src = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r'<main[^>]*>(.*?)</main>', src, re.S)
body = m.group(1) if m else src
body = re.sub(r'<script.*?</script>', '', body, flags=re.S)
body = re.sub(r'<svg.*?</svg>', '', body, flags=re.S)
def imgrep(m):
    t = m.group(0)
    u = re.search(r'\ssrc="([^"]+)"', t)
    a = re.search(r'alt="([^"]*)"', t)
    return f'\n[[IMG {u.group(1) if u else "?"} | {a.group(1) if a else ""}]]\n'
body = re.sub(r'<img[^>]*>', imgrep, body)
body = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: f'{m.group(2)} <{m.group(1)}>' if m.group(1).startswith('http') and 'tuufless' not in m.group(1) else m.group(2), body, flags=re.S)
body = re.sub(r'<(h[1-6])[^>]*>', lambda m: '\n' + '#' * int(m.group(1)[1]) + ' ', body)
body = re.sub(r'<pre[^>]*>', '\n```\n', body)
body = re.sub(r'</pre>', '\n```\n', body)
body = re.sub(r'<br\s*/?>', '\n', body)
body = re.sub(r'<li[^>]*>', '\n- ', body)
body = re.sub(r'</t[dh]>', ' | ', body)
body = re.sub(r'</(p|tr|li|div|h[1-6]|table|ul|ol|blockquote)>', '\n', body)
body = re.sub(r'<[^>]+>', '', body)
body = html.unescape(body)
out = []
for l in body.split('\n'):
    l = l.rstrip()
    if not l.strip():
        continue
    out.append(l)
print('\n'.join(out))
