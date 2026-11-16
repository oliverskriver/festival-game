"""The rules of the festival planner: may a booking be accepted, and if not, why not.

Times are whole minutes after midnight (16:00 is 960). Fees are whole euros.
Every action returns "" when it was accepted and saved, or a sentence explaining why it was refused.
A refused action saves nothing.
"""

import db

# What an action returns when it was accepted.
ACCEPTED = ""

# The festival day and the artist budget, straight from the brief.
FESTIVAL_START = 14 * 60  # 14:00
FESTIVAL_END = 23 * 60  # 23:00
BUDGET = 10000  # euros


def to_minutes(clock):
    """Turn a clock time like "16:00" into minutes after midnight (960)."""
    hours, minutes = clock.split(":")
    return int(hours) * 60 + int(minutes)


def to_clock(minutes):
    """Turn minutes after midnight (960) into a clock time like "16:00"."""
    return format(minutes // 60, "02d") + ":" + format(minutes % 60, "02d")


def end_of(booking):
    """The minute a booking ends: its start plus the artist's set length. Never stored, always calculated."""
    return booking["start"] + booking["duration"]


def overlaps(start_a, end_a, start_b, end_b):
    """Two sets clash when each one starts before the other ends. Touching (one ends as the other starts) is fine."""
    return start_a < end_b and start_b < end_a


def stage_lineup(stage_id):
    """The bookings of one stage, in time order."""
    lineup = []
    for booking in db.get_bookings():
        if booking["stage_id"] == stage_id:
            lineup.append(booking)
    return lineup


def euros(amount):
    """Format whole euros for a sentence: 2400 -> "€2,400"."""
    return "€" + format(amount, ",")


def total_fees():
    """The fees of all booked artists added up. Worked out from the saved bookings, never stored."""
    total = 0
    for booking in db.get_bookings():
        total += booking["fee"]
    return total


def remaining_budget():
    """How much of the artist budget is left."""
    return BUDGET - total_fees()


def catalogue():
    """The artist catalogue, each artist with a "booked" mark (True or False)."""
    booked_ids = []
    for booking in db.get_bookings():
        booked_ids.append(booking["artist_id"])
    artists = db.get_artists()
    for artist in artists:
        artist["booked"] = artist["id"] in booked_ids
    return artists


def find_problem(artist_id, stage_id, start, ignore_booking_id=None):
    """Check a wished booking against the rules. Return "" if it is allowed, else the reason.

    When an existing booking is being moved, pass its id as ignore_booking_id: the wish is then
    judged as a replacement of that booking, so it cannot clash with itself or pay its fee twice.
    """
    artist = db.get_artist(artist_id)
    stage = db.get_stage(stage_id)
    end = start + artist["duration"]
    wish = artist["name"] + " " + to_clock(start) + "–" + to_clock(end)

    # Every saved booking except the one being replaced.
    others = []
    for booking in db.get_bookings():
        if booking["id"] != ignore_booking_id:
            others.append(booking)

    # Rule R1: an artist plays at most once in the festival.
    for booking in others:
        if booking["artist_id"] == artist_id:
            return (
                artist["name"] + " is already in the programme (" + booking["stage_name"] + ", "
                + to_clock(booking["start"]) + "–" + to_clock(end_of(booking))
                + "). An artist can only be booked once."
            )

    # Rule R2: the set must fit inside the festival day.
    if start < FESTIVAL_START:
        return (
            artist["name"] + " would start at " + to_clock(start)
            + ", before the festival opens at " + to_clock(FESTIVAL_START) + "."
        )
    if end > FESTIVAL_END:
        return (
            artist["name"] + " would end at " + to_clock(end)
            + ", after the festival closes at " + to_clock(FESTIVAL_END) + "."
        )

    # Rule R2: no two sets at the same time on the same stage. (Rule R3: other stages do not matter.)
    for booking in others:
        if booking["stage_id"] == stage_id and overlaps(start, end, booking["start"], end_of(booking)):
            return (
                stage["name"] + " is taken: " + booking["artist_name"] + " plays "
                + to_clock(booking["start"]) + "–" + to_clock(end_of(booking))
                + ", which clashes with " + wish + "."
            )

    # Rule R4: the fees may not go over the budget. Landing exactly on it is allowed.
    fees_of_others = 0
    for booking in others:
        fees_of_others += booking["fee"]
    total = fees_of_others + artist["fee"]
    if total > BUDGET:
        return (
            artist["name"] + " costs " + euros(artist["fee"]) + ", which would bring the fees to "
            + euros(total) + ". That is over the " + euros(BUDGET) + " budget; "
            + euros(BUDGET - fees_of_others) + " is left."
        )
    return ACCEPTED


def add_booking(artist_id, stage_id, start):
    """Book an artist on a stage at a start time. Saves it only if every rule passes."""
    problem = find_problem(artist_id, stage_id, start)
    if problem != ACCEPTED:
        return problem
    db.add_booking(artist_id, stage_id, start)
    return ACCEPTED


def move_booking(booking_id, stage_id, start):
    """Move a saved booking to another stage and/or start time. A refused move keeps the original."""
    booking = db.get_booking(booking_id)
    if booking is None:
        return "That booking no longer exists."
    problem = find_problem(booking["artist_id"], stage_id, start, ignore_booking_id=booking_id)
    if problem != ACCEPTED:
        return problem
    db.update_booking(booking_id, stage_id, start)
    return ACCEPTED


def remove_booking(booking_id):
    """Remove a saved booking. Its slot is free again and its fee no longer counts."""
    if db.get_booking(booking_id) is None:
        return "That booking no longer exists."
    db.delete_booking(booking_id)
    return ACCEPTED
