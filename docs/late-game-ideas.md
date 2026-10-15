# Late-game ideas (research, 2026-10-15)

The user's problem: "Currently it feels like you've played through early on, and then after a while it just sits there generating clicks."

This brainstorm builds on [progression-research.md](progression-research.md). It leaves out what is already decided or being built: no prestige at 100M, crew v2 with traits, kitten levels and underlings, golden yarn, care time, the levels to 10T, and the skin collection with rarity classes. It also leaves out the friends league, which is already planned.

## 1. What the research says

**A note on sources.** Reddit can't be fetched from this environment, so the player evidence comes from Steam discussions, itch.io comments, wikis, mirrors of Reddit threads and design write-ups. Treat each quote as one player's voice, not a survey.

### Why late games go quiet

- **Waiting with nothing to decide.** In an r/incremental_games thread on what makes idle games fun, players said they want to influence the game by playing actively without being tied to it, and one called "click button, wait three days" a major turn-off ([thread mirror](https://libreddit.neb.cx/r/incremental_games/comments/1epowcl/what_makes_an_idle_game_fun/lhn9c1s/?context=3)).
- **Money with nothing to spend it on.** An itch.io reviewer, past the early grind, found it easy to earn millions and have "absolutely nothing to do with that". They asked for a big sink with small rewards ([itch.io](https://itch.io/post/7202422)).
- **New layers that are only bigger numbers.** Players ask for layers that expand the core mechanic beyond "number gets bigger" ([itch.io](https://itch.io/post/5769386)). A Microtopia player criticized a late game that mostly just raises numbers without new unit types ([itch.io](https://itch.io/post/5963211)).
- **Late systems that don't scale become chores.** In the Autumn Idle postmortem, pests meant to keep players alert didn't scale with the farm, so players clicked them away by reflex ([Brandon Korn](https://sites.google.com/view/brandonkorn/projects/autumn-idle)). Golden yarn needs to avoid the same fate.
- **Long, flat waits push players away.** A Trimps reviewer stepped away when stages went from minutes to hours ([Game Developer](https://www.gamedeveloper.com/design/incremental-game-review-trimps)). Leaf Blower Revolution players complain they "can't see anything more to advance" ([Steam](https://steamcommunity.com/app/1468260/discussions/0/4625855867810481269)).

### What keeps late games alive

- **Clocks at several speeds.** Eric Guan suggests production clocks of about 20 min, 5 h and 2 days. They match players' fading attention and let a player succeed at one system while neglecting another ([Idle Game Design Principles](https://ericguan.substack.com/p/idle-game-design-principles)). Clicker has a seconds clock (taps), a minutes clock (golden yarn, purchases) and a daily one (care time). **It has nothing at the hours scale, and nothing to look forward to when opening the app after a night away** except a bigger number.
- **Short active bursts, then idle.** The best idle games ask for short bursts of decisions, then run on their own ([Cal Poly roundup](https://grandavehousing.calpoly.edu/news/top-idle-games-2023-dive)). Idle progress should never feel like a loss ([Four Divine Abidings devlog](https://fourda.itch.io/four-divine-abidings-full/devlog/981439/active-or-idle)).
- **Minigames that feed the main number.** Cookie Clicker's Garden, Grimoire, Pantheon and Stock Market are unlocked with sugar lumps, which grow one a day ([wiki.gg](https://cookieclicker.wiki.gg/wiki/Sugar_Lump), [minigames](https://cookieclicker.wiki.gg/wiki/Minigames)). One write-up notes that when players get bored they can trade stocks or garden, and both help progression ([UWM](https://domin224.soisweb.uwm.edu/Cookie.html)). The Garden has 34 plants found by placing plants next to each other to mutate them ([PocketGamer](https://www.pocketgamer.com/cookie-clicker/garden-guide)). Discovery is the hook.
- **Collections and secrets.** Cookie Clicker's achievements fill "milk", which multiplies production through the kitten upgrades. Shadow achievements are hidden, luck-based or joke goals that give nothing and are hunted anyway ([KosGames](https://kosgames.com/cookie-clicker-how-to-get-every-shadow-achievement-5504/)). Renaming your bakery is itself an achievement.
- **A pet with a choice.** Cookie Clicker's dragon is trained by sacrificing buildings and gives one aura from a list. Switching costs a building, so it's a real choice ([wiki.gg](https://cookieclicker.wiki.gg/wiki/Krumblor)).
- **Calendar events.** Cookie Clicker's seasons follow real dates (Halloween is 24–31 October) and drop seasonal upgrades ([wiki.gg](https://cookieclicker.wiki.gg/wiki/Seasons)). AdVenture Capitalist's rotating limited-time events give rewards that help the main game even if you don't win ([Steam](https://steamcommunity.com/app/346900/discussions/0/492378806376208107)).
- **Timed expeditions.** Egg, Inc. added spaceships in 1.20: send a ship on a mission and it comes back hours later with artifacts that change your build ([fandom](https://egg-inc.fandom.com/wiki/File:Afx_ship_millenium_chicken.png), [1.21.1 changelog](https://apkmirror.com/apk/auxbrain-inc/egg-inc/egg-inc-1-21-1-release)). Its contracts are timed goals with their own rewards.
- **Challenges that change the rules.** In Antimatter Dimensions, challenges range from small tweaks to ones that "forever change the way you play" ([ModDB](https://www.moddb.com/games/antimatter-dimensions)), and they reward autobuyers ([how-to](https://raw.githack.com/IvarK/IvarK.github.io/master/howto.html)).
- **Automation as a reward, not a starting point.** Revolution Idle players praise its automation, but ask for it earlier because hours of manual clicking are tiresome ([Steam](https://steamcommunity.com/app/2763740/discussions/0/4697908845438731810)). Automate a verb once the player knows it, and give them a new one at the same time.
- **Random events with variety.** Idle Slayer's random boxes spawn every 30–120 s with different events (frenzy, horde, portals to a bonus stage), and Chest Hunt is a small minigame around them. Players say bonus stages become one of their more powerful tools later ([Steam](https://steamcommunity.com/app/1353300/discussions/0/3035978213232537410)).
- **Stage changes that change the screen.** Universal Paperclips plateaus, then asks you to invest in a breakthrough to reach the next stage, and its interface changes with each stage ([Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips)). This is the model for "era 2".
- **Breadth.** Kittens Game moves from gathering to religion, trade and space ([TV Tropes](https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/KittensGame)). Melvor Idle's 20+ skills interact, and it keeps about 90% positive reviews among players with 20+ hours ([vaporlens](https://vaporlens.app/app/1267910/melvor_idle/stats/details)). NGU Idle is praised for interlocking systems and criticised for an excessive time commitment ([vaporlens](https://vaporlens.app/app/1147690/ngu_idle)). Breadth works, but each system has to be cheap to check in on.

### What this means for Clicker

After the crew arrives, every system Clicker has is a **multiplier on the same number**, and almost every purchase is a "buy when affordable" decision. The sim confirms it: waits stay under 5 minutes, but each purchase is obvious. What's missing:

1. **An hours-scale clock**, so coming back after a break has something to open.
2. **Decisions with no single right answer** (which kitten to send, which aura, which contract).
3. **Discovery**: things the player doesn't know exist yet.
4. **A way to play actively in a short session** beyond tapping and catching yarn.

**One mechanical caveat.** Goals are checked against the balance (`s.pts`, `checkGoal` in `game.js`), and the game also tracks lifetime earnings (`s.total`). Any big points sink below fights against "the highest number". Either charge sinks in a different currency, build them from a share of production, or measure goals and the league on `total`.

## 2. Ideas

Effort: **small** = a rule or two in `game.js` plus a card in the UI; **medium** = a new screen or sheet, new save fields and tests; **large** = a new layer or a new art set.

### 1. Night shift expeditions

**What the player does.** From 100M, an **underling** or off-duty kitten can be sent on a run: 30 min, 2 h or 8 h, to a named place ("the old silo", "the catnip fields", "the server room"). Its team runs ×0.8 while it's away. It comes back with **loot**: toys, blueprints, yarn spools, stamp clues, or a rare recruit. Longer runs bring rarer loot. Missing the return costs nothing; the loot waits.

**Why it helps.** It's the missing hours-scale clock. Opening the app after a night away has a reveal ("3 EXPEDITIONS BACK"). Choosing who to send costs a little output now for loot later, which is a real decision.

**Inspired by.** Egg, Inc. spaceships and artifacts; Fallout Shelter's wasteland trips; Neko Atsume's gifts. Guan's 20 min / 5 h / 2 day clocks.

**Effort.** Medium. Offline progress already exists (`applyOffline`); expeditions are timestamps in the save. A loot table rolled from `seed`/`rolls`, like recruits.

**Prestige fit.** No reset needed. In an era 2 prestige, expedition gear could be what carries over.

### 2. Stamps and secrets (achievements with a hidden layer)

**What the player does.** A **stamp book** fills with stamps for milestones: first factory, all five silos full at once, ten yarn in a row, a ★★★ team, a kitten at level 20, a week of care days. Each stamp gives +2% to all income, like Cookie Clicker's milk. A few pages are **blank**: secret stamps whose hint is only a silhouette.
- Secrets fit the CRT theme: type `meow` into a hidden terminal prompt, tap the cat 100 times without stopping, open the game at 03:00, let a silo stay full for a whole hour, rename the company.
- Expeditions (idea 1) can bring back clues to secret stamps.

**Why it helps.** Each stamp is a small goal the player chooses, it gives the late game more to aim for than the next ×10, and secrets add mystery. It's also the cheapest idea here, and it gives the friends league events to count.

**Inspired by.** Cookie Clicker achievements, milk and shadow achievements; Universal Paperclips' hidden turns. Already proposed for level 6 in progression-research section 10.

**Effort.** Small to medium. A list of `{id, test(s)}` in `game.js`, checked every second, and one screen.

**Prestige fit.** Stamps never reset. In an era 2 prestige they'd be the permanent backbone.

### 3. Shift contracts (timed goals with a twist)

**What the player does.** A **contract board** in the factory shows 2–3 orders. Each has a goal, a time limit and sometimes a rule:
- "Ship 40× your current income from factory #3 in 10 minutes."
- "Cat strike: reach X in 5 minutes without the cat."
- "Small batch: only factory #1 counts."
- "Blackout: no yarn this shift, all kittens ×3."

Accepting one starts a countdown; finishing pays **contract tokens**, spent on permanent perks, automation and cosmetics. New contracts appear every few hours (offline too). Failing costs nothing but the attempt.

**Why it helps.** It gives a short session a goal with a clock and a strategy (which kittens to move where, when to use care time or yarn). Rule twists make old systems interesting again without a reset.

**Inspired by.** Antimatter Dimensions challenges (which reward autobuyers); Egg, Inc. contracts; AdVenture Capitalist events. Players want to influence the game actively without being tied to it ([thread mirror](https://libreddit.neb.cx/r/incremental_games/comments/1epowcl/what_makes_an_idle_game_fun/lhn9c1s/?context=3)).

**Effort.** Medium. Contract progress has to be tracked separately from the main balance. A "test factory" sandbox, a copy of the state run only for the contract, would allow harder rules (no cat) without touching the real save, at the cost of a large effort.

**Prestige fit.** Good: challenges without a reset. Era 2 could add harder contracts.

### 4. Kitten skills on a cooldown

**What the player does.** At level 10, each kitten unlocks one **active skill** that matches its trait:
- Hard worker: *Overtime* (×4 for 60 s).
- Gearhead: *Overclock* (turbo presses ×3 for 2 min).
- Packer: *Rush shipment* (20 min of output now).
- Cheerleader: *Pep talk* (all kittens ×2 for 60 s).
- Cat's pal: *Zoomies* (the cat clicks ×5 for 30 s).
- Night owl: *Night shift* (counts as away for 10 min, at ×2).

Each skill recharges in 15–60 min, and skills stack with each other and with yarn.

**Why it helps.** In-session verbs that reward planning: line up Pep talk, Overtime and a golden yarn for a burst. Doing nothing costs nothing.

**Inspired by.** Idle Miner Tycoon managers' active skills; Cookie Clicker's Grimoire spells and combos (golden cookie + spell stacking is a whole community art). The crew research recommended cooldown skills in section 3 of progression-research.

**Effort.** Small to medium. One button per kitten card and per factory manager card; timers in the save.

**Prestige fit.** Neutral.

### 5. Golden yarn varieties

**What the player does.** Yarn no longer always gives ×5. When caught it rolls one effect, shown by colour:
- **Frenzy** ×5 for 60 s (today's).
- **Lucky**: 15 min of income at once.
- **Click storm**: taps ×100 for 10 s.
- **Silo burst**: every silo fills.
- **Schooling**: all kittens get 20% of an XP bar.
- **Rare, "Ball of string"**: a chain of three more yarns in a row.

Some stamps and contracts need specific yarns.

**Why it helps.** Today's yarn is one effect that the player learns quickly. Variety turns it into a small lottery and a reason to keep the app open, and different effects suit different builds. It also scales with the player, which the Autumn Idle postmortem warns about.

**Inspired by.** Cookie Clicker's golden cookie effects (Frenzy, Lucky, Click frenzy, Building special); Idle Slayer's random boxes.

**Effort.** Small. `FRENZY_*` becomes a table of effects.

**Prestige fit.** Neutral.

### 6. Cat auras

**What the player does.** From level 4 (1B), every cat training milestone unlocks an **aura**, and one can be active (later two):
- **Purr engine**: the cat ×2.
- **Supervisor**: kittens +25%.
- **Night light**: offline gains +50%.
- **Ball magnet**: yarn every 4–6 min.
- **Generous**: Power tap ×3.

Switching costs a cooldown (or an expedition toy), so the choice sticks for a while.

**Why it helps.** The cat dominates income but stops being interesting after it's adopted. Auras make it a build decision: active vs idle, short session vs night.

**Inspired by.** Cookie Clicker's dragon (Krumblor) auras, which cost a building to switch; Clicker Heroes' separate idle and active builds.

**Effort.** Small.

**Prestige fit.** Neutral.

### 7. Catnip garden (discovery minigame)

**What the player does.** A small garden plot (4×4) behind the factory. Plant catnip, mint, cat grass and so on; plants grow over **real hours**. Plants side by side can **mutate** into new species. Each species has a passive effect while it grows ("conveyor belts +5%", "yarn twice as often") or a harvest effect. A **seed log** tracks the species found, with blank entries for the rest.

**Why it helps.** Discovery and an hours-scale clock in one. It is a game within the game that slow players can play as well as fast ones.

**Inspired by.** Cookie Clicker's Garden (34 species, mutation by adjacency); Leaf Blower Revolution's many side systems.

**Effort.** Large. A new screen, pixel art for every plant, growth and mutation rules, and balancing so it doesn't dominate (Melvor's Township showed how one side system can make others pointless).

**Prestige fit.** Good. Seeds could carry over into era 2.

### 8. Factory floor layout

**What the player does.** Each factory gets a small floor grid (3×4). Extensions become **tiles** that the player places: presses, belts, silos, the dock, a **break room** (kittens +XP), a **yarn bin** (more yarn), a **heater** (Night owl ×1.5). Adjacency gives bonuses: a press next to a belt +10%, two silos side by side merge.

**Why it helps.** Turns "buy extension" (no decision) into "where does it go" (a puzzle with trade-offs per factory, trait and team). Relayouts are free, so the player can experiment at any time.

**Inspired by.** Synergism (buildings that affect each other); Cookie Clicker's garden adjacency; Fallout Shelter rooms that merge.

**Effort.** Large. The factory art and its rules both change.

**Prestige fit.** Neutral. Layouts would carry over in era 2.

### 9. Mega projects (a visible points sink)

**What the player does.** Past 1B, start a **mega project** that's drawn on the main screen and built in stages over hours or days: a **satellite dish** (opens the friends league), a **cat tower** (cat auras slot 2), a **space silo** (opens era 2). The player chooses what share of income goes to it (0–50%). Each stage gives a permanent bonus or unlock.

**Why it helps.** It answers "millions and nothing to spend them on" ([itch.io](https://itch.io/post/7202422)), gives long-term visible progress, and lets the player choose between the number now and the project later.

**Inspired by.** Universal Paperclips' breakthrough plateaus; Kittens Game's space buildings; Egg, Inc.'s rocket and launch pad.

**Effort.** Medium. Build from a share of production and measure goals on `total`, so the sink doesn't fight the balance (see the caveat in section 1).

**Prestige fit.** Good: the last project can be the gate to era 2.

### 10. Seasonal events

**What the player does.** Real calendar dates switch on a season:
- **Halloween** (24–31 Oct): ghost yarn and pumpkin silos.
- **Winter** (Dec): snow on the roof, gift yarn that gives cosmetics.
- **Cat Day** (8 Aug).

Each season has an event-only currency, a few stamps, cosmetic drops for the skin collection, and a themed short tune. Events need no backend, only the device's date.

**Why it helps.** A reason to come back on dates, a new look for familiar screens, and limited-time rarities (which suit the skin collection with rarity classes being built now).

**Inspired by.** Cookie Clicker's seasons; AdVenture Capitalist's rotating events.

**Effort.** Medium per season, mostly art. The first one, Halloween, is two weeks away.

**Prestige fit.** Neutral.

### 11. Promotion perks (choose 1 of 3)

**What the player does.** At kitten levels 5, 10, 15 and 20, PROMOTE offers a choice of 1 of 3 perks:
- **Foreman**: underlings +30%.
- **Mentor**: team XP +50%.
- **Courier**: 10% of output to the cat.
- **Scout**: expeditions 25% faster.
- **Lucky paws**: yarn effects +1 s per level.

Respec is free.

**Why it helps.** Promotion is "buy when affordable" today; perks make each milestone a choice per kitten and per team.

**Inspired by.** Realm Grinder's faction and build choices; talent picks in RPGs. Already ranked #3 in progression-research section 10.

**Effort.** Small.

**Prestige fit.** Neutral.

### 12. Automation unlocks ("the foreman")

**What the player does.** Contract tokens or stamps unlock toggles one at a time: auto-collect for kitten-less factories, auto-promote, auto-hire underlings, auto-catch yarn at 50% value, and auto-care that does the daily task at ×1.5 instead of ×2.

**Why it helps.** By 1B, the old verbs are chores. Automating them, *paired with new verbs* (contracts, expeditions, skills), moves the player's attention to the new layer, the way every Antimatter Dimensions layer works. On its own it would make "sits there" worse, so ship it only together with ideas 1, 3 or 4.

**Inspired by.** Antimatter Dimensions and Revolution Idle autobuyers. Revolution Idle players asked for automation earlier, because manual clicking for hours was tiresome ([Steam](https://steamcommunity.com/app/2763740/discussions/0/4697908845438731810)).

**Effort.** Small per toggle.

**Prestige fit.** In era 2, these would be the perks that make a replay fast.

### 13. Era 2 as an optional prestige ("the move")

**What the player does.** At 10T, the space silo (idea 9) is finished, and the player can choose to **move to a new site**: the balance, factories and upgrades reset. In exchange:
- **Kittens, stamps, seeds and cosmetics are kept.**
- The player earns **patents** = ∛(lifetime / 10¹³), spent on a permanent tree.
- Era 2 changes one rule, like Paperclips' stages: for example, factories have power to share, or kittens can be assigned to two factories.

It's never forced, and a player who doesn't move keeps going with ×100 goals.

**Why it helps.** The game becomes a fast replay with new powers; ascension in Cookie Clicker is timed to a bundle of unlocks, not a number ([wiki.gg](https://cookieclicker.wiki.gg/wiki/Ascension)).

**Inspired by.** Cookie Clicker ascension, Egg, Inc. prestige and soul eggs, Universal Paperclips' stages. The user declined prestige at 100M, not after 10T; it's offered as a choice here.

**Effort.** Large.

**Prestige fit.** It is prestige, but optional, after the content in this list, and with the crew kept, so it respects the 100M decision.

### 14. Terminal events and the "phosphor" story

**What the player does.** The CRT occasionally prints a line: `> INCOMING TRANSMISSION`, a message from a rival factory, a kitten's diary entry, a glitch that hides a stamp. At each level a short boot-style story beat plays (like CAT ADOPTED), and the story builds towards era 2 ("Who built the first silo?").

**Why it helps.** Players stay for the mystery as well as the number. Paperclips' story emerges from the interface, and Leaf Blower Revolution players mention its lore as a draw. It's cheap and fits the look.

**Inspired by.** Universal Paperclips' narrative through the UI; Cookie Clicker's news ticker.

**Effort.** Small (text plus the existing boot sequence).

**Prestige fit.** Sets up era 2.

## 3. How the ideas fill the clocks

| Clock | Today | Added by |
| --- | --- | --- |
| Seconds | taps, cat | yarn varieties (5) |
| Minutes | purchases, golden yarn | kitten skills (4), contracts (3), terminal events (14) |
| Hours | — | expeditions (1), garden (7), contract refresh (3) |
| Day | care time | contracts, garden harvests |
| Week / season | — | seasonal events (10), friends league (planned) |
| Long-term | levels to 10T | stamps (2), mega projects (9), era 2 (13) |

## 4. Recommended top 3

1. **Night shift expeditions (1).** It fixes the biggest gap: nothing happens at the hours scale, and returning after a break has no reveal. It uses the underlings the player already owns, gives them a decision (send or keep working), and is a source of loot for stamps, cosmetics and contracts. Medium effort.
2. **Stamps and secrets (2).** It's the cheapest to build, it gives a dozen small, player-chosen goals between levels, and it adds mystery in the Phosphor style. It also produces the events the friends league will need. Small to medium effort.
3. **Shift contracts (3).** Contracts give a short session a goal with a clock and a twist, and make the crew's systems (MOVE, care, yarn) tactical again without a reset. The tokens give automation (12) and perks a currency. Medium effort.

Quick wins to slot in next to these: **golden yarn varieties (5)** and **cat auras (6)**, both small. **Kitten skills (4)** is a strong runner-up for #3 if contracts feel too large.

Before building any of them, use the sim to measure "decisions per minute" and the time to the next *new* thing (not just the next purchase), so the late game can be compared before and after.
