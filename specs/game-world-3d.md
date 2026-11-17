# Spec: the 3D festival (game-world-3d)

## Why
The team project turns the planner into a game you can walk around in. A guest should be able to
enter the festival, see the three stages where they really are, buy a beer, watch a concert and
finish one of four missions.

## What
- `festival.py`: the new front door with three buttons: Play the festival, Plan the programme,
  High scores. `app.py` (the planner) is now one of the pages.
- `game_screens.py`: title screen, set-up (day, character, mission, arrival time), the game
  screen, the recap and the high scores.
- `game3d/`: the 3D world in JavaScript, in eight files that are glued together in name order:
  helpers, the site, people, the player, concerts and music, the evening's systems, missions,
  the on-screen display, and the main loop.
- The world is built from the data Python sends (`game.build_config`): positions from `world.py`,
  the programme from `programme.py`, prices and limits from `game.py`.
- When the night ends, the event list goes back to Python and `game.finish_night` counts it.
- `game.clean_events`: the list comes from the browser, so it is cleaned before it is trusted.

## Out of scope
- Real 3D models, recorded music, photos of artists, the festival's logo or map artwork.
- More than one player, accounts, saving a night halfway.

## Done when
- `uv run pytest` passes.
- In the running app: start a night, walk to a bar, buy a beer (money goes down, buzz goes up),
  stand at a live concert for ten festival minutes (it counts), leave through the entrance and
  see a recap whose numbers match what happened. The run is on the high-score list after a restart.
