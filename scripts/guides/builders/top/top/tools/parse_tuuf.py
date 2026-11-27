"""Tuufless's Notes page (just-the-docs) -> plain text with [[IMG url | alt]] markers.
usage: python3 parse_tuuf.py <page.html>"""
import sys, re, html
src = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r'<main[^>]*>(.*?)</main>', src, re.S)
body = m.group(1) if m else src
def imgrep(m):
    t = m.group(0)
    u = re.search(r'src="([^"]+)"', t)
    if not u: return ''
    a = re.search(r'alt="([^"]*)"', t)
    url = u.group(1)
    if url.startswith('/'): url = 'https://ffxiv.tuufless.com' + url
    return f'\n[[IMG {url} | {a.group(1) if a else ""}]]\n'
body = re.sub(r'<img[^>]*>', imgrep, body)
body = re.sub(r'<pre[^>]*>(.*?)</pre>', lambda m: '\n<<<PRE\n' + m.group(1) + '\nPRE>>>\n', body, flags=re.S)
body = re.sub(r'<(h[1-6])[^>]*>', lambda m: f'\n#{m.group(1)} ', body)
body = re.sub(r'<li[^>]*>', '\n- ', body)
body = re.sub(r'<br\s*/?>', '\n', body)
body = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: f'{m.group(2)} <{m.group(1)}>', body, flags=re.S)
body = re.sub(r'</(p|td|th|tr|li|div|h[1-6]|table|ul|ol|blockquote)>', '\n', body)
body = re.sub(r'<(td|th)[^>]*>', ' | ', body)
body = re.sub(r'<script.*?</script>', '', body, flags=re.S)
body = re.sub(r'<svg.*?</svg>', '', body, flags=re.S)
body = re.sub(r'<[^>]+>', '', body)
body = html.unescape(body)
lines = [l.rstrip() for l in body.split('\n')]
out = []
for l in lines:
    if not l.strip(): continue
    out.append(l.strip() if not l.startswith(' ') else l.rstrip())
print('\n'.join(out))
