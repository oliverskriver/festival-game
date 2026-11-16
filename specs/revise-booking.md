# Revise a booking — move it or remove it

## Why

Planning is trial and error. The organiser needs to move a set to another stage or time, or drop it, without ever ending up with a broken programme or a lost booking.

## What

- [ ] A booking's stage and/or start time can be changed (**FA04**).
- [ ] A move is judged as a **replacement** of the original booking, not as an extra booking: the booking does not clash with its own old slot, and its fee is not counted twice (**FA R5**).
- [ ] A move that breaks a rule is refused with the reason, and the original booking stays exactly as it was (**FA04**, scenario **A5**).
- [ ] A booking can be removed. Its slot becomes free and its full fee is released (**FA R1**, scenario **A5**).

## Out of scope

Changing which artist a booking is for (remove it and book the other artist instead). Finalising. The Musik i Lejet look.

## Done when

1. Havgus is on Solscenen 16:00–17:15 and Tangsø on Solscenen 18:00–19:00. Moving Tangsø to 16:30 is refused; Tangsø is still at 18:00.
2. Moving Tangsø to Skovscenen 16:30 is accepted: still two bookings, still €4,400 in fees.
3. Moving Tangsø from 18:00 to 18:30 on the same stage is accepted (it does not clash with itself).
4. Removing Havgus drops the fees by €2,400, and both the 16:00 Solscenen slot and Havgus can be booked again.
5. `uv run pytest` is green, on a branch called `revise-booking`, merged into `main`.
