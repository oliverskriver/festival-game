# En nat i Lejet — a festival you can plan and play (unofficial fan project)

Team project for Introduction to Programming, Nova SBE 2026/27. It extends the solo project
"Festival planner" (the Festival Architect brief) into a game:

- **Plan the programme:** the original planner. Put artists on three stages inside a budget.
- **Play the festival:** walk around the Musik i Lejet site in 3D, buy a beer, watch concerts and
  complete one of four missions. You can play the real 2026 programme or the one you planned.
- **High scores:** every finished night is saved.

Not affiliated with Musik i Lejet. No logos, photos, map artwork or music from the festival or the
artists are used. The music in the game is made by the computer.

## Run it

```
uv run streamlit run festival.py
```

## High scores online

Online, the high scores are kept in a free Postgres database at Neon, because the host wipes its
files on every restart. The app finds the database through the secret `DATABASE_URL` (Streamlit:
app settings, Secrets; on your own computer: `.streamlit/secrets.toml`, never uploaded). Without
it, or when the database does not answer, scores are kept in `data/festival.db` as before.
See `specs/permanent-high-scores.md`.

## Run the tests

```
uv run pytest
```

## What is where

```
festival.py      the front door: three buttons, then one of the pages below
game_screens.py  the game's pages: title, set-up, the 3D game, recap, high scores
app.py           the planner page (the solo project)

game.py          the game's rules ("the referee"): money, drunkenness, concerts, missions, score
logic.py         the planner's rules: clashes, opening hours, budget
programme.py     who plays when: the 2026 programme, or the planner's own programme
world.py         where everything stands, measured from the site map

db.py            storage: one SQLite file, data/festival.db

game3d/          the 3D world, in JavaScript (glued together in file-name order)
  00_core.js       helpers
  10_world.js      sky, light, ground, trees, buildings
  20_people.js     your character and the crowd
  30_player.js     walking, the camera
  40_concerts.js   stages, light show, computer-made music
  50_life.js       time, buying, toilets, passing out, the end of the night
  55_showtime.js   glow, fireworks, lasers, the security buggy
  60_missions.js   guards, backstage, the flirt mission, the mission box
  70_hud.js        clock, bars, mini-map, menus
  90_main.js       starts the game and runs it frame by frame

tests/           the automatic checks
specs/           one spec per task: Why, What, Out of scope, Done when
docs/            the course brief, and where the 2026 programme comes from
TEAM-GUIDE.md    how it all works, written for the presentation and the code walkthrough
STUDY-GUIDE.md   the solo project's guide (the planner), written for the exam
```

## The one idea

The 3D world is the stadium; Python is the referee. The browser only reports what happened
("bought a beer at 21:05", "stood at KESI from 23:55 to 00:20"). `game.py` cleans that list,
recounts the money, works out how drunk you were and which concerts count, and gives the score.
