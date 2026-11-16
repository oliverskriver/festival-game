# Spec: game rules (the referee)

## Why
The team project turns the planner into a game: you walk around the festival in 3D and try to
complete a mission. The 3D world is drawn in JavaScript, but we want every rule that decides
money, drunkenness, concerts seen and the final score to live in Python, where we can test it.

## What
- `programme.py`: the real Musik i Lejet 2026 programme per day (Thursday, Friday, Saturday), plus
  a "your own programme" day built from the bookings saved in the planner.
- `world.py`: the places on the festival site (stages, bars, food, water, toilets, entrance) with
  their position in metres, measured from the official site map.
- `game.py`: the referee. The 3D world sends a list of events ("bought a beer at 21:05",
  "watched KESI from 23:55 to 00:20"). The referee works out from that list:
  money left, how drunk you were, whether you passed out, which concerts count as seen,
  whether the mission is completed, and the score with 1 to 5 stars.
- `db.py`: every finished night is saved as a "run", so the high-score list survives a restart.
  The player's name and outfit are saved too.

## Out of scope
- Drawing anything (that is the next task, `game-world-3d`).
- Checking that the player really walked where the 3D world says. The referee trusts positions,
  but it does not trust money: purchases the player could not afford are thrown away.

## Done when
- `uv run pytest` passes, including the new files `tests/test_game_rules.py`,
  `tests/test_game_programme.py` and `tests/test_game_storage.py`.
- The 41 planner tests still pass and none of them was changed.
