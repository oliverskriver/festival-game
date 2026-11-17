# Spec: arriving late must not make the mission impossible (fix-late-arrival)

## Why
Found while play-testing: arrive at 20:30 on Saturday with the mission "See your favourites" and
two of the three favourites have already played. The mission could not be completed.

## What
- A night only contains the acts you can still watch for the 10 minutes that count
  (`game.acts_from`). The favourites are picked from those.
- The referee counts the night against the same list of acts the game was played with.
- Arriving after the last act is refused with an explanation.

## Out of scope
- Changing the programme or the arrival times on offer.

## Done when
- `uv run pytest` passes, including the new tests in `tests/test_game_late_arrival.py`.
