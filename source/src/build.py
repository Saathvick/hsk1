import json, re, os
r = lambda p: open(p, encoding='utf-8').read()
shell = r('src/shell.html')
css = r('src/app.css'); app = r('src/app.js')
hw = r('/tmp/hsk/npm/node_modules/hanzi-writer/dist/hanzi-writer.min.js')
hw = re.sub(r'//# sourceMappingURL=.*', '', hw)
data = r('data.json'); strokes = r('strokes.json'); aidx = r('audio_index.json')
def safe(s): return s.replace('</', '<\\/').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
gear = re.search(r"gear: '(.*?)'\n", app, re.S).group(1) if False else None
m = re.search(r"gear: '(<svg.*?</svg>)'", app)
out = shell.replace('/*__CSS__*/', css).replace('/*__GEAR__*/', m.group(1)).replace('/*__HW__*/', safe(hw)).replace('/*__DATA__*/', safe(data)).replace('/*__STROKES__*/', safe(strokes)).replace('/*__AUDIO__*/', safe(aidx)).replace('/*__APP__*/', safe(app))
os.makedirs('dist', exist_ok=True)
open('dist/hsk1.html', 'w', encoding='utf-8').write(out)
open('dist/app_check.js', 'w', encoding='utf-8').write('var D=' + data + ';var STROKES=' + strokes + ';var AUDIO_INDEX=' + aidx + ';' + app)
print('built dist/hsk1.html', len(out)//1024, 'KB')

# standalone copy for normal web hosting (Vercel, GitHub Pages): needs its own doctype and viewport
os.makedirs('dist/site/audio', exist_ok=True)
head = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="description" content="HSK 1 Mandarin trainer with recorded audio, tones guide, grammar and drills.">\n'
site = head + out.replace('<meta charset="utf-8">\n', '', 1).replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '', 1)
open('dist/site/index.html', 'w', encoding='utf-8').write(site + '\n</html>\n')
import shutil
for f in ('words.mp3', 'sents.mp3'): shutil.copyfile('dist/audio/' + f, 'dist/site/audio/' + f)
print('built dist/site/index.html')
