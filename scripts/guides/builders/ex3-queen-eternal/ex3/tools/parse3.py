import sys, re
from html.parser import HTMLParser
sys.stdout.reconfigure(encoding='utf-8')
src = open(sys.argv[1], encoding='utf-8').read()
start = src.find(sys.argv[2])
end = src.find(sys.argv[3], start+10)
src = src[start-200:end]
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.out=[]; s.buf=''
    def flush(s):
        t=re.sub(r'[ \t　]+',' ',s.buf).strip()
        if t: s.out.append(t)
        s.buf=''
    def handle_starttag(s,tag,attrs):
        a=dict(attrs)
        if tag in ('h2','h3','h4','p','li','tr','td','th','div','br','table','pre'): s.flush()
        if tag in ('h2','h3','h4'): s.buf='##'+tag+' '
        if tag=='td': s.out.append('<td>')
        if tag=='img' and 'data-src' in a and 'img.game8.jp' in a['data-src']:
            s.flush()
            s.out.append(f"IMG {a['data-src']} [{a.get('alt','')}] {a.get('width','?')}x{a.get('height','?')}")
    def handle_endtag(s,tag):
        if tag in ('h2','h3','h4','p','li','tr','td','th','div','table','pre'): s.flush()
    def handle_data(s,d): s.buf+=d
p=P(); p.feed(src); p.flush()
print('\n'.join(x for x in p.out if x!='拡大'))
