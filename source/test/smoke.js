const { JSDOM, VirtualConsole } = require('/tmp/hsk/npm/node_modules/jsdom');
const fs = require('fs');
const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' + fs.readFileSync('dist/hsk1.html', 'utf8').replace(/<link[^>]*>/g, '') + '</body></html>';
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail && e.detail.stack || e.message).split('\n').slice(0,3).join(' | ')));
vc.on('error', e => errors.push('console.error: ' + e));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://example.org/' });
const w = dom.window;
w.scrollTo = () => {};
const spoken = [];
w.eval(`window.speechSynthesis = { getVoices: () => [{lang:'zh-CN', name:'Test zh'}], cancel(){}, speak(u){ window.__spoken.push(u.text) }, addEventListener(){} }; window.SpeechSynthesisUtterance = function(t){ this.text = t; };`);
w.__spoken = spoken;
// scripts already ran before stubs; re-run app init is not possible, so stubs matter only for later speak() calls (synth captured at load as null).
const doc = w.document;
const $ = (s) => doc.querySelector(s), $$ = (s) => [...doc.querySelectorAll(s)];
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const H = w.__hsk;
ok(!!H, 'app booted');
ok($('#view').innerHTML.length > 500, 'home rendered');
ok($$('.dot').length === 508, '508 dots, got ' + $$('.dot').length);

// tabs
for (const t of ['words', 'practice', 'grammar', 'home']) { click($(`.tab[data-t=${t}]`)); ok($('#view').innerHTML.length > 200, 'tab ' + t); }
// words: lessons, lesson, search
click($('.tab[data-t=words]')); ok($$('.lesson').length === 26, 'lessons: ' + $$('.lesson').length);
click($$('.lesson')[0]); ok($$('.wrow').length === 20, 'lesson rows ' + $$('.wrow').length);
click($('[data-act=lessons]'));
const q = $('#q'); q.value = 'shuǐ'; q.dispatchEvent(new w.Event('input', { bubbles: true })); ok($$('.wrow').length > 0 && $('#wlist').textContent.includes('水'), 'pinyin search');
$('#q').value = 'teacher'; $('#q').dispatchEvent(new w.Event('input', { bubbles: true })); ok($('#wlist').textContent.includes('老师'), 'english search');
$('#q').value = ''; $('#q').dispatchEvent(new w.Event('input', { bubbles: true })); ok($$('.lesson').length === 26, 'back to lessons after clear');
// word modal
click($$('.lesson')[0]); click($$('.wrow')[2]); ok($('#modal .bigz'), 'word modal'); ok($$('#modal [data-act=char]').length >= 1, 'char tiles');
click($('#modal [data-act=closem]')); ok(!$('#modal .sheet'), 'modal closed');

// generator integrity for all words / sentences / diffs
const MK = H.MK; let gen = 0;
H.startSession('build', { items: [{ t: 'w', w: H.W[0] }], diff: 'hard' });
for (const diff of ['easy', 'hard', 'brutal']) {
  for (const word of H.W) {
    const qq = MK.build({ t: 'w', w: word }, diff);
    const pool = qq.tiles.map(t => t.c); const need = [...word.h];
    const tmp = pool.slice(); let good = true; for (const c of need) { const i = tmp.indexOf(c); if (i < 0) good = false; else tmp.splice(i, 1); }
    ok(good, 'build tiles contain answer ' + word.h); gen++;
    ok(qq.tiles.length === need.length + { easy: 2, hard: 4, brutal: 7 }[diff], 'build tile count ' + word.h + ' ' + diff + ' ' + qq.tiles.length);
  }
  for (const s of H.SN) {
    const qq = MK.sent({ t: 's', s }, diff); const toks = s.w.filter(t => !'，。？！、；：'.includes(t)); const tmp = qq.tiles.map(t => t.c);
    let good = true; for (const t of toks) { const i = tmp.indexOf(t); if (i < 0) good = false; else tmp.splice(i, 1); } ok(good, 'sent tiles ' + s.w.join('')); gen++;
    // no decoy that duplicates an answer token
    ok(new Set(qq.tiles.map(t => t.c)).size >= new Set(toks).size, 'sent unique');
    const f = MK.fill({ t: 's', s }, diff); ok(f.opts.filter(o => o.ok).length === 1 && f.opts.length >= 3, 'fill opts ' + s.w.join('') + diff); 
    ok(new Set(f.opts.map(o => o.label)).size === f.opts.length, 'fill opts unique ' + s.w.join(''));
    const c2 = MK.choose({ t: 's', s }, diff); ok(c2.opts.filter(o => o.ok).length === 1, 'choose sent'); ok(new Set(c2.opts.map(o => o.label)).size === c2.opts.length, 'choose sent unique');
    const l2 = MK.listen({ t: 's', s }, diff); ok(l2.opts.filter(o => o.ok).length === 1, 'listen sent');
  }
  for (const word of H.W) {
    const c1 = MK.choose({ t: 'w', w: word }, diff); ok(c1.opts.filter(o => o.ok).length === 1, 'choose word ' + word.h);
    ok(new Set(c1.opts.map(o => o.label)).size === c1.opts.length, 'choose word unique labels ' + word.h + ' ' + diff + ' ' + JSON.stringify(c1.opts.map(o=>o.label)));
    const l1 = MK.listen({ t: 'w', w: word }, diff); ok(l1.opts.filter(o => o.ok).length === 1 && new Set(l1.opts.map(o => o.label)).size === l1.opts.length, 'listen word ' + word.h);
  }
}
console.log('generators checked:', gen);
console.log('errors so far:', errors.length); errors.slice(0, 5).forEach(e => console.log(' ', e));
console.log(fails ? fails + ' FAILURES' : 'ALL OK');
process.exit(0);
