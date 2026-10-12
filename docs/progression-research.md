# Progression research and proposal (2026-10-11)

Research into how incremental and idle games handle pacing, prestige, worker management and multiplayer. It is followed by a diagnosis of Clicker's current balance and a proposed plan. Nothing here is built yet. The open questions at the end are for the user to decide.

## 1. What is wrong today (measured)

These numbers come from `scripts/balance-sim.mjs` with the default greedy player (5 taps/s, collecting every 20 s, crew care every 20 s), plus extra logging of income by source and of purchases per minute.

| Stage | Time | Income at the end | Main source |
| --- | --- | --- | --- |
| 0 → 1M | 30.7 min | 1.4K/s | factories 76% |
| 1M → 10M | 14.1 min | 33K/s | **cat 78%** |
| 10M → 100M | 16.6 min | 137K/s | evenly split between cat, factories and taps |

Purchases per minute, from minute 0 to 61:

```
+64135..1112.85..24...............12...1....424.16......+.....
```

1. **A 16-minute dead zone before 1M.** After minute 18.7 nothing is worth buying until the goal. Every upgrade is maxed, and the 5th factory (500K) never pays off before the goal. Income sits flat at 1.4K/s for 12 minutes. This is the main cause of "difficulty varies too much".
2. **The cat is a ×28 jump.** Income goes from 1.4K/s to 40K/s within 6 minutes of adopting it, so 1M → 10M is easy.
3. **Nothing lacks a cap.** Every upgrade has a max level except the Auto-clicker, which adds +1/s. So each stage ends in "nothing left to buy, wait". The genre avoids this with repeatable purchases whose cost grows exponentially, plus milestone bonuses.
4. **Kitten care is a chore, not a choice.** Feed, nap and play each have one correct answer ("refill the empty bar"). They never get deeper, and neglecting them penalises the best income source, the cat. Even so, the late game still feels automatic, because the care adds work without adding any decisions.

## 2. Research findings

### Pacing math

The main source is Anthony Pecorella's "The Math of Idle Games", [part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i), [part II](https://www.gamedeveloper.com/disciplines/the-math-of-idle-games-part-ii) and [part III](https://gamedeveloper.com/design/the-math-of-idle-games-part-iii).

- **Cost formula:** cost = base × rate^owned, with the rate in the 1.07–1.15 range. Production grows linearly with the number owned, so costs always win eventually. Balancing only controls *when* the wall arrives.
- **Milestone multipliers push production ahead of cost for a while.** AdVenture Capitalist halves a business's cycle time at 25/50/100/200… owned ([summary](https://steamcommunity.com/app/346900/discussions/0/530646080843836486)). If each generator has different thresholds, the best buy keeps changing.
- **Make the curve deliberately bumpy.** Alternate fast and slow stretches. A flat curve feels dead, and one long wall feels unfair (part III).
- **Player actions should speed up the passive growth, not gate it** ([Pecorella, GDC](https://www.gamedeveloper.com/design/the-rise-of-games-you-mostly-don-t-play)).

### Prestige, and layers that change the verb

**Formulas for the reset currency** (Pecorella part III):

| Game | Formula |
| --- | --- |
| AdVenture Capitalist | 150·√(lifetime/10¹⁵) |
| Cookie Clicker | ∛(lifetime/10¹²) |
| Egg, Inc. | (run/10⁶)^0.14 |

- With a root of *lifetime* earnings, each run has to go further than the last.
- Cookie Clicker's first ascension is timed to a *bundle of unlocks*, not to a number ([wiki.gg](https://cookieclicker.wiki.gg/wiki/Ascension)).

**Antimatter Dimensions** is the clearest model of layering ([how-to](https://raw.githack.com/IvarK/IvarK.github.io/master/howto.html)):

- Each layer (boost, galaxy, infinity, eternity, reality) *automates the previous layer's verb* and adds a new one.
- Challenges disable a system and reward an autobuyer.

**Choices instead of upkeep in other games:**

- Realm Grinder: a faction pick each run.
- Clicker Heroes: separate idle and active builds.
- AdVenture Capitalist: spend angels now or keep them for the bonus.
- Universal Paperclips: stages that change the resources and the screen ([Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips)).

**Rewarding active play without punishing idle play:** Cookie Clicker's golden cookies appear every 5–15 min ([wiki.gg](https://cookieclicker.wiki.gg/wiki/Golden_Cookie)):

- Frenzy: ×7 for 77 s.
- Lucky: a lump sum capped by your bank.
- Click Frenzy (rare): ×777 per click for 13 s.

They are optional, they stack, and missing one costs nothing.

### Why care mechanics get tedious, and what works instead

**Why they get tedious:**

- **The pattern is learned.** Players stop having fun once the pattern is learned ([Koster](https://www.shortform.com/summary/a-theory-of-fun-for-game-design-summary-raph-koster)). Cook's "skill atoms" must either feed a deeper skill or be automated away ([Lostgarden](https://lostgarden.com/2007/07/19/the-chemistry-of-game-design/)).
- **A refill is not a decision.** Sid Meier's test for an interesting decision is that no option is clearly best ([Game Developer](https://www.gamedeveloper.com/design/designing-interesting-decisions-in-games-and-when-not-to-)). Refilling has one right answer, so it fails.
- **Wither drives players away.** FarmVille's wither forces appointments, but players who return to "a total mess" churn, and Hay Day dropped wither ([Adrian Crook](https://adriancrook.com/should-farmvilles-famous-wither-mechanic-be-left-to-rot/)). "Kitten stops working, cat loses focus" is wither.
- **Penalties feel worse than bonuses.** World of Warcraft relabelled "tired = 50% XP" as "rested = 200% XP" with the same maths, and the complaints stopped ([Psychology of Games](https://www.psychologyofgames.com/2010/03/framing-and-world-of-warcrafts-rest-system/)).
- **Players complain about babysitting.** One Idle Champions player said new systems turned it into "24x7 babysitting" ([Steam](https://steamcommunity.com/app/627690/discussions/0/2270321250027580638)).

**What works instead:**

- **Hire once, then optional active skills.** Idle Miner Tycoon managers are hired once. Each has an *active skill on a cooldown* that is optional upside, and placement matters ([AppGamer](https://www.appgamer.com/idle-miner-tycoon/strategy-guide/managers-in-idle-miner-tycoon)).
- **Assignment as a puzzle.** In Fallout Shelter you assign dwellers by stat and see a live preview of the effect ([Keengamer](https://www.keengamer.com/articles/guides/how-to-play-fallout-shelter/)). In Tiny Tower, a worker in their dream job earns a bonus ([wiki](https://tinytower.fandom.com/wiki/Bitizens)). The fun is matching workers to places, not upkeep.
- **Expeditions.** Fallout Shelter's wasteland trips and Egg, Inc.'s ships: one choice now, loot when you come back, and missing the return costs nothing.
- **Nothing is ever taken away.** In Neko Atsume, cats visit and leave gifts.

### Multiplayer

**Leagues: Duolingo's are the best answer to very different play time** ([Deconstructor of Fun](https://duolingo.deconstructoroffun.com/mechanics/leagues)):

- Groups of about 30 similar players.
- Ranked by what each earns *this week*.
- Promotion and demotion between tiers.

**Co-op contracts: Egg, Inc.** Shared timed goals pool production, and teammates gift each other boosts. The main problem is freeloaders, so tie rewards to each player's contribution.

**Limited attempts per window put casual and active players on equal footing:**

- Tap Titans 2: clan raids with 4 attacks per 12 h.
- Clicker Heroes: clan bosses that only count clicks.

**Shared global state: Reddit's The Button and r/place.** One scarce, identical action per player plus one shared board drove huge engagement ([Wikipedia](https://en.wikipedia.org/wiki/R/place)).

**Avoid stealing.** Coin Master-style raids punish being offline, which is the core loop of an idle game, and loss aversion makes them feel bad.

**Cheating is unavoidable in a client-side game** (one idle developer estimates 1–2% of players). Use layered defences:

- Friends or small groups, so the stakes stay low.
- Server time only, never the client's clock.
- Plausibility checks (gain ≤ maximum rate × elapsed time).
- Hide outliers instead of banning them.

**Tech.**

- **Cloudflare Workers + D1** is free at this scale and never pauses. The Worker can `import` `src/game.js` directly, so it can run the same rules for plausibility checks.
- **Firebase** needs the paid plan for server functions.
- **Supabase**'s free tier pauses after a week of inactivity.
- **Nakama** and PocketBase need a server to run and maintain.

## 3. Proposal

### Principles

1. **Each stage automates the previous verb and introduces one new decision.** For example: tapping is automated by the cat, collecting by the kittens, and kitten care by lead kittens.
2. **Every stage has at least one repeatable purchase with a rising cost**, so there is always something to buy. Milestone multipliers keep the best buy changing.
3. **Each goal takes about 1.0–1.3× as long as the previous one**, with a quick burst at the start of each stage from its new mechanic. The new mechanic should be the biggest lever in its own stage, without one ×28 jump.
4. **Care is a bonus, never a penalty.** The worst a neglected kitten does is fall back to a good base rate.
5. **Active play earns optional, stacking boosts.** Idle play is never punished.
6. **Required actions per minute go toward zero once a system has been taught.** Optional bonus actions are counted separately in the sim.

### Stage by stage

| Level | Range | New verb | What changes |
| --- | --- | --- | --- |
| 1 · Taps | 0 → ~5K | tap, buy upgrades | Keep as it is. Add a **golden click** that appears every few minutes: ×7 for 60 s, or a lump sum. |
| 2 · Factories | → 1M | build, extend, collect | Close the dead zone: **repeatable upgrades** (e.g. a "Press tuning" level per factory at ~1.12× cost, with ×2 milestones at 10/25/50) and a cheaper factory #5. Aim for no gap longer than ~3 min without an affordable buy. |
| 3 · Cat | 1M → 10M | train the cat | The cat starts at about ×3–5 total income, not ×28, and grows through **cat training** levels (repeatable). Optional "zoomies": tap the cat for a short burst. |
| 4 · Crew | 10M → 100M | **assign** kittens | Remove the draining needs. Kittens roll **traits** (Glutton, Engineer, Night owl, Show-off…) and have a **favourite factory**, with a Fallout Shelter-style preview of the multiplier before you assign. Feed, nap and play become **optional skills on cooldowns** (Feast ×3 for 60 s; Power nap banks output and releases it ×2; Yarn: your score in the minigame sets the bonus). Optional **expeditions** for off-duty kittens bring back toys, which give permanent mood bonuses, and skin fragments. |
| 5 · Next cycle | 100M | **promote** kittens (prestige) | Reset points and factories. **Kittens are kept** and earn XP. Cycle currency = √(lifetime / 1e8). A promoted kitten becomes a **lead** that runs underlings and looks after them itself; this is the planned shift the user described. The player chooses leads, matches lead and underling traits, and spends the currency on permanent unlocks. Later: challenge runs ("no cat", "one factory") that reward perks. |

Using prestige at 100M fits the user's plan for kittens levelling up, and it also gives multiplayer a fair basis: compare progress within a cycle or a week, not lifetime totals.

### Multiplayer, ranked

1. **Weekly Cat League (Duolingo-style).** Groups of ~30 by stage, ranked by points earned this week. Offline gains count at a reduced rate. Rewards are cosmetic (league-only skins and tracks), which keeps the Store cosmetic. It is the simplest to build and the fairest, and the cheat check is one formula.
2. **Co-op shipping contracts.** Teams of 4–6 have 72 h to ship N clicks together. Teammates can **gift a treat** to boost each other's kitten. Rewards scale with each player's contribution.
3. **Global Mega Silo.** Everyone's collects fill one shared weekly silo, and milestones turn on a temporary boost for everyone. It's one counter and cheap to build. Optionally split players into houses (Ginger / Midnight / Tuxedo) that compete.
4. **Avoid:** raids or stealing from silos.

**Stack:** GitHub Pages client, plus one Cloudflare Worker, plus D1, with the Worker importing `src/game.js`.

- Identity is an anonymous ID and a secret stored in localStorage, with no sign-up.
- Scores sent while offline are queued and submitted later.

**Minimal first step:**

1. Add `weekEarned` to the save, reset each Monday UTC.
2. The client posts it every 60 s.
3. The Worker rejects gains above a plausible rate.
4. Show a "TOP 30 THIS WEEK" panel.

### Suggested order of work

1. **Rebalance stages 2–3:** add repeatable upgrades with milestones, make the cat a growth curve instead of a jump, and add the golden click. Extend `balance-sim.mjs` to print each income source's share, the longest gap between purchases, and required vs optional actions per minute.
2. **Rework the crew:** traits, assignment, cooldown skills, and remove draining needs.
3. **Multiplayer v1:** the weekly league (needs the Worker).
4. **The 100M cycle:** promotion, leads and underlings.
5. **Multiplayer v2:** co-op contracts, using gifting between kittens.

## 4. Decisions (the user, 2026-10-11)

1. **No prestige reset at 100M.** The game carries on: kittens level up and get underlings, with no reset. So every stage needs repeatable purchases and new goals beyond 100M, rather than relying on a reset to restore the pace.
2. **Kitten needs become a once-a-day bonus task.** Doing the task gives a temporary speed bonus. Neglect costs nothing.
3. **Multiplayer will be a friends-only competition** (e.g. a league among friends).
4. **A small backend is fine, but multiplayer waits** until the mechanics feel right.

Order of work: (1) rebalance stages 2–3 and extend the sim's metrics; (2) rework the crew: draining needs out, assignment and traits in, plus the daily bonus task; (3) goals beyond 100M with kitten levels and underlings; (4) friends league.

## 5. First rebalancing attempt: findings

**The sim was too naive and is now improved.** In `scripts/balance-sim.mjs`:

- The greedy player now buys things as bundles: a speed-up together with the silo it needs, and a new factory together with its lines.
- It keeps buying anything that pays for itself within 5 minutes, even while saving for the goal.
- It prints, per goal, the longest wait between purchases and each income source's share. `--trace` lists every purchase.

With the improved sim, today's rules give:

| Goal | Time | Longest wait | Income at the end |
| --- | --- | --- | --- |
| 1M | 25.3 min | 7.3 min | taps 15%, factories 85% |
| 10M | 12.9 min | 5.0 min | **cat 76%** |
| 100M | 17.8 min | 7.0 min | mixed |

**Tuning prices alone doesn't fix it.** I tried:

- uncapped assembly lines
- a weaker cat plus a repeatable Cat training upgrade
- a cheaper factory #4 and #5
- cheaper turbo presses and silos

Each change mostly moved the problem somewhere else:

- **Uncapped lines** made new factories and click upgrades pointless: 1M was reached with two factories, and taps fell to 1% of income.
- **The income sources are substitutes that multiply.**
  - Taps and the cat both scale with the click value (×2⁵·4³), and factories don't.
  - Kittens multiply the factories by ×6.
  - So small price changes flip the best strategy between "all cat" and "all factories". Goal 3 swung between 6 and 18 minutes.

The draft rule changes are reverted. Only the sim improvements are kept.

## 6. Proposed economy v2 (to decide before tuning)

1. **Complementary sources, not competing ones.** Tapping should stay worthwhile at every stage. One option is a "Power tap" upgrade: each tap also earns n% of your income per second (Cookie Clicker does this). Then no source makes another one pointless.
2. **The cat grows instead of jumping.** It starts at about 10 clicks/s (not 50), and a repeatable "Cat training" upgrade adds to it at a steep price (about ×2 per level). Target: the cat brings in 40–50% of goal 2's income, not 76–84%.
3. **Factories keep the 5-factory ladder and 4 lines.** The mid-game gap gets cheaper steps: factory #4 at ~80K, #5 at ~200K, turbo price ×3 per level and up to 4 levels, and silos up to 10 levels.
4. **Kittens:** replace the flat ×6 with a smaller base boost, plus trait and assignment bonuses (step 2 of the plan). That's where goal 3's speed gets tuned.
5. **Beyond 100M without a reset** needs purchases with no cap that never run out. Kitten levels are the natural one: each level is a multiplier, the cost grows exponentially, and underlings come at certain levels.
6. **Targets for the sim:**
   - goals of roughly 25 / 28 / 32 min
   - no wait longer than ~4 min
   - no single source above ~60% of income in any goal
   - required care actions near 0 (the daily bonus task is optional)

## 7. Economy v2 as built (2026-10-11)

Items 1–3 of section 6 are built. Item 4 is a stopgap for now (kittens ×2 instead of ×6), and item 5 comes with the crew rework.

- **Power tap:** 1% of income per second per level, max 5, from 20K, ×3.87 per level.
- **Cat:** starts at 16 clicks/s. **Cat training** adds 16 per level, from 300K, ×2.7 per level, with no cap.
- **Factories:** cost 500 / 4K / 25K / 63K / 150K. Extension cost tier ×3.87. Turbo ×3.36 per level, max 4. Silo from 260, ×1.84, max 10. Quad tap ×34.

**Results (default player):**

| Goal | Time | Longest wait | Income at the end |
| --- | --- | --- | --- |
| 1M | 22.3 min | 5.0 min (the final save for the cat) | factories 94% |
| 10M | 14.3 min | 2.8 min | cat 56%, taps 22%, factories 22% |
| 100M | 13.2 min | 3.0 min | taps 26%, cat 32%, factories 42% |

The slow player (3 taps/s, collecting every 40 s) gets 25.3 / 17.1 / 14.2 min, with waits of at most 4.7 min.

**What the search taught:**

- If a player keeps buying things that pay back within P minutes, income grows ×10 about every 2.3·P minutes.
  - "Never wait more than ~5 min" therefore means each ×10 goal takes about 12–15 min.
  - Longer goals need slower paybacks, or many small purchases.
- Goal 2 stays the fastest because the cat's clicks/s and the click value multiply each other.

## 8. Crew v2 as built (2026-10-11)

Step 2 of the plan is built.

- **Draining needs are gone.** There's no hunger, no naps that stop work, no lessons, and the cat is never distracted.
- **Assignment is the decision.**
  - Each kitten has a favourite factory (×1.5) and one of six traits: Hard worker, Gearhead, Packer, Cheerleader, Cat's pal, Night owl.
  - The next recruit is shown before hiring.
  - MOVE swaps kittens, with a preview of the shipped income.
- **Care time, once a day:** feed, nap and play (the yarn game) make every kitten-run factory ×2 for an hour.
- **Base kitten boost ×1.** A kitten-run factory never stalls on its silo, which is a big speed-up on its own. With a ×2 base, goal 3 shrank to about 5 minutes.

**Sim (care time on/off):**

- Goal 3 takes 8.6 / 12.3 min, with waits of at most 3.6 / 5.9 min.
- Management drops to 1.0 actions/min, from 14/min while collecting in goal 2.
- The sim player now hires as soon as it can afford it, because the income maths doesn't value the end of collecting.

**Open:** goal 3 is shorter than goal 2. Kitten levels (step 3) are the repeatable purchase that should lengthen it.

## 9. Smaller gap between factories (2026-10-12)

The user noticed that each factory making ×3 the previous one made early factories pointless. Fully upgraded, factory #1 was 1% of factory output and #5 was 66%.

- **Now ×1.6 output and ×1.9 extension cost per factory.** The fully upgraded shares are 6 / 10 / 16 / 26 / 41%.
- **More turbo levels and a stronger base.** The total factory ceiling dropped, so factories got up to 5 turbo presses, a higher base rate (24/s per line) and a ×1.7 kitten base boost.
- **Quad tap is capped at 2**, so the cat doesn't swamp the crew phase.
- **The trade-off.** With smaller steps there's less to buy overall. The prices either made factories #4 and #5 a trap (20 / 15 / 9 min) or let everything be bought early (17 / 10 / 8 min). The user chose the second.
- **Next:** more content, either more lines per factory or kitten levels as a repeatable purchase, to bring back even pacing.

## 10. Next mechanics and goal spacing (research, 2026-10-12)

### Goal spacing

- **Shipped games keep a round, fixed reward step and let the time between milestones grow.**
  - Egg, Inc. eggs are each worth ×5 the previous one, while the farm value needed to unlock the next grows ×45–700 per step ([wiki](https://egg-inc.fandom.com/wiki/Eggs?oldid=2165)).
  - Cookie Clicker's kitten upgrades cost ×1000 per step ([wiki.gg](https://cookieclicker.wiki.gg/wiki/Milk)).
  - Universal Paperclips gives frequent small wins (trust at Fibonacci steps, about ×1.6 apart) and only two big era changes.
- **Pacing guides say:** early goals fast, later ones longer but finite. Tune by time-to-next rather than by price, and avoid stretches of 3 h or more without burst events.
- **Long goals don't have to mean long waits.**
  - A purchase with payback P that adds a fraction x of income costs P·x·income, so the wait to afford it is only P·x.
  - Many small (x ≤ 20%) purchases with no cap therefore allow long goals (high P) with waits of 1–2 minutes.
  - **Clicker's goals are short because there's too little to buy, not because 1M / 10M / 100M is wrong.**
- **Recommendation: keep ×10 round numbers.** Lengthen goals 2–3 with content (kitten levels from 10M), and continue the ladder 1B → 10T. Possibly switch to ×100 goals after an "era" boundary.

### Proposed ladder (default sim player)

| Goal | Value | Target min | Cumulative | What carries it |
| --- | --- | --- | --- | --- |
| 1 | 1M | 17 | 17 | factories |
| 2 | 10M | 12 | 29 | cat + cat training |
| 3 | 100M | 12 | 41 | kitten crew + first promotions |
| 4 | 1B | 14 | 55 | kitten levels, first underlings |
| 5 | 10B | 15 | 70 | underlings, team synergy |
| 6 | 100B | 17 | 87 | stamps (achievements) |
| 7 | 1T | 19 | 106 | lead perks tier 2 |
| 8 | 10T | 22 | 128 | era boundary |

### Next mechanics, ranked

1. **Kitten levels: XP from work + PROMOTE.**
   - Working fills a kitten's XP bar (Night owl's counts while away).
   - When it's full, PROMOTE costs points and gives +15% to its factory. Levels 5/10/15/20 are milestones (×2 and an unlock).
   - No cap, no decay, and nothing lost on MOVE.
   - Start at 10M.
   - Patterns: Fallout Shelter XP from work, Idle Miner super managers, AdVenture Capitalist milestones.
2. **Underlings.**
   - Levels 5/10/15 open slots for up to 3 underlings per lead.
   - Underlings are recruited from the save seed, cost points, have a small trait, add output and XP to their lead, and need nothing.
   - Decisions: which lead gets a slot, which recruit to take, team set bonuses, moving whole teams.
   - Lesson from Idle Miner's Super Manager 2.0: show progress from the first session; don't hide it behind scarce currency.
3. **Perk picks at promotion milestones:** choose 1 of 2–3 (Foreman: underlings +30%; Mentor: team XP +50%; Courier: 10% of output to the cat), with free respec.
4. **Golden yarn and stamps.**
   - Golden yarn: an optional tappable yarn ball every 6–10 min of active play gives ×5 for 60 s. Missing it costs nothing.
   - Stamps: achievements, each worth +2–4% permanently (Cookie Clicker milk).
   - Both produce countable events for the friends league.

### Friends league

Raw "points this week" always favours whoever started earliest. Fairer scores:
- orders of magnitude gained this week;
- league points for events (goals, promotions, care days, yarn catches);
- a weekly fresh-start event.

## 11. Kitten levels, underlings, golden yarn (built 2026-10-12)

The user's choices:
- promotion costs points;
- kitten levels start at 10M;
- 3 underlings per kitten, with art;
- try golden yarn;
- call them levels.

Built:
- **Levels to 10T.** 100M opens underlings, and levels 4–8 each give +50% income.
- **Kitten XP and PROMOTE.**
- **Underlings.** Hard-hat sprites stand at the belts, with trait matching and a team bonus.
- **Golden yarn.** It gives ×5 for 60 s, every 6–10 minutes.

**What tuning taught.**
- **Fixed promotion prices don't work.** Kitten output grows from levels, teams, care, yarn and level bonuses at once. Early promotions paid back in 1–20 s, so the XP timer alone set the pace, and late ones walled for hours.
- **Pricing in seconds of the crew's average output fixes it.** With promotions and underlings priced that way, payback stays at a few minutes at every stage and the search converged easily.
- **Result:** about 2 hours from 0 to 10T, each level a bit longer than the last (except level 3 when care time is done straight away), with no wait over about 5 minutes for any play style tested.
