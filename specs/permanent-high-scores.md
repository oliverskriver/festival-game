# Spec: high scores survive a restart of the online game (permanent-high-scores)

## Why
Online, the game runs on Streamlit Community Cloud. Its files are wiped every time the app
restarts (after a quiet spell, or when a new version is uploaded), so the high-score list was
wiped too. The team wants scores to stay after people have played.

## What
- High scores (the `runs` table) are saved in a free online Postgres database (Neon) when the app
  knows its address: the secret `DATABASE_URL` (Streamlit secrets, or an environment
  variable of the same name).
- Without that secret everything stays in the local file `data/festival.db`, exactly as before.
  This is what happens on our own computers and in the tests.
- If the online database cannot be reached, the game does not crash: the night is saved in the
  local file and the list is read from there.
- The planner and the remembered outfit stay in the local file.

## Out of scope
- Accounts or passwords for players, deleting scores, moving the planner online.

## Done when
- `uv run pytest` passes, including `tests/test_game_online_scores.py`.
- A night played on the live site is still on the high-score list after the app is rebooted.
