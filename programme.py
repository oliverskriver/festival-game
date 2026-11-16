"""Who plays when: the content of the game.

The three real days are the Musik i Lejet 2026 programme (16-18 July 2026) as far as we could find
it in the press. Every act has "known": True when the start time came from a published source and
False when the time or stage is our own estimate. See docs/programme-2026-sources.md.

The fourth day, "own", is not written here: it is built from the bookings saved in the planner.
"""

import db

# The days you can choose in the game.
DAYS = [
    {"id": "thu", "name": "Torsdag", "date": "16. juli 2026"},
    {"id": "fri", "name": "Fredag", "date": "17. juli 2026"},
    {"id": "sat", "name": "Lørdag", "date": "18. juli 2026"},
]
OWN_DAY = {"id": "own", "name": "Your own programme", "date": "from the planner"}

# The planner's stage names and the short ids the game uses.
STAGE_ID_BY_NAME = {"Solscenen": "sol", "Skovscenen": "skov", "Klub3210": "klub"}

# (artist, stage, start, end, music style, crowd pull 1-5, start time known from a source?)
# Times are written as "HH:MM". After midnight we keep counting: 01:10 at night is "25:10".
REAL_ACTS = {
    "thu": [
        ("URO", "sol", "15:00", "15:50", "pop", 2, True),
        ("Sira Jovina", "klub", "16:00", "16:45", "soul", 1, False),
        ("Poul Krebs", "skov", "16:45", "17:45", "folk", 3, True),
        ("GNAGS", "sol", "17:45", "18:55", "rock", 4, False),
        ("Tabloid", "klub", "18:30", "19:15", "rock", 1, False),
        ("Mekdes", "skov", "19:40", "20:40", "soul", 3, True),
        ("Kind mod Kind", "klub", "20:45", "21:30", "pop", 1, False),
        ("Benjamin Hav & Familien", "sol", "21:00", "22:15", "hiphop", 5, True),
        ("Bisse", "skov", "22:30", "23:30", "rock", 2, False),
        ("Anton Westerlin (DJ-set)", "sol", "23:55", "25:25", "dj", 4, True),
    ],
    "fri": [
        ("ICEKIID", "sol", "15:00", "15:50", "hiphop", 3, True),
        ("Guldimund", "skov", "16:30", "17:30", "pop", 3, False),
        ("Bob Zebra", "klub", "17:15", "18:00", "pop", 1, False),
        ("Pil", "sol", "18:05", "19:05", "pop", 4, True),
        ("Emil Lange", "skov", "19:30", "20:30", "pop", 2, False),
        ("Saveus", "sol", "21:00", "22:15", "pop", 5, True),
        ("DJ Pee .Wee", "skov", "22:30", "23:45", "dj", 4, False),
        ("Rosa", "klub", "22:35", "23:20", "soul", 1, True),
        ("KESI", "sol", "23:55", "25:10", "hiphop", 5, True),
        ("Papa's Got a Brand New Bag", "klub", "25:15", "26:30", "rock", 2, False),
    ],
    "sat": [
        ("Jonah Blacksmith", "sol", "15:00", "16:00", "folk", 3, False),
        ("Madsdamind", "skov", "16:15", "17:00", "pop", 2, True),
        ("Giift", "klub", "16:35", "17:20", "pop", 1, True),
        ("Dodo & the Dodos", "sol", "17:30", "18:40", "rock", 4, False),
        ("Emil Kruse", "klub", "18:15", "19:00", "pop", 1, False),
        ("Burhan G", "skov", "19:40", "20:50", "pop", 4, True),
        ("ABBAtizers", "klub", "19:40", "20:40", "pop", 2, True),
        ("Christopher", "sol", "21:00", "22:15", "pop", 5, True),
        ("KIDD", "skov", "22:30", "23:30", "hiphop", 3, False),
        ("Betty B", "klub", "22:30", "23:30", "dj", 1, True),
        ("Artigeardit", "sol", "23:55", "25:10", "hiphop", 4, True),
    ],
}


def minutes(text):
    """Turn "23:55" into minutes after midnight. "25:10" means 01:10 the next morning."""
    hours, mins = text.split(":")
    return int(hours) * 60 + int(mins)


def real_acts(day_id):
    """The acts of one real day as dictionaries, in order of start time."""
    acts = []
    for number, (artist, stage, start, end, style, pull, known) in enumerate(REAL_ACTS[day_id], start=1):
        acts.append(
            {
                "id": day_id + "-" + str(number),
                "artist": artist,
                "stage": stage,
                "start": minutes(start),
                "end": minutes(end),
                "style": style,
                "pull": pull,
                "known": known,
            }
        )
    return sorted(acts, key=lambda act: act["start"])


def own_acts():
    """The planner's saved bookings, turned into acts for the game."""
    acts = []
    for booking in db.get_bookings():
        acts.append(
            {
                "id": "own-" + str(booking["id"]),
                "artist": booking["artist_name"],
                "stage": STAGE_ID_BY_NAME[booking["stage_name"]],
                "start": booking["start"],
                "end": booking["start"] + booking["duration"],
                "style": style_for(booking["genre"]),
                # A more expensive artist pulls a bigger crowd: 1 (cheap) to 5 (expensive).
                "pull": min(5, 1 + booking["fee"] // 700),
                "known": True,
            }
        )
    return sorted(acts, key=lambda act: act["start"])


def style_for(genre):
    """Pick one of the game's music styles for a genre written in the planner's catalogue."""
    genre = genre.lower()
    for word, style in [("hip", "hiphop"), ("dj", "dj"), ("electronic", "dj"), ("disco", "dj"),
                        ("rock", "rock"), ("folk", "folk"), ("jazz", "soul"), ("soul", "soul"), ("funk", "soul")]:
        if word in genre:
            return style
    return "pop"


def acts_for(day_id):
    """The acts of a day: one of the three real days, or "own" for the planner's programme."""
    if day_id == OWN_DAY["id"]:
        return own_acts()
    return real_acts(day_id)


def day_ids():
    """Every day you can choose."""
    return [day["id"] for day in DAYS] + [OWN_DAY["id"]]


def day_label(day_id):
    """A day as text, e.g. "Fredag 17. juli 2026"."""
    for day in DAYS + [OWN_DAY]:
        if day["id"] == day_id:
            return day["name"] + " " + day["date"]
    return day_id
