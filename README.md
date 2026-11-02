# HSK 1 Trainer

A single-page Mandarin trainer for the HSK 3.0 level 1 list: 508 words, 300 characters, 31 grammar lessons covering the 48 official grammar points, and recorded audio for every word and sentence.

Features: guided Learn and Review sessions with spaced repetition, a tones and pinyin guide, a tone-hearing drill, stroke-order writing practice, word and sentence building, fill-the-blank, listening and flashcards, each at Easy, Hard and Brutal levels. Progress is saved in the browser (localStorage), with a backup and restore box in Settings.

## Deploy

It is a static site with no build step. `index.html` and `audio/` at the repo root are everything that gets served.

- **Vercel:** import the repo, set Framework Preset to "Other", and leave the build command and output directory empty.
- **Locally:** run `python3 -m http.server` in the repo root and open http://localhost:8000. Opening the file directly will not load audio, because browsers block `fetch` on `file://`.

## Layout

```
index.html          the whole app (HTML, CSS, JS, word data and stroke data inlined)
audio/words.mp3     concatenated word, character and syllable clips
audio/sents.mp3     concatenated sentence clips (byte ranges are in the page's AUDIO_INDEX)
source/             scripts and data used to generate the above
```

`source/src/build.py` assembles `index.html` from `shell.html`, `app.css`, `app.js` and the JSON data. `build_audio.py` regenerates the audio. It needs the audio-cmn recordings, the sherpa-onnx Matcha model and a Paraformer model for checking, so the paths inside it point to a scratch directory. The jsdom tests are in `source/test/`.

## Credits and licences

- Word list: HSK 3.0 level 1 from [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) and [ivankra/hsk30](https://github.com/ivankra/hsk30) (MIT).
- Stroke data: [Hanzi Writer](https://github.com/chanind/hanzi-writer) (MIT) and Hanzi Writer Data (Arphic Public License, derived from Make Me a Hanzi).
- Word and syllable recordings: [audio-cmn](https://github.com/hugolpz/audio-cmn) by Yue Tan and Chen Wang, CC BY-SA. The clips in `audio/` derived from them are shared under the same licence.
- Sentence audio and the words without a recording: generated offline with the [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) Matcha TTS model trained on the Databaker Chinese Standard Mandarin corpus, which is licensed for **non-commercial use only**. Replace these clips before any commercial use.
- Example sentences, glosses and grammar notes are original to this project.
