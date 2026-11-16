# Festival planner — notes for the AI agent

Solo project for Introduction to Programming (Nova SBE, Block 2): the Festival Architect brief, themed as an unofficial Musik i Lejet planner. The owner is a **beginner** and is examined on this code. Keep it simple enough to explain out loud.

## Running things

- Run the app: `uv run streamlit run app.py` (uv installs Python and the libraries by itself; never use `pip`).
- Run the tests: `uv run pytest`
- Start over with an empty plan: `uv run python db.py --reset` (deletes the saved bookings, keeps the catalogue).

## The project

```
app.py     the Streamlit screens (entry point). No rules in here.
logic.py   the rules: may this booking be accepted? budget, overlaps, finalising.
db.py      storage: reads and writes the SQLite database file data/festival.db.
tests/     pytest checks. One file per feature, plus the brief's scenarios A1-A6.
style.css  colours and fonts only.
specs/     one spec per task: Why, What, Out of scope, Done when.
docs/      a copy of the business requirements (BRD).
```

The chain is always: button in `app.py` -> rule in `logic.py` -> save in `db.py`.
Times are stored as whole minutes after midnight (16:00 is 960). Fees are whole euros.

## Rules for every task

- One task per branch; never commit straight to `main`. Merge when the tests are green.
- Tests are written first and then frozen. Never weaken, skip or delete a test to get green. If a test is wrong, correct it openly against `docs/festival-architect-brd.md` and say so in the commit message.
- After every change, run the tests and paste the real output. Never just claim they pass.
- A rejected action must leave the saved data unchanged, and must explain the reason to the user.
- `data/festival.db` is local data. It stays out of git, and so do secrets.
- Plain functions and short comments. No classes, no clever tricks.
- Every claim about the code comes with file and function name.
