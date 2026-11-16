"""The rules of the festival planner: may a booking be accepted, and if not, why not.

Times are whole minutes after midnight (16:00 is 960). Fees are whole euros.
Every action returns "" when it was accepted and saved, or a sentence explaining why it was refused.
A refused action saves nothing.
"""

import db

# What an action returns when it was accepted.
ACCEPTED = ""


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


def find_problem(artist_id, stage_id, start):
    """Check a wished booking against the rules. Return "" if it is allowed, else the reason."""
    artist = db.get_artist(artist_id)
    stage = db.get_stage(stage_id)
    end = start + artist["duration"]
    wish = artist["name"] + " " + to_clock(start) + "–" + to_clock(end)

    # Rule R2: no two sets at the same time on the same stage.
    for booking in stage_lineup(stage_id):
        if overlaps(start, end, booking["start"], end_of(booking)):
            return (
                stage["name"] + " is taken: " + booking["artist_name"] + " plays "
                + to_clock(booking["start"]) + "–" + to_clock(end_of(booking))
                + ", which clashes with " + wish + "."
            )
    return ACCEPTED


def add_booking(artist_id, stage_id, start):
    """Book an artist on a stage at a start time. Saves it only if every rule passes."""
    problem = find_problem(artist_id, stage_id, start)
    if problem != ACCEPTED:
        return problem
    db.add_booking(artist_id, stage_id, start)
    return ACCEPTED
