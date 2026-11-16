# Finalise and reopen the plan

## Why

When the lineup is ready, the organiser marks it as final so nobody changes it by accident. If plans change, they reopen it on purpose.

## What

- [ ] The plan is either `draft` or `final`. A new plan is a draft. The status is saved (**FA05**).
- [ ] Finalising is refused with fewer than four booked artists (**FA05**, scenario **A6**).
- [ ] Finalising is refused if any saved booking breaks a rule (**FA05**: "all rules pass").
- [ ] A final plan is read-only: adding, moving and removing are refused until it is reopened (**FA R5**).
- [ ] Reopening turns the plan back into a draft, with every booking kept (**FA05**).
- [ ] After a restart the lineup, the totals and the draft/final status are all as they were saved (scenario **A6**).

## Out of scope

Several plans, plan history, and who is allowed to finalise. The Musik i Lejet look.

## Done when

1. With three artists booked, finalising is refused and the plan is still a draft.
2. With four valid bookings, finalising succeeds and the status is `final`.
3. While final, adding, moving and removing are each refused and the lineup is unchanged.
4. The status in the database file is `final`, so a restarted app is still read-only.
5. After reopening, the plan is a draft with the same four bookings and can be changed again.
6. `uv run pytest` is green, on a branch called `finalise-reopen`, merged into `main`.
