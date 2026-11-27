"""parsek.py <kanatan.html>: the article body as text, with [[IMG url]] where its pictures are."""
import sys, re, html
src = open(sys.argv[1], encoding="utf-8").read()
i = src.find('<div class="article-body-inner">')
body = src[i:]
for stop in ['<div class="article-option', '<div class="related-articles', 'id="comments"', '<div class="article-footer']:
    j = body.find(stop)
    if j > 0: body = body[:j]
def imgrep(m):
    t = m.group(0)
    u = re.search(r'src="([^"]+)"', t)
    return f'\n[[IMG {u.group(1) if u else "?"}]]\n'
def arep(m):
    h = m.group(1)
    if re.search(r'\.(jpe?g|png|gif|webp)', h, re.I) and 'livedoor' in h:
        return f'\n[[A {h}]]'
    return f'[[LINK {h}]]'
body = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>', arep, body)
body = re.sub(r'<img[^>]*>', imgrep, body)
body = re.sub(r'<iframe[^>]*src="([^"]+)"[^>]*>', lambda m: f'\n[[IFRAME {m.group(1)}]]\n', body)
body = re.sub(r'<(h[1-5])[^>]*>', lambda m: f'\n##{m.group(1)} ', body)
body = re.sub(r'<br\s*/?>', '\n', body)
body = re.sub(r'</(p|td|th|tr|li|div|h[1-5]|table|blockquote)>', '\n', body)
body = re.sub(r'<script.*?</script>', '', body, flags=re.S)
body = re.sub(r'<[^>]+>', '', body)
body = html.unescape(body)
out = [l.strip() for l in body.split('\n')]
out = [l for l in out if l]
print('\n'.join(out))
