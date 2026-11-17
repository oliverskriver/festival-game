"""The event list comes from the browser, so the referee cleans it before trusting it."""

import game

PROGRAMME = [{"id": "c", "artist": "Headliner", "stage": "sol", "start": 1260, "end": 1335, "pull": 5}]


def test_good_events_pass_through():
    events = [
        {"type": "buy", "minute": 900, "item": "beer", "place": "fiskerbaren"},
        {"type": "watch", "act": "c", "from": 1260, "to": 1280},
        {"type": "end", "minute": 1500, "reason": "went_home"},
    ]
    assert game.clean_events(events) == [
        {"type": "buy", "minute": 900, "item": "beer"},
        {"type": "watch", "act": "c", "from": 1260, "to": 1280},
        {"type": "end", "minute": 1500, "reason": "went_home"},
    ]


def test_rubbish_is_dropped():
    rubbish = [
        "hello",
        None,
        {"type": "fly"},
        {"type": "buy", "minute": "soon", "item": "beer"},
        {"type": "buy", "minute": 900, "item": "helicopter"},
        {"type": "watch", "act": "c", "from": 1300, "to": 1200},
        {"type": "watch", "act": 7, "from": 1260, "to": 1280},
    ]
    assert game.clean_events(rubbish) == []
    assert game.clean_events("not a list") == []
    assert game.clean_events(None) == []


def test_times_outside_the_festival_are_pulled_inside():
    events = [{"type": "buy", "minute": 5, "item": "beer"}, {"type": "end", "minute": 99999, "reason": "closing"}]
    cleaned = game.clean_events(events)
    assert cleaned[0]["minute"] == game.OPENS
    assert cleaned[1]["minute"] == game.CLOSES


def test_an_unknown_ending_becomes_unknown():
    assert game.clean_events([{"type": "end", "minute": 1500, "reason": "became king"}])[0]["reason"] == "unknown"


def test_a_gift_costs_money_but_does_not_make_you_drunk():
    events = [{"type": "buy", "minute": 900, "item": "gift"}]
    assert game.money_left(events) == game.START_MONEY - game.ITEMS["gift"]["price"]
    assert game.buzz_at(events, 900) == 0


def test_score_lines_add_up_to_the_score():
    events = [
        {"type": "watch", "act": "c", "from": 1260, "to": 1280},
        {"type": "end", "minute": game.CLOSES, "reason": "closing"},
    ]
    summary = game.summarise(events, PROGRAMME)
    lines = game.score_lines("music", summary, PROGRAMME)
    assert sum(points for _, points in lines) == game.score("music", summary, PROGRAMME)
    assert ("1 concert seen", game.POINTS_PER_CONCERT) in lines


def test_score_lines_show_the_penalty_even_when_the_score_stops_at_zero():
    events = [{"type": "buy", "minute": 900 + i, "item": "shot"} for i in range(10)]
    summary = game.summarise(events, PROGRAMME)
    lines = game.score_lines("music", summary, PROGRAMME)
    assert ("Passed out", -game.POINTS_LOST_FOR_PASSING_OUT) in lines
    assert sum(points for _, points in lines) == 0
