"""xq.py search <Sheet> <query> [fields] | sheet <Sheet> <id> [fields]: XIVAPI v2 via curl (Mac Python lacks certs)."""
import sys, json, subprocess, urllib.parse
def get(url, params):
    u = url + '?' + urllib.parse.urlencode(params)
    return json.loads(subprocess.run(["curl", "-s", "-A", "Mozilla/5.0", u], capture_output=True, text=True).stdout)
mode = sys.argv[1]
if mode == 'search':
    sheet, q = sys.argv[2], sys.argv[3]
    fields = sys.argv[4] if len(sys.argv) > 4 else 'Name,Name@ja'
    d = get('https://v2.xivapi.com/api/search', {'sheets': sheet, 'query': q, 'fields': fields, 'limit': 100})
    for r in d.get('results', []): print(r['row_id'], json.dumps(r['fields'], ensure_ascii=False))
    if 'results' not in d: print(d)
else:
    sheet, i = sys.argv[2], sys.argv[3]
    fields = sys.argv[4] if len(sys.argv) > 4 else None
    p = {'fields': fields} if fields else {}
    print(json.dumps(get(f'https://v2.xivapi.com/api/sheet/{sheet}/{i}', p), ensure_ascii=False)[:4000])
