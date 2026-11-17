"""Arriving late: the mission only asks for artists you can still see."""

import game
import programme
from conftest import book


def test_a_late_night_only_contains_acts_you_can_still_watch():
    acts = programme.acts_for("sat")
    late = game.acts_from(acts, 20 * 60 + 30)
    names = [act["artist"] for act in late]
    assert "Dodo & the Dodos" not in names  # finished at 18:40
    assert "Burhan G" in names  # on stage until 20:50: twenty minutes left
    assert "Christopher" in names


def test_an_act_with_less_than_ten_minutes_left_is_not_part_of_the_night():
    acts = [{"id": "a", "artist": "Almost done", "stage": "sol", "start": 1200, "end": 1239, "pull": 5}]
    assert game.acts_from(acts, 1230) == []
    assert game.acts_from(acts, 1229) == acts


def test_favourites_at_a_late_arrival_can_all_still_be_seen(fresh_db):
    for day_id in ["thu", "fri", "sat"]:
        for start in game.ARRIVALS.values():
            config = game.build_config(day_id, "music", game.default_look(), "Oliver", start)
            ends = {act["artist"]: act["end"] for act in config["acts"]}
            for artist in config["favourites"]:
                assert ends[artist] - start >= game.MINUTES_TO_COUNT_A_CONCERT, artist + " on " + day_id


def test_arriving_after_the_last_act_is_refused(fresh_db):
    assert book("Havgus", "Solscenen", "16:00") == ""
    assert game.check_choice("own", "music", 14 * 60) == ""
    assert game.check_choice("own", "music", 23 * 60) != ""
    assert game.check_choice("fri", "music", 23 * 60) == ""
