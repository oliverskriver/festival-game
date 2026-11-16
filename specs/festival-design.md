# Festival design — the Musik i Lejet look and a visual timetable

## Why

An organiser should see the whole day at a glance, and the tool should feel like it belongs to the festival: an app that looks like a spreadsheet will not be used.

## What

- [ ] A look inspired by musikilejet.dk: flat colour blocks (cobalt, orange-red, yellow, indigo, cream, black, white), square corners, big tight headings, one band with a repeated word. No logo and no images from the festival; a visible "unofficial concept" note.
- [ ] A visual timetable: one column per stage, each set drawn as a block from its start to its end, 14:00 at the top and 23:00 at the bottom, one colour per stage (**FA03**).
- [ ] A budget meter: fees booked, budget left, artists booked, and a bar (**FA03**).
- [ ] An artist catalogue as cards, with booked artists clearly marked and where they play (**FA01**).
- [ ] After every action a message: yellow "Saved" or orange "Not accepted · nothing was changed" with the reason (**FA02**).
- [ ] While the plan is final, the booking and change forms are not shown (**FA05**).
- [ ] No rule moves into `app.py`: the screens only draw and pass clicks on to `logic.py`.

## Out of scope

Drag and drop in the timetable, a phone layout, Danish/English switching, printing the programme.

## Done when

1. Every earlier test is still green without being changed.
2. `tests/test_screens.py` is green: a refused booking shows its reason on screen, move and remove work from the screen, and a final plan hides the forms until it is reopened, also in a new session.
3. Checked by hand in a browser: one accepted booking, one refused booking, then the app stopped completely and started again with the lineup and the budget still there.
