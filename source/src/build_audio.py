"""Build every audio clip the app can play.

Words: native recordings from audio-cmn (CC BY-SA). Single-character words use the
syllable recording for the official tone, so polyphones (还, 得, 长 ...) are always right.
Words with no recording, and every sentence, use offline TTS (src/tts.py) fed with
official pinyin plus tone sandhi.

Output: dist/audio/w.bin, dist/audio/s.bin (concatenated mp3s) and audio_index.json
{key: [bundle, offset, length, source]}.
"""
import json, os, sys, subprocess, hashlib, urllib.parse, urllib.request
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(__file__))
import tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, 'data.json'), encoding='utf-8'))
ACMN = '/tmp/hsk/acmn/'
SYL = '/tmp/hsk/acmn/syl/'
CLIPS = '/tmp/hsk/clips/'
os.makedirs(SYL, exist_ok=True); os.makedirs(CLIPS, exist_ok=True)
OUT = os.path.join(ROOT, 'dist', 'audio'); os.makedirs(OUT, exist_ok=True)
PUN = '，。？！、；：'
WBY = {w['h']: w for w in D['words']}


def plain(t):
    return ''.join(c for c in t if c not in PUN and not c.isspace())


def syl_name(s):
    b, t, er = tts.numeric(s)
    return b + str(t) if 1 <= t <= 4 and not er else None


def fetch_syl(name):
    p = SYL + name + '.mp3'
    if not os.path.exists(p) or os.path.getsize(p) < 500:
        u = 'https://raw.githubusercontent.com/hugolpz/audio-cmn/master/64k/syllabs/cmn-' + name + '.mp3'
        try:
            urllib.request.urlretrieve(u, p)
        except Exception:
            return None
    return p if os.path.getsize(p) > 500 else None


def acmn_word(h):
    p = ACMN + h + '.mp3'
    return p if os.path.exists(p) and os.path.getsize(p) > 500 else None


def decode(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy()


def tidy(a, sr=22050):
    """Trim silence, normalise loudness, add short fades and padding."""
    if not len(a): return a
    fr = 256; n = len(a) // fr
    if n < 2: return a
    e = np.sqrt((a[:n * fr].reshape(n, fr) ** 2).mean(1) + 1e-12)
    thr = max(e.max() * 0.03, 1e-4)
    idx = np.where(e > thr)[0]
    s = max(0, idx[0] * fr - int(0.04 * sr)); t = min(len(a), (idx[-1] + 1) * fr + int(0.08 * sr))
    a = a[s:t].astype(np.float64)
    rms = np.sqrt(np.mean(a[np.abs(a) > thr] ** 2)) if np.any(np.abs(a) > thr) else np.sqrt(np.mean(a ** 2))
    a = a * (0.09 / max(rms, 1e-6))
    pk = np.abs(a).max()
    if pk > 0.95: a = a * (0.95 / pk)
    f = int(0.01 * sr); w = np.linspace(0, 1, f)
    a[:f] *= w; a[-f:] *= w[::-1]
    pad = np.zeros(int(0.05 * sr))
    return np.concatenate([pad, a, pad]).astype(np.float32)


def to_mp3(a, key):
    h = hashlib.sha1(a.tobytes()).hexdigest()[:16]
    mp = CLIPS + h + '.mp3'
    if not os.path.exists(mp):
        wav = CLIPS + h + '.wav'; sf.write(wav, a, 22050)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '40k', mp], check=True)
        os.remove(wav)
    return mp


def units_for(tokens):
    out = []
    for t in tokens:
        if t in PUN: out.append(t)
        elif t in WBY: out.append((t, WBY[t]['py']))
        else: raise KeyError(t)
    return out


import sherpa_onnx
_d = '/tmp/hsk/tts/sherpa-onnx-paraformer-zh-small-2024-03-09/'
rec = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=_d + 'model.int8.onnx', tokens=_d + 'tokens.txt', num_threads=4)


def cer(ref, hyp):
    m, n = len(ref), len(hyp); dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev, dp[0] = dp[0], i
        for j in range(1, n + 1):
            cur = dp[j]; dp[j] = min(dp[j] + 1, dp[j - 1] + 1, prev + (ref[i - 1] != hyp[j - 1])); prev = cur
    return dp[n] / max(1, m)


def hear(a):
    s = rec.create_stream(); s.accept_waveform(22050, a); rec.decode_stream(s)
    return plain(s.result.text)


SCORES = {}


def best_tts(units, key, tries=6, ls=1.0):
    """The model samples noise, so takes differ. Keep the take the recogniser understands best."""
    seq0 = tts.phones(units)
    variants = [seq0, [','] + seq0] if len(seq0) <= 4 else [seq0]
    if len(seq0) <= 4: tries = 12
    best = None
    for i in range(tries):
        seq = variants[i % len(variants)]
        a = tts.synth(seq, length_scale=ls)
        hyp = hear(a); e = cer(key, hyp)
        if best is None or e < best[0]: best = (e, a, hyp)
        if e == 0 and i >= 1: break
    SCORES[key] = (round(best[0], 2), best[2], ' '.join(seq0))
    return best[1]


# ---------- collect what needs a clip ----------
jobs = {}  # key -> (bundle, kind, payload)
for w in D['words']:
    jobs[w['h']] = ('w', 'word', w)
for c in D['chars']:
    if c['c'] not in jobs:
        jobs[c['c']] = ('w', 'char', c)
for s in D['sents']:
    jobs.setdefault(plain(''.join(s['w'])), ('s', 'sent', s['w']))
for g in D['grammar']:
    for e in g['ex']:
        jobs.setdefault(plain(''.join(e['w'])), ('s', 'sent', e['w']))
EXTRA = ['你 好 ， 我 是 你 的 汉语 老师 。']
for e in EXTRA:
    toks = e.split(); jobs.setdefault(plain(''.join(toks)), ('s', 'sent', toks))
# tone guide syllables
TONE_SYL = ['mā', 'má', 'mǎ', 'mà', 'mā', 'bā', 'bá', 'bǎ', 'bà', 'shī', 'shí', 'shǐ', 'shì', 'yī', 'yí', 'yǐ', 'yì']
for s in TONE_SYL:
    jobs.setdefault('syl:' + s, ('w', 'syl', s))
jobs.setdefault('syl:ma', ('w', 'tts1', [('吗', ['ma'])]))

print('clips to make:', len(jobs))
index, src_count, problems = {}, {}, []
bundles = {'w': bytearray(), 's': bytearray()}
tts_made = []
for key, (bn, kind, pl) in jobs.items():
    a = None; src = None
    if kind == 'word':
        w = pl
        if len(w['h']) == 1:
            nm = syl_name(w['py'][0]) if len(w['py']) == 1 else None
            p = fetch_syl(nm) if nm else None
            if p: a = decode(p); src = 'syllable'
            elif acmn_word(w['h']): a = decode(acmn_word(w['h'])); src = 'word'
        elif acmn_word(w['h']):
            a = decode(acmn_word(w['h'])); src = 'word'
        if a is None:
            a = best_tts([(w['h'], w['py'])], key); src = 'tts'
    elif kind == 'char':
        nm = syl_name(pl['p'][0]) if pl['p'] else None
        if not nm and pl['p']:
            b0 = tts.numeric(pl['p'][0])[0]; ct = tts.citation(pl['c'], b0)
            if ct: nm = b0 + str(ct)
        p = fetch_syl(nm) if nm else None
        if p: a = decode(p); src = 'syllable'
        elif acmn_word(pl['c']): a = decode(acmn_word(pl['c'])); src = 'word'
        else:
            a = best_tts([(pl['c'], [pl['p'][0]])], key); src = 'tts'
    elif kind == 'syl':
        nm = syl_name(pl); p = fetch_syl(nm)
        if p: a = decode(p); src = 'syllable'
        else: problems.append(key); continue
    elif kind == 'tts1':
        a = tts.synth(tts.phones(pl)); src = 'tts'
    else:
        a = best_tts(units_for(pl), key); src = 'tts'
    a = tidy(a)
    mp = to_mp3(a, key)
    b = open(mp, 'rb').read()
    index[key] = [bn, len(bundles[bn]), len(b), src[0]]
    bundles[bn] += b
    src_count[src] = src_count.get(src, 0) + 1

for bn, buf in bundles.items():
    open(os.path.join(OUT, {'w': 'words.mp3', 's': 'sents.mp3'}[bn]), 'wb').write(buf)
    print(bn, len(buf) // 1024, 'KB')
json.dump(index, open(os.path.join(ROOT, 'audio_index.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('sources:', src_count, 'missing:', problems)

bad = sorted([(v[0], k, v[1], v[2]) for k, v in SCORES.items() if v[0] > 0], reverse=True)
print('TTS clips:', len(SCORES), 'perfectly recognised:', len(SCORES) - len(bad))
for b in bad: print('  ', b)
json.dump(SCORES, open('/tmp/hsk/tts_scores.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
