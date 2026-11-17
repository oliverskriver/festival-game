# Spec: showtime and screen tests (game-screens-tests)

## Why
The game worked but two things were missing: checks for the pages around the 3D game, and the
showy parts that make a festival night feel like one.

## What
- `tests/test_game_screens.py`: click through title, set-up, recap, high scores and the menu.
- `game3d/55_showtime.js`: lamp glow, sun and moon, phone lights in the crowd, lasers, fireworks
  (after the biggest acts, when a mission is completed and before closing), and a security buggy
  you can borrow for about half a minute before security takes it back.
- The camera moves closer instead of ending up inside a building.
- `TEAM-GUIDE.md`, `README.md` and `AGENTS.md` describe the team project.

## Out of scope
- Automatic tests of the 3D part.
- Putting the app online.

## Done when
- `uv run pytest` passes (95 tests).
- In the running game at night: lamps glow, a live stage shows lasers and phone lights, and the
  buggy can be driven and left again.
