"""XIVAPI v2 via curl (python's SSL store is missing on this Mac).
usage: python3 xa.py rows <sheet> <a> <b> [fields] | search <sheet> <query> [fields] | get <url-path>"""
import sys, json, subprocess, urllib.parse
def get(url, params=None):
    u = url + ('?' + urllib.parse.urlencode(params) if params else '')
    return json.loads(subprocess.run(['curl', '-s', '-A', 'Mozilla/5.0', u], capture_output=True, text=True).stdout)
def show(rows):
    for r in rows:
        f = r['fields']
        print(r['row_id'], ' | '.join(json.dumps(f[k], ensure_ascii=False) if not isinstance(f[k], str) else f[k] for k in f))
if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'rows':
        sheet, a, b = sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
        fields = sys.argv[5] if len(sys.argv) > 5 else 'Name,Name@ja'
        show(get(f'https://v2.xivapi.com/api/sheet/{sheet}', {'rows': ','.join(str(i) for i in range(a, b)), 'fields': fields})['rows'])
    elif mode == 'search':
        sheet, q = sys.argv[2], sys.argv[3]
        fields = sys.argv[4] if len(sys.argv) > 4 else 'Name,Name@ja'
        show(get('https://v2.xivapi.com/api/search', {'sheets': sheet, 'query': q, 'fields': fields, 'limit': 100})['results'])
