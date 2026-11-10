# Pitch Trainer

An ear-training app for your phone: intervals, chords, perfect pitch, scale degrees, scales and modes, progressions, and pitch matching by singing.

It's a Progressive Web App. Open it in Safari (iPhone) or Chrome (Android), add it to your home screen, and it runs full screen and offline. Progress is stored on the device only.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm run dev:phone  # HTTPS on your LAN, for testing mic and install on a real phone
npm test           # unit tests (theory, question generation, scheduling)
npm run build      # production build + service worker in dist/
npm run shots -- http://localhost:4173 shots dark   # phone-size screenshots of `npm run preview`
```

## Stack

Vite, React, TypeScript, Tone.js (audio), tonal (music theory), pitchy (pitch detection), Dexie (IndexedDB), vite-plugin-pwa.

`src/theory`, `src/exercises` and `src/srs` are plain TypeScript with no DOM or React imports, so a future native (Expo) build can reuse them.

## Credits

Piano samples: Salamander Grand Piano by Alexander Holm, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
Guitar, strings, organ and flute samples: [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) by Nicholaus Brosowsky, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
