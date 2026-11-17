# En nat i Lejet — notes for the AI agent

Team project for Introduction to Programming (Nova SBE, Block 3). It extends the solo project (a
festival planner on the Festival Architect brief) into a 3D game you can walk around in. The three
owners are **beginners** and are asked about this code in a walkthrough. Keep it simple enough to
explain out loud. Read `TEAM-GUIDE.md` first.

## Running things

- Run the product: `uv run streamlit run festival.py` (uv installs Python and the libraries by itself; never use `pip`).
- Run the tests: `uv run pytest`
- Jump straight into the 3D game while testing: open `http://localhost:8501/?dev=music&day=fri&time=1230`
  (`dev` is the mission, `time` is minutes after midnight). Add `&debug=1` for screenshots.
- After changing a `.py` file, restart the app. Changes to `game3d/*.js` only need a page reload.

## The project

```
festival.py      front door (entry point): the menu, then one page
game_screens.py  the game's pages; hands the JavaScript in game3d/ to the browser
app.py           the planner page (the solo project). No rules in here.
game.py          the game's rules, "the referee". Every number lives here.
logic.py         the planner's rules.
programme.py     who plays when.            world.py   where everything stands.
db.py            storage: the SQLite file data/festival.db. The only file that touches it.
game3d/          the 3D world in JavaScript, glued together in file-name order.
tests/           pytest checks.             specs/     one spec per task.
```

The chain is always: page -> rule -> `db.py`. For the game: `game.build_config` -> the 3D world
plays and logs events -> `game.finish_night` cleans, counts and saves.
Times are whole minutes after midnight and keep counting past midnight (01:00 is 1500).

## Rules that are special to the game

- JavaScript never decides money, score or whether a mission is done. It logs events; `game.py` decides.
- A number that is a rule (a price, a limit) is written in `game.py` and sent in the config. Never copy it into JavaScript.
- A position is written in `world.py`, never in JavaScript.
- No logos, photos, map artwork or recorded music from the festival or the artists.

## Rules for every task

- One task per branch; never commit straight to `main`. Merge when the tests are green.
- Tests are written first and then frozen. Never weaken, skip or delete a test to get green. If a test is wrong, correct it openly against `docs/festival-architect-brd.md` or the task's spec and say so in the commit message.
- After every change, run the tests and paste the real output. Never just claim they pass.
- A rejected action must leave the saved data unchanged, and must explain the reason to the user.
- `data/festival.db` is local data. It stays out of git, and so do secrets.
- Plain functions and short comments. No classes, no clever tricks.
- Every claim about the code comes with file and function name.
