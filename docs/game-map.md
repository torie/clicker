# Game map

The shape of the game: the levels, what each one opens, and the systems that run alongside them. Keep it up
to date when a level, system or unlock changes (the diagram is Mermaid, so GitHub renders it).

Times are minutes of play for the default simulated player (`node scripts/balance-sim.mjs`: 5 taps/s,
collects every 20 s, does care time, catches a golden yarn every 8 min, buys and wears skins, keeps up to 3
underlings on night shifts for badges). Boxes are not in the sim yet. Era 2's full plan is in
[era2-plan.md](era2-plan.md).

## The levels

```mermaid
flowchart TD
  classDef level fill:#0F2416,stroke:#39FF6A,color:#9CFFB5
  classDef opens fill:#1C1608,stroke:#FFD479,color:#FFD479
  classDef always fill:#0A140D,stroke:#4E9A63,color:#7CFF9B
  classDef future fill:#070A08,stroke:#4E9A63,color:#4E9A63,stroke-dasharray:4 3
  classDef weak fill:#2A2400,stroke:#FFE66B,color:#FFE66B

  START([New game]):::level
  START --> TAP["Tap the button<br/>Upgrades: Auto-clicker, Double tap, Quad tap,<br/>Lucky clicks, Power tap<br/>(each shows at half its price)"]:::opens
  START --> FAC["Click factories ×5<br/>500 · 3.3K · 38K · 67K · 120K<br/>Extensions: lines, turbo, silo, dock<br/>Silos must be collected"]:::opens

  TAP --> L1
  FAC --> L1
  L1{{"LEVEL 1 · 1M · ~17 min<br/>bought, not reached"}}:::level
  L1 --> CAT["The cat clicks 12×/s<br/>+ Cat training upgrade"]:::opens
  L1 --> YARN["Golden yarn every 6–10 min<br/>catch it: all income ×5 for 60 s"]:::opens

  CAT --> L2
  L2{{"LEVEL 2 · 10M · ~9 min<br/>reached"}}:::level
  L2 --> STORE["STORE<br/>skins (released ones), jukebox,<br/>boxes, code field"]:::opens
  L2 --> CREW["KITTEN CREW<br/>first kitten free, hire one per factory<br/>(450K → 7.2M); factories ship by themselves"]:::opens
  CREW --> CREWX["Traits · favourite factory · MOVE<br/>Kitten XP → PROMOTE (priced in crew output)"]:::opens
  CREW --> CARE["Care time once a day<br/>feed + nap + play → factories ×2 for 1 h"]:::opens

  CREWX --> L3
  L3{{"LEVEL 3 · 100M · ~6 min"}}:::weak
  L3 --> SUBS["UNDERLINGS<br/>slots at kitten level 5 / 10 / 15<br/>★ same trait: more, 3★ team bonus"]:::opens
  L3 --> HQ{{"ERA 2 OPENS · HQ<br/>wings give badges;<br/>levels 4–8 need points + badges"}}:::opens
  HQ --> NIGHT["EXPEDITIONS<br/>night shift: silo, fields, server room, roof<br/>side-quests: the lost blueprint, the smugglers"]:::opens
  SUBS --> NIGHT
  NIGHT -- "first badge" --> ARC["ARCADE<br/>Conveyor sort, Yarn rush<br/>3 plays, tickets, prizes"]:::opens
  HQ -.-> CON["CONTRACTS · soon"]:::future
  HQ -.-> LABW["LAB · soon"]:::future

  NIGHT --> L4
  ARC --> L4
  L4{{"LEVEL 4 · 1B + 1 badge · ~15 min<br/>all income +50%"}}:::level
  L4 --> L5{{"LEVEL 5 · 10B + 2 badges · ~16 min<br/>+50%"}}:::level
  L5 --> L6{{"LEVEL 6 · 100B + 3 badges · ~13 min<br/>+50%"}}:::level
  L6 --> L7{{"LEVEL 7 · 1T + 5 badges · ~20 min<br/>+50%"}}:::level
  L7 --> L8{{"LEVEL 8 · 10T + 6 badges · ~60 min<br/>+50% · end of era 2"}}:::level
  L8 --> ERA3(["ERA 3 · SOON<br/>(not designed yet)"]):::future

  subgraph ALONG ["Runs alongside every level"]
    SKINS["SKIN COLLECTION · 182 skins<br/>stats and feats release them from the first tap;<br/>buyable from level 2; the worn skin gives a bonus"]:::always
    BOXES["BOXES (from level 2)<br/>cardboard → golden: upgrades for good,<br/>skins, clicks, spools, blueprints"]:::always
    SPOOL["Golden spools<br/>a yarn ×5 whenever you like"]:::always
  end
  L2 -.-> BOXES
  START -.-> SKINS
  NIGHT -.-> SPOOL
  BOXES -.-> SPOOL
  BOXES -.-> SKINS

  subgraph MP ["Friends league (prepared)"]
    EV["Profile + event log<br/>test saves flagged"]:::always
  end
  HQ -.-> EV
```

**Era 1 is one line; era 2 branches.** Levels 1–3 come in the same order for everyone. From level 3 the
wings are side branches that join back at every level through badges: a player picks which wings to chase.
(City branches on a map were tried after level 2 and removed: see CLAUDE.md.)

## The clocks

What brings the player back, on each timescale. Gaps are where the game "just sits there".

| Timescale | What happens | Opens at |
| --- | --- | --- |
| Seconds | Tapping, lucky clicks, Power tap | Start |
| ~1 minute | Collecting silos (until kittens run the factories) | First factory |
| Minutes | Buying upgrades and extensions, promotions, underlings, boxes | Start / L2 / L3 |
| 6–10 minutes | Golden yarn rolls past | L1 |
| 20 min | An arcade play comes back | First badge |
| 30 min – 4 h | Night shift: the old silo, the catnip fields, the roof; side-quest steps | L3 |
| 1 hour | Happy crew from care time runs out | L2 |
| 8 hours | Night shift: the server room; offline progress cap | L3 / start |
| A day | Care time; skin unlocks for care days and streaks | L2 |
| Days to weeks | The rarest skins (9-day care streak, 200 yarns, 100 skins owned) | — |

## Known weak spots

- **Level 3 is short (~6 min)**: care time at 10M doubles the crew for an hour, which carries straight through it.
- **Level 2 (~9 min)** leans almost entirely on the cat.
- **Level 8 waits about an hour** for the last badge (10 night shifts or 30 in Yarn rush): fine as a finale,
  but points pile up meanwhile.
- After level 8 nothing new arrives ("ERA 3 · SOON").
- **Spending competes with levels**: levels check the points you hold, so boxes, skins and promotions all delay
  the next level.
- Night shift and boxes are not in the balance sim, so their effect on level times is unmeasured.
