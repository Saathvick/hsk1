import json, re, sys, csv, unicodedata, collections
sys.path.insert(0, 'src')
from gloss import GLOSS
from sentences import SENTENCES
from grammar import LESSONS, OFFICIAL_EN
from pypinyin import lazy_pinyin, Style

raw = json.load(open('vocab_raw.json', encoding='utf-8'))
strokes = json.load(open('strokes.json', encoding='utf-8'))
TONES = {'ā':1,'á':2,'ǎ':3,'à':4,'ē':1,'é':2,'ě':3,'è':4,'ī':1,'í':2,'ǐ':3,'ì':4,'ō':1,'ó':2,'ǒ':3,'ò':4,'ū':1,'ú':2,'ǔ':3,'ù':4,'ǖ':1,'ǘ':2,'ǚ':3,'ǜ':4}
def plain(s):
    s = s.lower().replace('ü', 'v')
    for a in 'ǖǘǚǜ': s = s.replace(a, 'v')
    s = unicodedata.normalize('NFD', s)
    return ''.join(c for c in s if not unicodedata.combining(c))
def tone_of(syl):
    for c in syl:
        if c in TONES: return TONES[c]
    return 0

def split_syll(word, pin):
    """split official pinyin into one syllable per character"""
    clean = pin.replace(' ', '').replace("'", '').replace('-', '')
    chars = [c for c in word]
    base = lazy_pinyin(word, style=Style.NORMAL, v_to_u=False)
    out, i = [], 0
    for ch, b in zip(chars, base):
        if ch == '儿' and clean[i:].lower().startswith('r') and plain(clean[i:]) == 'r':
            out.append('r'); i += 1; continue
        n = len(b)
        seg = clean[i:i+n]
        if plain(seg) != b:
            return None
        out.append(seg); i += n
    if i != len(clean): return None
    return out

BADM = re.compile(r'^(surname|variant of|old variant|abbr\.|erhua variant|Taiwan pr|see |also pr|used in|\(literary\)|CL:|\(archaic\))', re.I)
POSMAP = {'N':'noun','V':'verb','Adj':'adjective','Adv':'adverb','Pron':'pronoun','Pr':'pronoun','Num':'numeral','M':'measure word','Prep':'preposition','Conj':'conjunction','Aux':'particle','Suffix':'suffix','Prefix':'prefix'}

words = []
bad_syll = []
for i, w in enumerate(raw):
    h = w['h']
    py = split_syll(h, w['p'])
    if py is None:
        bad_syll.append((h, w['p'])); py = [w['p']] if len(h) == 1 else None
    pos = [POSMAP.get(x, x) for x in w['pos'].split('/') if x] if w['pos'] else []
    ms = [m for m in w['m'] if m and not BADM.search(m) and len(m) < 110][:3]
    words.append({'id': i, 'h': h, 't': w['t'], 'p': w['p'], 'py': py, 'pos': pos, 'g': GLOSS[h], 'm': ms, 'r': w['r'], 'c': w['c']})
print('syllable split failures:', bad_syll)
byh = {w['h']: w for w in words}

# lessons of 20 words by frequency order (already sorted)
for w in words: w['l'] = w['id'] // 20 + 1

def next_tone(tokens, k):
    for t in tokens[k+1:]:
        if t in byh: return tone_of(byh[t]['p'])
        if t in '，。？！': return None
    return None

def tok_py(tokens):
    out = []
    for k, t in enumerate(tokens):
        if t not in byh: out.append(''); continue
        p = byh[t]['p']
        nt = next_tone(tokens, k)
        if t == '不' and nt == 4: p = 'bú'
        if t == '一' and nt is not None:
            if nt == 4: p = 'yí'
            elif nt in (1, 2, 3): p = 'yì'
        out.append(p)
    return out

sents = []
for i, (topic, zh, en) in enumerate(SENTENCES):
    toks = zh.split()
    sents.append({'id': i, 'topic': topic, 'w': toks, 'py': tok_py(toks), 'en': en})

gram = []
for L in LESSONS:
    ex = []
    for zh, en in L['examples']:
        toks = zh.split()
        ex.append({'w': toks, 'py': tok_py(toks), 'en': en})
    g = {k: L[k] for k in ('id', 'title', 'cn', 'rule', 'body', 'patterns', 'tips', 'official')}
    g['ex'] = ex
    gram.append(g)

rows = [r for r in csv.DictReader(open('/tmp/hsk/grammar.csv', encoding='utf-8')) if r['Level'] == '1']
official = []
for r in rows:
    n = int(r['No'])
    cn = ' / '.join(x.strip() for x in [r['Category'], r['Details'], r['Content']] if x.strip())
    cn = re.sub(r'\s+', ' ', cn)
    official.append({'n': n, 'group': r['Group'], 'cn': cn, 'en': OFFICIAL_EN[n], 'lessons': [L['id'] for L in LESSONS if n in L['official']]})

# characters
chars = {}
for w in words:
    if w['py'] is None: continue
    for c, p in zip(w['h'], w['py']):
        if c in strokes:
            d = chars.setdefault(c, {'c': c, 'p': [], 'w': [], 'r': ''})
            if p not in d['p'] and p != 'r': d['p'].append(p)
            d['w'].append(w['id'])
            if len(w['h']) == 1: d['r'] = w['r']
# single-character words give canonical pinyin first
for w in words:
    if len(w['h']) == 1 and w['h'] in chars:
        d = chars[w['h']]
        if w['p'] in d['p']: d['p'].remove(w['p'])
        d['p'].insert(0, w['p'])
        d['g'] = w['g']
charlist = sorted(chars.values(), key=lambda d: (d['w'][0]))
for j, d in enumerate(charlist): d['id'] = j

data = {'words': words, 'sents': sents, 'grammar': gram, 'official': official, 'chars': charlist}
json.dump(data, open('data.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
import os
print('words', len(words), 'sents', len(sents), 'lessons', len(gram), 'official', len(official), 'chars', len(charlist), 'data KB', os.path.getsize('data.json')//1024)
print('chars without a single-char word gloss:', sum(1 for d in charlist if 'g' not in d))
