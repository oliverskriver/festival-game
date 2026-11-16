"""Shared test setup: make the app modules importable and give every test its own empty database."""

import os
import sys

import pytest

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# So that "import db" and "import logic" work when pytest runs from the project folder.
sys.path.insert(0, REPO_DIR)

import db  # imported after fixing sys.path, on purpose
import logic


@pytest.fixture
def fresh_db(tmp_path, monkeypatch):
    """Point db.py at a brand-new database file, so a test never touches the real plan."""
    path = tmp_path / "festival.db"
    monkeypatch.setattr(db, "DB_PATH", str(path))
    return path


def artist(name):
    """Return the id of the catalogue artist with this name."""
    for row in db.get_artists():
        if row["name"] == name:
            return row["id"]
    raise AssertionError("no artist called " + name)


def stage(name):
    """Return the id of the stage with this name."""
    for row in db.get_stages():
        if row["name"] == name:
            return row["id"]
    raise AssertionError("no stage called " + name)


def book(artist_name, stage_name, clock):
    """Try to book an artist on a stage at a time like "16:00". Returns "" when accepted, else the reason."""
    return logic.add_booking(artist(artist_name), stage(stage_name), logic.to_minutes(clock))


def lineup_text(stage_name):
    """The saved lineup of one stage as readable text, e.g. ["Havgus 16:00-17:15"]."""
    lines = []
    for booking in logic.stage_lineup(stage(stage_name)):
        lines.append(
            booking["artist_name"] + " " + logic.to_clock(booking["start"]) + "-" + logic.to_clock(logic.end_of(booking))
        )
    return lines
