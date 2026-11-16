# Musik i Lejet — festival planner (unofficial concept)

A one-day festival planner: put artists on stages, and the app refuses clashes and keeps you inside the €10,000 artist budget. Solo project for Introduction to Programming, Nova SBE 2026/27, built on the Festival Architect brief (`docs/`).

Not affiliated with Musik i Lejet. All artists are invented.

## Run it

```
uv run streamlit run app.py
```

## Run the tests

```
uv run pytest
```

## Start over with an empty plan

```
uv run python db.py --reset
```

## What is where

```
app.py        the screens (entry point). Draws things and passes clicks on.
logic.py      the rules: may this booking be accepted, and if not, why not.
db.py         storage: the SQLite file data/festival.db (created on first run).
style.css     colours and fonts.
tests/        the automatic checks, one file per feature.
specs/        one spec per task: Why, What, Out of scope, Done when.
docs/         the business requirements (BRD) this app implements.
STUDY-GUIDE.md  how the app works, written for the exam.
```

## The rules, in one place

- One day, 14:00 to 23:00. A set must start and end inside it.
- An artist can be booked once.
- No two sets at the same time on the same stage; back to back is fine; other stages do not matter.
- Fees may not exceed €10,000; exactly €10,000 is allowed.
- A booking can be moved or removed; a refused move keeps the original.
- The plan can be finalised with at least four artists, and is then read-only until reopened.
- Everything is saved, so it is all still there after a restart.
