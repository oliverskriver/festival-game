# First feature — book a performance, reject an overlap, reload the saved lineup

## Before writing the spec

- **Product and user:** Festival Architect, themed as a Musik i Lejet planner. The user is the festival organiser who is planning the programme.
- **Trigger:** The organiser picks an artist, a stage and a start time, and clicks **Add to programme**.
- **Before:** The artist catalogue and the stages must already exist (they are fixed content, loaded when the database is first created). The plan starts empty.
- **Rule:** The app must refuse the booking when it would overlap another performance on the same stage.
- **After:** If accepted, one new booking (artist, stage, start time) is saved, and the timetable shows it with its start and end time.
- **Restart:** After stopping and reopening the app, every accepted booking is still in the timetable. Rejected bookings were never saved.

## Why

The organiser should be able to put an artist on a stage at a time, trust the app to stop two sets from clashing on the same stage, and come back later without losing the lineup.

## What

- [ ] Show the artist catalogue with name, genre, fee and set length (part of **FA01**).
- [ ] Let the organiser choose an artist, a stage and a start time and add a performance (**FA02**).
- [ ] The end time is calculated: start time + the artist's set length. Havgus (75 minutes) at 16:00 ends at 17:15 (**FA02**).
- [ ] A booking that overlaps another performance **on the same stage** is rejected, with a sentence that explains why (**FA R2**, scenario **A1**).
- [ ] A performance may start exactly when the previous one on that stage ends (**FA R2**, scenario **A1**).
- [ ] Performances at the same time on **different** stages are allowed (**FA R3**, scenario **A2**).
- [ ] A rejected booking changes nothing: the saved lineup is exactly as before.
- [ ] Show the performances per stage in time order with start and end times (part of **FA03**).
- [ ] Accepted bookings are saved in the SQLite database and are still there after the app is restarted (part of scenario **A6**).

## Out of scope

These belong to later tasks. This feature is not the full product.

- Festival opening hours 14:00–23:00 (the rest of FA R2, scenario A3).
- One booking per artist, and the €10,000 budget (FA R1, FA R4, scenario A4).
- Moving and removing bookings (FA04, FA R5, scenario A5).
- Finalising and reopening the plan (FA05, the rest of scenario A6).
- The Musik i Lejet look: colours, fonts and the visual timetable.

## Done when

Expected results, decided before any test was written:

1. **Accepted action.** On an empty plan, book *Havgus* (75 min) on *Solscenen* at 16:00. It is accepted and the timetable shows Havgus 16:00–17:15 on Solscenen.
2. **Rejected action, data unchanged.** Then book *Tangsø* (60 min) on *Solscenen* at 16:30. It is rejected with a message that names the clash with Havgus. The lineup still has exactly one booking.
3. **Back to back is fine.** Book *Tangsø* on *Solscenen* at 17:15. It is accepted (17:15–18:15).
4. **Different stage is fine.** Book *Klitrosen* (45 min) on *Skovscenen* at 16:00. It is accepted even though Havgus plays at the same time on Solscenen.
5. **Restart.** Stop the app completely and start it again. The three accepted bookings are still shown, with the same stages and times. A browser refresh does not count.
6. `uv run pytest tests/test_first_feature.py` is green, and the work is on a branch called `first-feature`, merged into `main`.
