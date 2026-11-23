# En nat i Lejet — a festival you can plan and play (unofficial fan project)

Team project for Introduction to Programming, Nova SBE 2026/27. It extends the solo project
"Festival planner" (the Festival Architect brief) into a game:

- **Plan the programme:** the original planner. Put artists on three stages inside a budget.
- **Play the festival:** walk around the Musik i Lejet site in 3D, buy a beer, watch concerts and
  complete one of four missions. You can play the real 2026 programme or the one you planned.
- **High scores:** every finished night is saved.

Not affiliated with Musik i Lejet. No logos, photos, map artwork or music from the festival or the
artists are used. The music in the game is made by the computer.

**Play it online:** https://en-nat-i-lejet.streamlit.app/ (needs a keyboard and a mouse; the free
host falls asleep when unused, so the first visit can take about a minute).

## Objectives

- **Extend the best solo project.** Keep the Festival Architect planner working (its 41 tests still
  pass) and build something bigger on top of it.
- **Make it a game you want to play.** A single-player, third-person 3D night at Musik i Lejet:
  pick a day, dress your character, choose a mission, buy a fadøl, watch concerts, stay standing.
- **Keep the rules in Python.** The 3D world only reports what happened; `game.py` decides what it
  was worth, so every rule can be tested and explained.
- **Work like the course teaches.** One branch and one spec per task, tests written first where
  possible, merged into `main` when green.

## Team

Each member fills in their own row (on GitHub: open this file, click the pencil, edit, "Commit
changes").

| Member | Main part (see `TEAM-GUIDE.md`, section 11) |
|---|---|
| oliverskriver | Rules, programme, site map and storage (`game.py`, `programme.py`, `world.py`, `db.py`) |
| _name_ | The 3D world and moving in it (`game3d/00`, `10`, `20`, `30`, `90`) |
| _name_ | What you can do: concerts, missions, menus, pages (`game3d/40`–`70`, `game_screens.py`) |

## Installation

You need a Mac, Windows or Linux computer with internet access. Everything else is installed by
**uv**, a small tool that downloads the right Python (3.12) and the packages in `pyproject.toml`.

1. Install uv (once). Mac or Linux, in Terminal:

   ```
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

   Windows, in PowerShell: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`

2. Download the project and go into its folder:

   ```
   git clone https://github.com/oliverskriver/festival-game.git
   cd festival-game
   ```

3. Install Python and the packages:

   ```
   uv sync
   ```

## Run it

```
uv run streamlit run festival.py
```

The app opens in the browser (the address is shown in the terminal, for example
`http://localhost:8501`). Stop it with Ctrl + C. Scores are saved in `data/festival.db`, which is
created on the first run. The online high-score database is optional (see below).

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

db.py            storage: the SQLite file data/festival.db; online, high scores go to Postgres

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
