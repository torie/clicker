# Clicker

A phone-first incremental clicker game, installable as a PWA. Tap the green button, build up to five click factories, collect what they make, reach 1,000,000 to adopt a cat that clicks for you, then hire kittens to run your factories and look after them on the way to 100,000,000.

Plain HTML, CSS and JavaScript modules, with no build step and no dependencies. The music (four tracks, three of them unlocked in the 10M store) is synthesised live with Web Audio, so there are no audio files.

## Run locally

```bash
npm start
```

Then open http://localhost:8080. The service worker only registers over HTTPS, so offline mode works on the deployed site, not on localhost.

## Test

```bash
npm test
```

The tests cover the game rules and balance in `src/game.js`.

## Deploy to GitHub Pages

1. Push `main` to GitHub.
2. In the repo, go to **Settings → Pages**, choose **Deploy from a branch**, then pick `main` and `/ (root)`.
3. The game is served at `https://<user>.github.io/<repo>/`. On a phone, open it and use **Add to Home Screen** (iOS Safari) or **Install app** (Android Chrome).

When you ship a change, bump `VERSION` in `sw.js` so installed copies pick it up.

## Project layout

| Path | What it is |
| --- | --- |
| `index.html`, `styles.css` | The four screens (main, factory, crew, store) and the Phosphor look |
| `src/game.js` | Rules, balance, save format, offline progress |
| `src/main.js` | UI, game loop, saving, music toggle |
| `src/audio/soundtrack.js`, `src/audio/songs.js` | The chip-music synth and the four songs |
| `src/skins.js` | Cat skins for the store |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA: offline cache, install metadata, icons |
| `scripts/make-icons.mjs` | Regenerates the icons (`npm run icons`) |

## Notes

- Progress is saved on the device (localStorage) every 5 seconds and when the app is backgrounded. Time away counts for up to 8 hours.
- To start over, open the game with `#reset` at the end of the URL.
