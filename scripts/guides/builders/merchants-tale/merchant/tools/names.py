"""names.py: English names of game8's Japanese terms, through Name@ja on XIVAPI (Action, Status, BNpcName)."""
import sys, json, urllib.request, urllib.parse
sys.stdout.reconfigure(encoding='utf-8')


def get(params):
    u = 'https://v2.xivapi.com/api/search?' + urllib.parse.urlencode(params)
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})))


def find(sheet, field, ja, exact=True):
    q = f'{field}@ja="{ja}"' if exact else f'{field}@ja~"{ja}"'
    try:
        d = get({'sheets': sheet, 'query': q, 'fields': f'{field},{field}@ja', 'limit': 50})
    except Exception as e:
        return [f'ERR {e}']
    seen = {}
    for r in d['results']:
        f = r['fields']
        k = (f.get(field), f.get(field + '@ja'))
        seen.setdefault(k, []).append(r['row_id'])
    return [f'{en} [{ja2}] ids={ids[:6]}' for (en, ja2), ids in seen.items()]


ACT = """ピアシングプランジ コールファミリア エコードセレナーデ サージングカレント チャーミングオーダー スイムインエア
シースレスカレント クロスカレント サンケントレジャー アクアスピア
天界交差斬・円 天界交差斬・輪 四方凶兆 変転光波 縛鎖凶兆撃 八葉残響 輪転残響 時差剣波 八葉反響 咬撃古狼閃 冥界重光波 剣気解放
光波剛剣舞 灼熱反響 幻影光波・四連 凶兆撃 落石 剣気呪縛
熱波 炎舞 集い火 火の粉 炎の輪 回転幻舞 散り火花 番の火花 炎舞四連・追火 火精の呪い 怒りの炎 焔光 幻影炎舞 幻影生成 輝石 輝石炎舞四連 近間当て 遠間当て""".split()
STA = """水の鎖 水毒 凶兆 焼尽の呪い 爆粉の呪い 蘇生制限 激痛""".split()
NPC = """ダリヤ 人魚ダリヤ ソードマスター ペリ 火精ペリ ハリセンボン コチョコボ カニ カメ タツノオトシゴ""".split()

if __name__ == '__main__':
    which = sys.argv[1:] or ['act', 'sta', 'npc']
    if 'act' in which:
        for j in ACT:
            print('A', j, '=>', '; '.join(find('Action', 'Name', j)) or '-')
    if 'sta' in which:
        for j in STA:
            print('S', j, '=>', '; '.join(find('Status', 'Name', j)) or '-')
    if 'npc' in which:
        for j in NPC:
            print('N', j, '=>', '; '.join(find('BNpcName', 'Singular', j, exact=False))[:600] or '-')
