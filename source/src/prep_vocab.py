import json, re, csv, collections, unicodedata
dk = json.load(open('/tmp/hsk/l1.json', encoding='utf-8'))
by_s = collections.defaultdict(list)
for e in dk: by_s[e['simplified']].append(e)
def norm_num(s): return re.sub(r'\s+', '', s.lower().replace('u:', 'v').replace('ü','v'))
def strip_tone(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z]', '', s.replace('ü','v'))
def clean(m):
    m = re.sub(r'\((Tw|Taiwan|dialect|coll\.|literary|slang|old|Cantonese)[^)]*\)', '', m)
    return re.sub(r'\s+', ' ', m).strip(' ;')
rows = [r for r in csv.DictReader(open('/tmp/hsk/hsk30.csv', encoding='utf-8')) if r['Level']=='1']
items = []
for r in rows:
    vs = json.loads(r['Variants']) if r['Variants'] else [{'Simplified': r['Simplified'], 'Pinyin': r['Pinyin'], 'POS': r['POS'], 'Traditional': r['Traditional'], 'CEDICT': r['CEDICT']}]
    for v in vs:
        items.append((r['ID'], v))
out, problems = [], []
seen = set()
for id_, v in items:
    s = v['Simplified']
    if s in seen: continue
    seen.add(s)
    cands = by_s.get(s, [])
    forms = [f for e in cands for f in e['forms']]
    m = re.search(r'\[([^\]]+)\]', v.get('CEDICT', '') or '')
    want = norm_num(m.group(1)) if m else None
    pick = None
    for f in forms:
        if want and norm_num(f['transcriptions']['numeric']) == want: pick = f; break
    if not pick:
        for f in forms:
            if strip_tone(f['transcriptions']['pinyin']) == strip_tone(v['Pinyin']): pick = f; break
    if not pick and forms: pick = forms[0]; problems.append((s, 'fallback first form', v['Pinyin']))
    if not forms: problems.append((s, 'NOT IN dk', v['Pinyin']))
    freq = cands[0]['frequency'] if cands else 99999
    out.append({'h': s, 't': v['Traditional'], 'p': v['Pinyin'], 'pos': v['POS'], 'f': freq,
                'r': cands[0]['radical'] if cands else '',
                'm': [clean(x) for x in pick['meanings']][:5] if pick else [],
                'c': (pick or {}).get('classifiers', [])[:3] if pick else []})
out.sort(key=lambda w: (w['f'], w['h']))
for i, w in enumerate(out): w['id'] = i
json.dump(out, open('vocab_raw.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(len(out), 'words;', len(problems), 'problems')
for p in problems: print(p)
print(len(set(''.join(w['h'] for w in out))), 'unique hanzi')
