// New features: recorded audio path, learn / review sessions, tones drill and guide, tappable words, keyboard.
const { JSDOM, VirtualConsole } = require('/tmp/hsk/npm/node_modules/jsdom');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' + fs.readFileSync(ROOT + '/dist/hsk1.html', 'utf8').replace(/<link[^>]*>/g, '') + '</body></html>';
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { const m = (e.detail && e.detail.stack || e.message || '').split('\n').slice(0, 3).join(' | '); if (!/Not implemented: (HTMLMediaElement|window.scrollTo)/.test(m)) errors.push(m); });
const played = [], webspoken = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://example.org/app/',
  beforeParse(w) {
    w.scrollTo = () => {};
    w.fetch = (u) => { const f = path.join(ROOT, 'dist', String(u)); const b = fs.readFileSync(f); return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) }); };
    let n = 0; w.URL.createObjectURL = (blob) => { const id = 'blob:test/' + (++n); w.__blobs[id] = blob; return id; }; w.__blobs = {};
    w.Audio = function () { this.src = ''; this.play = () => { played.push(this.src); return Promise.resolve(); }; this.pause = () => {}; };
    w.speechSynthesis = { getVoices: () => [], cancel() {}, speak(u) { webspoken.push(u.text); }, addEventListener() {}, paused: false, resume() {} };
    w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  }
});
const w = dom.window, doc = w.document, H = w.__hsk;
const $ = (s) => doc.querySelector(s), $$ = (s) => [...doc.querySelectorAll(s)];
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const key = (k) => doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function answer(correct) {
  const q = H.S.q, m = q.m;
  if (m === 'intro') { click($('#nextbtn')); return; }
  if (['choose', 'listen', 'tones', 'fill'].includes(m)) {
    let i = q.opts.findIndex(o => o.ok); if (!correct) i = q.opts.findIndex(o => !o.ok);
    click($$('.opts .tile')[i]); return;
  }
  if (m === 'build' || m === 'sent') {
    const want = m === 'build' ? q.chars : q.toks; const used = [];
    want.forEach((c, k) => {
      let t = q.tiles.find(t => t.c === c && !used.includes(t.id));
      if (!correct && k === 0) t = q.tiles.find(t => t.c !== c && !used.includes(t.id)) || t;
      used.push(t.id); click($(`[data-act=pick][data-i="${t.id}"]`));
    });
    click($('[data-act=check]')); return;
  }
  if (m === 'write') { H.record(correct, q.w.id); H.render(); return; }
  if (m === 'cards') { click($(correct ? '[data-act=flip]' : '[data-act=flip]')); click($(correct ? '[data-act=cknow]' : '[data-act=cmiss]')); return; }
  throw new Error('unknown mode ' + m);
}
function next() { const nb = $('#nextbtn'); if (nb) click(nb); }

(async () => {
  ok(!!H, 'app booted');
  await sleep(50);
  ok(H.audioState === 'ready', 'audio bundles loaded: ' + H.audioState);

  // 1. every clip is a well-formed mp3 slice
  const bufs = { w: fs.readFileSync(ROOT + '/dist/audio/words.mp3'), s: fs.readFileSync(ROOT + '/dist/audio/sents.mp3') };
  let badClip = 0;
  for (const [k, [b, off, len]] of Object.entries(H.AIDX)) { const x = bufs[b].subarray(off, off + len); const good = (x[0] === 0x49 && x[1] === 0x44 && x[2] === 0x33) || (x[0] === 0xFF && (x[1] & 0xE0) === 0xE0); if (!good || len < 300) badClip++; }
  ok(badClip === 0, 'bad mp3 slices: ' + badClip);

  // 2. everything the app can say has a recorded clip
  const plain = (t) => t.replace(/[\s，。？！、；：]/g, '');
  const D = w.D; const missing = [];
  D.words.forEach(x => { if (!H.AIDX[x.h]) missing.push(x.h); });
  D.chars.forEach(x => { if (!H.AIDX[x.c]) missing.push(x.c); });
  D.sents.forEach(x => { if (!H.AIDX[plain(x.w.join(''))]) missing.push(x.w.join('')); });
  D.grammar.forEach(g => g.ex.forEach(x => { if (!H.AIDX[plain(x.w.join(''))]) missing.push(x.w.join('')); }));
  ok(missing.length === 0, 'texts without a clip: ' + missing.slice(0, 10).join(' '));

  // 3. speak() plays the clip through the audio element, not the browser voice
  played.length = 0; webspoken.length = 0;
  H.speak('谢谢'); ok(played.length === 1 && /^blob:test\//.test(played[0]), 'word plays a recorded clip');
  const blob = w.__blobs[played[0]]; ok(blob && blob.size === H.AIDX['谢谢'][2], 'clip slice has the right size');
  H.speak('你好，我是你的汉语老师'); ok(played.length === 2, 'sentence with punctuation plays a clip');
  H.speak('syl:mǎ'); ok(played.length === 3, 'tone syllable plays');
  H.speak('不在表里的话'); await sleep(120); ok(webspoken.length === 1, 'unknown text falls back to the browser voice');
  click($('#ttsSwitch')); played.length = 0; H.speak('谢谢'); ok(played.length === 0, 'audio off is silent'); click($('#ttsSwitch'));

  // 4. home: welcome card + Today
  H.render();
  ok($('.welcome') && $('[data-act=learn]'), 'welcome and learn button on a fresh profile');
  ok($('[data-act=review]').disabled, 'review disabled before learning anything');

  // 5. learn 5 words, all right
  click($('[data-act=learn]'));
  ok(H.S && H.S.mode === 'learn' && H.S.words.length === 5, 'learn session started');
  ok($('.intro') && $$('.iw').length >= 1, 'intro card rendered with stroke boxes');
  ok(played.length >= 1, 'intro auto-plays the word');
  const learned = H.S.words.map(x => x.id);
  let guard = 0; while (H.S && !H.S.done && guard++ < 60) { if (H.S.q.res === null || H.S.q.m === 'intro') answer(true); if (H.S.q && H.S.q.res !== null && H.S.q.m !== 'intro') next(); }
  ok(H.S.done, 'learn session finished in ' + guard + ' steps');
  ok($('[data-act=learnmore]') && $('[data-act=writelearned]'), 'learn results offer next steps');
  ok(learned.every(id => H.status(id) === 'learning' && H.P.srs[id].b === 1), 'learned words are in box 1: ' + learned.map(id => H.P.srs[id] && H.P.srs[id].b));
  ok(learned.every(id => H.P.srs[id].d > Date.now() + 20 * 3600e3), 'learned words due tomorrow');

  // 6. learn 5 more with one mistake: that question comes back once, word lands in box 0
  click($('[data-act=learnmore]'));
  const ids2 = H.S.words.map(x => x.id); let wrongDone = false; let againSeen = false; guard = 0;
  while (H.S && !H.S.done && guard++ < 80) {
    const q = H.S.q;
    if (q.item.again) againSeen = true;
    if (q.m !== 'intro' && !wrongDone && q.m === 'choose') { answer(false); wrongDone = q.w.id; ok($('.picked'), 'wrong pick explained'); }
    else if (q.res === null || q.m === 'intro') answer(true);
    if (H.S.q && H.S.q.res !== null && H.S.q.m !== 'intro') next();
  }
  ok(againSeen, 'missed question came back in the same session');
  ok(H.P.srs[wrongDone].b === 0 && ids2.filter(i => i !== wrongDone).every(i => H.P.srs[i].b === 1), 'mistaken word in box 0, the rest in box 1');
  click($('[data-act=quit]'));
  ok(H.ui.tab === 'home' && !H.S, 'quit from learn returns home');

  // 7. review: make everything due, run a mixed session
  Object.values(H.P.srs).forEach(r => r.d = 0); H.render();
  ok(!$('[data-act=review]').disabled && /Review 10 now/.test($('[data-act=review]').textContent), 'review button shows due count: ' + $('[data-act=review]').textContent);
  click($('[data-act=review]'));
  const kinds = new Set(H.S.items.map(i => i.m)); ok(kinds.size >= 2, 'review mixes question types: ' + [...kinds]);
  guard = 0; while (H.S && !H.S.done && guard++ < 60) { if (H.S.q.res === null) answer(true); next(); }
  ok(H.S.done && H.S.ok === H.S.graded, 'review finished, all right ' + H.S.ok + '/' + H.S.graded);
  click($('[data-act=quit]'));

  // 8. tones drill
  const toneWords = H.W.filter(H.toneable); ok(toneWords.length > 250, 'toneable words: ' + toneWords.length);
  let badT = 0;
  ['easy', 'hard', 'brutal'].forEach(diff => toneWords.forEach(x => {
    const q = H.MK.tones({ t: 'w', w: x }, diff); const labels = q.opts.map(o => o.label);
    const right = q.opts.filter(o => o.ok); const want = x.py.join('');
    if (right.length !== 1 || new Set(labels).size !== labels.length || right[0].label.normalize('NFC') !== want.normalize('NFC') || q.opts.length < 2) { badT++; if (badT < 4) console.log('  tone q', x.h, want, labels); }
  }));
  ok(badT === 0, 'tone questions well-formed (bad ' + badT + ')');
  H.startSession('tones', { scope: 'all', n: 5, diff: 'hard' }); ok(H.S.mode === 'tones' && played.length > 0, 'tones session auto-plays');
  key('1'); ok(H.S.q.res !== null, 'number key picks an option');
  click($('[data-act=quit]'));

  // 9. tones guide
  click($('.tab[data-t=home]')); click($$('[data-act=tones]')[0]);
  ok($('#modal .trow') && $$('#modal .trow').length === 5, 'tones guide has 5 tone rows');
  const sylBtns = $$('#modal .sylb'); ok(sylBtns.length === 17, 'syllable buttons with audio: ' + sylBtns.length);
  played.length = 0; sylBtns.forEach(click); ok(played.length === 17, 'all syllable buttons play');
  const wbtn = $$('#modal .tip [data-act=say], #modal .plist [data-act=say]'); ok(wbtn.length >= 12, 'example word buttons: ' + wbtn.length);
  click($('[data-act=tonedrill]')); ok(H.S && H.S.mode === 'tones', 'guide launches tone drill'); click($('[data-act=quit]'));

  // 10. tappable words inside example sentences
  click($('.tab[data-t=grammar]')); click($$('.gl')[1]);
  const tok = $('.sx .tok'); ok(tok, 'example words are buttons'); click(tok); ok($('#modal .bigz') && $('#modal .bigz').textContent === tok.getAttribute('data-h'), 'tapping a word opens it');
  click($('#modal [data-act=closem]'));

  // 11. tone colours
  ok($('.pyc .t1, .pyc .t2, .pyc .t3, .pyc .t4, .pyc .t5'), 'pinyin is tone-coloured');
  click($('#setBtn')); click($('[data-act=tonecol]')); ok(doc.body.classList.contains('notone'), 'tone colours can be turned off'); click($('[data-act=tonecol]')); ok(!doc.body.classList.contains('notone'), 'and on');
  ok(/Recorded audio is ready/.test($('#astat').textContent), 'settings shows audio status');
  click($('[data-act=closem]'));

  // 12. markTone / pinyin colouring helpers
  ok(H.markTone('hao', 3) === 'hǎo' && H.markTone('gui', 4) === 'guì' && H.markTone('liu', 2) === 'liú' && H.markTone('nü', 3) === 'nǚ' && H.markTone('zhou', 1) === 'zhōu', 'tone mark placement');
  ok(H.pyHTML('bù kèqì', ['bù', 'kè', 'qì']).includes('</span> <span'), 'pinyin colouring keeps spaces');

  // 12b. flashcard back: separate Word and Sentence buttons that play different clips
  H.startSession('cards', { n: 3, scope: 'all', dir: 'zh2en' });
  let found = false;
  for (let k = 0; k < 3 && !found; k++) {
    click($('[data-act=flip]'));
    const sb = $$('.saybtn').find(b => b.textContent === 'Sentence'), wb = $$('.saybtn').find(b => b.textContent === 'Word');
    if (sb && wb) {
      found = true; played.length = 0;
      click(wb); click(sb);
      ok(played.length === 2 && played[0] !== played[1], 'word and sentence play different clips');
      ok(sb.getAttribute('data-t').length > wb.getAttribute('data-t').length, 'sentence button carries the whole sentence');
    } else click($('[data-act=cknow]'));
  }
  ok(found, 'flashcard shows Word and Sentence buttons');
  click($('[data-act=quit]'));
  click($('.tab[data-t=grammar]')); click($$('.gl')[1]);
  ok($$('.ex .saybtn').length === $$('.ex').length, 'every grammar example has a Sentence button');

  // 13. every old drill still runs at every difficulty for a few questions
  for (const m of ['build', 'sent', 'write', 'fill', 'choose', 'listen', 'cards', 'tones']) for (const diff of ['easy', 'hard', 'brutal']) {
    H.startSession(m, { diff, n: 4, scope: m === 'sent' || m === 'fill' ? 'all' : 'all' });
    guard = 0; while (H.S && !H.S.done && guard++ < 20) { if (H.S.q.res === null) answer(true); next(); }
    ok(H.S && H.S.done, 'drill ' + m + ' ' + diff); click($('[data-act=quit]'));
  }
  console.log('errors:', errors.length); errors.slice(0, 8).forEach(e => console.log('  ', e));
  console.log(fails ? fails + ' FAILURES' : 'ALL OK'); process.exit(0);
})();
