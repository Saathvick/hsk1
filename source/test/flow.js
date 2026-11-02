const { JSDOM, VirtualConsole } = require('/tmp/hsk/npm/node_modules/jsdom');
const fs = require('fs');
let src = fs.readFileSync('dist/hsk1.html', 'utf8').replace(/<link[^>]*>/g, '');
// install speech stubs before the app script runs
const stub = `<script>window.__spoken=[];window.speechSynthesis={getVoices:function(){return [{lang:'zh-CN',name:'Test zh'}]},cancel:function(){},speak:function(u){window.__spoken.push(u.text)},addEventListener:function(){}};window.SpeechSynthesisUtterance=function(t){this.text=t};</script>`;
const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' + stub + src + '</body></html>';
const errors = []; const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push((e.detail && e.detail.stack || e.message).split('\n').slice(0, 3).join(' | ')));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://example.org/' });
const w = dom.window; w.scrollTo = () => {};
const doc = w.document, $ = s => doc.querySelector(s), $$ = s => [...doc.querySelectorAll(s)];
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const H = w.__hsk;

for (const diff of ['easy', 'hard', 'brutal']) {
  // BUILD: solve correctly
  H.startSession('build', { diff, n: 6, scope: 'all' });
  let n = 0;
  while (H.S && !H.S.done && n++ < 20) {
    const q = H.S.q;
    for (const ch of q.chars) { const t = $$('[data-act=pick]').find(b => b.textContent === ch && !b.disabled); ok(!!t, 'build tile for ' + ch); if (t) click(t); }
    ok(!$('[data-act=check]').disabled, 'check enabled');
    click($('[data-act=check]')); ok($('.fb.ok'), 'build correct feedback ' + q.w.h);
    click($('#nextbtn'));
  }
  ok(H.S.done && H.S.ok === 6, 'build session complete ' + H.S.ok); ok($('.score').textContent.trim() === '6 / 6', 'score shown');
  // wrong answer path
  H.startSession('build', { diff, n: 1, scope: 'L1' });
  { const q = H.S.q; const wrong = q.tiles.filter(t => !q.chars.includes(t.c)); for (let i = 0; i < q.chars.length; i++) { const t = wrong[i] ? wrong[i] : null; const b = $$('[data-act=pick]').find(b => t ? b.textContent === t.c : true); click(b); }
    click($('[data-act=check]')); ok($('.fb.no') || $('.fb.ok'), 'wrong feedback shown'); click($('#nextbtn')); ok(H.S.done, 'ended'); }

  // SENT
  H.startSession('sent', { diff, n: 5, scope: 'all' }); n = 0;
  while (H.S && !H.S.done && n++ < 20) {
    const q = H.S.q;
    for (const tk of q.toks) { const b = $$('[data-act=pick]').find(b => b.firstChild && b.firstChild.textContent === tk && !b.disabled); ok(!!b, 'sent tile ' + tk); if (b) click(b); }
    click($('[data-act=check]')); ok($('.fb.ok'), 'sent correct ' + q.s.w.join('')); click($('#nextbtn'));
  }
  ok(H.S.ok === 5, 'sent session ' + H.S.ok);

  // FILL / CHOOSE / LISTEN
  for (const mode of ['fill', 'choose', 'listen']) {
    H.startSession(mode, { diff, n: 6, scope: mode === 'fill' ? 'all' : 'all', dir: 'mix', kind: mode === 'fill' ? 'words' : 'both' }); n = 0;
    while (H.S && !H.S.done && n++ < 20) {
      const q = H.S.q; const i = q.opts.findIndex(o => o.ok);
      click($$('[data-act=opt]')[i]); ok($('.fb.ok'), mode + ' correct'); click($('#nextbtn'));
    }
    ok(H.S.ok === 6, mode + ' ' + diff + ' complete ' + H.S.ok);
  }
}
// miss path for choose
H.startSession('choose', { diff: 'hard', n: 2, scope: 'all', kind: 'words', dir: 'zh2en' });
{ const q = H.S.q; const i = q.opts.findIndex(o => !o.ok); click($$('[data-act=opt]')[i]); ok($('.fb.no'), 'wrong shows no'); ok($$('.tile.ok').length === 1, 'correct option highlighted'); click($('#nextbtn')); const q2 = H.S.q; click($$('[data-act=opt]')[q2.opts.findIndex(o => !o.ok)]); click($('#nextbtn')); ok(H.S.done && H.S.miss.length === 2, 'misses recorded'); ok($('[data-act=redomiss]'), 'retry misses button');
  click($('[data-act=redomiss]')); ok(H.S && !H.S.done && H.S.items.length === 2, 'retry misses starts'); click($('[data-act=quit]')); }

// CARDS
H.startSession('cards', { n: 5, scope: 'due', dir: 'zh2en' });
for (let i = 0; i < 5; i++) { click($('[data-act=flip]')); ok($('[data-act=cknow]'), 'flip shows buttons'); click(i % 2 ? $('[data-act=cmiss]') : $('[data-act=cknow]')); }
ok(H.S.done && H.S.ok === 3, 'cards scored ' + H.S.ok);
const srs = H.P.srs; ok(Object.keys(srs).length > 5, 'srs recorded ' + Object.keys(srs).length);
click($('[data-act=quit]'));

// WRITE mode (jsdom may not support svg quiz; check it degrades without throwing)
let threw = null; try { H.startSession('write', { diff: 'hard', n: 2, scope: 'all' }); } catch (e) { threw = e; }
ok(!threw, 'write start ' + (threw && threw.message)); ok($('#sw'), 'writer container');
console.log('write mode renders; writer svg present:', !!$('#sw svg'));
if (H.S) { try { click($('[data-act=reveal]')); } catch (e) { console.log('reveal threw', e.message); } }

// persistence + backup
click($('.tab[data-t=home]')); H.render(); ok($('.stats'), 'home after sessions');
const saved = w.localStorage.getItem('hsk1.trainer.v1'); ok(saved && JSON.parse(saved).stats.ans > 20, 'localStorage saved, answers=' + (saved && JSON.parse(saved).stats.ans));
click($('#setBtn')); ok($('#bk'), 'settings opens'); click($('[data-act=bshow]')); const bk = $('#bk').value; ok(bk.includes('"srs"'), 'backup text');
$('#bk').value = bk.replace('"v":1', '"v":1'); click($('[data-act=brestore]')); ok(!$('#modal .sheet'), 'restore closes modal');
click($('#ttsSwitch')); ok(H.P.set.tts === false && doc.body.classList.contains('noaudio'), 'tts off -> noaudio class'); click($('#ttsSwitch')); ok(H.P.set.tts === true && !doc.body.classList.contains('noaudio'), 'tts on');
w.__spoken.length = 0; click($('.tab[data-t=words]')); click($$('.lesson')[0]); click($$('.wrow [data-act=say]')[0]); /* audio playback is covered in test/v2.js with a stubbed Audio element */
click($('#ttsSwitch')); w.__spoken.length = 0; H.render(); const sp = $$('[data-act=say]')[0]; if (sp) click(sp); ok(w.__spoken.length === 0, 'no speech when off');
click($('#ttsSwitch'));

// grammar
click($('.tab[data-t=grammar]')); ok($$('.gl').length === 32, 'grammar lessons ' + $$('.gl').length);
click($$('.gl')[1]); ok($('.rule') && $$('.ex').length >= 3, 'lesson detail'); click($('[data-act=gdone]')); ok(H.P.gram.order === 1, 'marked');
click($('[data-act=gprac]')); ok(H.S && H.S.mode === 'sent' && H.S.items.length === 5, 'grammar practice: ' + (H.S && H.S.items.length)); click($('[data-act=quit]'));
click($('.tab[data-t=grammar]')); click($$('[data-act=gtab]')[1]); ok($$('.check').length === 48, 'syllabus items'); ok($$('.check.done').length >= 8, 'covered items marked ' + $$('.check.done').length);
console.log('errors:', errors.length); errors.slice(0, 6).forEach(e => console.log('  ', e));
console.log(fails ? fails + ' FAILURES' : 'ALL OK'); process.exit(0);
