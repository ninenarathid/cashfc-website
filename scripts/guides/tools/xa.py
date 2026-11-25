# xa.py rows <Sheet> <from> <to> [fields] | search <Sheet> <query> [fields]: XIVAPI v2, for names by Name@ja.
import sys, json, urllib.request, urllib.parse
sys.stdout.reconfigure(encoding='utf-8')
def get(url, params):
    u = url + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    return json.load(urllib.request.urlopen(req))
if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'rows':
        sheet, a, b = sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
        fields = sys.argv[5] if len(sys.argv) > 5 else 'Name,Name@ja'
        ids = ','.join(str(i) for i in range(a, b))
        d = get(f'https://v2.xivapi.com/api/sheet/{sheet}', {'rows': ids, 'fields': fields})
        for r in d['rows']:
            f = r['fields']
            print(r['row_id'], ' | '.join(json.dumps(f[k], ensure_ascii=False) if not isinstance(f[k], str) else f[k] for k in f))
    elif mode == 'search':
        sheet, q = sys.argv[2], sys.argv[3]
        fields = sys.argv[4] if len(sys.argv) > 4 else 'Name,Name@ja'
        d = get('https://v2.xivapi.com/api/search', {'sheets': sheet, 'query': q, 'fields': fields, 'limit': 100})
        for r in d['results']:
            f = r['fields']
            print(r['row_id'], ' | '.join(json.dumps(f[k], ensure_ascii=False) if not isinstance(f[k], str) else f[k] for k in f))
