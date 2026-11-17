"""High scores go to the online database when the app has its address, and to the local file otherwise."""

import os
import uuid

import pytest

import db
import game

PROGRAMME = [{"id": "c", "artist": "Headliner", "stage": "sol", "start": 1260, "end": 1335, "pull": 5}]
WATCHED = [{"type": "watch", "act": "c", "from": 1260, "to": 1280}]

# An address where no database answers, so connecting fails straight away.
NOBODY_HOME = "postgresql://nobody:nothing@127.0.0.1:1/none?connect_timeout=2"


def test_without_an_address_scores_stay_in_the_file(fresh_db):
    assert db.scores_url() == ""
    game.finish_night("Oliver", "sat", "music", WATCHED, PROGRAMME)
    assert [run["player"] for run in db.get_runs()] == ["Oliver"]


def test_the_address_is_read_from_the_environment(fresh_db, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://example/scores")
    assert db.scores_url() == "postgresql://example/scores"


def test_an_unreachable_online_database_does_not_lose_the_night(fresh_db, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", NOBODY_HOME)
    game.finish_night("Oliver", "sat", "music", WATCHED, PROGRAMME)  # must not crash
    runs = db.get_runs()  # must not crash either; falls back to the file
    assert [run["player"] for run in runs] == ["Oliver"]
    assert runs[0]["summary"]["concerts"] == ["Headliner"]


# Runs only when a real test database is given, for example:
#   TEST_DATABASE_URL="postgresql://..." uv run pytest tests/test_game_online_scores.py
REAL_DATABASE = os.environ.get("TEST_DATABASE_URL", "")


@pytest.mark.skipif(not REAL_DATABASE, reason="no real online database given")
def test_a_night_is_saved_in_the_real_online_database(fresh_db, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", REAL_DATABASE)
    name = "pytest-" + uuid.uuid4().hex[:8]
    try:
        game.finish_night(name, "sat", "music", WATCHED, PROGRAMME)
        mine = [run for run in db.get_runs(limit=1000) if run["player"] == name]
        assert len(mine) == 1
        assert mine[0]["completed"] is True
        assert mine[0]["summary"]["concerts"] == ["Headliner"]
        assert db.read("SELECT COUNT(*) AS n FROM runs")[0]["n"] == 0  # nothing went to the file
    finally:
        db.delete_online_runs(name)
