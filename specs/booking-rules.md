# Booking rules — opening hours, one booking per artist, budget

## Why

The organiser must not be able to build a programme that cannot run: sets outside the festival day, the same artist twice, or more fees than the €10,000 artist budget.

## What

- [ ] A set must start at or after 14:00 and end at or before 23:00 (**FA R2**, scenario **A3**).
- [ ] An artist can be booked at most once, whatever the stage (**FA R1**, scenario **A4**).
- [ ] Total fees may not exceed €10,000; exactly €10,000 is allowed (**FA R4**, scenario **A4**).
- [ ] Every refusal explains the reason in a sentence, and saves nothing (**FA02**).
- [ ] The screen shows total fees and remaining budget after every accepted change (**FA03**).
- [ ] The catalogue clearly marks artists that are already booked (**FA01**).

## Out of scope

Moving and removing bookings, finalising, and the Musik i Lejet look.

## Done when

1. A 60-minute set (Tangsø) at 13:59 is refused, at 22:01 is refused, and at 22:00 is accepted (ends 23:00 exactly).
2. With €9,000 booked (Sommerfugl 3,200 + Solsort & Stær 2,600 + Havgus 2,400 + Marehalm 800), a €1,001 artist is refused and the total stays €9,000. Klitrosen (€1,000) is then accepted and the remaining budget is €0.
3. Booking Havgus a second time is refused on the same stage and on another stage.
4. `uv run pytest` is green, on a branch called `booking-rules`, merged into `main`.
