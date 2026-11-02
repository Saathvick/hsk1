import json, os
v = json.load(open('vocab_raw.json', encoding='utf-8'))
chars = sorted(set(c for w in v for c in w['h'] if '一' <= c <= '鿿'))
base = '/tmp/hsk/npm/node_modules/hanzi-writer-data/'
out, missing = {}, []
for c in chars:
    p = base + c + '.json'
    if os.path.exists(p):
        d = json.load(open(p, encoding='utf-8'))
        out[c] = {'s': d['strokes'], 'm': [[[round(x) for x in pt] for pt in st] for st in d['medians']]}
    else: missing.append(c)
json.dump(out, open('strokes.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(chars), 'chars', len(out), 'with data; missing:', missing, 'size KB', os.path.getsize('strokes.json')//1024)
