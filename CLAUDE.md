# Clicker — project notes for agents

Phone-first incremental clicker game, shipped as a PWA on GitHub Pages. Plain HTML/CSS/JS modules: no build step, no dependencies. See [README.md](README.md) for running, testing and deploying.

- Repo: `git@github.com:torie/clicker.git`, branch `main`. Target URL: `https://torie.github.io/clicker/` (Pages: deploy from branch `main`, root).
- **Phones are the only target for now.** Don't design or build desktop layouts unless asked.

## Rules for working here

- Commits and PRs are authored by the user only: **no `Co-Authored-By` trailer and no mention of Claude or any AI tool** in commits, PR titles, bodies or comments.
- `DESIGN_PROMPT.md` (the original design brief) is kept local and is in `.gitignore`. Never commit it.
- Commit or push only when the user asks.
- Keep the Phosphor look (below). Match the existing code's style: small pure functions in `game.js`, and DOM writes in `main.js` go through the cached `set()` helper.

## How the code is split

| File | Role |
| --- | --- |
| `src/game.js` | All rules, balance constants, save format and offline progress. Pure, no DOM. Every rule change goes here, with a test in `test/game.test.js`. |
| `src/main.js` | UI: builds rows once, renders at 10 Hz via `set()` (writes only changed values), game loop, saving, music toggle, cat overlay, toast. |
| `index.html`, `styles.css` | Four screens (`#screen-main`, `#screen-factory`, `#screen-crew`, `#screen-store`), overlays (`#confirm`, `#lesson`, `#play`, `#boot`, `#toast`). CSS tokens are on `:root`. |
| `src/audio/soundtrack.js` | Web Audio chip synth (pulse lead, pulse arpeggio, triangle bass, noise drums). API: `createSoundtrack(song)`, then `start/stop/toggle/setSong/setVolume/jumpTo/onStep`. |
| `src/audio/songs.js` | The four songs as data (per-bar chord + melody + voice styles; notation documented at the top). Silo Shuffle 104 BPM, 2:46 loop · Kitten Cruise 88 BPM, 2:00 · Neon Commute 126 BPM, 1:31 · Lullaby.exe 76 BPM, 2:06. `test/songs.test.js` checks every bar adds up to 16 steps and every chord exists. |
| `src/skins.js` | The cat's pixel art per skin (`catSvg(id)`), built on one shared 16×16 shape. |
| `sw.js` | Cache-first service worker with background refresh. **Bump `VERSION` on every release**: the new worker pre-caches fresh files (bypassing the HTTP cache) and waits; `main.js` shows the "NEW VERSION · TAP TO RELOAD" banner (`#update`) and sends `SKIP_WAITING` when tapped, then reloads on `controllerchange`. It only registers over HTTPS, so test it by temporarily allowing localhost. |
| `scripts/balance-sim.mjs` | Greedy-player simulation against the real rules. Run it after any price or rate change. |
| `scripts/make-icons.mjs` | Regenerates `icons/*.png` (pixel "+1" button). |

Checks: `npm test` (27 tests, all passing), `node scripts/balance-sim.mjs [--taps N --collect S --care S]`, `npm start` then open http://localhost:8080 at phone size. `#reset` on the URL wipes the save.

## Game design (decided with the user)

- **Core loop:** tap the green button → points → buy upgrades → the number grows faster. The goal is simply the highest number.
- **Upgrades:** Auto-clicker (+1/s, unlimited), Double tap (×2 per click, max 5), Quad tap (×4, max 3), Lucky clicks (+5% chance of ×10 per level, max 5). Each upgrade stays hidden until the player has earned half its base price.
- **Click factories** (the user's idea; called "click factory", never "farm"):
  - Up to **5**, costing 500 / 4K / 25K / 120K / 500K. Factory #n makes and stores ×3ⁿ⁻¹ of #1, and its extensions cost ×4ⁿ⁻¹.
  - Production goes into a **silo, not the balance**. The player must **enter the factory to collect**. When the silo is full, production stops and the UI flashes yellow.
  - The factory is drawn as a real building: saw-tooth roof, smoking chimney, stamping presses, conveyor belts carrying glowing clicks into a silo that visibly fills.
  - **Extensions:** Assembly line (up to 4 lines), Turbo press (×2 speed, max 3), Bigger silo (×2, max 8), Loading dock (20% ships straight to the balance, max 3). **No kittens in factories before 10M**: the cat (clicking the button) is the only kitten in the factory phase.
  - A slot bar in the factory switches between factories, shows each silo's fill, and builds the next one.
- **Stretch goals:** a meter on the main screen shows progress, points to go, an ETA and the reward.
  - **Goal 1: 1,000,000 points, tuned for about 30 minutes of active play.** Buying it adopts a **cute pixel cat that clicks the button 50×/s** (50 × points per click). A boot-style "CAT ADOPTED" sequence plays.
  - **Goal 2: 10,000,000.** Reaching it (no purchase needed) permanently opens the **Store**, with a "STORE OPEN" boot sequence, and moves the meter on to goal 3. The store is **cosmetic only**.
  - **Goal 3: 100,000,000.** Reward teased as "LEVEL UP YOUR KITTENS" (not built yet; see next steps). Reaching it shows "100,000,000 REACHED · NEXT CYCLE · SOON". The 10M → 100M stretch is the **kitten crew tutorial** (below), which prepares the player for that shift.
- **Kitten crew** (from goal 2; the user's direction: the game shifts from managing factories to managing kittens, and 10M → 100M teaches kitten care):
  - At 10M the first kitten (Mochi) joins **free** and runs the strongest factory. The player **hires one kitten per factory** (500K / 1M / 2M / 4M / 8M by factory) on the crew screen.
  - A **working** kitten **runs its factory**: ×6 speed (`KITTEN_BOOST`), production ships straight to the balance, and the silo empties (`CREW_DRAIN`). So the player stops collecting and looks after kittens instead. The user wanted this to take **less management than the factories** did: the simulation measures ~3.3 actions/min in the crew phase vs ~12/min of collecting before it.
  - **Needs drain while working** and arrive one lesson at a time, by best balance: **food** at 10M (feed, 50K; lasts 4 min of work), **sleep** at 25M (nap for 40 s, off work; lasts 6 min), **play** at 50M (catch the yarn ball 5 times; lasts 5 min). Each lesson shows a card (`#lesson`), and the crew screen keeps the current lesson and the next one on top.
  - A kitten with an empty need **stops working** (its factory is back to normal speed and filling its silo), and **every unhappy kitten pulls the cat away from the button**: the cat's clicking × `catFocus` (average kitten mood: 0 if it needs care, 0.5 while napping, 0.1–1 by its lowest need otherwise). Shown as "CAT n%" under the cat.
  - UI: paw button in the header (badge = kittens needing care), an alert strip under the goal meter ("MOCHI IS HUNGRY · THE CAT IS HELPING"), and the crew screen (`#screen-crew`): lesson card, cat focus bar, FEED ALL, a card per kitten with need bars and FEED / NAP / PLAY, and hire rows. Factory rows say "RUN BY MOCHI · ×6". On the factory screen a kitten-run factory is unmistakable: the hall gets an amber "RUN BY MOCHI · ×6" tag, the silo becomes an "AUTO / SHIP" chute, the belts speed up, and a **manager card** (big kitten, "MOCHI RUNS THIS FACTORY", "Nothing to collect", need bars, FEED / NAP / PLAY) replaces the Collect button. When the kitten needs care or naps, the card turns yellow or dashed and Collect comes back. A factory with no kitten shows a hire offer there. Upgrades stay buyable; the silo and loading dock are marked as only helping while the kitten is off duty.
  - Time away drains the crew as well (offline progress runs in 5 s steps), so returning after hours means hungry kittens and a distracted cat.
- **Planned next shift, at 100M (the user's direction, not built):** kittens **level up**. Levelled kittens **employ their own underlings** to speed up production and **look after those underlings themselves**, so the player manages the top layer of kittens while they manage theirs.
- The user uses "levels" for these steps; the UI still says "GOAL n". Each level should end in a new stretch goal.
- **Store** (`#screen-store`, opened from the amber bag icon in the header, next to the music button, so the goal meter stays visible). Items cost points; the first of each list is free and owned from the start. Tapping an item you don't own opens a **confirmation sheet** (`#confirm`: big preview, price, balance, ▶ preview for tracks, CANCEL / BUY). Nothing is bought without tapping BUY, and owned items switch with one tap:
  - **Cat skins:** Classic (free), Ginger tabby 1M, Snowball 2M, Midnight 4M, Tuxedo 8M, Royal 20M. The pixel art is in `src/skins.js`; names and prices are `SKINS` in `game.js`. Buying a skin also puts it on.
  - **Jukebox:** Silo Shuffle (free), Kitten Cruise 2M, Neon Commute 5M, Lullaby.exe 10M. Every track has a 20 s ▶ preview. Choosing or buying a track turns the music on. The songs are in `src/audio/songs.js`; names and prices are `TRACKS` in `game.js`.
- **Saving:** localStorage (`clicker.save.v1`) every 5 s and when the app is hidden. Offline progress is capped at 8 h and reported in a "WELCOME BACK" toast.
- **Music:** off by default. The note button in the header toggles it, and the preference is remembered (`clicker.music`) and resumed on the first tap, since browsers block autoplay.

### Balance (from `scripts/balance-sim.mjs`)

- A player tapping 5/s, collecting every 20 s and checking the crew every 20 s: 0 → 1M **30.7 min**, 1M → 10M **14.1 min**, 10M → 100M **16.6 min**. The user asked for the 100M stretch to take slightly longer than the one before, while feeling like a speedup (income jumps with the ×6 kittens), and to need less management. Checking the crew only once a minute: 16.9 min; never caring: ~35 min (and back to collecting); a slower player (3 taps/s, collect every 40 s, crew every 40 s): ~19 min.
- Removing kittens from the factory phase didn't change 1M → 10M (the cat dominates there), so nothing else needed retuning.
- The sim prints management actions/min per goal (a silo collect or a kitten care action each count as one).
- Feeding must stay cheap: at 250K per feed, careful players were slower than careless ones.
- The cat still dominates income; the crew works by gating the cat and multiplying factories. The earlier idea of counting cat clicks as base clicks is on hold.

### Tried and rejected

- **City branches on a map** (2026-09-28): after 10M the cat became "cat boss", the player picked a home country and city, and new factories were built in other real cities, opened after an in-game trip, shown on a world map. Built, then removed at the user's request: "works quite poorly as a game mechanism". Don't bring it back without asking.

## Visual design: "Phosphor"

The user chose it from three directions (Toy Box, Phosphor, Ledger). It's a green CRT terminal:
- **Colours:** ground `#070A08`, phosphor `#39FF6A`, bright `#9CFFB5`, dim `#4E9A63`, rules `#1F4A2B`. Amber `#FFD479` is reserved for cat and kitten things; yellow `#FFE66B` means alarm or full.
- **Type:** VT323 for numbers and big labels, IBM Plex Mono for everything else.
- **Details:** scanline overlay, pixel-art cat and kittens drawn as inline SVG `<rect>`s, and `steps()` animations for the retro feel.

Design references (private claude.ai artifacts owned by the user):
- Design canvas: https://claude.ai/artifact/KaGwSBeGGnrKYEznZBP1Nh. The artboard `Factory-Phone.dc.html` is the full interactive prototype the app was built from.
- Soundtrack player: https://claude.ai/artifact/DmSxWWSJTXjNGcWbU5oLER

## Status (2026-09-28)

- `18351bd` (the game, PWA, tests, README) is pushed to `origin/main`.
- Committed on `main` (not pushed): this file, `scripts/balance-sim.mjs`, the 10M Store (skins, jukebox with three new songs, purchase confirmation, goal 3 at 100M), the kitten crew with one hired kitten per factory, and the main-screen layout fix (number and button size to the space left, via container units). `sw.js` cache `clicker-v11` (with the update banner).
- Tested in a desktop browser at phone size: fresh game, late-game save, factory, collecting, cat, welcome-back toast, store unlock, buying and wearing a skin, previewing and buying a track, crew start with the free kitten and food lesson, hiring, hungry alert and badge, feeding, sleep lesson and napping, play lesson and the yarn game, factory rows run by the crew. Audio has never been listened to by an agent, only checked for errors. **Not yet tested on a real phone** or as an installed PWA.

## Suggested next steps

1. The user pushes, enables Pages, and tests on a real phone: tap feel, safe areas, install, offline, audio on iOS.
2. Decide the cat balance (see the open question above) and design what changes in the game after 10M ("cycle 2").
3. Play-test the kitten crew tutorial (pace, lesson clarity, whether care feels lighter than collecting), then build the **100M shift: kitten levels and underlings** (see above). Open design questions for the user: how a kitten levels up (XP from work, or bought?), how many underlings, what underlings need, and what the player still does at that point.
4. Ideas raised but not built:
   - a short tune when the cat is adopted
   - a "collect all" shortcut
   - a settings or reset screen (today only `#reset` exists)
   - sound effects for taps and collecting
