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

Checks: `npm test` (38 tests, all passing), `node scripts/balance-sim.mjs [--taps N --collect S --daily 0|1 --yarn S --worth S --seed N --limit S --trace --load SAVE --save-at N --save-to FILE]`, `npm start` then open http://localhost:8080 at phone size. `#reset` on the URL wipes the save.

## Game design (decided with the user)

- **Core loop:** tap the green button → points → buy upgrades → the number grows faster. The goal is simply the highest number.
- **Upgrades:** Auto-clicker (+1/s, unlimited), Double tap (×2 per click, max 5), Quad tap (×4, max 2), Lucky clicks (+5% chance of ×10 per level, max 5), **Power tap** (each tap also earns 1% of the income per second per level, max 5; luck doesn't multiply it, and the cat's clicks don't get it), **Cat training** (after the cat). Each upgrade stays hidden until the player has earned half its base price.
- **Click factories** (the user's idea; called "click factory", never "farm"):
  - Up to **5**, costing 500 / 3.3K / 38K / 67K / 120K. Factory #n makes and stores ×1.6ⁿ⁻¹ of #1 (`TIER_OUT`; was ×3 until 2026-10-12), and its extensions cost ×1.9ⁿ⁻¹ (`TIER_COST`). The user wanted the gap smaller so early factories stay worth having: fully upgraded, the five make 6 / 10 / 16 / 26 / 41% of factory output (with ×3 it was 1% for #1 and 66% for #5).
  - Production goes into a **silo, not the balance**. The player must **enter the factory to collect**. When the silo is full, production stops and the UI flashes yellow.
  - The factory is drawn as a real building: saw-tooth roof, smoking chimney, stamping presses, conveyor belts carrying glowing clicks into a silo that visibly fills.
  - **Extensions:** Assembly line (up to 4 lines), Turbo press (×2 speed, max 5), Bigger silo (×2, max 10), Loading dock (20% ships straight to the balance, max 3). **No kittens in factories before 10M**: the cat (clicking the button) is the only kitten in the factory phase.
  - A slot bar in the factory switches between factories, shows each silo's fill, and builds the next one.
- **Stretch goals:** a meter on the main screen shows progress, points to go, an ETA and the reward.
  - **Goal 1: 1,000,000 points, about 17 minutes of active play.** Buying it adopts a **cute pixel cat that clicks the button 12×/s** (`CAT_CPS`; was 50×/s before economy v2). **Cat training** (repeatable, from 350K, ×2.6 per level) adds 12 clicks/s per level, so the cat grows through goal 2 instead of jumping income ×28. A boot-style "CAT ADOPTED" sequence plays.
  - **Goal 2: 10,000,000.** Reaching it (no purchase needed) permanently opens the **Store**, with a "STORE OPEN" boot sequence, and moves the meter on to goal 3. The store is **cosmetic only**.
  - **Level 3: 100,000,000** opens **underlings** (below).
  - **Levels 4–8: 1B, 10B, 100B, 1T, 10T.** Each gives a permanent **+50% to all income** (`LEVEL_BONUS`). After 10T the meter shows "10,000,000,000,000 REACHED · ERA 2 · SOON".
  - **The UI says "LEVEL n"** (the user's word; the code still calls them `GOALS`). `checkGoal` handles every level after the first.
- **Golden yarn** (the user agreed to try it, 2026-10-12):
  - After the cat arrives, every 6–10 minutes of play a golden yarn ball rolls across the screen (`#gold-yarn`; the timing is in `main.js`).
  - Catching it gives ×5 to all income for 60 s (`FRENZY_MULT`, `FRENZY_SECONDS`), shown as "YARN ×5 · 45s" in the header. Missing it costs nothing.
- **Kitten crew v2** (from goal 2; rebuilt 2026-10-11 after the user found the hunger/nap/play upkeep tedious):
  - **Hiring.** At 10M the first kitten joins **free** and runs the strongest factory. The player **hires one kitten per factory** (450K / 900K / 1.8M / 3.6M / 7.2M by factory). The next recruit (name, trait, favourite) is shown before hiring, and each hire row previews its boost and the income it would ship.
  - **What a kitten does.** It **runs its factory**: production ships straight to the balance, the silo empties (`CREW_DRAIN`), and nothing stalls on a full silo. On top of that it runs ×1.7 (`KITTEN_BOOST`).
  - **Favourite factory:** ×1.5 (`FAV_BONUS`).
  - **One trait per kitten** (`TRAITS`):
    - Hard worker: ×1.3.
    - Gearhead: +15% per turbo press.
    - Packer: +20% per loading dock, which makes the dock useful again.
    - Cheerleader: other kittens +15%.
    - Cat's pal: the cat clicks +25% faster.
    - Night owl: ×2 while away.
  - **MOVE** swaps kittens between factories for free. The move sheet previews each factory's boost and the change in shipped income.
  - **Kittens are rolled from the save's `seed`/`rolls`,** so a save always offers the same recruits. Old kittens get a trait and favourite derived from their name.
  - **Nothing drains and nothing is taken away.** The cat is never distracted. Hunger, naps, lessons and "cat focus" are gone.
  - **Care time,** the user's "bonus task once per day":
    - Once per local calendar day, FEED, NAP and PLAY (the yarn game), in any order.
    - All three make the crew happy: every kitten-run factory runs ×2 (`HAPPY_MULT`) for an hour (`HAPPY_SECONDS`, counts down while away too).
    - Skipping it costs nothing.
  - **UI:**
    - The paw button in the header shows "!" when care time is ready.
    - An amber strip under the goal meter reads "CARE TIME IS READY", "HAPPY CREW · 43m LEFT" or "CREW OK".
    - The crew screen (`#screen-crew`) has the care card, a card per kitten (trait, favourite, boost, MOVE), the next recruit and the hire rows.
    - The move sheet is `#move`.
    - On the factory screen, the manager card shows the kitten, its boost, its trait and MOVE.
    - A one-time intro card (`#lesson`) appears when the crew arrives.
  - **Play-testing:** on localhost, these load saves from `test/presets/`, written by `balance-sim.mjs --save-at N --save-to FILE` (regenerate them after balance changes):
    - `#preset=precat`: just past 1M, with the cat ready to adopt.
    - `#preset=precrew`: 9.5M.
    - `#preset=crew`: 20M, five kittens at work.
    - `#preset=teams`: 300M, underlings open.
- **Kitten levels** (from 10M; built 2026-10-12, the user's choices: promotion costs points, starts at 10M):
  - Working fills a kitten's XP bar (`XP_BASE` 180 s, ×1.04 per level; ×1.5 in its favourite factory; +50% per underling). The bar stops when full.
  - **PROMOTE** costs points: +16% per level (`LEVEL_STEP`), and every 5th level doubles it (`MILESTONE_EVERY`). There's no cap, no decay, and nothing is lost on MOVE.
  - Promotions and underlings are **priced in seconds of the crew's average output** (`crewPace`, without yarn, care and level bonuses): a promotion is 40 s × 1.06^level. That keeps their payback at a few minutes at every stage. Fixed prices became nearly free or out of reach, because kitten output grows from many sources.
- **Underlings** (from 100M; the user's planned shift: levelled kittens employ underlings and look after them themselves):
  - A kitten's levels 5, 10 and 15 open up to 3 slots. The next underling (name, trait) waits on the crew screen, and the player taps a free slot to hire it into that team. The price is 300 s of crew output, ×1.8 per underling hired.
  - Each underling adds +50% to its lead's factory, or +100% if it shares the lead's trait (★). Three matching make a ×1.5 team bonus. Each also gives the lead +50% XP. They need nothing.
  - **Art:** underlings are the kitten sprite with a yellow hard hat (`SUB_SVG`). They stand at the conveyor belts of their lead's factory, and appear in the team row of each kitten card.
- The user uses "levels" for these steps; the UI still says "GOAL n". Each level should end in a new stretch goal.
- **Store** (`#screen-store`, opened from the amber bag icon in the header, next to the music button, so the goal meter stays visible). Items cost points; the first of each list is free and owned from the start. Tapping an item you don't own opens a **confirmation sheet** (`#confirm`: big preview, price, balance, ▶ preview for tracks, CANCEL / BUY). Nothing is bought without tapping BUY, and owned items switch with one tap:
  - **Cat skins:** Classic (free), Ginger tabby 1M, Snowball 2M, Midnight 4M, Tuxedo 8M, Royal 20M. The pixel art is in `src/skins.js`; names and prices are `SKINS` in `game.js`. Buying a skin also puts it on.
  - **Jukebox:** Silo Shuffle (free), Kitten Cruise 2M, Neon Commute 5M, Lullaby.exe 10M. Every track has a 20 s ▶ preview. Choosing or buying a track turns the music on. The songs are in `src/audio/songs.js`; names and prices are `TRACKS` in `game.js`.
- **Saving:** localStorage (`clicker.save.v1`) every 5 s and when the app is hidden. Offline progress is capped at 8 h and reported in a "WELCOME BACK" toast.
- **Music:** off by default. The note button in the header toggles it, and the preference is remembered (`clicker.music`) and resumed on the first tap, since browsers block autoplay.

### Progression rework (decided 2026-10-11)

The user found the balance uneven, the late game too automatic, and kitten care tedious. The research, the measurements and the proposal are in [docs/progression-research.md](docs/progression-research.md). The user's decisions:

- **No prestige reset at 100M.** The game carries on, with kitten levels and underlings.
- **Kitten needs become a once-a-day bonus task** that gives a temporary speed bonus. Neglect costs nothing.
- **Multiplayer will be a friends-only competition with a small backend**, but it waits until the mechanics feel right.

The plan, in order:

1. Economy v2 (section 6 of the doc).
2. Crew rework: assignment and traits instead of draining needs, plus the daily task.
3. Goals beyond 100M.
4. The friends league.

### Balance (from `scripts/balance-sim.mjs`)

The sim was improved on 2026-10-11:

- It buys speed-ups together with the silo they need, and new factories together with their lines.
- It buys anything that pays off within 5 min.
- It prints, per goal, the longest wait between purchases and each income source's share. `--trace` lists every purchase.

**Current balance (2026-10-12, with kitten levels, underlings, golden yarn and levels to 10T).** These are full games from 0:

| Player | L1–L8 (minutes) | Longest wait |
| --- | --- | --- |
| Default (5 taps/s, collect every 20 s, care time, a yarn every 8 min) | 17 / 9 / 6 / 13 / 12 / 15 / 19 / 28 (about 2 h) | 3.6 min |
| Skips care time | 17 / 9 / 12 / 18 / 16 / 17 / 20 / 22 | 3.0 min |
| Never catches yarn | 17 / 10 / 10 / 13 / 14 / 15 / 25 / 26 | 4.6 min |
| Slow (2 taps/s, collect every 60 s, no yarn) | 24 / 15 / 11 / 12 / 14 / 15 / 24 / 27 | 5.3 min |

- Level 3 is short (6 min) because the sim does care time the moment the crew arrives (×2 for an hour).
- The crew-era values came from a search starting from the 10M preset (`--load`).
- Levels 1–2 are unchanged from "B" below.

**Earlier (2026-10-12, before kitten levels).** This was economy v2 plus crew v2 plus the smaller ×1.6 gap between factories:
- Goals took 17.3 / 9.8 / 7.8 min, with all five factories built before the cat.
- The user chose this ("B") over even pacing; the alternative left factories #4 and #5 unbuilt.
- The missing content is now there: kitten levels and underlings.

The rules before v2 gave 25.3 / 12.9 / 17.8 min, waits of up to 7.3 min, and the cat at 76% of goal 2.

Known weak spots:

- Level 2 (1M → 10M, 9 min) is the shortest stretch apart from level 3; only the cat carries it.
- The prices are sensitive. Rounding Quad tap's growth from 39 to 40 once gave the slow player a 9 min wait, so rerun the sim with several play styles after any change.

The figures below come from the old sim and the old rules.


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

## Status (2026-10-12)

- Deployed to https://torie.github.io/clicker/ (`sw.js` cache `clicker-v12`): economy v2, kitten crew v2 with care time, and the ×1.6 factory tiers. The user is play-testing it over a longer period.
- Tested in a desktop browser at phone size: the new upgrades, the cat, store unlock, crew intro, hiring, care time with the yarn game, moving kittens, and the factory manager card. **Not yet tested on a real phone** or as an installed PWA.
- Seen once while an agent drove the page: the crew intro card closed on its own about a second after appearing. Not reproduced.

## Suggested next steps

1. Play-test kitten levels, underlings, golden yarn and the ladder to 10T. Collect the user's feedback on pacing per level, whether PROMOTE and the team picks feel like decisions, and the yarn's frequency.
2. From the research (docs section 10), not built yet:
   - perk picks at promotion milestones (choose 1 of 2–3, free respec);
   - stamps (achievements, each a small permanent bonus).
3. What happens after 10T ("era 2").
4. The friends league (multiplayer), once the mechanics feel right. The research suggests scoring orders of magnitude gained per week, or points for events.
5. Ideas raised but not built:
   - a short tune when the cat is adopted
   - a "collect all" shortcut
   - a settings or reset screen (today only `#reset` exists)
   - sound effects for taps and collecting
