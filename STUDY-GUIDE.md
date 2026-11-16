# Study guide — Musik i Lejet festival planner

Written for the exam. The solo-project part (30% of your grade) asks you to explain **this** app. The six question types in section 6 are the course's own template. Practise answering them out loud with the app open.

---

## 1. What the app is

A planner for one festival day. The organiser puts artists on three stages (Solscenen, Skovscenen, Klub3210). The app refuses anything that cannot run: two sets clashing on one stage, a set outside 14:00–23:00, the same artist twice, or more than €10,000 in fees. When at least four artists are booked, the plan can be marked final, which locks it until it is reopened. Everything is saved, so it is all still there after the app is closed.

It implements the course's **Festival Architect** brief (`docs/festival-architect-brd.md`). The theme, the third stage and the 12 invented artists are my own.

## 2. Run it

```bash
uv run streamlit run app.py
```

```bash
uv run pytest
```

```bash
uv run python db.py --reset
```

The first starts the app, the second runs the 41 automatic checks, and the third empties the plan.

---

## 3. The three files

| File | Job | Example |
|---|---|---|
| `app.py` | **Screens.** Draws the page and passes clicks on. Contains no rules. | `show_booking_form()` |
| `logic.py` | **Rules.** Decides if an action is allowed and explains why not. | `find_problem()` |
| `db.py` | **Storage.** Reads and writes the file `data/festival.db`. | `add_booking()` |

**The chain is always: button in `app.py` → rule in `logic.py` → save in `db.py`.**

The key idea in `logic.py`: every action (`add_booking`, `move_booking`, `remove_booking`, `finalise_plan`, `reopen_plan`) returns **text**. Empty text `""` means "accepted and saved". Any other text is the reason it was refused, and in that case **nothing was saved**.

---

## 4. What is stored

The database file has four tables.

| Table | Columns | Fixed content or progress? |
|---|---|---|
| `stages` | id, name, description | **Fixed content.** Loaded once when the file is created. |
| `artists` | id, name, genre, fee, duration | **Fixed content.** The 12 invented artists. |
| `bookings` | id, artist_id, stage_id, start | **Progress.** One row per booked set. |
| `plan` | id, status | **Progress.** One row: `draft` or `final`. |

Things worth being able to explain:

- **Times are whole minutes after midnight.** 16:00 is stored as `960`. That turns "do two sets clash?" into simple arithmetic. `to_minutes("16:00")` and `to_clock(960)` convert.
- **A booking stores only three facts:** which artist, which stage, what start time. The end time, the fee and the name are **looked up or calculated**, never stored.
- **Totals are never stored.** `total_fees()` adds up the fees of the saved bookings every time. So the budget can never disagree with the lineup, which is exactly what the brief demands after a restart.
- **Nothing lives in memory.** Every function in `db.py` opens the file, does one thing and closes it. A restarted app simply reads the same file. The only thing kept in memory is the "Saved / Not accepted" message, in `st.session_state`, so it survives the page redraw.
- **Second safety net:** the `bookings` table says `artist_id ... UNIQUE`, so even the database itself refuses the same artist twice.
- **The database file is not in git** (`.gitignore` lists `data/`). It is local data, created on first run.

---

## 5. The rules and where they live

All in `logic.py`. `find_problem(artist_id, stage_id, start, ignore_booking_id)` checks a wished booking in this order and returns the **first** problem it finds:

| Order | Rule | Brief | Refused when |
|---|---|---|---|
| 0 | Plan is final | R5 | Checked first, in `add_booking` / `move_booking` / `remove_booking` via `is_final()` |
| 1 | One booking per artist | R1 | The artist already has a booking |
| 2 | Opening hours | R2 | `start < 840` (14:00) or `end > 1380` (23:00) |
| 3 | No clash on the same stage | R2, R3 | `overlaps(...)` is true for a booking on the **same** stage |
| 4 | Budget | R4 | fees of the other bookings + this fee `> 10000` |

The clash rule is one line:

```python
def overlaps(start_a, end_a, start_b, end_b):
    return start_a < end_b and start_b < end_a
```

Two sets clash when each starts before the other ends. Because it uses `<` and not `<=`, a set may start in the very minute the previous one ends.

**Moving is a replacement, not an addition.** `move_booking` calls the same `find_problem`, but passes the booking's own id as `ignore_booking_id`. The booking being moved is left out of the comparison, so it cannot clash with its own old slot and its fee is not counted twice.

**Finalising** (`finalise_plan`) needs at least 4 bookings **and** `plan_problems()` to be empty. `plan_problems()` re-checks every saved booking with the same `find_problem`.

---

## 6. The six exam question types, answered for this app

### Type 1 — Explain one workflow

**Workflow: book a set.**

1. **The user enters:** in "Book a set" they choose an artist (Tangsø), a stage (Solscenen) and a start time (16:30) and click **Add to programme**. This is `show_booking_form()` in `app.py`. It turns the time into minutes (16 × 60 + 30 = 990) and calls `logic.add_booking(artist_id, stage_id, 990)`.
2. **The rule that is checked:** `add_booking` first asks `is_final()`. Then `find_problem` runs the checks in section 5. Suppose Sommerfugl already plays Solscenen 16:00–17:30 (960–1050). Tangsø would play 990–1050. `overlaps(990, 1050, 960, 1050)` is true, because 990 < 1050 and 960 < 1050.
3. **What the program changes:** nothing. `add_booking` returns the reason and never reaches `db.add_booking`.
4. **What the user sees:** an orange box: "Not accepted · nothing was changed. Solscenen is taken: Sommerfugl plays 16:00–17:30, which clashes with Tangsø 16:30–17:30." The timetable and the budget are unchanged.

**The accepted version:** the same click with start 17:30 (1050). `overlaps(1050, 1110, 960, 1050)` is false, because 1050 < 1050 is false. Every check passes, `db.add_booking` inserts one row `(artist_id, stage_id, 1050)`, `add_booking` returns `""`, and `finish_action` stores a "Saved" message and redraws the page. The timetable now shows Tangsø 17:30–18:30 and the budget drops by €2,000.

### Type 2 — Explain the state and stored data

Use section 4. The short version to say out loud:

> "The state is the set of bookings plus whether the plan is draft or final. Each booking stores an artist, a stage and a start minute. The stages and the artist catalogue are fixed content, loaded once when the database is created. The bookings and the plan status are the user's progress. Everything is in the SQLite file `data/festival.db`. After a restart the app reads that file again; end times and budget totals are recalculated from the bookings, so they always match."

### Type 3 — Predict the outcome

Starting state for all of these: **Sommerfugl on Solscenen 16:00–17:30 (€3,200). Nothing else. Draft.**

| Action | Outcome | Why |
|---|---|---|
| Tangsø (60 min), Solscenen, 17:30 | Accepted, 17:30–18:30 | Starts exactly when Sommerfugl ends; `<` not `<=` |
| Tangsø, Solscenen, 17:29 | Refused, clash | 1049 < 1050 and 960 < 1109 |
| Tangsø, Solscenen, 15:01 | Refused, clash | Would end 16:01, one minute into Sommerfugl |
| Tangsø, Skovscenen, 16:00 | Accepted | Other stage: the clash check only looks at the same stage |
| Tangsø, Solscenen, 13:59 | Refused, "before the festival opens at 14:00" | 839 < 840 |
| Tangsø, Solscenen, 22:00 | Accepted, ends 23:00 | 1380 is not greater than 1380 |
| Tangsø, Solscenen, 22:01 | Refused, "would end at 23:01" | 1381 > 1380 |
| Sommerfugl, Skovscenen, 20:00 | Refused, "already in the programme" | One booking per artist, whatever the stage |
| Sommerfugl, Solscenen, 13:00 | Refused, "already in the programme" | Two rules are broken; the duplicate check comes first |
| Finalise | Refused, "Only 1 of the 4 artists needed" | Fewer than 4 bookings; status stays `draft` |

Budget example: with exactly €9,000 booked, a €1,000 artist is accepted (total 10,000 is not greater than 10,000) and a €1,001 artist is refused. After that, any further artist is refused.

Move example: Tangsø is on Solscenen 18:00–19:00. Moving it to 18:30 on the same stage is **accepted**, because the booking being moved is ignored. Moving it to 16:30 is **refused**, and Tangsø is still at 18:00.

**In every refused case, the saved data is exactly as before.**

### Type 4 — Locate and explain a bug

Trace from the screen to the rule to the stored data.

| Symptom | Where I would look | How to reproduce |
|---|---|---|
| Two overlapping sets on one stage were both accepted | `overlaps()` and the stage loop in `find_problem` (`booking["stage_id"] == stage_id`) | Book 16:00 and 16:30 on Solscenen |
| A back-to-back set is refused | `overlaps()`: someone wrote `<=` instead of `<` | Book 16:00–17:00, then 17:00 |
| A set on another stage is refused as a clash | The `stage_id ==` condition is missing in the clash loop | Book the same time on two stages |
| Moving a booking says it clashes with itself | `move_booking` not passing `ignore_booking_id`, or `find_problem` not filtering `others` | Slide a booking by 30 minutes |
| The budget is wrong after a move | Same place: the fee is counted twice | Fill the budget, then move a booking |
| After a restart the lineup is empty | `db.write()` missing `connection.commit()`, or `DB_PATH` pointing somewhere else | Book, stop the app, start it |
| A final plan can still be changed | The `is_final()` check at the top of `add_booking` / `move_booking` / `remove_booking`; `db.get_plan_status()` | Finalise, then try to remove |
| A block is drawn at the wrong height or place | `show_timetable()` in `app.py` and `PIXELS_PER_MINUTE`. A drawing bug only: the saved data is fine | Compare the block with the times printed inside it |
| No message appears after a click | `finish_action()` / `show_message()` and `st.session_state["message"]` | Click any button |

A good first question for any bug: **is the saved data wrong, or only the picture?** Run `uv run python db.py` or look at the times printed in the blocks. Wrong data means `logic.py` or `db.py`. Right data but a wrong picture means `app.py`.

### Type 5 — Show how you verified a rule

**Rule: no overlap on the same stage (scenario A1).**

- **Automatic test:** `test_scenario_a1_same_stage_conflict` in `tests/test_first_feature.py`. Starting state: an empty plan in a throwaway database. Actions: book Tangsø on Solscenen 16:00 (accepted, 16:00–17:00); book Klitrosen on Solscenen 16:30 (expected: refused); book Klitrosen at 17:00 (expected: accepted). Final check: the lineup is exactly `Tangsø 16:00-17:00, Klitrosen 17:00-17:45`.
- **What mistake it would catch:** a clash rule that is too weak (accepts 16:30) or too strict (refuses 17:00, the `<=` mistake).
- **Edge cases tested next to it:** a set that starts earlier and runs into the other one (`test_a_set_that_ends_inside_another_is_rejected`), and the same time on another stage (`test_scenario_a2_different_stages`).
- **Manual check:** in the running app I booked Sommerfugl on Solscenen at 16:00, then tried Tangsø on Solscenen at 16:30 and got the orange refusal. Then I stopped the app completely, started it again, and Sommerfugl and the €6,800 remaining budget were still there.
- **What it does not prove:** it tests a few chosen times, not every possible pair. It does not prove the timetable is *drawn* correctly. It says nothing about two people using the app at the same moment.

**How the tests were written:** for each feature the tests were written from the spec *before* the code (you can see a "red" commit followed by a "green" commit on each branch). They were never weakened to make them pass. Every test gets its own empty database (`fresh_db` in `tests/conftest.py`), so tests never touch the real plan.

| Scenario | Test file |
|---|---|
| A1 same-stage conflict, A2 different stages | `tests/test_first_feature.py` |
| A3 festival boundaries, A4 budget and duplicates | `tests/test_booking_rules.py` |
| A5 edit and remove | `tests/test_revise_booking.py` |
| A6 save and finalise | `tests/test_finalise_reopen.py` |
| The same things clicked on the real screens | `tests/test_screens.py`, `tests/test_smoke.py` |

### Type 6 — Reason about a change

**New requirement: a 15-minute setup gap between sets on the same stage.**

- **Workflow:** unchanged for the user, but a set that starts right after another is now refused, with a new sentence such as "Solscenen needs 15 minutes to set up after Tangsø (ends 17:00)".
- **Rules:** one new constant `SETUP_GAP = 15` in `logic.py`, and the clash check in `find_problem` compares against the end time **plus the gap**: `overlaps(start, end + SETUP_GAP, other_start, other_end + SETUP_GAP)`.
- **Stored data:** no change. The gap is a rule, not a fact about a booking. (If each stage needed its own gap, `stages` would get a new column.)
- **What must keep working:** two stages at the same time; a move not clashing with its own old slot; the opening hours (the gap must not push a 22:00 set past 23:00); the budget.
- **Checks I would add:** after a 16:00–17:00 set, a start at 17:14 is refused and 17:15 is accepted. The existing A1 test expects 17:00 to be accepted, so it would be **changed on purpose**, with the reason in the commit message, because the requirement itself changed.
- **A catch:** plans saved before the change might now break the rule. `plan_problems()` would report it when finalising.

**Two more to think through:**

- *Only jazz and new Danish music on Klub3210:* a new check in `find_problem` using the artist's genre and the stage; no new stored data if the allowed genres are a constant.
- *A fixed €500 operating cost for every stage that is used:* `total_fees()` is no longer the whole cost, so add a `total_cost()` and use it in the budget check. Removing the last booking of a stage must give the €500 back.

---

## 7. How it was built

The course's way of working, visible in the git history:

1. `main` started with the brief, the first spec and `AGENTS.md`.
2. Five features, each on its own **branch**: `first-feature`, `booking-rules`, `revise-booking`, `finalise-reopen`, `festival-design`.
3. On each branch: a **spec** (`specs/`), then the **tests** (red), then the **code** (green), then **merged** into `main`.

| Word | Meaning |
|---|---|
| Branch | A separate copy to do one task in |
| Commit | A save point with a message |
| Merge | Putting a finished branch into `main` |
| Spec | A short description of one task: Why, What, Out of scope, Done when |
| State | The information that describes the app right now (bookings + draft/final) |
| Persistence | State is saved, so it survives a restart |

---

## 8. A4 cheat sheet (draft — rewrite it in your own words)

```
FILES   app.py = screens | logic.py = rules | db.py = storage (data/festival.db)
CHAIN   button (app) -> rule (logic) -> save (db). Refused = nothing saved.
RETURN  every action returns "" = accepted, or the reason as text.

TABLES  stages(id,name,description)            fixed content
        artists(id,name,genre,fee,duration)    fixed content
        bookings(id,artist_id UNIQUE,stage_id,start)   progress
        plan(id=1,status draft/final)          progress
TIME    minutes after midnight. 14:00=840  16:00=960  23:00=1380
NOT STORED: end time (start+duration), total fees, remaining budget.

find_problem order: 1 artist already booked  2 start<840 or end>1380
                    3 overlap on SAME stage  4 fees > 10000
overlaps(a,b):  startA < endB and startB < endA   (touching is OK: < not <=)
MOVE    same find_problem with ignore_booking_id -> a replacement, not an extra.
FINAL   finalise: >=4 bookings and plan_problems()==[] . While final:
        add/move/remove refused (is_final checked first). Reopen -> draft.
BUDGET  10000. exactly 10000 OK. 9000+1000 OK, 9000+1001 refused.

RESTART nothing in memory; every db function opens the file and closes it.
        Only the Saved/Not accepted message is in st.session_state.
TESTS   41, written before the code. fresh_db = throwaway database per test.
        A1,A2 first_feature | A3,A4 booking_rules | A5 revise | A6 finalise
BUG?    data wrong -> logic.py / db.py.  data right, picture wrong -> app.py.
CHANGE  setup gap: constant + clash check uses end+gap; no new stored data;
        A1 test changes on purpose; keep: other stages, move ignores itself.
```

---

## 9. Honest limits

- One plan, one day, one user at a time. No login.
- Fees are in euros and the artists are invented, as the brief requires.
- The look is inspired by musikilejet.dk but uses no logo or images from the festival, and the app says "unofficial concept".
- The app runs on your laptop. It is not deployed to a public address yet; the team project presentation will need that.
