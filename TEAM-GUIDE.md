# Team guide — En nat i Lejet

Written for the three of us, for the live demo and the code walkthrough. In the walkthrough each
of us is asked about code we did not write, so everyone should read all of this once.

## 1. What we built

We took the solo project (a festival planner) and extended it into a game.

| Page | What it does | File |
|---|---|---|
| Play the festival | Pick a day, make a character, choose a mission, then walk around the site in 3D | `game_screens.py`, `game3d/` |
| Plan the programme | The solo project: book artists on stages inside a budget | `app.py` |
| High scores | Every finished night, best first | `game_screens.py` |

The link between the two halves: in the game you can choose **"Your own programme"**, and then the
artists you booked in the planner are the ones playing on the stages.

Run it: `uv run streamlit run festival.py`. Test it: `uv run pytest` (100 tests).

## 2. The one idea to remember

**The 3D world is the stadium. Python is the referee.**

```
Python                               Browser (JavaScript)                    Python
game.build_config()  ── config ──▶  game3d/ draws and lets you play  ── events ──▶  game.finish_night()
 day, mission, map,                  writes down what happens:                 clean_events → summarise
 programme, prices                   buy / watch / kiss / backstage / end      → score → db.save_run
```

- JavaScript never decides the score. It only reports events.
- Python does not trust the report blindly: `game.clean_events` throws away rubbish, and
  `game.accepted_purchases` recounts the money and drops anything you could not afford.
- Every number (beer price, how strong a beer is, when you pass out) is written once, in
  `game.py`, and sent to the browser inside the config.

## 3. Every file in one line

**Python**

| File | Job |
|---|---|
| `festival.py` | Front door: the three buttons, then calls the right page |
| `game_screens.py` | The game's pages. Hands the JavaScript to the browser (`game_component`) |
| `app.py` | The planner page |
| `game.py` | The game's rules: money, buzz, concerts, missions, score |
| `logic.py` | The planner's rules: overlaps, opening hours, budget |
| `programme.py` | The acts of each day (real 2026 days, or the planner's bookings) |
| `world.py` | Where every stage, bar and toilet stands (measured from the site map) |
| `db.py` | The only file that reads and writes the database |

**JavaScript (`game3d/`, glued together in name order by `game_screens.game_code`)**

| File | Job |
|---|---|
| `00_core.js` | Helpers: `G` (the whole running game), collisions, `logEvent` |
| `10_world.js` | Sky and light by time of day, the painted ground, trees, one builder per kind of building |
| `20_people.js` | `buildCharacter` (boxes with swinging arms and legs) and the crowd of 520 |
| `30_player.js` | Keys and mouse, walking, jumping, drunk wobble, the camera |
| `40_concerts.js` | Stages, who is live, the light show, music made from rules |
| `50_life.js` | Time passing, buying, toilets, passing out, `endNight` |
| `55_showtime.js` | Lamp glow, phone lights, lasers, fireworks, the security buggy |
| `60_missions.js` | Guards, backstage, Jonas the crew member, the flirt mission, the mission box |
| `70_hud.js` | Clock, bars, mini-map, menus, messages |
| `90_main.js` | `startGame` builds everything; `step` runs one frame |

## 4. What is saved

One SQLite file, `data/festival.db`, through `db.py` only.

| Table | What | Written by |
|---|---|---|
| `stages`, `artists`, `bookings`, `plan` | The planner (solo project) | `logic.py` |
| `runs` | One row per finished night: player, day, mission, points, stars, summary | `game.finish_night` → `db.save_run` |
| `player` | One row: your name and outfit | `db.save_player` |

A night in progress is **not** saved. If you close the tab mid-game, that night is gone.

## 5. The rules, with the numbers

All in `game.py`.

| Rule | Number | Where |
|---|---|---|
| Money at the gate | 800 kr | `START_MONEY` |
| Fadøl / drink / shot | 65 / 95 / 40 kr, buzz +12 / +18 / +14 | `ITEMS` |
| Water / food / coffee | 0 / 110 / 45 kr, buzz −6 / −10 / −4 | `ITEMS` |
| Sobering up | 0.15 buzz per minute (9 per hour) | `BUZZ_FADE_PER_MINUTE` |
| Hammered / pass out | buzz 70 / 100 | `HAMMERED_AT`, `PASS_OUT_AT` |
| A concert counts after | 10 minutes inside the set's time | `minutes_watched`, `concerts_seen` |
| Score | +100 per concert, +1000 mission, +200 stayed to 04:00, −500 passed out, −500 thrown out | `score_lines` |
| Stars | 2★ from 300, 3★ 700, 4★ 1200, 5★ 1700 | `STAR_LIMITS` |

Missions (`mission_completed`): **music** = saw the three biggest names; **party** = reached buzz 70,
never passed out, still there at 01:00; **flirt** = a kiss event; **backstage** = a backstage event.
Being thrown out fails every mission.

## 6. Questions we may get, with answers

**"What happens when I press E at a bar and buy a beer?"**
`70_hud.js handleKeyPress` → `50_life.js interact` → `usePlace` opens the menu → `buy("beer")`:
money down, buzz up, and `logEvent({type: "buy", minute, item})`. At the end of the night Python's
`accepted_purchases` recounts it.

**"Where is the price of a beer?"** `game.py`, `ITEMS["beer"]["price"]`. The browser gets it in the
config (`build_config` → `"items"`). It is not written anywhere in the JavaScript.

**"How does the game know where Solscenen is?"** `world.py`, the `PLACES` list. Each place was
measured in pixels on the site map; `world.metres` turns pixels into metres. `10_world.js
buildWorld` walks through the list and calls a builder for each shape.

**"How is a concert counted?"** While you stand in the audience zone of a live stage
(`40_concerts.js stageAtPlayer`), `50_life.js updateWatching` remembers when you arrived. When you
leave, it logs `{type: "watch", act, from, to}`. Python's `minutes_watched` only counts the minutes
inside the act's own start and end, and `concerts_seen` needs 10 of them.

**"Could I cheat by changing my money in the browser?"** Not the score. Python starts again from
800 kr and replays every purchase. What Python cannot check is where you walked: a faked "kiss" or
"backstage" event would be believed. We say so openly (see section 9).

**"How does the crowd decide where to go?"** `20_people.js chooseCrowdTarget`: each guest draws
lots between the live stages (weighted by the act's `pull`), a bar, a stroll and the dance floor.
When an act starts, `callTheCrowd` makes a share of them choose again.

**"How can 520 people be drawn smoothly?"** Each guest is seven boxes. All heads are one
`InstancedMesh`, all bodies another, and so on: seven draw calls for the whole crowd.

**"Where does the music come from?"** `40_concerts.js`. Each style in `STYLES` is a tempo, drum
patterns over 16 steps and four chords. `updateMusic` schedules short computer-made tones. No
recordings are used.

**"What happens when the night ends?"** `50_life.js endNight` logs an "end" event and sends the list
with `setStateValue("result", …)`. Streamlit reruns, `game_screens.play_page` sees the result,
`finish_game` calls `game.finish_night`, and the recap page is shown.

**"Why is it dark at 23:00?"** `10_world.js SKY_STEPS` lists sky colours and light strength by
minute; `updateSkyAndLight` blends between two steps.

## 7. If something breaks: where to look

| What you see | Look in |
|---|---|
| Wrong price, wrong score, a concert not counted | `game.py` (and its tests) |
| A building in the wrong place | `world.py` `PLACES` |
| Wrong artist or time | `programme.py` `REAL_ACTS` |
| You walk through a wall | the builder in `10_world.js` forgot `addCollider` |
| A key does nothing | `70_hud.js handleKeyPress`, `30_player.js setupControls` |
| Recap never appears | `50_life.js endNight`, `game_screens.play_page` |
| High scores empty after restart | `db.save_run`, `db.get_runs` |

## 8. How we verify it

- **100 automatic tests** (`uv run pytest`): the 41 planner tests, 49 for the game's rules, content
  and storage, and 10 that click through the game's pages.
- The rule tests were written before the rule code (branch `game-rules`: a red commit, then green).
  The page tests were written after the pages.
- **The 3D part has no automatic tests.** It was checked by hand in the browser: buying, a counted
  concert, passing the backstage guard, the flirt conversation, the buggy, and the end-of-night
  hand-over to Python.

## 9. Honest limits

- The 2026 programme is pieced together from press coverage; acts marked `False` in
  `programme.py` have an estimated time or stage (`docs/programme-2026-sources.md`).
- The referee trusts "kiss", "backstage" and "caught" events from the browser.
- A night in progress is not saved.
- The map is redrawn from the layout; distances are approximate.
- Needs a keyboard and a mouse; not built for phones.

## 10. A three-minute demo

1. Title page → **START A NIGHT**. Show the programme, the character and the four missions.
2. Choose Friday, "See your favourites", arrive 20:30. **ENTER THE FESTIVAL**.
3. Walk in, press **Tab** (programme), buy a fadøl at a bar (money and buzz move).
4. Hold **T** until 21:00, run to Solscenen (follow the mini-map), stand there: "Concert counted".
5. Borrow the security buggy for a few seconds.
6. Press **H**, then **Q** to end the night: the recap shows "How the referee counted".
7. Open **Plan the programme**, book an artist, then show that "Your own programme" can be played.

## 11. Who learns what first

| Person | Start with | Then |
|---|---|---|
| 1 | `game.py`, `programme.py`, `world.py`, `db.py` and their tests | the rest |
| 2 | `game3d/00`, `10`, `20`, `30`, `90` (the world and moving in it) | the rest |
| 3 | `game3d/40`, `50`, `55`, `60`, `70` and `game_screens.py` (what you can do) | the rest |
