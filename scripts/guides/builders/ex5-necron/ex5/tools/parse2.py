import sys, re, html
sys.stdout.reconfigure(encoding='utf-8')
src = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'<div class="archive-style-wrapper">(.*)', src, re.S)
body = m.group(1) if m else src
for stop in ['<div class="p-archiveComment', 'id="hl_comment', '<footer', '極永遠の闇のタイムライン']:
    i = body.find(stop)
    if i > 0: body = body[:i]
def imgrep(m):
    t = m.group(0)
    u = re.search(r'data-src="([^"]+)"', t)
    if not u or 'img.game8.jp' not in u.group(1): return ''
    a = re.search(r'alt="([^"]*)"', t); w = re.search(r'width="(\d+)"', t); h = re.search(r'height="(\d+)"', t)
    return f'\n[[IMG {u.group(1)} | {a.group(1) if a else ""} | {w.group(1) if w else "?"}x{h.group(1) if h else "?"}]]\n'
body = re.sub(r'<img[^>]*>', imgrep, body)
body = re.sub(r'<(h[2-4])[^>]*>', lambda m: f'\n##{m.group(1)} ', body)
body = re.sub(r'<br\s*/?>', '\n', body)
body = re.sub(r'</(p|td|th|tr|li|div|h[2-4]|table)>', '\n', body)
body = re.sub(r'<script.*?</script>', '', body, flags=re.S)
body = re.sub(r'<[^>]+>', '', body)
body = html.unescape(body)
lines = [l.strip() for l in body.split('\n')]
out = []
for l in lines:
    if not l or l == '拡大': continue
    out.append(l)
print('\n'.join(out))
