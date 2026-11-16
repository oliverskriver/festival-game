"""The rules of the game: the referee.

The 3D world (game3d/*.js) draws the festival and lets you walk around. It never decides what a
night was worth. When the night is over it hands Python a list of events, for example:

    {"type": "buy", "minute": 1265, "item": "beer"}          bought a beer at 21:05
    {"type": "watch", "act": "sat-8", "from": 1260, "to": 1290}  stood at that concert 21:00-21:30
    {"type": "kiss", "minute": 1500}                         the flirt mission worked out
    {"type": "backstage", "minute": 1300}                    got into the backstage area
    {"type": "end", "minute": 1680, "reason": "closing"}     how the night ended

Everything below works out money, drunkenness, concerts seen, mission and score from that list.
Times are whole minutes after midnight, and they keep counting after midnight: 01:00 is 1500.
"""

import db
import programme
import world

ACCEPTED = ""

OPENS = 14 * 60  # the gates open at 14:00
CLOSES = 28 * 60  # the music stops at 04:00, which we count as 28:00
START_MONEY = 800  # kroner in your pocket when you arrive

# What you can buy. "buzz" is how much drunker (or soberer, when negative) it makes you;
# "energy" is how much it wakes you up. The scale for both goes from 0 to 100.
ITEMS = {
    "beer": {"name": "Fadøl", "price": 65, "buzz": 12, "energy": 0},
    "drink": {"name": "Drink", "price": 95, "buzz": 18, "energy": 0},
    "shot": {"name": "Shot", "price": 40, "buzz": 14, "energy": 0},
    "water": {"name": "Vand", "price": 0, "buzz": -6, "energy": 3},
    "food": {"name": "Mad", "price": 110, "buzz": -10, "energy": 25},
    "coffee": {"name": "Kaffe", "price": 45, "buzz": -4, "energy": 20},
}

BUZZ_FADE_PER_MINUTE = 0.15  # you sober up 9 points per hour
HAMMERED_AT = 70  # from here the screen wobbles and the party mission counts
PASS_OUT_AT = 100  # here you fall over
MINUTES_TO_COUNT_A_CONCERT = 10
PARTY_MUST_LAST_UNTIL = 25 * 60  # 01:00

POINTS_PER_CONCERT = 100
POINTS_FOR_MISSION = 1000
POINTS_FOR_STAYING_TO_THE_END = 200
POINTS_LOST_FOR_PASSING_OUT = 500
POINTS_LOST_FOR_BEING_THROWN_OUT = 500
STAR_LIMITS = [300, 700, 1200, 1700]  # 2, 3, 4 and 5 stars start at these scores

MISSIONS = {
    "music": {"name": "See your favourites", "goal": "Watch your three favourite artists for at least 10 minutes each."},
    "party": {"name": "Party hardest, stay standing", "goal": "Get properly drunk, do not pass out, and last until 01:00."},
    "flirt": {"name": "Find a festival flirt", "goal": "Meet someone, win them over and end the night with a kiss."},
    "backstage": {"name": "Get backstage", "goal": "Find a way into the backstage area behind Solscenen."},
}

TITLES = ["Went home early", "Festival guest", "Crowd favourite", "Festival hero", "Legend of Lejet"]

# What your character can look like. The first choice in each list is the default.
LOOK_CHOICES = {
    "skin": ["#F2C9A5", "#E0A878", "#B97A50", "#8A5A3A", "#5E3B28"],
    "hair": ["short", "long", "bun", "bald"],
    "hair_colour": ["#E8C36B", "#5A3A22", "#1E1A18", "#B5562B", "#D9D9D9", "#E85D9E"],
    "top": ["tshirt", "shirt", "top", "hoodie"],
    "top_colour": ["#FFFFFF", "#FF471C", "#3374F2", "#FFC607", "#4636AA", "#22252B", "#F29BC4", "#1F7A3A"],
    "bottom": ["shorts", "jeans", "skirt"],
    "bottom_colour": ["#3A5A8C", "#22252B", "#F7F3E3", "#D8342B", "#C9A66B"],
    "hat": ["none", "bucket", "cap", "cowboy"],
    "glasses": ["none", "sun"],
    "shoes": ["sneakers", "boots", "sandals"],
}


def clock(minute):
    """Minutes as clock text. 1500 (which is 25:00) is shown as "01:00"."""
    return "%02d:%02d" % ((minute // 60) % 24, minute % 60)


def default_look():
    """The outfit you get before you change anything."""
    return {part: choices[0] for part, choices in LOOK_CHOICES.items()}


# ---------- money ----------


def accepted_purchases(events):
    """The purchases that count, in time order. Unknown items and things you could not pay for are dropped."""
    money = START_MONEY
    accepted = []
    for event in sorted(events, key=lambda event: event.get("minute", 0)):
        if event.get("type") != "buy" or event.get("item") not in ITEMS:
            continue
        price = ITEMS[event["item"]]["price"]
        if price <= money:
            money = money - price
            accepted.append(event)
    return accepted


def money_left(events):
    """Kroner left after every accepted purchase."""
    spent = 0
    for purchase in accepted_purchases(events):
        spent = spent + ITEMS[purchase["item"]]["price"]
    return START_MONEY - spent


# ---------- drunkenness ----------


def faded(buzz, minutes_passed):
    """How drunk you still are after some minutes without drinking."""
    return max(0, buzz - minutes_passed * BUZZ_FADE_PER_MINUTE)


def buzz_history(events):
    """Walk through the purchases and return (minute, buzz right after it) for each one."""
    history = []
    buzz = 0
    last_minute = OPENS
    for purchase in accepted_purchases(events):
        buzz = faded(buzz, purchase["minute"] - last_minute)
        buzz = max(0, buzz + ITEMS[purchase["item"]]["buzz"])
        last_minute = purchase["minute"]
        history.append((last_minute, buzz))
    return history


def buzz_at(events, minute):
    """How drunk you are at a given minute."""
    buzz = 0
    last_minute = OPENS
    for purchase_minute, buzz_after in buzz_history(events):
        if purchase_minute > minute:
            break
        buzz = buzz_after
        last_minute = purchase_minute
    return faded(buzz, minute - last_minute)


# ---------- concerts ----------


def minutes_watched(events, act):
    """How many minutes of this act's set you stood in front of the stage."""
    total = 0
    for event in events:
        if event.get("type") == "watch" and event.get("act") == act["id"]:
            start = max(event["from"], act["start"])
            end = min(event["to"], act["end"])
            if end > start:
                total = total + (end - start)
    return total


def concerts_seen(events, acts):
    """The artists you watched long enough for it to count, in programme order."""
    seen = []
    for act in acts:
        if minutes_watched(events, act) >= MINUTES_TO_COUNT_A_CONCERT:
            seen.append(act["artist"])
    return seen


def favourites(acts):
    """The three artists with the biggest crowd pull: the ones the music mission wants you to see."""
    biggest_first = sorted(acts, key=lambda act: (-act["pull"], act["start"]))
    return [act["artist"] for act in biggest_first[:3]]


# ---------- the whole night ----------


def summarise(events, acts):
    """Boil the list of events down to the facts the recap and the score need."""
    history = buzz_history(events)
    peak_buzz = max([buzz for _, buzz in history], default=0)
    end_minute = max([event.get("minute", event.get("to", OPENS)) for event in events], default=OPENS)
    end_reason = "unknown"
    for event in events:
        if event.get("type") == "end":
            end_minute = event["minute"]
            end_reason = event.get("reason", "unknown")
    counts = {item: 0 for item in ITEMS}
    for purchase in accepted_purchases(events):
        counts[purchase["item"]] = counts[purchase["item"]] + 1
    return {
        "beers": counts["beer"],
        "drinks": counts["drink"],
        "shots": counts["shot"],
        "waters": counts["water"],
        "meals": counts["food"],
        "coffees": counts["coffee"],
        "money_left": money_left(events),
        "spent": START_MONEY - money_left(events),
        "peak_buzz": round(peak_buzz),
        "passed_out": peak_buzz >= PASS_OUT_AT,
        "concerts": concerts_seen(events, acts),
        "kiss": any(event.get("type") == "kiss" for event in events),
        "backstage": any(event.get("type") == "backstage" for event in events),
        "times_caught": sum(1 for event in events if event.get("type") == "caught"),
        "thrown_out": end_reason == "thrown_out",
        "end_minute": end_minute,
        "end_reason": end_reason,
    }


def mission_completed(mission, summary, acts):
    """True when the night described by the summary completes the mission."""
    if summary["thrown_out"]:
        return False
    if mission == "music":
        return all(artist in summary["concerts"] for artist in favourites(acts)) and len(acts) > 0
    if mission == "party":
        return (
            summary["peak_buzz"] >= HAMMERED_AT
            and not summary["passed_out"]
            and summary["end_minute"] >= PARTY_MUST_LAST_UNTIL
        )
    if mission == "flirt":
        return summary["kiss"]
    if mission == "backstage":
        return summary["backstage"]
    return False


def score(mission, summary, acts):
    """Points for the night. Never below zero."""
    points = len(summary["concerts"]) * POINTS_PER_CONCERT
    if mission_completed(mission, summary, acts):
        points = points + POINTS_FOR_MISSION
    if summary["end_reason"] == "closing":
        points = points + POINTS_FOR_STAYING_TO_THE_END
    if summary["passed_out"]:
        points = points - POINTS_LOST_FOR_PASSING_OUT
    if summary["thrown_out"]:
        points = points - POINTS_LOST_FOR_BEING_THROWN_OUT
    return max(0, points)


def stars(points):
    """1 to 5 stars for a score."""
    earned = 1
    for limit in STAR_LIMITS:
        if points >= limit:
            earned = earned + 1
    return earned


def title(points):
    """The name you earn with your stars, e.g. "Legend of Lejet"."""
    return TITLES[stars(points) - 1]


# ---------- starting and finishing a game ----------


def check_choice(day_id, mission):
    """Return "" when a game can start with this day and mission, otherwise the reason it cannot."""
    if day_id not in programme.day_ids():
        return "That day is not on the programme."
    if mission not in MISSIONS:
        return "That mission does not exist."
    if len(programme.acts_for(day_id)) == 0:
        return "Your own programme is empty. Book at least one artist in the planner first."
    return ACCEPTED


def build_config(day_id, mission, look, player_name):
    """Everything the 3D world needs to know, as plain data that can be sent to the browser."""
    acts = programme.acts_for(day_id)
    return {
        "player": {"name": player_name, "look": look},
        "day": {"id": day_id, "label": programme.day_label(day_id)},
        "mission": {"id": mission, "name": MISSIONS[mission]["name"], "goal": MISSIONS[mission]["goal"]},
        "favourites": favourites(acts),
        "acts": acts,
        "places": world.PLACES,
        "fence": world.FENCE,
        "paths": world.PATHS,
        "trees": world.TREES,
        "items": ITEMS,
        "rules": {
            "opens": OPENS,
            "closes": CLOSES,
            "start_money": START_MONEY,
            "buzz_fade_per_minute": BUZZ_FADE_PER_MINUTE,
            "hammered_at": HAMMERED_AT,
            "pass_out_at": PASS_OUT_AT,
            "minutes_to_count_a_concert": MINUTES_TO_COUNT_A_CONCERT,
            "party_must_last_until": PARTY_MUST_LAST_UNTIL,
        },
    }


def finish_night(player_name, day_id, mission, events, acts):
    """Work out the result of a finished night, save it for the high-score list and return it."""
    summary = summarise(events, acts)
    points = score(mission, summary, acts)
    run = {
        "player": player_name,
        "day": day_id,
        "mission": mission,
        "points": points,
        "stars": stars(points),
        "title": title(points),
        "completed": mission_completed(mission, summary, acts),
        "summary": summary,
    }
    db.save_run(run)
    return run
