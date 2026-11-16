"""The content of the game: the real programme and the map of the festival site."""

import json

import game
import logic
import programme
import world
from conftest import book


def test_three_real_days():
    assert [day["id"] for day in programme.DAYS] == ["thu", "fri", "sat"]


def test_every_act_is_on_a_real_stage_inside_opening_hours():
    for day in programme.DAYS:
        for act in programme.acts_for(day["id"]):
            assert act["stage"] in world.STAGE_IDS
            assert game.OPENS <= act["start"] < act["end"] <= game.CLOSES


def test_no_two_acts_overlap_on_the_same_stage():
    # The same rule as the planner: logic.overlaps.
    for day in programme.DAYS:
        acts = programme.acts_for(day["id"])
        for first in acts:
            for second in acts:
                if first["id"] != second["id"] and first["stage"] == second["stage"]:
                    assert not logic.overlaps(first["start"], first["end"], second["start"], second["end"]), (
                        first["artist"] + " clashes with " + second["artist"]
                    )


def test_headliners_are_where_the_press_said():
    names = {act["artist"]: act for act in programme.acts_for("sat")}
    assert names["Christopher"]["stage"] == "sol"
    assert names["Christopher"]["start"] == 21 * 60
    friday = {act["artist"]: act for act in programme.acts_for("fri")}
    assert friday["KESI"]["start"] == 23 * 60 + 55


def test_own_programme_comes_from_the_planner(fresh_db):
    assert book("Havgus", "Solscenen", "16:00") == ""
    assert book("Klitrosen", "Klub3210", "18:00") == ""
    acts = programme.acts_for("own")
    assert [(a["artist"], a["stage"], a["start"], a["end"]) for a in acts] == [
        ("Havgus", "sol", 16 * 60, 17 * 60 + 15),
        ("Klitrosen", "klub", 18 * 60, 18 * 60 + 45),
    ]


def test_the_three_stages_are_on_the_map():
    by_id = {place["id"]: place for place in world.PLACES}
    for stage_id in world.STAGE_IDS:
        assert by_id[stage_id]["kind"] == "stage"
    # Solscenen is in the north-east corner, Skovscenen in the south-west, as on the real map.
    assert by_id["sol"]["x"] > 0 and by_id["sol"]["z"] < 0
    assert by_id["skov"]["x"] < 0 and by_id["skov"]["z"] > 0


def test_every_place_is_inside_the_fence_and_has_a_unique_id():
    ids = [place["id"] for place in world.PLACES]
    assert len(ids) == len(set(ids))
    for place in world.PLACES:
        assert world.inside_site(place["x"], place["z"]), place["name"] + " is outside the fence"


def test_there_is_somewhere_to_drink_eat_and_sober_up():
    kinds = {place["kind"] for place in world.PLACES}
    assert {"stage", "bar", "food", "water", "toilet", "entrance", "coffee"} <= kinds


def test_config_for_the_3d_world_is_plain_data(fresh_db):
    look = game.default_look()
    config = game.build_config("fri", "music", look, "Oliver")
    text = json.dumps(config)  # must not raise: only numbers, text, lists and dicts
    assert "KESI" in text
    assert config["mission"]["id"] == "music"
    assert config["favourites"] == game.favourites(programme.acts_for("fri"))
    assert config["rules"]["start_money"] == game.START_MONEY
    assert len(config["places"]) == len(world.PLACES)


def test_unknown_day_or_mission_is_refused(fresh_db):
    assert game.check_choice("fri", "music") == ""
    assert game.check_choice("monday", "music") != ""
    assert game.check_choice("fri", "world domination") != ""


def test_own_day_needs_bookings(fresh_db):
    assert game.check_choice("own", "music") != ""
    assert book("Havgus", "Solscenen", "16:00") == ""
    assert game.check_choice("own", "music") == ""
