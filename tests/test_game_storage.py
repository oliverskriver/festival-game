"""Finished nights and the player's outfit are saved in the database file."""

import db
import game

PROGRAMME = [{"id": "c", "artist": "Headliner", "stage": "sol", "start": 1260, "end": 1335, "pull": 5}]


def test_a_finished_night_is_saved(fresh_db):
    events = [{"type": "watch", "act": "c", "from": 1260, "to": 1280}]
    run = game.finish_night("Oliver", "sat", "music", events, PROGRAMME)
    saved = db.get_runs()
    assert len(saved) == 1
    assert saved[0]["player"] == "Oliver"
    assert saved[0]["points"] == run["points"]
    assert saved[0]["summary"]["concerts"] == ["Headliner"]


def test_high_scores_are_sorted_best_first(fresh_db):
    game.finish_night("Low", "sat", "music", [], PROGRAMME)
    game.finish_night("High", "sat", "music", [{"type": "watch", "act": "c", "from": 1260, "to": 1280}], PROGRAMME)
    assert [run["player"] for run in db.get_runs()] == ["High", "Low"]


def test_the_outfit_is_remembered(fresh_db):
    assert db.get_player() is None
    look = game.default_look()
    look["hat"] = "bucket"
    db.save_player("Oliver", look)
    db.save_player("Oliver", look)  # saving twice must not create a second player
    assert db.get_player() == {"name": "Oliver", "look": look}


def test_saving_a_run_does_not_touch_the_plan(fresh_db):
    game.finish_night("Oliver", "sat", "music", [], PROGRAMME)
    assert db.get_bookings() == []
    assert db.get_plan_status() == "draft"
