(function () {
'use strict';
var W = D.words, SN = D.sents, GR = D.grammar, OF = D.official, CHL = D.chars;
var WBY = {}; W.forEach(function (w) { WBY[w.h] = w; });
var CHBY = {}; CHL.forEach(function (c) { CHBY[c.c] = c; });
var PUNCT = '，。？！、；：';
function isP(t) { return PUNCT.indexOf(t) >= 0; }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function $(s, r) { return (r || document).querySelector(s); }
function rnd(n) { return Math.floor(Math.random() * n); }
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function sample(a, n) { return shuffle(a).slice(0, n); }
function strip(s) { s = String(s).toLowerCase().replace(/[üǖǘǚǜ]/g, 'v').normalize('NFD'); return s.replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, ''); }
function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function now() { return Date.now(); }
function plain(t) { return t.replace(/[\s，。？！、；：]/g, ''); }

/* ---------- pinyin and tones ---------- */
var TM = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', v: 'ǖǘǚǜ' };
function toneOf(s) { s = String(s).normalize('NFC'); for (var k in TM) for (var i = 0; i < 4; i++) if (s.indexOf(TM[k][i]) >= 0) return i + 1; return 5; }
function baseOf(s) {
  return String(s).normalize('NFC').toLowerCase().split('').map(function (ch) {
    for (var k in TM) { if (TM[k].indexOf(ch) >= 0) return k === 'v' ? 'ü' : k; } return ch;
  }).join('');
}
function markTone(b, t) {
  if (!t || t === 5) return b;
  var idx = -1;
  if (b.indexOf('a') >= 0) idx = b.indexOf('a'); else if (b.indexOf('e') >= 0) idx = b.indexOf('e'); else if (b.indexOf('ou') >= 0) idx = b.indexOf('o');
  else for (var i = b.length - 1; i >= 0; i--) if ('iouü'.indexOf(b[i]) >= 0) { idx = i; break; }
  if (idx < 0) return b;
  var v = b[idx] === 'ü' ? 'v' : b[idx];
  return b.slice(0, idx) + TM[v][t - 1] + b.slice(idx + 1);
}
/* colour each syllable of a pinyin string by tone; sylls is the word's syllable list */
function pyHTML(p, sylls) {
  p = String(p || ''); if (!sylls || !sylls.length) return esc(p);
  var out = '', cur = 0, low = p.toLowerCase().normalize('NFC');
  sylls.forEach(function (s) {
    var sl = String(s).toLowerCase().normalize('NFC'); if (!sl) return;
    var at = low.indexOf(sl, cur); if (at < 0) return;
    out += esc(p.slice(cur, at));
    out += sl === 'r' ? esc(p.slice(at, at + 1)) : '<span class="t' + toneOf(s) + '">' + esc(p.slice(at, at + sl.length)) + '</span>';
    cur = at + sl.length;
  });
  return out + esc(p.slice(cur));
}
function wpy(w) { return '<span class="pyc">' + pyHTML(w.p, w.py) + '</span>'; }
function tokPy(t, fallback) { var w = WBY[t]; return w ? pyHTML(w.p.replace(/\s+/g, ''), w.py) : esc(fallback || ''); }

/* ---------- icons ---------- */
var IC = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  words: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5"/><path d="M9 8h6"/></svg>',
  practice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="M14 17h6M17 14v6"/></svg>',
  grammar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h16"/></svg>',
  spk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7"/><path d="M19 6a8.5 8.5 0 010 12"/></svg>',
  spkoff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>'
};
function spk(text, cls) { return '<button class="iconbtn ' + (cls || '') + '" data-audio data-act="say" data-t="' + esc(text) + '" aria-label="Play audio" title="Play audio">' + IC.spk + '</button>'; }
function spks(text) { return '<span class="row" style="gap:6px;display:inline-flex">' + spk(text) + '<button class="btn sm slowbtn" data-audio data-act="say" data-slow="1" data-t="' + esc(text) + '" title="Play slowly">Slow</button></span>'; }

/* ---------- saved progress ---------- */
var KEY = 'hsk1.trainer.v1';
function DEF() { return { v: 2, ts: 0, srs: {}, stats: { ans: 0, ok: 0, days: {} }, set: { tts: true, rate: 1, auto: true, diff: 'hard', n: 10, scope: 'due', tc: true, learnN: 5, hideWelcome: false }, gram: {} }; }
var P = DEF();
function adopt(o) {
  var d = DEF(); P = Object.assign(d, o || {}); P.set = Object.assign(DEF().set, (o && o.set) || {});
  P.stats = Object.assign(DEF().stats, (o && o.stats) || {}); P.srs = P.srs || {}; P.gram = P.gram || {};
  if (!o || !o.v || o.v < 2) { if (P.set.rate === 0.85) P.set.rate = 1; P.v = 2; } // old default speed was tuned for the browser voice
}
function loadLocal() { try { var s = localStorage.getItem(KEY); if (s) adopt(JSON.parse(s)); } catch (e) { } }
var dbDoc = null, saveT = null, saving = false, dirty = false, dbState = 'off';
function save() {
  P.ts = now();
  try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { }
  dirty = true; clearTimeout(saveT); saveT = setTimeout(flush, 1500);
}
function flush() {
  if (!dbDoc || !dirty) return;
  if (saving) { saveT = setTimeout(flush, 1500); return; }
  saving = true; dirty = false;
  dbDoc.set({ blob: JSON.stringify(P), ts: P.ts }).then(function () { dbState = 'synced'; }, function () { dbState = 'error'; }).then(function () { saving = false; if (dirty) saveT = setTimeout(flush, 1500); });
}
function initDb() {
  try {
    if (!window.claude || !window.claude.use) return;
    Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function (r) {
      var db = r[0], user = r[1]; if (!db || !user) return null;
      return user.id().then(function (id) {
        if (!id) return null;
        dbDoc = db.doc('data/users/' + id + '/progress'); dbState = 'ready';
        return dbDoc.get().then(function (snap) {
          if (snap.exists) {
            var rm = snap.data();
            if (rm && rm.blob && rm.ts > P.ts) { adopt(JSON.parse(rm.blob)); try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { } dbState = 'synced'; if (!S) render(); }
            else if (P.ts > (rm && rm.ts || 0)) { dirty = true; flush(); }
          } else if (P.ts) { dirty = true; flush(); }
        });
      });
    }).catch(function () { dbState = 'off'; });
  } catch (e) { }
}

/* ---------- audio ----------
   Every word, character and sentence has a recorded clip (native speakers for words,
   offline neural voice for sentences). Clips live in two mp3 bundles next to the page and
   are sliced out by byte range. The browser's own speech engine is only a last resort,
   because many devices have no Chinese voice and stay silent without any error. */
var AIDX = (typeof AUDIO_INDEX !== 'undefined' && AUDIO_INDEX) || {};
var BUNDLE_FILE = { w: 'audio/words.mp3', s: 'audio/sents.mp3' };
var BUF = {}, BUFP = {}, CLIPURL = {}, audioState = 'loading', audioErr = '';
function loadBundle(n) {
  if (BUFP[n]) return BUFP[n];
  if (typeof fetch !== 'function') { audioState = 'failed'; audioErr = 'no fetch'; return Promise.reject(new Error('no fetch')); }
  BUFP[n] = fetch(BUNDLE_FILE[n]).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
    .then(function (b) { BUF[n] = b; if (BUF.w && BUF.s) audioState = 'ready'; return b; })
    .catch(function (e) { audioState = 'failed'; audioErr = String(e && e.message || e); BUFP[n] = null; throw e; });
  return BUFP[n];
}
function preloadAudio() { if (!Object.keys(AIDX).length) { audioState = 'none'; return; } loadBundle('w').then(function () { return loadBundle('s'); }).catch(function () { }); }
function clipKey(t) { t = String(t); return t.indexOf('syl:') === 0 ? t : plain(t); }
function clipUrlNow(key) {
  if (CLIPURL[key]) return CLIPURL[key];
  var e = AIDX[key]; if (!e || !BUF[e[0]]) return null;
  CLIPURL[key] = URL.createObjectURL(new Blob([BUF[e[0]].slice(e[1], e[1] + e[2])], { type: 'audio/mpeg' }));
  return CLIPURL[key];
}
var player = (typeof Audio !== 'undefined') ? new Audio() : null, playTok = 0, unlocked = false;
if (player) player.preload = 'auto';
function playUrl(u, slow, onFail) {
  try {
    player.pause(); player.src = u;
    var r = Math.max(0.5, Math.min(1.5, (P.set.rate || 1) * (slow ? 0.7 : 1)));
    player.defaultPlaybackRate = r; player.playbackRate = r;
    try { player.preservesPitch = true; } catch (e) { }
    var pr = player.play();
    if (pr && pr.catch) pr.catch(function (err) { if (err && err.name !== 'AbortError' && onFail) onFail(err); });
  } catch (e) { if (onFail) onFail(e); }
}
function unlockAudio() {
  // Some browsers only allow sound after a tap; prime the player on the first tap.
  if (unlocked || !player) return; unlocked = true;
  try { player.muted = true; player.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; var p = player.play(); if (p && p.then) p.then(function () { player.pause(); player.muted = false; }, function () { player.muted = false; }); else player.muted = false; } catch (e) { player.muted = false; }
}
/* the browser speech engine, with the usual workarounds */
var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
var voice = null, lastUtt = null;
function pickVoice() {
  if (!synth) return; var vs = synth.getVoices() || [];
  voice = vs.filter(function (v) { return /^zh[-_]CN/i.test(v.lang) || /cmn/i.test(v.lang); })[0] || vs.filter(function (v) { return /^zh/i.test(v.lang); })[0] || null;
}
if (synth) { pickVoice(); try { synth.addEventListener('voiceschanged', pickVoice); } catch (e) { synth.onvoiceschanged = pickVoice; } }
function webSpeak(t, slow) {
  if (!synth) { toast('No audio for this item on this device.'); return; }
  try {
    synth.cancel(); if (synth.paused) synth.resume();
    var text = t.indexOf('syl:') === 0 ? t.slice(4) : plain(t);
    setTimeout(function () {
      var u = new SpeechSynthesisUtterance(text); u.lang = 'zh-CN'; u.rate = (P.set.rate || 1) * (slow ? 0.7 : 0.9); if (voice) u.voice = voice;
      lastUtt = u; synth.speak(u);
    }, 60);
  } catch (e) { }
}
function ttsOn() { return !!P.set.tts; }
function speak(t, slow) {
  if (!ttsOn() || !t) return;
  t = String(t); var key = clipKey(t), tok = ++playTok;
  if (synth) { try { synth.cancel(); } catch (e) { } }
  var e = AIDX[key];
  if (e && player) {
    var u = clipUrlNow(key);
    if (u) { playUrl(u, slow, function () { webSpeak(t, slow); }); return; }
    loadBundle(e[0]).then(function () { if (tok !== playTok) return; var u2 = clipUrlNow(key); if (u2) playUrl(u2, slow, function () { webSpeak(t, slow); }); else webSpeak(t, slow); }, function () { if (tok === playTok) webSpeak(t, slow); });
    return;
  }
  webSpeak(t, slow);
}
function stopAudio() { playTok++; try { if (player) player.pause(); } catch (e) { } try { if (synth) synth.cancel(); } catch (e) { } }
function applyAudio() {
  document.body.classList.toggle('noaudio', !ttsOn());
  document.body.classList.toggle('notone', !P.set.tc);
  var sw = $('#ttsSwitch'); if (sw) { sw.setAttribute('aria-checked', P.set.tts ? 'true' : 'false'); sw.querySelector('.ic').innerHTML = P.set.tts ? IC.spk : IC.spkoff; }
}

/* ---------- spaced repetition ---------- */
var INTV = [0, 1, 2, 4, 8, 16];
function status(id) { var r = P.srs[id]; if (!r || !r.s) return 'new'; return r.b >= 3 ? 'known' : 'learning'; }
function isDue(id) { var r = P.srs[id]; return !!(r && r.s && r.d <= now()); }
function isWeak(id) { var r = P.srs[id]; return !!(r && r.s && r.m > 0 && r.b < 3); }
function tally(ok) {
  var st = P.stats, t = today(); st.ans++; if (ok) st.ok++;
  st.days[t] = (st.days[t] || 0) + 1;
  var ks = Object.keys(st.days).sort(); while (ks.length > 120) delete st.days[ks.shift()];
}
function grade(id, ok) {
  var r = P.srs[id] || (P.srs[id] = { b: 0, d: 0, s: 0, m: 0, c: 0 });
  r.s++;
  if (ok) { r.c++; r.b = Math.min(5, r.b + 1); } else { r.m++; r.b = Math.max(0, r.b - 2); }
  r.d = now() + (r.b === 0 ? 10 * 60000 : INTV[r.b] * 86400000);
  tally(ok); save();
}
function streak() {
  var d = new Date(), n = 0, days = P.stats.days;
  function key(x) { return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
  if (!days[key(d)]) d.setDate(d.getDate() - 1);
  while (days[key(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function counts() {
  var c = { new: 0, learning: 0, known: 0, due: 0 };
  W.forEach(function (w) { c[status(w.id)]++; if (isDue(w.id)) c.due++; });
  return c;
}

/* ---------- picking material ---------- */
function inScope(w, sc) {
  if (sc === 'all' || sc === 'due') return true;
  if (sc === 'weak') return isWeak(w.id);
  if (sc === 'seen') return status(w.id) !== 'new';
  if (sc === 'new') return status(w.id) === 'new';
  if (sc.charAt(0) === 'L') return w.l === +sc.slice(1);
  return true;
}
function pickWords(n, sc, filt) {
  var pool = W.filter(function (w) { return (!filt || filt(w)) && inScope(w, sc); });
  if (sc === 'due') {
    var due = pool.filter(function (w) { return isDue(w.id); }).sort(function (a, b) { return P.srs[a.id].d - P.srs[b.id].d; });
    var fresh = pool.filter(function (w) { return status(w.id) === 'new'; });
    var rest = pool.filter(function (w) { return !isDue(w.id) && status(w.id) !== 'new'; }).sort(function (a, b) { return P.srs[a.id].d - P.srs[b.id].d; });
    return due.concat(fresh, rest).slice(0, n);
  }
  return sample(pool, n);
}
function sentPool(sc) {
  var all = SN.map(function (s) { return s; });
  if (sc === 'all' || !sc) return all;
  if (sc.indexOf('T:') === 0) return all.filter(function (s) { return s.topic === sc.slice(2); });
  if (sc.indexOf('G:') === 0) { var g = GR.filter(function (x) { return x.id === sc.slice(2); })[0]; return g ? g.ex.map(function (e) { return { w: e.w, py: e.py, en: e.en, topic: g.title }; }) : all; }
  return all;
}
function examplesFor(h) {
  var out = SN.filter(function (s) { return s.w.indexOf(h) >= 0; });
  GR.forEach(function (g) { g.ex.forEach(function (e) { if (e.w.indexOf(h) >= 0 && !out.some(function (o) { return o.en === e.en; })) out.push(e); }); });
  return out;
}
function sxHTML(toks, pys, noTap) {
  return '<div class="sx">' + toks.map(function (t, i) {
    if (isP(t)) return '<b>' + esc(t) + '</b>';
    var inner = '<small class="pyc">' + tokPy(t, pys && pys[i]) + '</small><b>' + esc(t) + '</b>';
    return WBY[t] && !noTap ? '<button class="tok" data-act="wordh" data-h="' + esc(t) + '" title="' + esc(WBY[t].g) + '">' + inner + '</button>' : '<span>' + inner + '</span>';
  }).join('') + '</div>';
}
function posOf(w) { return (w.pos && w.pos[0]) || ''; }

/* ---------- ui state ---------- */
var ui = { tab: 'home', q: '', f: 'all', lesson: null, setup: null, gram: null, gtab: 'lessons', modal: null };
var S = null;
var HWR = null;
var VIEW = $('#view');

function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2200);
}

/* ---------- views: home ---------- */
function nextNew(n, lesson) { return W.filter(function (w) { return status(w.id) === 'new' && (!lesson || w.l === lesson); }).slice(0, n); }
function viewHome() {
  var c = counts(), seen = c.learning + c.known, N = P.set.learnN || 5, nn = nextNew(N);
  var dots = W.map(function (w) { return '<button class="dot ' + status(w.id) + '" data-act="word" data-id="' + w.id + '" title="' + esc(w.h + ' ' + w.p + ' ' + w.g) + '" aria-label="' + esc(w.h + ' ' + w.g) + '"></button>'; }).join('');
  var welcome = P.set.hideWelcome ? '' :
    '<div class="card stack welcome"><div class="row between"><h3>How to study with this app</h3><button class="btn sm ghost" data-act="hidewelcome">Hide</button></div>' +
    '<ol class="steps3">' +
    '<li><b>Learn the tones first.</b> Chinese has four tones and a light tone, and tone changes meaning. The guide takes about five minutes. <button class="btn sm" data-act="tones">Open the tones guide</button></li>' +
    '<li><b>Learn ' + N + ' new words at a time.</b> You hear each word, watch its strokes and see it in a sentence. Then you answer a few quick questions on it.</li>' +
    '<li><b>Review every day.</b> Words come back just before you would forget them. Wrong answers come back sooner.</li>' +
    '<li><b>Then go harder.</b> Write characters from memory, build sentences and work through the grammar lessons.</li></ol>' +
    '<p class="muted small">Pinyin is coloured by tone: <span class="t1">1st ā</span>, <span class="t2">2nd á</span>, <span class="t3">3rd ǎ</span>, <span class="t4">4th à</span>, <span class="t5">light a</span>. You can turn the colours off in Settings. Tap any word in a sentence to see what it means.</p></div>';
  var learnBlock = nn.length ?
    '<div class="todo"><div><b>Learn new words</b><p class="muted small">Next up, lesson ' + nn[0].l + ':</p><div class="hz nextw">' + nn.map(function (w) { return esc(w.h); }).join(' ') + '</div></div>' +
    '<button class="btn' + (c.due ? '' : ' primary') + '" data-act="learn">Learn ' + nn.length + ' new word' + (nn.length > 1 ? 's' : '') + '</button></div>' :
    '<div class="todo"><div><b>Every word started</b><p class="muted small">Keep reviewing until all ' + W.length + ' are known well.</p></div></div>';
  var revBlock = '<div class="todo"><div><b>Review</b><p class="muted small">' + (c.due ? c.due + ' word' + (c.due > 1 ? 's are' : ' is') + ' due now. Mixed questions: build, listen, choose and write.' : seen ? 'Nothing due right now. You can still practise the words you have started.' : 'Words you learn show up here when they are due.') + '</p></div>' +
    '<button class="btn' + (c.due ? ' primary' : '') + '" data-act="review"' + (seen ? '' : ' disabled') + '>' + (c.due ? 'Review ' + c.due + ' now' : 'Practise started words') + '</button></div>';
  return '<div class="view">' + welcome +
    '<div class="card stack"><h3>Today</h3>' + (c.due ? revBlock + learnBlock : learnBlock + revBlock) + '</div>' +
    '<div class="stats">' +
    '<div class="stat"><b>' + seen + '<small class="muted"> / ' + W.length + '</small></b><span>words started</span></div>' +
    '<div class="stat"><b>' + c.known + '</b><span>known well</span></div>' +
    '<div class="stat"><b>' + c.due + '</b><span>due for review</span></div>' +
    '<div class="stat"><b>' + streak() + '</b><span>day streak</span></div></div>' +
    '<div class="card stack"><div class="row between"><h3>All ' + W.length + ' words</h3><div class="legend"><span><i style="background:var(--surface2)"></i>new</span><span><i style="background:var(--warn)"></i>learning</span><span><i style="background:var(--good)"></i>known</span></div></div><div class="dots">' + dots + '</div><p class="muted small">Tap a square to open that word.</p></div>' +
    '<div class="head"><div><h2>More practice</h2><p>Pick one skill to drill. Each has Easy, Hard and Brutal levels.</p></div><button class="btn sm" data-act="tones">Tones guide</button></div>' + modeGrid() + '</div>';
}
var MODES = {
  build: { name: 'Build a word', zh: '组', desc: 'Read the meaning, then click the characters into place. Decoy characters get harder to spot.', kind: 'word' },
  sent: { name: 'Build a sentence', zh: '句', desc: 'Read the English, then arrange Chinese word blocks into the sentence.', kind: 'sent' },
  write: { name: 'Write hanzi', zh: '写', desc: 'Draw each character from memory, stroke by stroke. Wrong strokes are caught.', kind: 'word' },
  fill: { name: 'Fill the blank', zh: '填', desc: 'One word is missing from a sentence. Pick the block that fits.', kind: 'sent' },
  choose: { name: 'Read and choose', zh: '读', desc: 'Recognise words and sentences. Pick the meaning, or pick the hanzi for a meaning.', kind: 'both' },
  listen: { name: 'Listen and pick', zh: '听', desc: 'Hear it, pick the hanzi. Needs audio on.', kind: 'both' },
  tones: { name: 'Hear the tones', zh: '声', desc: 'Hear a word, then pick the pinyin with the right tone marks. Trains your ear for tones.', kind: 'word' },
  cards: { name: 'Flashcards', zh: '卡', desc: 'Spaced repetition. Words come back when you are about to forget them.', kind: 'word' },
  learn: { name: 'Learn new words', zh: '学', desc: '', kind: 'word', hidden: true },
  review: { name: 'Review', zh: '复', desc: '', kind: 'word', hidden: true }
};
var MODE_ORDER = ['build', 'sent', 'write', 'fill', 'choose', 'listen', 'tones', 'cards'];
function modeGrid() {
  return '<div class="grid g2">' + MODE_ORDER.map(function (k) {
    var m = MODES[k];
    return '<button class="mode" data-act="startmode" data-mode="' + k + '"><h3><span class="hz">' + m.zh + '</span>' + esc(m.name) + '</h3><p class="muted small">' + esc(m.desc) + '</p></button>';
  }).join('') + '</div>';
}

/* ---------- views: words ---------- */
function wordRow(w) {
  var st = status(w.id);
  return '<div class="wrow" role="button" tabindex="0" data-act="word" data-id="' + w.id + '"><span class="hz">' + esc(w.h) + '</span>' +
    '<span class="meta"><b>' + wpy(w) + '</b> <span class="chip ' + st + '">' + st + '</span><br><span class="g">' + esc(w.g) + '</span></span>' + spk(w.h) + '</div>';
}
function filterWords() {
  var q = ui.q.trim().toLowerCase(), qs = strip(q);
  return W.filter(function (w) {
    if (ui.f === 'new' && status(w.id) !== 'new') return false;
    if (ui.f === 'learning' && status(w.id) !== 'learning') return false;
    if (ui.f === 'known' && status(w.id) !== 'known') return false;
    if (ui.f === 'weak' && !isWeak(w.id)) return false;
    if (!q) return true;
    return w.h.indexOf(ui.q.trim()) >= 0 || w.t.indexOf(ui.q.trim()) >= 0 || w.g.toLowerCase().indexOf(q) >= 0 || (qs && strip(w.p).indexOf(qs) >= 0);
  });
}
function wordList() {
  var list = filterWords();
  if (!list.length) return '<p class="muted">No words match. Try another spelling or filter.</p>';
  return '<div class="stack">' + list.slice(0, 120).map(wordRow).join('') + '</div>' + (list.length > 120 ? '<p class="muted small">Showing 120 of ' + list.length + '. Narrow the search to see the rest.</p>' : '');
}
function viewWords() {
  var nl = Math.ceil(W.length / 20);
  var filtered = ui.q || ui.f !== 'all';
  var segs = ['all', 'new', 'learning', 'known', 'weak'].map(function (f) { return '<button data-act="wf" data-f="' + f + '" aria-pressed="' + (ui.f === f) + '">' + f[0].toUpperCase() + f.slice(1) + '</button>'; }).join('');
  var head = '<div class="head"><div><h2>Words</h2><p>Tap any word for characters, stroke order and example sentences.</p></div></div>' +
    '<div class="row"><div style="flex:1;min-width:200px"><input type="search" id="q" placeholder="Search hanzi, pinyin or English" value="' + esc(ui.q) + '" aria-label="Search words"></div><div class="seg">' + segs + '</div></div>';
  if (filtered) return '<div class="view">' + head + '<div id="wlist">' + wordList() + '</div></div>';
  if (ui.lesson) {
    var L = ui.lesson, ws = W.filter(function (w) { return w.l === L; });
    return '<div class="view">' + head + '<div class="row between"><div class="row"><button class="btn sm" data-act="lessons">All lessons</button><h3>Lesson ' + L + '</h3></div>' +
      '<div class="row">' + (nextNew(1, L).length ? '<button class="btn sm primary" data-act="learnl" data-n="' + L + '">Learn new words</button>' : '') + '<button class="btn sm" data-act="studyl" data-n="' + L + '">Flashcards</button><button class="btn sm" data-act="buildl" data-n="' + L + '">Build words</button></div></div>' +
      '<div class="stack">' + ws.map(wordRow).join('') + '</div></div>';
  }
  var cards = [];
  for (var l = 1; l <= nl; l++) {
    var ws2 = W.filter(function (w) { return w.l === l; }), k = 0, ln = 0;
    ws2.forEach(function (w) { var s = status(w.id); if (s === 'known') k++; else if (s === 'learning') ln++; });
    cards.push('<button class="lesson" data-act="lesson" data-n="' + l + '"><div class="row between"><b>Lesson ' + l + '</b><span class="muted small">' + k + '/' + ws2.length + ' known</span></div>' +
      '<div class="hz" style="font-size:1.25rem;overflow-wrap:anywhere">' + ws2.slice(0, 5).map(function (w) { return esc(w.h); }).join(' ') + '</div>' +
      '<div class="bar"><i class="k" style="width:' + (k / ws2.length * 100) + '%"></i><i class="l" style="width:' + (ln / ws2.length * 100) + '%"></i></div></button>');
  }
  return '<div class="view">' + head + '<div class="grid g3">' + cards.join('') + '</div></div>';
}

/* ---------- modals ---------- */
function openModal(html) {
  ui.modal = true;
  $('#modal').innerHTML = '<div class="scrim" data-act="closem"><div class="sheet" role="dialog" aria-modal="true" data-stop="1">' + html + '</div></div>';
  var b = $('#modal .sheet'); if (b) b.scrollTop = 0;
}
function closeModal() { ui.modal = null; killWriter(); $('#modal').innerHTML = ''; }
function wordModal(id) {
  var w = W[id], st = status(id), ex = examplesFor(w.h).slice(0, 3), r = P.srs[id];
  var chars = [].concat.apply([], [].map.call(w.h, function (c) { return CHBY[c] ? [c] : []; }));
  var kv = '';
  if (w.t !== w.h) kv += '<dt>Traditional</dt><dd class="hz">' + esc(w.t) + '</dd>';
  if (w.pos.length) kv += '<dt>Type</dt><dd>' + esc(w.pos.join(', ')) + '</dd>';
  if (w.c && w.c.length) kv += '<dt>Measure word</dt><dd class="hz">' + w.c.map(esc).join(' ') + '</dd>';
  if (w.r) kv += '<dt>Radical</dt><dd class="hz">' + esc(w.r) + '</dd>';
  if (r && r.s) kv += '<dt>Your record</dt><dd>' + r.c + ' right, ' + r.m + ' wrong, box ' + r.b + ' of 5</dd>';
  var html = '<div class="row between"><span class="chip ' + st + '">' + st + '</span><button class="iconbtn" data-act="closem" aria-label="Close">&times;</button></div>' +
    '<div class="row" style="align-items:flex-end"><div class="bigz">' + esc(w.h) + '</div>' + spks(w.h) + '</div>' +
    '<div><h3 style="font-size:1.4rem">' + wpy(w) + '</h3><p>' + esc(w.g) + '</p></div>' +
    (kv ? '<dl class="kv">' + kv + '</dl>' : '') +
    (w.m.length ? '<div><h4 class="muted small">DICTIONARY SENSES</h4><ul style="margin:4px 0 0;padding-left:18px">' + w.m.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>' : '') +
    (chars.length ? '<div><h4 class="muted small">CHARACTERS (TAP FOR STROKE ORDER)</h4><div class="row" style="margin-top:6px">' + chars.map(function (c) { return '<button class="tile sq" data-act="char" data-c="' + c + '">' + c + '</button>'; }).join('') + '</div></div>' : '') +
    (ex.length ? '<div class="stack"><h4 class="muted small">EXAMPLES</h4>' + ex.map(function (e) { return '<div class="ex">' + sxHTML(e.w, e.py) + '<span class="muted">' + esc(e.en) + '</span><span>' + spk(e.w.join('')) + '</span></div>'; }).join('') + '</div>' : '') +
    '<div class="row"><button class="btn primary" data-act="writeone" data-id="' + id + '">Practise writing</button></div>';
  openModal(html);
}
function charModal(c) {
  var d = CHBY[c]; if (!d) return;
  var ws = d.w.slice(0, 8).map(function (i) { return W[i]; });
  var html = '<div class="row between"><h3 style="font-size:1.2rem">Stroke order</h3><button class="iconbtn" data-act="closem" aria-label="Close">&times;</button></div>' +
    '<div class="writer" id="cw"></div>' +
    '<div class="actions"><button class="btn" data-act="canim">Animate</button><button class="btn primary" data-act="cquiz">Draw it</button></div>' +
    '<p class="center muted small" id="cmsg" style="text-align:center">Watch the strokes, then try drawing it yourself.</p>' +
    '<div class="row" style="justify-content:center"><span class="hz" style="font-size:2rem">' + esc(c) + '</span><span class="py">' + esc(d.p.join(' / ')) + '</span>' + spk(c) + '</div>' +
    '<div><h4 class="muted small">WORDS WITH ' + esc(c) + '</h4><div class="stack" style="margin-top:6px">' + ws.map(function (w) { return '<div class="wrow" role="button" tabindex="0" data-act="word" data-id="' + w.id + '"><span class="hz">' + esc(w.h) + '</span><span class="meta"><b>' + wpy(w) + '</b><br><span class="g">' + esc(w.g) + '</span></span><span></span></div>'; }).join('') + '</div></div>';
  openModal(html);
  mountWriter($('#cw'), c, { showOutline: true }, true);
  HWR.animateCharacter();
}

/* ---------- Hanzi Writer ---------- */
function css(v, d) { var x = getComputedStyle(document.documentElement).getPropertyValue(v).trim(); return x || d; }
function killWriter() { if (HWR) { try { HWR.cancelQuiz(); } catch (e) { } } HWR = null; }
function mountWriter(el, ch, extra, noQuiz) {
  killWriter();
  if (!el || !window.HanziWriter || !STROKES[ch]) return null;
  var size = Math.min(300, Math.max(200, window.innerWidth - 80));
  el.style.width = size + 'px'; el.style.height = size + 'px'; el.innerHTML = '';
  var o = Object.assign({
    width: size, height: size, padding: 16, strokeColor: css('--fg', '#14202E'), radicalColor: css('--accent', '#2650A8'), outlineColor: css('--grid', '#C9D2DE'),
    highlightColor: css('--good', '#1B7560'), drawingColor: css('--accent', '#2650A8'), drawingWidth: 18, strokeAnimationSpeed: 1.3, delayBetweenStrokes: 180,
    showCharacter: false, showOutline: true, leniency: 1.15,
    charDataLoader: function (c, ok) { var d = STROKES[c]; ok({ strokes: d.s, medians: d.m }); }
  }, extra || {});
  HWR = HanziWriter.create(el, ch, o);
  return HWR;
}

/* ---------- practice launcher ---------- */
function scopeOptions(kind) {
  var sel = P.set.scope, o = '';
  function opt(v, l) { return '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + esc(l) + '</option>'; }
  if (kind === 'sent') {
    o += opt('all', 'All sentences (' + SN.length + ')');
    var tps = []; SN.forEach(function (s) { if (tps.indexOf(s.topic) < 0) tps.push(s.topic); });
    tps.forEach(function (t) { o += opt('T:' + t, 'Topic: ' + t); });
    GR.forEach(function (g) { o += opt('G:' + g.id, 'Grammar: ' + g.title); });
    return o;
  }
  o += opt('due', 'Due, then new words'); o += opt('weak', 'Words I get wrong'); o += opt('seen', 'Words I have started'); o += opt('new', 'New words only'); o += opt('all', 'All ' + W.length + ' words');
  for (var l = 1; l <= Math.ceil(W.length / 20); l++) o += opt('L' + l, 'Lesson ' + l);
  return o;
}
var DIFFNOTE = {
  build: ['Pinyin shown, 2 extra characters.', 'Pinyin only through Hint, 4 extra characters, some sound alike.', 'No hints, 7 extra characters, many sound alike.'],
  sent: ['Pinyin on blocks, 2 extra words.', 'No pinyin, 4 extra words.', 'No pinyin, no length hint, 6 extra words.'],
  write: ['Outline guide, hint after a few misses, up to 4 misses allowed.', 'No outline, hint after 3 misses, up to 2 misses allowed.', 'No outline, no hints, no pinyin, one wrong stroke fails the word.'],
  fill: ['English and pinyin shown, 3 options.', 'English shown, 5 options of the same word type.', 'No English, grammar words only, 7 options.'],
  choose: ['3 options.', '5 options, similar words.', '7 options, very similar words, no pinyin.'],
  listen: ['4 options.', '6 options with the same syllables in other tones.', '8 options with the same syllables in other tones.'],
  tones: ['3 options, one syllable changed, meaning shown.', '4 options, any syllable changed.', '6 options, any syllable changed.'],
  cards: ['', '', '']
};
function viewPractice() {
  if (!ui.setup) return '<div class="view"><div class="head"><div><h2>Practise</h2><p>Pick a drill. Your difficulty and scope are remembered.</p></div></div>' + modeGrid() + '</div>';
  var k = ui.setup, m = MODES[k], di = ['easy', 'hard', 'brutal'].indexOf(P.set.diff);
  var segs = ['easy', 'hard', 'brutal'].map(function (d) { return '<button data-act="diff" data-d="' + d + '" aria-pressed="' + (P.set.diff === d) + '">' + d[0].toUpperCase() + d.slice(1) + '</button>'; }).join('');
  var ns = [5, 10, 20].map(function (n) { return '<button data-act="num" data-n="' + n + '" aria-pressed="' + (P.set.n === n) + '">' + n + '</button>'; }).join('');
  var extra = '';
  if (k === 'choose') extra = '<label class="f">Direction<select id="s-dir"><option value="mix">Mixed</option><option value="zh2en">Chinese to English</option><option value="en2zh">English to Chinese</option></select></label>';
  if (k === 'cards') extra = '<label class="f">Card shows<select id="s-dir"><option value="zh2en">Chinese first, recall the meaning</option><option value="en2zh">Meaning first, recall the hanzi</option><option value="audio">Audio first (needs audio on)</option></select></label>';
  if ((k === 'listen' || k === 'tones') && !ttsOn()) extra = '<div class="notice">Audio is off. Turn on the audio switch at the top to use this drill.</div>';
  var kind = m.kind === 'sent' ? 'sent' : 'word';
  if (k === 'choose' || k === 'listen') {
    extra += '<label class="f">Material<select id="s-kind"><option value="words">Words</option><option value="sents">Sentences</option><option value="both">Both</option></select></label>';
  }
  var diffRow = k === 'cards' ? '' : '<div class="stack"><b>Difficulty</b><div><div class="seg">' + segs + '</div></div><p class="muted small">' + esc(DIFFNOTE[k][di]) + '</p></div>';
  var scopeSel = (k === 'choose' || k === 'listen') ? '<label class="f">Words to use (and which sentences when mixed)<select id="s-scope">' + scopeOptions('word') + '</select></label>' : '<label class="f">Material<select id="s-scope">' + scopeOptions(kind) + '</select></label>';
  return '<div class="view"><div class="row"><button class="btn sm" data-act="unsetup">Back</button><h2><span class="hz" style="color:var(--accent)">' + m.zh + '</span> ' + esc(m.name) + '</h2></div>' +
    '<div class="card stack"><p>' + esc(m.desc) + '</p>' + diffRow + scopeSel + extra +
    '<div class="stack"><b>Questions</b><div><div class="seg">' + ns + '</div></div></div>' +
    '<div class="actions" style="justify-content:flex-start"><button class="btn primary" data-act="begin"' + ((k === 'listen' || k === 'tones') && !ttsOn() ? ' disabled' : '') + '>Start</button></div></div></div>';
}

/* ---------- sessions ----------
   A session is a list of items. Each item can carry its own question type (it.m), so
   "Learn" and "Review" sessions mix several kinds of question. */
function M() { return (S && S.q && S.q.m) || (S && S.mode); }
var NOTONE = {};
function toneable(w) {
  // skip words whose spoken tones differ from the written ones (3rd+3rd, 一, 不)
  if (/[一不]/.test(w.h)) return false;
  var t = w.py.filter(function (x) { return x !== 'r'; }).map(toneOf);
  for (var i = 0; i < t.length - 1; i++) if (t[i] === 3 && t[i + 1] === 3) return false;
  return !!AIDX[w.h];
}
function canWrite(w) { return [].every.call(w.h, function (c) { return STROKES[c]; }); }
function startSession(mode, opts) {
  opts = opts || {};
  var diff = opts.diff || P.set.diff, n = opts.n || P.set.n, sc = opts.scope || P.set.scope;
  var items = opts.items;
  if (!items) {
    var kind = MODES[mode].kind;
    if (mode === 'write') items = pickWords(n, sc, canWrite).map(function (w) { return { t: 'w', w: w }; });
    else if (mode === 'tones') items = pickWords(n, sc, toneable).map(function (w) { return { t: 'w', w: w }; });
    else if (kind === 'word') items = pickWords(n, sc).map(function (w) { return { t: 'w', w: w }; });
    else if (kind === 'sent') items = sample(sentPool(sc), n).map(function (s) { return { t: 's', s: s }; });
    else {
      var mat = opts.kind || 'words';
      var ws = pickWords(n, sc).map(function (w) { return { t: 'w', w: w }; });
      var ss = sample(SN, n).map(function (s) { return { t: 's', s: s }; });
      if (mat === 'words') items = ws; else if (mat === 'sents') items = ss;
      else items = shuffle(ws.slice(0, Math.ceil(n / 2)).concat(ss.slice(0, Math.floor(n / 2))));
    }
  }
  if (!items.length) { toast('Nothing to practise in that scope yet. Try "All words".'); return; }
  stopAudio();
  S = { mode: mode, diff: diff, items: items, i: 0, ok: 0, graded: 0, miss: [], dir: opts.dir || 'mix', q: null, again: opts, requeue: !!opts.requeue, words: opts.words || null, res: {} };
  ui.tab = (mode === 'learn' || mode === 'review') ? 'home' : 'practice'; newQ(); renderSession(); window.scrollTo(0, 0);
}
function startLearn(ws) {
  if (!ws.length) { toast('Every word here is already started. Use Review.'); return; }
  var intro = ws.map(function (w) { return { t: 'w', w: w, m: 'intro' }; });
  var recog = [], produce = [];
  ws.forEach(function (w) {
    recog.push({ t: 'w', w: w, m: 'choose', dir: 'zh2en' });
    recog.push(ttsOn() ? { t: 'w', w: w, m: 'listen' } : { t: 'w', w: w, m: 'choose', dir: 'en2zh' });
    produce.push({ t: 'w', w: w, m: 'build' });
  });
  startSession('learn', { items: intro.concat(shuffle(recog), shuffle(produce)), diff: 'easy', requeue: true, words: ws });
}
function startReview() {
  var n = Math.max(10, P.set.n);
  var started = W.filter(function (w) { return status(w.id) !== 'new'; });
  var due = started.filter(function (w) { return isDue(w.id); }).sort(function (a, b) { return P.srs[a.id].d - P.srs[b.id].d; });
  var pool = due.length ? due.slice(0, n) : started.slice().sort(function (a, b) { return P.srs[a.id].d - P.srs[b.id].d; }).slice(0, n);
  if (!pool.length) { toast('Learn some words first.'); return; }
  var items = shuffle(pool).map(function (w) {
    var opts = ['build', 'build', 'choose'];
    if (ttsOn()) opts.push('listen', 'listen');
    if (canWrite(w) && w.h.length <= 2 && P.set.diff !== 'easy') opts.push('write', 'write');
    if (ttsOn() && toneable(w)) opts.push('tones');
    var m = opts[rnd(opts.length)];
    return { t: 'w', w: w, m: m, dir: m === 'choose' ? 'en2zh' : undefined };
  });
  startSession('review', { items: items, requeue: true });
}
function newQ() {
  var it = S.items[S.i], m = it.m || S.mode;
  S.q = MK[m](it, S.diff);
  S.q.m = m; S.q.item = it; S.q.res = m === 'intro' ? 'seen' : null; S.q.t0 = now();
}
function nextQ() {
  killWriter(); killIntro();
  S.i++;
  if (S.i >= S.items.length) { S.q = null; S.done = true; if (S.mode === 'learn') settleLearn(); renderSession(); window.scrollTo(0, 0); return; }
  newQ(); renderSession(); window.scrollTo(0, 0);
}
function record(ok, wordId) {
  var q = S.q; if (q.res !== null) return;
  var it = q.item;
  q.res = ok ? 'ok' : 'no';
  if (!it.again) { S.graded++; if (ok) S.ok++; else S.miss.push(it); }
  if (S.mode === 'learn') {
    if (wordId !== undefined && !it.again) S.res[wordId] = (S.res[wordId] === undefined ? true : S.res[wordId]) && ok;
    tally(ok); save();
  } else if (wordId !== undefined && !it.again) grade(wordId, ok);
  else { tally(ok); save(); }
  if (!ok && S.requeue && !it.again) S.items.push(Object.assign({}, it, { again: true }));
}
function settleLearn() {
  // a freshly learned word starts in box 1 (back tomorrow) if every first answer was right, else box 0 (back in 10 minutes)
  (S.words || []).forEach(function (w) {
    var r = P.srs[w.id] || (P.srs[w.id] = { b: 0, d: 0, s: 0, m: 0, c: 0 });
    var good = S.res[w.id] !== false;
    r.s++; if (good) { r.c++; r.b = Math.max(r.b, 1); } else { r.m++; r.b = 0; }
    r.d = now() + (r.b === 0 ? 10 * 60000 : INTV[r.b] * 86400000);
  });
  save();
}
/* decoy helpers */
function simWords(w, k, diff) {
  var pos = posOf(w), base = strip(w.p);
  var pool = W.filter(function (x) { return x.id !== w.id && x.g !== w.g; });
  var tier = pool.filter(function (x) { return (pos && posOf(x) === pos) || strip(x.p) === base; });
  if (diff === 'easy') tier = shuffle(pool);
  var out = sample(tier, Math.min(k, tier.length));
  if (out.length < k) out = out.concat(sample(pool.filter(function (x) { return out.indexOf(x) < 0; }), k - out.length));
  return out;
}
function decoyChars(chars, k, diff) {
  var bases = chars.map(function (c) { return strip(CHBY[c] ? CHBY[c].p[0] : ''); });
  var rest = CHL.map(function (c) { return c.c; }).filter(function (c) { return chars.indexOf(c) < 0; });
  var sim = diff === 'easy' ? [] : rest.filter(function (c) { return bases.indexOf(strip(CHBY[c].p[0])) >= 0; });
  var out = sample(sim, Math.min(sim.length, Math.ceil(k * (diff === 'brutal' ? 0.6 : 0.5))));
  out = out.concat(sample(rest.filter(function (c) { return out.indexOf(c) < 0; }), k - out.length));
  return out;
}
function tilesFor(arr) { return shuffle(arr.map(function (c, i) { return { id: i, c: c }; })); }

/* ---- generators ---- */
var MK = {};
MK.build = function (it, diff) {
  var w = it.w, chars = [].slice.call(w.h), k = { easy: 2, hard: 4, brutal: 7 }[diff];
  return { w: w, chars: chars, tiles: tilesFor(chars.concat(decoyChars(chars, k, diff))), placed: [], hint: diff === 'easy' };
};
MK.sent = function (it, diff) {
  var s = it.s, toks = s.w.filter(function (t) { return !isP(t); }), k = { easy: 2, hard: 4, brutal: 6 }[diff];
  var pool = W.filter(function (x) { return toks.indexOf(x.h) < 0 && !toks.some(function (t) { return t.indexOf(x.h) >= 0 || x.h.indexOf(t) >= 0; }); });
  var poss = toks.map(function (t) { return WBY[t] ? posOf(WBY[t]) : ''; });
  var near = pool.filter(function (x) { return poss.indexOf(posOf(x)) >= 0 && x.h.length <= 3; });
  var dec = sample(near, Math.min(k, near.length)); if (dec.length < k) dec = dec.concat(sample(pool.filter(function (x) { return dec.indexOf(x) < 0 && x.h.length <= 3; }), k - dec.length));
  return { s: s, toks: toks, tiles: tilesFor(toks.concat(dec.map(function (x) { return x.h; }))), placed: [], showPy: diff === 'easy' };
};
MK.choose = function (it, diff) {
  var dir = it.dir || (S.dir === 'mix' ? (rnd(2) ? 'zh2en' : 'en2zh') : S.dir);
  if (it.t === 'w') {
    var w = it.w, k = { easy: 3, hard: 5, brutal: 7 }[diff];
    var dec = simWords(w, k - 1, diff);
    if (dir === 'zh2en') return { dir: dir, w: w, opts: shuffle([w].concat(dec).map(function (x) { return { label: x.g, ok: x === w, w: x }; })) };
    return { dir: dir, w: w, opts: shuffle([w].concat(dec).map(function (x) { return { label: x.h, ok: x === w, hz: true, w: x }; })) };
  }
  var s = it.s, k2 = { easy: 3, hard: 4, brutal: 6 }[diff];
  var others = SN.filter(function (x) { return x.en !== s.en; });
  var sc = others.map(function (x) { return { x: x, n: x.w.filter(function (t) { return s.w.indexOf(t) >= 0 && !isP(t); }).length + Math.random() * 0.5 }; }).sort(function (a, b) { return b.n - a.n; });
  var pickd = diff === 'easy' ? sample(others, k2 - 1) : sc.slice(0, k2 - 1).map(function (z) { return z.x; });
  return { dir: 'zh2en', s: s, opts: shuffle([s].concat(pickd).map(function (x) { return { label: x.en, ok: x === s }; })) };
};
var FUNC_POS = ['adverb', 'preposition', 'measure word', 'pronoun', 'conjunction', 'particle'];
var NOBLANK = ['的', '了', '吗', '吧', '呢', '地', '着'];
MK.fill = function (it, diff) {
  var s = it.s, idxs = [];
  s.w.forEach(function (t, i) { var w = WBY[t]; if (!w || NOBLANK.indexOf(t) >= 0) return; if (diff === 'brutal' && FUNC_POS.indexOf(posOf(w)) < 0) return; idxs.push(i); });
  if (!idxs.length) s.w.forEach(function (t, i) { if (WBY[t] && NOBLANK.indexOf(t) < 0) idxs.push(i); });
  var bi = idxs[rnd(idxs.length)], target = WBY[s.w[bi]] || WBY['我'];
  var k = { easy: 3, hard: 5, brutal: 7 }[diff];
  var pool = W.filter(function (x) { return x.h !== target.h && s.w.indexOf(x.h) < 0 && x.h.indexOf(target.h) < 0 && target.h.indexOf(x.h) < 0 && x.g !== target.g && x.h.length <= 3; });
  var same = pool.filter(function (x) { return posOf(x) && posOf(x) === posOf(target); });
  var dec = sample(same, Math.min(k - 1, same.length)); if (dec.length < k - 1) dec = dec.concat(sample(pool.filter(function (x) { return dec.indexOf(x) < 0; }), k - 1 - dec.length));
  return { s: s, bi: bi, target: target, opts: shuffle([target].concat(dec).map(function (x) { return { label: x.h, ok: x === target, hz: true, w: x }; })), peek: diff !== 'brutal' };
};
MK.listen = function (it, diff) {
  if (it.t === 'w') {
    var w = it.w, k = { easy: 4, hard: 6, brutal: 8 }[diff], base = strip(w.p);
    var pool = W.filter(function (x) { return x.id !== w.id; });
    var sim = diff === 'easy' ? [] : pool.filter(function (x) { return strip(x.p) === base || (x.h.length === w.h.length && strip(x.p).slice(0, 2) === base.slice(0, 2)); });
    var dec = sample(sim, Math.min(k - 1, sim.length)); dec = dec.concat(sample(pool.filter(function (x) { return dec.indexOf(x) < 0; }), k - 1 - dec.length));
    return { w: w, say: w.h, opts: shuffle([w].concat(dec).map(function (x) { return { label: x.h, ok: x === w, hz: true, w: x }; })) };
  }
  var s = it.s, k2 = { easy: 3, hard: 4, brutal: 5 }[diff];
  var others = SN.filter(function (x) { return x.en !== s.en; });
  var d2 = diff === 'easy' ? sample(others, k2 - 1) : others.map(function (x) { return { x: x, n: x.w.filter(function (t) { return s.w.indexOf(t) >= 0 && !isP(t); }).length + Math.random() * 0.5 }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, k2 - 1).map(function (z) { return z.x; });
  return { s: s, say: s.w.join(''), opts: shuffle([s].concat(d2).map(function (x) { return { label: x.w.join(''), ok: x === s }; })) };
};
MK.write = function (it, diff) {
  var w = it.w; return { w: w, chars: [].slice.call(w.h), ci: 0, miss: 0, mode: 'draw', diff: diff };
};
MK.cards = function (it) {
  var dir = it.dir || (S.dir === 'mix' ? 'zh2en' : S.dir); if (dir === 'audio' && !ttsOn()) dir = 'zh2en';
  return { w: it.w, dir: dir, flipped: false };
};
MK.intro = function (it) { return { w: it.w }; };
MK.tones = function (it, diff) {
  var w = it.w, syl = w.py.filter(function (x) { return x !== 'r'; }), er = w.py.indexOf('r') >= 0;
  var bases = syl.map(baseOf), tones = syl.map(toneOf), k = { easy: 3, hard: 4, brutal: 6 }[diff];
  var cap = /^[A-Z]/.test(syl[0].normalize('NFD'));
  function label(t) { var x = bases.map(function (b, i) { return markTone(b, t[i]); }).join('') + (er ? 'r' : ''); return cap ? x.charAt(0).toUpperCase() + x.slice(1) : x; }
  var seen = {}, opts = [tones]; seen[tones.join('')] = 1;
  var max = 1; syl.forEach(function (x, i) { max *= i === 0 ? 4 : 5; });
  for (var tries = 0; opts.length < Math.min(k, max) && tries < 300; tries++) {
    var t = tones.slice(), j = rnd(t.length), nt;
    // easy changes one syllable, harder levels change one or more
    var changes = diff === 'easy' ? 1 : 1 + rnd(t.length);
    for (var c = 0; c < changes; c++) { j = rnd(t.length); do { nt = j === 0 ? 1 + rnd(4) : 1 + rnd(5); } while (nt === t[j] && tries < 299); t[j] = nt; }
    if (seen[t.join('')]) continue; seen[t.join('')] = 1; opts.push(t);
  }
  return { w: w, say: w.h, opts: shuffle(opts.map(function (t) { return { label: label(t), ok: t.join('') === tones.join(''), py: true }; })) };
};

/* ---- session views ---- */
function fbBox(ok, inner) { return '<div class="fb ' + (ok ? 'ok' : 'no') + '"><b>' + (ok ? 'Correct' : 'Not quite') + '</b>' + inner + '</div>'; }
function wordInfo(w) {
  return '<div class="zh">' + esc(w.h) + '</div><div class="small"><b>' + wpy(w) + '</b> &middot; ' + esc(w.g) + '</div>';
}
function nextBtn(label) { return '<div class="actions"><button class="btn primary" data-act="next" id="nextbtn">' + (S.i + 1 >= S.items.length ? 'See results' : (label || 'Next')) + '</button></div>'; }

var VW = {};
VW.build = function (q) {
  var done = q.res !== null, n = q.chars.length;
  var slots = '';
  for (var i = 0; i < n; i++) {
    var tid = q.placed[i], t = q.tiles.filter(function (x) { return x.id === tid; })[0];
    if (t) { var cls = done ? (t.c === q.chars[i] ? ' ok' : ' no') : ''; slots += '<button class="tile sq' + cls + '" data-act="unpick" data-i="' + t.id + '"' + (done ? ' disabled' : '') + '>' + esc(t.c) + '</button>'; }
    else slots += '<span class="tile sq" style="opacity:.45;border-style:dashed"></span>';
  }
  var bank = q.tiles.filter(function (t) { return q.placed.indexOf(t.id) < 0; }).map(function (t) { return '<button class="tile sq" data-act="pick" data-i="' + t.id + '">' + esc(t.c) + '</button>'; }).join('');
  var ok = q.res === 'ok';
  return '<div class="q"><div class="prompt"><span class="sub">Build the Chinese for</span><div class="big">' + esc(q.w.g) + '</div>' +
    (q.hint ? '<div class="sub">' + wpy(q.w) + '</div>' : '') + '<div>' + spk(q.w.h) + '</div></div>' +
    '<div class="answer ' + (done ? (ok ? 'ok' : 'no') : '') + '">' + slots + '</div>' +
    (done ? fbBox(ok, ok ? wordInfo(q.w) : '<div class="small">Answer:</div>' + wordInfo(q.w)) + nextBtn() :
      '<div class="bank">' + bank + '</div><div class="actions"><button class="btn" data-act="clear"' + (q.placed.length ? '' : ' disabled') + '>Clear</button>' +
      (S.diff !== 'brutal' && !q.hint ? '<button class="btn" data-act="hint">Show pinyin</button>' : '') +
      '<button class="btn primary" data-act="check"' + (q.placed.length === n ? '' : ' disabled') + '>Check</button></div>') + '</div>';
};
VW.sent = function (q) {
  var done = q.res !== null, ok = q.res === 'ok', n = q.toks.length;
  var pl = q.placed.map(function (id) { return q.tiles.filter(function (x) { return x.id === id; })[0]; });
  var ans = pl.map(function (t, i) {
    var cls = done ? (t.c === q.toks[i] ? ' ok' : ' no') : ''; var w = WBY[t.c];
    return '<button class="tile word' + cls + '" data-act="unpick" data-i="' + t.id + '"' + (done ? ' disabled' : '') + '>' + esc(t.c) + (q.showPy && w ? '<small>' + wpy(w) + '</small>' : '') + '</button>';
  }).join('');
  if (!done && S.diff !== 'brutal') for (var i = pl.length; i < n; i++) ans += '<span class="tile word" style="opacity:.4;border-style:dashed;min-width:3rem"></span>';
  var bank = q.tiles.filter(function (t) { return q.placed.indexOf(t.id) < 0; }).map(function (t) { var w = WBY[t.c]; return '<button class="tile word" data-act="pick" data-i="' + t.id + '">' + esc(t.c) + (q.showPy && w ? '<small>' + wpy(w) + '</small>' : '') + '</button>'; }).join('');
  var full = q.s.w.join('');
  return '<div class="q"><div class="prompt"><span class="sub">Say this in Chinese</span><div class="big">' + esc(q.s.en) + '</div></div>' +
    '<div class="answer ' + (done ? (ok ? 'ok' : 'no') : '') + '">' + (ans || '<span class="muted small">Tap blocks below to build the sentence</span>') + '</div>' +
    (done ? fbBox(ok, (ok ? '' : '<div class="small">Answer:</div>') + sxHTML(q.s.w, q.s.py) + '<div>' + spk(full) + '</div>') + nextBtn() :
      '<div class="bank">' + bank + '</div><div class="actions"><button class="btn" data-act="clear"' + (q.placed.length ? '' : ' disabled') + '>Clear</button>' +
      (S.diff === 'easy' ? '' : '<button class="btn" data-act="hint">' + (q.showPy ? 'Hide pinyin' : 'Show pinyin') + '</button>') +
      '<button class="btn primary" data-act="check"' + (q.placed.length ? '' : ' disabled') + '>Check</button></div>') + '</div>';
};
function optsHTML(q, done) {
  var hzs = q.opts.some(function (o) { return o.hz; });
  return '<div class="opts' + (hzs ? ' hzs' : '') + '">' + q.opts.map(function (o, i) {
    var cls = done ? (o.ok ? ' ok' : (q.picked === i ? ' no' : '')) : '';
    return '<button class="tile opt' + (o.hz ? ' hzopt' : '') + (o.py ? ' pyopt' : '') + cls + '" data-act="opt" data-i="' + i + '"' + (done ? ' disabled' : '') + '><span class="kbd" aria-hidden="true">' + (i < 9 ? i + 1 : '') + '</span>' + esc(o.label) + '</button>';
  }).join('') + '</div>';
}
/* after a wrong pick, say what the picked option actually was: the most useful correction */
function pickedNote(q) {
  if (q.res !== 'no' || q.picked == null) return '';
  var o = q.opts[q.picked]; if (!o) return '';
  if (o.w) return '<div class="small picked">You picked <span class="hz">' + esc(o.w.h) + '</span> ' + wpy(o.w) + ', which means "' + esc(o.w.g) + '".</div>';
  if (o.py) return '<div class="small picked">You picked ' + esc(o.label) + '.</div>';
  return '';
}
VW.choose = function (q) {
  var done = q.res !== null, ok = q.res === 'ok', it = q.item, head;
  if (it.t === 'w') {
    head = q.dir === 'zh2en' ? '<span class="sub">What does this mean?</span><div class="zhbig">' + esc(q.w.h) + '</div>' + (S.diff === 'easy' ? '<div class="sub">' + wpy(q.w) + '</div>' : '') + '<div>' + spk(q.w.h) + '</div>'
      : '<span class="sub">Which one means</span><div class="big">' + esc(q.w.g) + '</div>';
  } else head = '<span class="sub">What does this say?</span>' + '<div class="sentence">' + esc(q.s.w.join(' ')) + '</div>' + (S.diff === 'brutal' ? '' : '<div class="sub">' + esc(q.s.py.filter(Boolean).join(' ')) + '</div>') + '<div>' + spk(q.s.w.join('')) + '</div>';
  var info = it.t === 'w' ? wordInfo(q.w) : sxHTML(q.s.w, q.s.py) + '<div class="small">' + esc(q.s.en) + '</div>';
  return '<div class="q"><div class="prompt">' + head + '</div>' + optsHTML(q, done) + (done ? fbBox(ok, info + pickedNote(q)) + nextBtn() : '') + '</div>';
};
VW.fill = function (q) {
  var done = q.res !== null, ok = q.res === 'ok';
  var parts = q.s.w.map(function (t, i) { return i === q.bi ? (done ? '<span class="blank" style="color:' + (ok ? 'var(--good)' : 'var(--bad)') + '">' + esc(q.target.h) + '</span>' : '<span class="blank">&nbsp;&nbsp;&nbsp;</span>') : '<span>' + esc(t) + '</span>'; }).join('');
  var py = S.diff === 'easy' ? '<div class="sub">' + esc(q.s.py.map(function (p, i) { return i === q.bi && !done ? '___' : p; }).filter(Boolean).join(' ')) + '</div>' : '';
  var en = (S.diff === 'brutal') ? '' : (S.diff === 'easy' || q.showEn || done ? '<div class="sub">' + esc(q.s.en) + '</div>' : '<button class="btn sm" data-act="peek">Show English</button>');
  return '<div class="q"><div class="prompt"><span class="sub">Fill the blank</span><div class="sentence">' + parts + '</div>' + py + en + '</div>' + optsHTML(q, done) +
    (done ? fbBox(ok, sxHTML(q.s.w, q.s.py) + '<div class="small">' + esc(q.s.en) + '</div>' + pickedNote(q) + '<div>' + spk(q.s.w.join('')) + '</div>') + nextBtn() : '') + '</div>';
};
VW.listen = function (q) {
  var done = q.res !== null, ok = q.res === 'ok', it = q.item;
  var info = it.t === 'w' ? wordInfo(q.w) : sxHTML(q.s.w, q.s.py) + '<div class="small">' + esc(q.s.en) + '</div>';
  return '<div class="q"><div class="prompt"><span class="sub">Which did you hear?</span><div class="row" style="justify-content:center"><button class="btn primary" data-act="say" data-t="' + esc(q.say) + '">Play again</button><button class="btn" data-act="say" data-slow="1" data-t="' + esc(q.say) + '">Slow</button></div></div>' + optsHTML(q, done) + (done ? fbBox(ok, info + pickedNote(q)) + nextBtn() : '') + '</div>';
};
VW.tones = function (q) {
  var done = q.res !== null, ok = q.res === 'ok';
  return '<div class="q"><div class="prompt"><span class="sub">Listen. Which tones do you hear?</span>' +
    '<div class="row" style="justify-content:center"><button class="btn primary" data-act="say" data-t="' + esc(q.say) + '">Play again</button><button class="btn" data-act="say" data-slow="1" data-t="' + esc(q.say) + '">Slow</button></div>' +
    (done || S.diff === 'easy' ? '<div class="sub">' + esc(q.w.g) + '</div>' : '') + '</div>' + optsHTML(q, done) +
    (done ? fbBox(ok, wordInfo(q.w) + '<div class="small">Tones: ' + toneNames(q.w) + '</div>' + pickedNote(q)) + nextBtn() : '<p class="muted small" style="text-align:center">Not sure? Open the <button class="linkbtn" data-act="tones">tones guide</button>.</p>') + '</div>';
};
function toneNames(w) {
  var N = ['', '1st (high, level)', '2nd (rising)', '3rd (low, dipping)', '4th (falling)', 'light (short, unstressed)'];
  return w.py.filter(function (x) { return x !== 'r'; }).map(function (s) { return '<span class="t' + toneOf(s) + '">' + esc(s) + '</span> ' + N[toneOf(s)]; }).join(', ');
}
function toneTips(w) {
  var t = w.py.filter(function (x) { return x !== 'r'; }).map(toneOf), tips = [];
  for (var i = 0; i < t.length - 1; i++) if (t[i] === 3 && t[i + 1] === 3) { tips.push('Two 3rd tones in a row: say the first one as a 2nd (rising) tone.'); break; }
  if (/不/.test(w.h) && w.h.length > 1) tips.push('不 bù is said bú before a 4th tone.');
  if (/一/.test(w.h) && w.h.length > 1) tips.push('一 yī changes tone in front of other syllables: yí before a 4th tone, yì before the others.');
  if (w.py.indexOf('r') >= 0) tips.push('The final r is the "erhua" sound, common in Beijing speech: curl the tongue back at the end.');
  return tips;
}
VW.intro = function (q) {
  var w = q.w, n = S.words ? S.words.length : 1, k = S.items.indexOf(q.item) + 1;
  var chars = [].slice.call(w.h).filter(function (c) { return CHBY[c]; });
  var ex = examplesFor(w.h)[0];
  var parts = w.h.length > 1 ? '<div class="stack"><h4 class="muted small">CHARACTERS</h4><div class="parts">' + chars.map(function (c) {
    var d = CHBY[c]; return '<button class="part" data-act="char" data-c="' + c + '"><span class="hz">' + c + '</span><span class="pyc small">' + pyHTML(d.p[0], [d.p[0]]) + '</span><span class="small muted">' + esc(d.g) + '</span></button>';
  }).join('') + '</div></div>' : '';
  var tips = toneTips(w).map(function (t) { return '<div class="tip">' + esc(t) + '</div>'; }).join('');
  return '<div class="q"><div class="row between"><span class="chip acc">New word ' + Math.min(k, n) + ' of ' + n + '</span><span class="muted small">Look, listen, then go on</span></div>' +
    '<div class="card stack intro">' +
    '<div class="iwrap" id="iw">' + chars.map(function (c, i) { return '<div class="iw" id="iw' + i + '"></div>'; }).join('') + '</div>' +
    '<div class="center"><div class="ipy pyc">' + pyHTML(w.p, w.py) + '</div><div class="ig">' + esc(w.g) + '</div>' + (w.pos.length ? '<div class="muted small">' + esc(w.pos.join(', ')) + '</div>' : '') + '</div>' +
    '<div class="row" style="justify-content:center">' + spks(w.h) + '<button class="btn sm" data-act="ianim">Show strokes again</button></div>' +
    tips + parts +
    (ex ? '<div class="stack"><h4 class="muted small">IN A SENTENCE</h4><div class="ex">' + sxHTML(ex.w, ex.py) + '<span class="muted">' + esc(ex.en) + '</span><span>' + spk(ex.w.join('')) + '</span></div></div>' : '') +
    '</div>' + nextBtn('Got it, next') + '</div>';
};
VW.write = function (q) {
  var done = q.res !== null, ok = q.res === 'ok', n = q.chars.length;
  var steps = '<div class="steps">' + q.chars.map(function (c, i) { return '<i class="' + (i < q.ci || done ? 'done' : (i === q.ci ? 'on' : '')) + '"></i>'; }).join('') + '</div>';
  var showPy = S.diff !== 'brutal' && (S.diff === 'easy' || q.hint);
  var gotten = q.chars.slice(0, q.ci).join('');
  return '<div class="q"><div class="prompt"><span class="sub">Write the characters for</span><div class="big">' + esc(q.w.g) + '</div>' +
    '<div class="sub" id="wpy"' + (showPy ? '' : ' hidden') + '>' + wpy(q.w) + '</div><div>' + spk(q.w.h) + '</div></div>' +
    (done ? fbBox(ok, wordInfo(q.w) + (ok ? '' : '<div class="small">Wrong strokes: ' + q.miss + '</div>')) + nextBtn() :
      steps + (gotten ? '<div class="sentence" style="font-size:1.6rem">' + esc(gotten) + '</div>' : '') +
      '<div class="writer" id="sw"></div><p class="muted small" style="text-align:center" id="wmsg">Draw character ' + (q.ci + 1) + ' of ' + n + '. Start with the first stroke.</p>' +
      '<div class="actions">' + (S.diff !== 'brutal' && S.diff !== 'easy' && !q.hint ? '<button class="btn" data-act="hint">Show pinyin</button>' : '') + '<button class="btn" data-act="reveal">Show me</button></div>') + '</div>';
};
VW.cards = function (q) {
  var w = q.w, front, back = wordInfo(w) + (w.m.length ? '<div class="small muted">' + esc(w.m[0]) + '</div>' : '');
  var ex = examplesFor(w.h)[0];
  if (ex) back += '<div class="ex" style="text-align:left;margin-top:8px">' + sxHTML(ex.w, ex.py) + '<span class="muted">' + esc(ex.en) + '</span></div>';
  if (q.dir === 'zh2en') front = '<div class="zhbig">' + esc(w.h) + '</div><div class="muted">What does it mean?</div>';
  else if (q.dir === 'en2zh') front = '<div class="big" style="font-size:1.8rem;font-weight:700">' + esc(w.g) + '</div><div class="muted">Recall the hanzi, then flip.</div>';
  else front = '<div class="muted">Listen, then recall the word.</div><button class="btn primary" data-act="say" data-t="' + esc(w.h) + '">Play audio</button>';
  return '<div class="q"><div class="card flash pop" data-act="flip">' + (q.flipped ? '<div class="stack" style="justify-items:center;width:100%">' + back + '<div>' + spk(w.h) + '</div></div>' : '<div class="stack" style="justify-items:center">' + front + '</div>') + '</div>' +
    (q.flipped ? '<div class="actions"><button class="btn" data-act="cmiss">Missed it</button><button class="btn good" data-act="cknow">Got it</button></div>' : '<div class="actions"><button class="btn primary" data-act="flip">Flip card</button></div>') + '</div>';
};
var QNAME = { build: 'Build the word', choose: 'Choose', listen: 'Listen', write: 'Write it', tones: 'Tones', intro: 'New word', sent: 'Build the sentence', fill: 'Fill the blank', cards: 'Card' };
function viewSession() {
  if (S.done) {
    var tot = S.graded || 1, pct = Math.round(S.ok / tot * 100);
    var rowFor = function (w, mark) { return '<div class="wrow" role="button" tabindex="0" data-act="word" data-id="' + w.id + '"><span class="hz">' + esc(w.h) + '</span><span class="meta"><b>' + wpy(w) + '</b><br><span class="g">' + esc(w.g) + '</span></span><span>' + (mark || '') + '</span></div>'; };
    var miss = S.miss.map(function (it) { return it.t === 'w' ? rowFor(it.w) : '<div class="ex">' + sxHTML(it.s.w, it.s.py) + '<span class="muted">' + esc(it.s.en) + '</span></div>'; });
    var uniq = {}; miss = miss.filter(function (h) { if (uniq[h]) return false; uniq[h] = 1; return true; }).join('');
    if (S.mode === 'learn') {
      var more = nextNew(P.set.learnN || 5);
      var list = S.words.map(function (w) { var g = S.res[w.id] !== false; return rowFor(w, '<span class="chip ' + (g ? 'known' : 'learning') + '">' + (g ? 'back tomorrow' : 'back in 10 min') + '</span>'); }).join('');
      return '<div class="view"><div class="card stack" style="text-align:center"><span class="muted">Learn new words</span><div class="score">' + S.words.length + ' new</div>' +
        '<p>' + S.ok + ' of ' + S.graded + ' answers right the first time. These words now come back in Review.</p>' +
        '<div class="actions">' + (more.length ? '<button class="btn primary" data-act="learnmore">Learn ' + more.length + ' more</button>' : '') +
        '<button class="btn" data-act="writelearned">Practise writing them</button><button class="btn" data-act="quit">Done</button></div></div>' +
        '<div class="stack"><h3>Words in this set</h3>' + list + '</div></div>';
    }
    var name = MODES[S.mode] ? MODES[S.mode].name : 'Practice';
    return '<div class="view"><div class="card stack" style="text-align:center"><span class="muted">' + esc(name) + (S.mode === 'cards' ? '' : ' &middot; ' + S.diff) + '</span><div class="score">' + S.ok + ' / ' + tot + '</div><p>' + (pct >= 90 ? 'Excellent. Try the next difficulty.' : pct >= 60 ? 'Solid. The misses below will come back sooner.' : 'Good practice. Look over the misses and go again.') + '</p>' +
      '<div class="actions"><button class="btn primary" data-act="again">Go again</button>' + (S.miss.length ? '<button class="btn" data-act="redomiss">Retry misses</button>' : '') + '<button class="btn" data-act="quit">Done</button></div></div>' +
      (miss ? '<div class="stack"><h3>To look over</h3>' + miss + '</div>' : '') + '</div>';
  }
  var pct2 = S.i / S.items.length * 100, m = M();
  var label = (S.mode === 'learn' || S.mode === 'review') ? '<span class="chip">' + esc(QNAME[m] || m) + (S.q.item.again ? ' &middot; again' : '') + '</span>' : (S.mode === 'cards' ? '' : '<span class="chip acc">' + S.diff + '</span>');
  return '<div class="view"><div class="sbar"><button class="btn sm" data-act="quit">Quit</button><div class="bar"><i style="width:' + pct2 + '%"></i></div><span class="muted small">' + (S.i + 1) + ' / ' + S.items.length + '</span>' + label + '</div>' + VW[m](S.q) + '</div>';
}
function setTabs() { document.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-current', t.getAttribute('data-t') === ui.tab ? 'page' : 'false'); }); }
function renderSession() {
  VIEW.innerHTML = viewSession();
  applyAudio(); setTabs();
  var q = S.q; if (!q || S.done) return;
  if (q.m === 'write' && q.res === null) mountWrite();
  if (q.m === 'intro') mountIntro();
  autoPlay();
}
function autoPlay() {
  var q = S.q; if (!q) return; var m = q.m;
  var key = (q.res === null || m === 'intro') ? '_a1' : '_a2'; if (q[key]) return; q[key] = true;
  if (m === 'intro') { if (P.set.auto) speak(q.w.h); return; }
  if (q.res === null) {
    if (m === 'listen' || m === 'tones') speak(q.say);
    else if (m === 'cards' && q.dir === 'audio') speak(q.w.h);
    else if (P.set.auto && S.diff !== 'brutal' && S.mode !== 'review' && (m === 'build' || m === 'write' || (m === 'choose' && q.item.t === 'w' && q.dir === 'zh2en'))) speak(q.item.t === 'w' ? q.item.w.h : '');
  } else if (P.set.auto) {
    var it = q.item; speak(it.t === 'w' ? it.w.h : it.s.w.join(''));
  }
}
/* the intro card draws each character stroke by stroke, one after another */
var IW = [];
function killIntro() { IW.forEach(function (w) { try { w.cancelQuiz(); } catch (e) { } }); IW = []; }
function mountIntro() {
  killIntro();
  var q = S.q, chars = [].slice.call(q.w.h).filter(function (c) { return CHBY[c]; });
  var size = chars.length > 2 ? 96 : (chars.length === 2 ? 130 : 170);
  if (window.innerWidth < 380 && chars.length > 2) size = 84;
  chars.forEach(function (c, i) {
    var el = $('#iw' + i); if (!el || !window.HanziWriter || !STROKES[c]) { if (el) { el.textContent = c; el.className += ' hz plainch'; } IW.push(null); return; }
    el.style.width = size + 'px'; el.style.height = size + 'px';
    IW.push(HanziWriter.create(el, c, {
      width: size, height: size, padding: 8, strokeColor: css('--fg', '#14202E'), radicalColor: css('--accent', '#2650A8'), outlineColor: css('--grid', '#C9D2DE'),
      showOutline: true, showCharacter: true, strokeAnimationSpeed: 1.1, delayBetweenStrokes: 160,
      charDataLoader: function (ch, ok) { var d = STROKES[ch]; ok({ strokes: d.s, medians: d.m }); }
    }));
  });
  animIntro();
}
function animIntro() {
  var list = IW.slice(), q = S && S.q;
  function step(i) {
    if (!S || S.q !== q || i >= list.length) return;
    var w = list[i]; if (!w) { step(i + 1); return; }
    try { w.hideCharacter(); w.animateCharacter({ onComplete: function () { setTimeout(function () { step(i + 1); }, 250); } }); } catch (e) { step(i + 1); }
  }
  setTimeout(function () { step(0); }, 300);
}
function mountWrite() {
  var q = S.q, ch = q.chars[q.ci], d = S.diff;
  var limit = { easy: 4, hard: 2, brutal: 0 }[d];
  var w = mountWriter($('#sw'), ch, { showOutline: d === 'easy', showHintAfterMisses: d === 'easy' ? 1 : (d === 'hard' ? 3 : false), highlightOnComplete: true });
  if (!w) { $('#wmsg').textContent = 'Stroke data missing for this character.'; return; }
  w.quiz({
    onMistake: function () { q.miss++; $('#wmsg').textContent = 'Not that stroke. Misses: ' + q.miss; if (d === 'brutal') { /* fails at the end */ } },
    onCorrectStroke: function () { $('#wmsg').textContent = 'Good.'; },
    onComplete: function () {
      setTimeout(function () {
        if (S.q !== q || q.res !== null) return;
        if (q.ci + 1 < q.chars.length) { q.ci++; renderSession(); }
        else { record(q.miss <= limit, q.w.id); renderSession(); }
      }, 650);
    }
  });
}

/* ---------- grammar ---------- */
function viewGrammar() {
  var tabs = '<div class="seg"><button data-act="gtab" data-t="lessons" aria-pressed="' + (ui.gtab === 'lessons') + '">Lessons</button><button data-act="gtab" data-t="syllabus" aria-pressed="' + (ui.gtab === 'syllabus') + '">Official checklist</button></div>';
  if (ui.gram) {
    var g = GR.filter(function (x) { return x.id === ui.gram; })[0], done = !!P.gram[g.id];
    var ex = g.ex.map(function (e) { return '<div class="ex">' + sxHTML(e.w, e.py) + '<span class="muted">' + esc(e.en) + '</span><span>' + spk(e.w.join('')) + '</span></div>'; }).join('');
    return '<div class="view"><div class="row between"><button class="btn sm" data-act="gback">All lessons</button><button class="btn sm' + (done ? ' good' : '') + '" data-act="gdone" data-id="' + g.id + '">' + (done ? 'Marked as learned' : 'Mark as learned') + '</button></div>' +
      '<div><h2>' + esc(g.title) + '</h2><p class="muted hz" style="font-weight:500">' + esc(g.cn) + '</p></div>' +
      '<div class="rule">' + esc(g.rule) + '</div>' + g.body.map(function (b) { return '<p>' + esc(b) + '</p>'; }).join('') +
      '<div>' + g.patterns.map(function (p) { return '<span class="pat">' + esc(p) + '</span>'; }).join('') + '</div>' +
      '<div class="stack"><h3>Examples</h3>' + ex + '</div>' + g.tips.map(function (t) { return '<div class="tip">' + esc(t) + '</div>'; }).join('') +
      '<div class="actions"><button class="btn primary" data-act="gprac" data-id="' + g.id + '">Practise these sentences</button><button class="btn" data-act="gfill" data-id="' + g.id + '">Fill the blank</button></div></div>';
  }
  if (ui.gtab === 'syllabus') {
    var cov = {}; GR.forEach(function (g2) { if (P.gram[g2.id]) g2.official.forEach(function (n) { cov[n] = 1; }); });
    var nd = Object.keys(cov).length;
    return '<div class="view"><div class="head"><div><h2>Grammar</h2><p>' + nd + ' of ' + OF.length + ' official items covered by lessons you marked as learned.</p></div></div>' + tabs +
      '<div class="stack">' + OF.map(function (o) {
        return '<div class="check' + (cov[o.n] ? ' done' : '') + '"><span class="n">' + o.n + '</span><div><div>' + esc(o.en) + '</div><div class="hz muted small" style="font-weight:500">' + esc(o.cn) + '</div><div class="row" style="margin-top:4px">' + o.lessons.map(function (id) { var gg = GR.filter(function (x) { return x.id === id; })[0]; return '<button class="chip acc" data-act="gl" data-id="' + id + '">' + esc(gg.title) + '</button>'; }).join('') + '</div></div></div>';
      }).join('') + '</div></div>';
  }
  return '<div class="view"><div class="head"><div><h2>Grammar</h2><p>' + GR.length + ' short lessons covering every item on the official HSK 3.0 level 1 grammar list. Tap any word in an example to see what it means.</p></div></div>' + tabs +
    '<button class="gl" data-act="tones"><h3><span>Start here: tones and pinyin</span><span class="chip acc">audio</span></h3><span class="muted small">The four tones, how they change, and the pinyin sounds that trip people up.</span></button>' +
    '<div class="stack">' + GR.map(function (g3) { return '<button class="gl" data-act="gl" data-id="' + g3.id + '"><h3><span>' + esc(g3.title) + '</span><span class="chip ' + (P.gram[g3.id] ? 'known' : '') + '">' + (P.gram[g3.id] ? 'learned' : g3.ex.length + ' examples') + '</span></h3><span class="muted small">' + esc(g3.rule) + '</span></button>'; }).join('') + '</div></div>';
}

/* ---------- settings ---------- */
function audioStatus() {
  var n = Object.keys(AIDX).length;
  if (audioState === 'ready') return 'Recorded audio is ready: ' + n + ' clips. Words are recorded by native speakers; sentences use an offline Mandarin voice with checked pronunciation.';
  if (audioState === 'loading') return 'Loading recorded audio (about 4 MB, once)...';
  var vs = !synth ? 'this browser has no speech engine either' : (voice ? 'using the device voice "' + voice.name + '" instead' : 'and this device has no Chinese voice, so audio may stay silent');
  return 'Recorded audio could not load (' + (audioErr || 'unknown error') + '), ' + vs + '.';
}
function openSettings() {
  var sync = dbState === 'synced' ? 'Progress is saved to your account and this browser.' : dbState === 'ready' ? 'Progress saves to your account and this browser.' : dbState === 'error' ? 'Account sync failed. Progress is saved in this browser only.' : 'Progress is saved in this browser. Use the backup box to move it.';
  var ln = [3, 5, 8].map(function (n) { return '<button data-act="learnn" data-n="' + n + '" aria-pressed="' + ((P.set.learnN || 5) === n) + '">' + n + '</button>'; }).join('');
  openModal('<div class="row between"><h3 style="font-size:1.3rem">Settings</h3><button class="iconbtn" data-act="closem" aria-label="Close">&times;</button></div>' +
    '<div class="stack"><b>Audio</b><div class="row"><button class="switch" role="switch" aria-checked="' + P.set.tts + '" data-act="tts"><span class="knob"></span>Audio on</button>' +
    '<button class="switch" role="switch" aria-checked="' + P.set.auto + '" data-act="auto"><span class="knob"></span>Play automatically</button></div>' +
    '<label class="f">Speed <span class="muted small" id="rv">' + P.set.rate.toFixed(2) + 'x</span><input type="range" id="rate" min="0.6" max="1.3" step="0.05" value="' + P.set.rate + '"></label>' +
    '<div class="row"><button class="btn sm" data-act="say" data-t="你好，我是你的汉语老师">Test a sentence</button><button class="btn sm" data-act="say" data-t="谢谢">Test a word</button></div><p class="muted small" id="astat">' + esc(audioStatus()) + '</p>' +
    '<p class="muted small">No sound? Check the device volume and silent switch, and that the Audio switch at the top is on.</p></div>' +
    '<div class="stack"><b>Learning</b><div class="row"><button class="switch" role="switch" aria-checked="' + !!P.set.tc + '" data-act="tonecol"><span class="knob"></span>Colour pinyin by tone</button></div>' +
    '<div class="row"><span>New words per Learn session</span><div class="seg">' + ln + '</div></div>' +
    '<div class="row"><button class="btn sm" data-act="tones">Tones guide</button><button class="btn sm" data-act="showwelcome">Show the how-to card on Home</button></div>' +
    '<p class="muted small">Keyboard: 1 to 9 pick an answer, Enter checks or goes on, R plays the audio again.</p></div>' +
    '<div class="stack"><b>Your progress</b><p class="muted small">' + esc(sync) + '</p>' +
    '<textarea id="bk" aria-label="Backup text" spellcheck="false" placeholder="Press Show backup to see a copy of your progress. Paste a backup here and press Restore to load it."></textarea>' +
    '<div class="row"><button class="btn sm" data-act="bshow">Show backup</button><button class="btn sm" data-act="bcopy">Copy</button><button class="btn sm" data-act="brestore">Restore</button><button class="btn sm" data-act="breset">Reset all progress</button></div></div>' +
    '<p class="muted small">Word list: HSK 3.0 level 1 (complete-hsk-vocabulary and ivankra/hsk30, MIT). Stroke data: Hanzi Writer Data (Arphic Public License, from Make Me a Hanzi). Word and syllable recordings: audio-cmn by Yue Tan and Chen Wang (CC BY-SA). Sentence audio: Matcha TTS trained on the Databaker Mandarin corpus (non-commercial use). Example sentences and grammar notes are original.</p>');
}

/* ---------- tones guide ---------- */
function contour(levels, t) {
  // Chao tone letters: pitch 1 (low) to 5 (high), drawn left to right
  var W2 = 64, H = 44, pts = levels.map(function (l, i) { return [6 + i * (W2 - 12) / Math.max(1, levels.length - 1), H - 4 - (l - 1) * (H - 8) / 4]; });
  var grid = [1, 2, 3, 4, 5].map(function (l) { var y = H - 4 - (l - 1) * (H - 8) / 4; return '<line x1="2" x2="' + (W2 - 2) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" stroke-width="1"/>'; }).join('');
  var path = levels.length === 1 ? '<circle cx="' + W2 / 2 + '" cy="' + pts[0][1] + '" r="4" fill="var(--t5)"/>' : '<polyline fill="none" stroke="var(--t' + t + ')" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '"/>';
  return '<svg class="contour" viewBox="0 0 ' + W2 + ' ' + H + '" width="' + W2 + '" height="' + H + '" aria-hidden="true">' + grid + path + '</svg>';
}
function sylBtn(s) { return AIDX['syl:' + s] ? '<button class="btn sm sylb t' + toneOf(s) + '" data-act="say" data-audio data-t="syl:' + s + '">' + esc(s) + '</button>' : ''; }
function wordBtn(h, note) { var w = WBY[h]; if (!w) return ''; return '<button class="btn sm" data-act="say" data-audio data-t="' + esc(h) + '"><span class="hz">' + esc(h) + '</span> ' + wpy(w) + (note ? ' <span class="muted">' + esc(note) + '</span>' : '') + '</button>'; }
function openTones() {
  var T = [
    [1, [5, 5], 'High and level', 'Hold the note steady, as if singing.', ['mā', 'bā', 'shī', 'yī'], '妈 mā means mother.'],
    [2, [3, 5], 'Rising', 'Goes up, like asking "huh?"', ['má', 'bá', 'shí', 'yí'], '麻 má means hemp.'],
    [3, [2, 1, 4], 'Low, dipping', 'Drops low and comes back up. In normal speech it often stays low.', ['mǎ', 'bǎ', 'shǐ', 'yǐ'], '马 mǎ means horse.'],
    [4, [5, 1], 'Falling', 'Drops sharply, like a firm "No!"', ['mà', 'bà', 'shì', 'yì'], '骂 mà means to scold.'],
    [5, [3], 'Light (neutral)', 'Short and unstressed, no mark. Its pitch follows the syllable before.', [], '吗 ma turns a sentence into a question.']
  ];
  var rows = T.map(function (r) {
    return '<div class="trow"><div>' + contour(r[1], r[0]) + '</div><div class="stack" style="gap:4px"><b class="t' + r[0] + '">' + (r[0] < 5 ? ['', '1st', '2nd', '3rd', '4th'][r[0]] + ' tone' : 'Light tone') + ': ' + esc(r[2]) + '</b><span class="small">' + esc(r[3]) + ' ' + esc(r[5]) + '</span>' +
      '<div class="row" style="gap:6px">' + (r[4].length ? r[4].map(sylBtn).join('') : (AIDX['syl:ma'] ? '<button class="btn sm sylb t5" data-act="say" data-t="syl:ma">ma</button>' : '')) + '</div></div></div>';
  }).join('');
  var seen = W.some(function (w) { return status(w.id) !== 'new'; });
  openModal('<div class="row between"><h3 style="font-size:1.3rem">Tones and pinyin</h3><button class="iconbtn" data-act="closem" aria-label="Close">&times;</button></div>' +
    '<p>Mandarin uses pitch to tell words apart. <span class="t1">mā</span>, <span class="t2">má</span>, <span class="t3">mǎ</span> and <span class="t4">mà</span> are four different words. Pinyin shows the tone with a mark over the vowel. Tap each button and copy the sound out loud.</p>' +
    '<div class="stack">' + rows + '</div>' +
    '<div class="stack"><b>Tones change in a few fixed places</b>' +
    '<div class="tip">Two 3rd tones in a row: the first one becomes a 2nd tone. 你好 is written nǐ hǎo but said ní hǎo, and 水果 shuǐguǒ is said shuíguǒ. ' + wordBtn('水果') + '</div>' +
    '<div class="tip">不 bù becomes bú before a 4th tone: 不客气 bú kèqi. ' + wordBtn('不客气') + '</div>' +
    '<div class="tip">一 yī becomes yí before a 4th tone and yì before the others: 一起 yìqǐ, 一下儿 yíxiàr. When counting, and at the end of a word, it stays yī. ' + wordBtn('一起') + '</div>' +
    '<p class="muted small">Word lists, including this app, write the original tones. The audio has the changed tones, because that is how people speak.</p></div>' +
    '<div class="stack"><b>Pinyin sounds that surprise English speakers</b><ul class="plist">' +
    '<li><b>x, q, j</b>: tongue flat behind the lower teeth. x is close to "sh" with a smile, q to "ch", j to "j". ' + wordBtn('谢谢') + wordBtn('去') + '</li>' +
    '<li><b>zh, ch, sh, r</b>: tongue curled back. ' + wordBtn('中国') + wordBtn('吃') + '</li>' +
    '<li><b>z, c, s</b>: z is "ds" as in "kids", c is "ts" as in "cats". ' + wordBtn('字') + wordBtn('菜') + '</li>' +
    '<li><b>ü</b>: say "ee" with rounded lips. After j, q, x and y it is written u: qù, yǔ. ' + wordBtn('女') + wordBtn('雨') + '</li>' +
    '<li><b>-i after zh, ch, sh, r, z, c, s</b> is a buzzing vowel, not "ee": shì, zì. ' + wordBtn('是') + '</li>' +
    '<li><b>e</b> on its own is like the "u" in "duh", not "ay". ' + wordBtn('喝') + '</li></ul></div>' +
    '<div class="actions"><button class="btn primary" data-act="tonedrill">Practise hearing tones</button></div>');
}

/* ---------- router / render ---------- */
function render() {
  setTabs();
  if (S) { renderSession(); return; }
  var v = ui.tab === 'home' ? viewHome() : ui.tab === 'words' ? viewWords() : ui.tab === 'practice' ? viewPractice() : viewGrammar();
  VIEW.innerHTML = v; applyAudio();
}
function go(tab) { ui.tab = tab; S = null; killWriter(); closeModal(); if (tab !== 'practice') ui.setup = null; if (tab === 'grammar') ui.gram = null; if (tab === 'words') ui.lesson = null; render(); window.scrollTo(0, 0); }

/* ---------- actions ---------- */
var ACT = {
  tab: function (e) { go(e.getAttribute('data-t')); },
  say: function (e) { speak(e.getAttribute('data-t'), e.hasAttribute('data-slow')); },
  wordh: function (e) { var w = WBY[e.getAttribute('data-h')]; if (w) wordModal(w.id); },
  word: function (e) { wordModal(+e.getAttribute('data-id')); },
  char: function (e) { charModal(e.getAttribute('data-c')); },
  closem: function () { closeModal(); },
  lesson: function (e) { ui.lesson = +e.getAttribute('data-n'); render(); window.scrollTo(0, 0); },
  lessons: function () { ui.lesson = null; render(); },
  wf: function (e) { ui.f = e.getAttribute('data-f'); render(); },
  studyl: function (e) { var n = +e.getAttribute('data-n'); ui.tab = 'practice'; startSession('cards', { scope: 'L' + n, n: 20, dir: 'zh2en' }); },
  buildl: function (e) { var n = +e.getAttribute('data-n'); ui.tab = 'practice'; startSession('build', { scope: 'L' + n, n: 10 }); },
  startmode: function (e) {
    var m = e.getAttribute('data-mode'); S = null; ui.tab = 'practice'; ui.setup = m;
    var sc = P.set.scope, sentScope = sc.indexOf('T:') === 0 || sc.indexOf('G:') === 0;
    if (MODES[m].kind === 'sent' && sc !== 'all' && !sentScope) P.set.scope = 'all';
    if (MODES[m].kind !== 'sent' && sentScope) P.set.scope = 'due';
    closeModal(); render(); window.scrollTo(0, 0);
  },
  unsetup: function () { ui.setup = null; render(); },
  diff: function (e) { P.set.diff = e.getAttribute('data-d'); save(); render(); },
  num: function (e) { P.set.n = +e.getAttribute('data-n'); save(); render(); },
  begin: function () {
    var m = ui.setup, sc = $('#s-scope'), dir = $('#s-dir'), kd = $('#s-kind');
    if (sc) { P.set.scope = sc.value; save(); }
    startSession(m, { dir: dir ? dir.value : 'mix', kind: kd ? kd.value : 'words' });
  },
  quit: function () {
    var m = S && S.mode; S = null; killWriter(); killIntro(); stopAudio();
    if (m === 'learn' || m === 'review' || !MODES[m]) { ui.setup = null; ui.tab = 'home'; } else ui.setup = m;
    render(); window.scrollTo(0, 0);
  },
  again: function () {
    if (S.mode === 'learn') { startLearn(nextNew(P.set.learnN || 5)); return; }
    if (S.mode === 'review') { startReview(); return; }
    var m = S.mode, o = Object.assign({}, S.again, { items: null, dir: S.dir }); startSession(m, o);
  },
  redomiss: function () {
    var m = S.mode, items = S.miss.map(function (it) { var c = Object.assign({}, it); delete c.again; return c; });
    if (m === 'learn' || m === 'review') { startSession('review', { items: items, requeue: true }); return; }
    startSession(m, Object.assign({}, S.again, { items: items, dir: S.dir }));
  },
  learn: function () { startLearn(nextNew(P.set.learnN || 5)); },
  learnl: function (e) { startLearn(nextNew(P.set.learnN || 5, +e.getAttribute('data-n'))); },
  learnmore: function () { startLearn(nextNew(P.set.learnN || 5)); },
  review: function () { startReview(); },
  writelearned: function () { var ws = (S.words || []).filter(canWrite); if (!ws.length) { toast('No stroke data for these words.'); return; } startSession('write', { items: ws.map(function (w) { return { t: 'w', w: w }; }), diff: 'easy' }); },
  hidewelcome: function () { P.set.hideWelcome = true; save(); render(); },
  tones: function () { openTones(); },
  tonedrill: function () { closeModal(); var seen = W.filter(function (w) { return status(w.id) !== 'new' && toneable(w); }).length; startSession('tones', { scope: seen >= 5 ? 'seen' : 'all', n: 10, diff: 'easy' }); },
  ianim: function () { animIntro(); },
  tonecol: function () { P.set.tc = !P.set.tc; save(); applyAudio(); openSettings(); },
  learnn: function (e) { P.set.learnN = +e.getAttribute('data-n'); save(); openSettings(); },
  showwelcome: function () { P.set.hideWelcome = false; save(); closeModal(); ui.tab = 'home'; S = null; render(); },
  pick: function (e) { var q = S.q; if (q.res !== null) return; var id = +e.getAttribute('data-i'); var lim = M() === 'build' ? q.chars.length : 99; if (q.placed.length >= lim) return; q.placed.push(id); renderSession(); },
  unpick: function (e) { var q = S.q; if (q.res !== null) return; var id = +e.getAttribute('data-i'); q.placed = q.placed.filter(function (x) { return x !== id; }); renderSession(); },
  clear: function () { var q = S.q; if (q.res !== null) return; q.placed = []; renderSession(); },
  hint: function (e) {
    var q = S.q;
    if (M() === 'write') { q.hint = true; var py = $('#wpy'); if (py) py.hidden = false; if (e && e.parentNode) e.parentNode.removeChild(e); return; }
    if (M() === 'sent') q.showPy = !q.showPy; else q.hint = true;
    renderSession();
  },
  peek: function () { S.q.showEn = true; renderSession(); },
  check: function () {
    var q = S.q; if (q.res !== null) return;
    if (M() === 'build') { var s = q.placed.map(function (id) { return q.tiles.filter(function (t) { return t.id === id; })[0].c; }).join(''); record(s === q.w.h, q.w.id); }
    else { var sx = q.placed.map(function (id) { return q.tiles.filter(function (t) { return t.id === id; })[0].c; }); record(sx.join('|') === q.toks.join('|'), undefined); }
    renderSession();
  },
  opt: function (e) {
    var q = S.q; if (q.res !== null) return; var i = +e.getAttribute('data-i'); q.picked = i; var ok = q.opts[i].ok;
    var wid = q.item.t === 'w' ? q.item.w.id : undefined;
    if (M() === 'fill') wid = undefined;
    record(ok, wid); renderSession();
  },
  next: function () { nextQ(); },
  flip: function () { var q = S.q; if (q.flipped) return; q.flipped = true; renderSession(); speak(q.w.h); },
  cknow: function () { var q = S.q; record(true, q.w.id); nextQ(); },
  cmiss: function () { var q = S.q; record(false, q.w.id); nextQ(); },
  reveal: function () {
    var q = S.q; if (q.res !== null) return; var w = HWR;
    if (w) { try { w.cancelQuiz(); w.animateCharacter({ onComplete: function () { setTimeout(function () { if (S && S.q === q && q.res === null) { record(false, q.w.id); renderSession(); } }, 600); } }); } catch (er) { record(false, q.w.id); renderSession(); } }
    else { record(false, q.w.id); renderSession(); }
  },
  writeone: function (e) { var w = W[+e.getAttribute('data-id')]; closeModal(); ui.tab = 'practice'; startSession('write', { items: [{ t: 'w', w: w }], diff: P.set.diff }); },
  canim: function () { if (HWR) { try { HWR.cancelQuiz(); } catch (er) { } HWR.hideCharacter(); HWR.animateCharacter(); $('#cmsg').textContent = 'Watch the stroke order.'; } },
  cquiz: function () { if (HWR) { $('#cmsg').textContent = 'Draw the first stroke.'; HWR.quiz({ showHintAfterMisses: 2, onComplete: function (s) { $('#cmsg').textContent = s.totalMistakes ? 'Done with ' + s.totalMistakes + ' wrong stroke' + (s.totalMistakes > 1 ? 's' : '') + '.' : 'Perfect.'; } }); } },
  gl: function (e) { ui.tab = 'grammar'; ui.gram = e.getAttribute('data-id'); S = null; render(); window.scrollTo(0, 0); },
  gback: function () { ui.gram = null; render(); },
  gtab: function (e) { ui.gtab = e.getAttribute('data-t'); render(); },
  gdone: function (e) { var id = e.getAttribute('data-id'); if (P.gram[id]) delete P.gram[id]; else P.gram[id] = 1; save(); render(); },
  gprac: function (e) { var id = e.getAttribute('data-id'); ui.tab = 'practice'; startSession('sent', { scope: 'G:' + id, n: 20 }); },
  gfill: function (e) { var id = e.getAttribute('data-id'); ui.tab = 'practice'; startSession('fill', { scope: 'G:' + id, n: 20 }); },
  settings: function () { openSettings(); },
  tts: function () { P.set.tts = !P.set.tts; if (!P.set.tts) stopAudio(); save(); applyAudio(); if (ui.modal) openSettings(); else if (!S) render(); else renderSession(); },
  auto: function () { P.set.auto = !P.set.auto; save(); openSettings(); },
  bshow: function () { $('#bk').value = JSON.stringify(P); },
  bcopy: function () { var t = $('#bk'); if (!t.value) t.value = JSON.stringify(P); t.select(); try { navigator.clipboard.writeText(t.value).then(function () { toast('Copied'); }, function () { toast('Press Ctrl+C to copy'); }); } catch (er) { toast('Press Ctrl+C to copy'); } },
  brestore: function () { try { var o = JSON.parse($('#bk').value); if (!o || typeof o !== 'object' || !o.srs) throw 0; adopt(o); save(); toast('Progress restored'); closeModal(); render(); } catch (er) { toast('That backup text is not valid'); } },
  breset: function (e) { if (e.getAttribute('data-sure')) { var keep = P.set; adopt({}); P.set = keep; save(); toast('Progress reset'); closeModal(); render(); } else { e.setAttribute('data-sure', '1'); e.textContent = 'Tap again to erase everything'; e.classList.add('primary'); } }
};

document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
document.addEventListener('keydown', unlockAudio, { once: true, capture: true });
document.addEventListener('click', function (ev) {
  var t = ev.target.closest('[data-act]'); if (!t) return;
  if (t.classList.contains('scrim') && ev.target.closest('[data-stop]')) return;
  var a = t.getAttribute('data-act');
  if (ACT[a]) { ev.preventDefault(); ACT[a](t, ev); }
});
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape' && ui.modal) { closeModal(); return; }
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.getAttribute && ev.target.getAttribute('role') === 'button' && ev.target.hasAttribute('data-act')) { ev.preventDefault(); ev.target.click(); return; }
  if (ev.key === 'Enter' && S && !ui.modal && ev.target.tagName !== 'BUTTON' && ev.target.tagName !== 'SELECT') {
    var nb = $('#nextbtn'); if (nb) { nb.click(); return; }
    if (S.q && S.q.res === null && (M() === 'build' || M() === 'sent')) ACT.check();
  }
  // number keys pick options, R replays the audio
  if (S && S.q && !ui.modal && !/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName || '') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    if (/^[1-9]$/.test(ev.key)) { var ob = document.querySelectorAll('#view .opts .tile')[+ev.key - 1]; if (ob && !ob.disabled) { ev.preventDefault(); ob.click(); } }
    else if (ev.key === 'r' || ev.key === 'R') { var sb = $('#view .prompt [data-act="say"]') || $('#view [data-act="say"]'); if (sb) { ev.preventDefault(); sb.click(); } }
  }
});
document.addEventListener('input', function (ev) {
  if (ev.target.id === 'q') {
    var wasFiltered = !!(ui.q || ui.f !== 'all'); ui.q = ev.target.value; var nowFiltered = !!(ui.q || ui.f !== 'all'), l = $('#wlist');
    if (l && wasFiltered === nowFiltered) l.innerHTML = wordList();
    else { render(); var qi = $('#q'); if (qi) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); } }
  }
  if (ev.target.id === 'rate') { P.set.rate = +ev.target.value; $('#rv').textContent = P.set.rate.toFixed(2) + 'x'; save(); }
});
document.addEventListener('change', function (ev) { if (ev.target.id === 's-scope') { P.set.scope = ev.target.value; save(); } });

$('#ttsSwitch').addEventListener('click', function () { ACT.tts(); });
$('#setBtn').addEventListener('click', function () { ACT.settings(); });
document.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('data-act', 'tab'); });

loadLocal(); applyAudio(); render(); initDb(); try { preloadAudio(); } catch (e) { audioState = 'failed'; }
window.__hsk = { get P() { return P; }, get S() { return S; }, ACT: ACT, ui: ui, W: W, SN: SN, MK: MK, AIDX: AIDX, startSession: startSession, startLearn: startLearn, startReview: startReview, record: record, render: render, status: status, speak: speak, toneable: toneable, get audioState() { return audioState; }, pyHTML: pyHTML, markTone: markTone, toneOf: toneOf, baseOf: baseOf };
})();
