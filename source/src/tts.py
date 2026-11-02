"""Offline Mandarin TTS with explicit, checked pronunciation.

Runs the Matcha (baker-zh) acoustic model + Vocos vocoder directly, feeding toned
syllables we control (official HSK pinyin + standard tone sandhi), so polyphones
are never guessed by a lexicon.
"""
import sys, unicodedata
import numpy as np
import onnxruntime as ort

MD = '/tmp/hsk/tts/matcha-icefall-zh-baker/'
VOC = '/tmp/hsk/tts/vocos-22khz-univ.onnx'
SR = 22050

TOK = {}
for line in open(MD + 'tokens.txt', encoding='utf-8'):
    parts = line.rstrip('\n').rsplit(' ', 1)
    if len(parts) == 2:
        TOK[parts[0]] = int(parts[1])
PAD = 1  # "_"
PUNCT = {'，': ',', '。': '.', '！': '!', '？': '?', '、': ',', '：': ':', '；': ','}

_ac = None
_vo = None


def sessions():
    global _ac, _vo
    if _ac is None:
        o = ort.SessionOptions(); o.intra_op_num_threads = 4
        _ac = ort.InferenceSession(MD + 'model-steps-3.onnx', o)
        _vo = ort.InferenceSession(VOC, o)
    return _ac, _vo


TONES = {'ā': ('a', 1), 'á': ('a', 2), 'ǎ': ('a', 3), 'à': ('a', 4), 'ē': ('e', 1), 'é': ('e', 2), 'ě': ('e', 3), 'è': ('e', 4),
         'ī': ('i', 1), 'í': ('i', 2), 'ǐ': ('i', 3), 'ì': ('i', 4), 'ō': ('o', 1), 'ó': ('o', 2), 'ǒ': ('o', 3), 'ò': ('o', 4),
         'ū': ('u', 1), 'ú': ('u', 2), 'ǔ': ('u', 3), 'ù': ('u', 4), 'ǖ': ('v', 1), 'ǘ': ('v', 2), 'ǚ': ('v', 3), 'ǜ': ('v', 4), 'ü': ('v', 0)}


def numeric(syl):
    """'nǚ' -> ('nv', 3); 'de' -> ('de', 5); 'nǎr' -> ('na', 3, erhua)."""
    s = unicodedata.normalize('NFC', syl.strip().lower())
    base, tone = '', 5
    for ch in s:
        if ch in TONES:
            b, t = TONES[ch]; base += b
            if t: tone = t
        elif ch.isalpha():
            base += ch
    er = False
    if base.endswith('r') and base not in ('er',) and base + str(tone) not in TOK and base not in TOK:
        base = base[:-1]; er = True
    # j/q/x/y + u means ü; tokens already spell those as u, so nothing to do
    return base, tone, er


def sandhi(sylls):
    """sylls: list of [base, tone, er, hz] for one phrase. Applies 不/一 and 3-3 sandhi in place."""
    n = len(sylls)
    for i in range(n - 1):
        b, t, er, hz, isnum = sylls[i]  # isnum here means 'sandhi allowed'
        nt = sylls[i + 1][1]
        if hz == '不' and b == 'bu' and t == 4 and nt == 4 and isnum:
            sylls[i][1] = 2
        if hz == '一' and b == 'yi' and t == 1 and isnum:
            sylls[i][1] = 2 if nt == 4 else (4 if nt in (1, 2, 3) else 1)
    i = 0
    while i < n - 1:
        if sylls[i][1] == 3 and sylls[i + 1][1] == 3:
            sylls[i][1] = 2
        i += 1
    return sylls


def ids_for(seq):
    """seq: list of phone strings or punctuation tokens. Returns interspersed ids."""
    out = []
    for p in seq:
        if p not in TOK:
            raise KeyError('no token for %r' % p)
        out.append(TOK[p])
    x = [PAD]
    for t in out:
        x += [t, PAD]
    return x


LEX = {}
BARE = {}
for _line in open(MD + 'lexicon.txt', encoding='utf-8'):
    _p = _line.split()
    if len(_p) >= 2 and _p[0] not in LEX:
        LEX[_p[0]] = _p[1:]
    for _x in _p[1:]:
        if not _x[-1].isdigit():
            BARE[_x] = BARE.get(_x, 0) + 1
NUMCH = '〇一二三四五六七八九十百千万两零第'


def _split(ph):
    return (ph[:-1], int(ph[-1])) if ph[-1].isdigit() else (ph, 5)


def citation(ch, base):
    """Tone the model was trained with for a neutral-tone syllable (the char's own tone)."""
    e = LEX.get(ch)
    if e and len(e) == 1:
        b, t = _split(e[0])
        if b == base and t != 5:
            return t
    return None


def word_phones(hz, sy, sandhi_yi_bu=True, nxt_tone=None, numctx=False):
    """Phones for one word, written the way the model's training lexicon writes them."""
    sylls = []  # [base, tone, ch]
    aligned = len(hz) == len(sy)
    for k, s in enumerate(sy):
        if s.strip() == 'r':
            sylls.append(['er', 2, '儿']); continue
        b, t, er = numeric(s)
        sylls.append([b, t, hz[k] if aligned else ''])
        if er: sylls.append(['er', 2, '儿'])
    # within-word 3-3 sandhi
    for i in range(len(sylls) - 1):
        if sylls[i][1] == 3 and sylls[i + 1][1] == 3:
            sylls[i][1] = 2
    # 一 / 不 before another syllable in the same word
    for i in range(len(sylls) - 1):
        b, t, ch = sylls[i]; nt = sylls[i + 1][1]
        if ch == '一' and t == 1 and not (i == 0 and len(hz) > 1 and hz[1:2] in NUMCH):
            sylls[i][1] = 2 if nt == 4 else 4
        if ch == '不' and t == 4 and nt == 4:
            sylls[i][1] = 2
    # a single 一 / 不 token before the next word
    if len(sylls) == 1 and nxt_tone and not numctx:
        b, t, ch = sylls[0]
        if ch == '一' and t == 1: sylls[0][1] = 2 if nxt_tone == 4 else 4
        if ch == '不' and t == 4 and nxt_tone == 4: sylls[0][1] = 2
    mine = [b + ('' if t == 5 else str(t)) for b, t, ch in sylls]
    # prefer the training lexicon when it agrees with the official reading
    lx = LEX.get(hz)
    if lx and len(lx) == len(sylls) and not (len(sylls) == 1 and nxt_tone):
        ok = True
        for (b, t, ch), lp in zip(sylls, lx):
            lb, lt = _split(lp)
            if lb != b: ok = False; break
            if lt == t: continue
            if t == 5 and BARE.get(b, 0) < 20: continue
            if (t, lt) in ((3, 2), (1, 2), (1, 4), (4, 2)): continue
            ok = False; break
        if ok:
            return list(lx)
    out = []
    for b, t, ch in sylls:
        if t == 5 and BARE.get(b, 0) < 20:
            ct = citation(ch, b) if ch else None
            if ct: t = ct
        p = b + ('' if t == 5 else str(t))
        p = {'shei2': 'shui2'}.get(p, p)  # the phone set has no "shei"; shuí is the accepted variant
        if p not in TOK and b in TOK: p = b
        out.append(p)
    return out


def phones(units, end='.'):
    """units: list of (hanzi_token, [tone-marked syllables]) or punctuation strings."""
    toks = list(units)
    seq = []
    for j, u in enumerate(toks):
        if isinstance(u, str):
            seq.append(PUNCT.get(u, ',')); continue
        hz, sy = u
        nxt = toks[j + 1] if j + 1 < len(toks) and not isinstance(toks[j + 1], str) else None
        prev = toks[j - 1] if j > 0 and not isinstance(toks[j - 1], str) else None
        nt = None
        if nxt:
            s0 = [s for s in nxt[1] if s.strip() != 'r'][0]
            nt = numeric(s0)[1]
        numctx = hz == '一' and ((prev and prev[0][-1] in NUMCH) or (nxt and (nxt[0][0] in NUMCH or nxt[0] in ('月', '号', '日', '年'))))
        seq += word_phones(hz, sy, nxt_tone=nt, numctx=numctx)
    if end and (not seq or seq[-1] not in ('.', '!', '?', ',', ':')):
        seq.append(end)
    return seq


def istft(mag, x, y, n_fft=1024, hop=256):
    spec = mag * (x + 1j * y)  # (freq, frames)
    frames = np.fft.irfft(spec.T, n=n_fft, axis=1)
    win = np.hanning(n_fft + 1)[:-1].astype(np.float64)
    nfr = frames.shape[0]
    L = n_fft + hop * (nfr - 1)
    out = np.zeros(L); env = np.zeros(L)
    for i in range(nfr):
        s = i * hop
        out[s:s + n_fft] += frames[i] * win
        env[s:s + n_fft] += win * win
    env[env < 1e-8] = 1
    out = out / env
    pad = n_fft // 2
    return out[pad:L - pad]


def synth(seq, length_scale=1.05, noise_scale=0.6, seed=7):
    ac, vo = sessions()
    x = np.array([ids_for(seq)], dtype=np.int64)
    mel = ac.run(None, {'x': x, 'x_length': np.array([x.shape[1]], dtype=np.int64),
                        'noise_scale': np.array([noise_scale], dtype=np.float32),
                        'length_scale': np.array([length_scale], dtype=np.float32)})[0]
    mag, xx, yy = vo.run(None, {'mels': mel.astype(np.float32)})
    a = istft(mag[0], xx[0], yy[0])
    return a.astype(np.float32)


if __name__ == '__main__':
    import soundfile as sf
    seq = phones([('你', ['nǐ']), ('好', ['hǎo']), '！', ('我', ['wǒ']), ('很', ['hěn']), ('好', ['hǎo']), '。'])
    print(seq)
    a = synth(seq)
    print(len(a) / SR, float(np.abs(a).max()))
    sf.write(sys.argv[1] if len(sys.argv) > 1 else '/tmp/hsk/tts/test.wav', a, SR)
