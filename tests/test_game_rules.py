"""The referee: what a night at the festival was worth, worked out from the list of events."""

import game


def buy(minute, item):
    return {"type": "buy", "minute": minute, "item": item}


def watch(act, start, end):
    return {"type": "watch", "act": act, "from": start, "to": end}


PROGRAMME = [
    {"id": "a", "artist": "Opener", "stage": "sol", "start": 15 * 60, "end": 16 * 60, "pull": 2},
    {"id": "b", "artist": "Middle", "stage": "skov", "start": 18 * 60, "end": 19 * 60, "pull": 3},
    {"id": "c", "artist": "Headliner", "stage": "sol", "start": 21 * 60, "end": 22 * 60 + 15, "pull": 5},
    {"id": "d", "artist": "Night DJ", "stage": "sol", "start": 23 * 60 + 55, "end": 25 * 60 + 10, "pull": 4},
]


def test_clock_counts_past_midnight():
    assert game.clock(14 * 60) == "14:00"
    assert game.clock(23 * 60 + 55) == "23:55"
    assert game.clock(25 * 60) == "01:00"
    assert game.clock(28 * 60) == "04:00"


def test_buying_costs_money():
    events = [buy(900, "beer"), buy(930, "beer")]
    assert game.money_left(events) == game.START_MONEY - 2 * game.ITEMS["beer"]["price"]


def test_free_water_costs_nothing():
    assert game.money_left([buy(900, "water")]) == game.START_MONEY


def test_purchases_you_cannot_afford_are_thrown_away():
    price = game.ITEMS["beer"]["price"]
    affordable = game.START_MONEY // price
    events = [buy(900 + i, "beer") for i in range(affordable + 3)]
    assert len(game.accepted_purchases(events)) == affordable
    assert game.money_left(events) == game.START_MONEY - affordable * price
    assert game.money_left(events) >= 0


def test_unknown_items_are_ignored():
    assert game.accepted_purchases([buy(900, "helicopter")]) == []


def test_one_beer_raises_the_buzz():
    assert game.buzz_at([buy(900, "beer")], 900) == game.ITEMS["beer"]["buzz"]


def test_buzz_fades_with_time_but_never_below_zero():
    beer = game.ITEMS["beer"]["buzz"]
    later = game.buzz_at([buy(900, "beer")], 920)
    assert later == beer - 20 * game.BUZZ_FADE_PER_MINUTE
    assert game.buzz_at([buy(900, "beer")], 900 + 600) == 0


def test_water_and_food_sober_you_up():
    drunk = game.buzz_at([buy(900, "shot"), buy(900, "shot")], 900)
    with_water = game.buzz_at([buy(900, "shot"), buy(900, "shot"), buy(900, "water")], 900)
    assert with_water < drunk


def test_too_many_shots_and_you_pass_out():
    events = [buy(900 + i, "shot") for i in range(10)]
    summary = game.summarise(events, PROGRAMME)
    assert summary["passed_out"] is True
    assert summary["peak_buzz"] >= game.PASS_OUT_AT


def test_a_calm_evening_does_not_pass_out():
    events = [buy(900, "beer"), buy(1000, "beer"), buy(1100, "beer")]
    summary = game.summarise(events, PROGRAMME)
    assert summary["passed_out"] is False
    assert summary["beers"] == 3


def test_ten_minutes_at_a_concert_counts_as_seen():
    assert game.concerts_seen([watch("c", 21 * 60, 21 * 60 + 10)], PROGRAMME) == ["Headliner"]


def test_nine_minutes_does_not_count():
    assert game.concerts_seen([watch("c", 21 * 60, 21 * 60 + 9)], PROGRAMME) == []


def test_two_short_visits_add_up():
    events = [watch("c", 21 * 60, 21 * 60 + 6), watch("c", 21 * 60 + 30, 21 * 60 + 36)]
    assert game.concerts_seen(events, PROGRAMME) == ["Headliner"]


def test_minutes_outside_the_set_do_not_count():
    # Standing at the stage from 20:00 to 21:05 is only 5 minutes of the 21:00 concert.
    assert game.concerts_seen([watch("c", 20 * 60, 21 * 60 + 5)], PROGRAMME) == []


def test_favourites_are_the_three_biggest_acts():
    assert game.favourites(PROGRAMME) == ["Headliner", "Night DJ", "Middle"]


def test_music_mission_needs_all_three_favourites():
    seen_two = [watch("c", 1260, 1280), watch("d", 1435, 1460)]
    seen_all = seen_two + [watch("b", 1080, 1100)]
    assert game.mission_completed("music", game.summarise(seen_two, PROGRAMME), PROGRAMME) is False
    assert game.mission_completed("music", game.summarise(seen_all, PROGRAMME), PROGRAMME) is True


def test_party_mission_hammered_but_still_standing_after_one():
    drinks = [buy(1380 + 10 * i, "drink") for i in range(5)]
    stayed = drinks + [{"type": "end", "minute": 25 * 60 + 30, "reason": "went_home"}]
    left_early = drinks + [{"type": "end", "minute": 24 * 60, "reason": "went_home"}]
    assert game.summarise(stayed, PROGRAMME)["peak_buzz"] >= game.HAMMERED_AT
    assert game.mission_completed("party", game.summarise(stayed, PROGRAMME), PROGRAMME) is True
    assert game.mission_completed("party", game.summarise(left_early, PROGRAMME), PROGRAMME) is False


def test_party_mission_fails_if_you_pass_out():
    events = [buy(1380 + i, "shot") for i in range(10)] + [{"type": "end", "minute": 1600, "reason": "passed_out"}]
    assert game.mission_completed("party", game.summarise(events, PROGRAMME), PROGRAMME) is False


def test_flirt_mission_needs_a_kiss():
    kiss = [{"type": "kiss", "minute": 1400}]
    assert game.mission_completed("flirt", game.summarise([], PROGRAMME), PROGRAMME) is False
    assert game.mission_completed("flirt", game.summarise(kiss, PROGRAMME), PROGRAMME) is True


def test_backstage_mission_fails_if_thrown_out():
    inside = [{"type": "backstage", "minute": 1300}]
    thrown = [{"type": "end", "minute": 1250, "reason": "thrown_out"}]
    assert game.mission_completed("backstage", game.summarise(inside, PROGRAMME), PROGRAMME) is True
    assert game.mission_completed("backstage", game.summarise(thrown, PROGRAMME), PROGRAMME) is False


def test_score_rewards_concerts_and_the_mission():
    nothing = game.score("music", game.summarise([], PROGRAMME), PROGRAMME)
    one = game.score("music", game.summarise([watch("c", 1260, 1280)], PROGRAMME), PROGRAMME)
    everything = game.score(
        "music",
        game.summarise([watch("c", 1260, 1280), watch("d", 1435, 1460), watch("b", 1080, 1100)], PROGRAMME),
        PROGRAMME,
    )
    assert one == nothing + game.POINTS_PER_CONCERT
    assert everything == nothing + 3 * game.POINTS_PER_CONCERT + game.POINTS_FOR_MISSION


def test_passing_out_costs_points_but_score_is_never_negative():
    events = [buy(900 + i, "shot") for i in range(10)]
    assert game.score("music", game.summarise(events, PROGRAMME), PROGRAMME) == 0


def test_stars_go_from_one_to_five():
    assert game.stars(0) == 1
    assert game.stars(10 ** 6) == 5
    assert [game.stars(p) for p in game.STAR_LIMITS] == [2, 3, 4, 5]
