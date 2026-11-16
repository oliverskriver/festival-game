"""First feature: book a performance, reject an overlap on the same stage, reload the saved lineup.

Written from specs/first-feature.md before the code existed. Covers scenarios A1 and A2 of the brief.
Catalogue facts used here: Havgus plays 75 minutes, Tangsø 60, Klitrosen 45.
"""

import sqlite3

import db
import logic
from conftest import artist, book, lineup_text, stage


def test_clock_and_minutes_convert_both_ways():
    """Times are stored as minutes after midnight: 16:00 is 960."""
    assert logic.to_minutes("16:00") == 960
    assert logic.to_clock(960) == "16:00"
    assert logic.to_clock(logic.to_minutes("17:15")) == "17:15"


def test_the_catalogue_and_stages_are_supplied(fresh_db):
    """A new database already holds the fixed content: at least 8 artists and the stages."""
    assert len(db.get_artists()) >= 8
    names = []
    for row in db.get_stages():
        names.append(row["name"])
    assert names == ["Solscenen", "Skovscenen", "Klub3210"]
    for row in db.get_artists():
        assert row["fee"] > 0
        assert row["duration"] > 0


def test_accepted_booking_is_saved_with_its_end_time(fresh_db):
    """Done-when 1: Havgus on Solscenen at 16:00 is accepted and shown as 16:00-17:15."""
    assert book("Havgus", "Solscenen", "16:00") == ""
    assert lineup_text("Solscenen") == ["Havgus 16:00-17:15"]


def test_overlap_on_the_same_stage_is_rejected_and_nothing_changes(fresh_db):
    """Done-when 2: Tangsø at 16:30 clashes with Havgus; the reason names Havgus and the lineup is unchanged."""
    book("Havgus", "Solscenen", "16:00")
    problem = book("Tangsø", "Solscenen", "16:30")
    assert problem != ""
    assert "Havgus" in problem
    assert lineup_text("Solscenen") == ["Havgus 16:00-17:15"]
    assert len(db.get_bookings()) == 1


def test_a_set_may_start_exactly_when_the_previous_one_ends(fresh_db):
    """Done-when 3: Tangsø at 17:15, the minute Havgus ends, is accepted."""
    book("Havgus", "Solscenen", "16:00")
    assert book("Tangsø", "Solscenen", "17:15") == ""
    assert lineup_text("Solscenen") == ["Havgus 16:00-17:15", "Tangsø 17:15-18:15"]


def test_a_set_that_ends_inside_another_is_rejected(fresh_db):
    """A clash is a clash from either side: a set starting earlier but running into Havgus is rejected too."""
    book("Havgus", "Solscenen", "16:00")
    assert book("Tangsø", "Solscenen", "15:30") != ""
    assert book("Tangsø", "Solscenen", "15:00") == ""  # 15:00-16:00 ends exactly when Havgus starts


def test_same_time_on_a_different_stage_is_accepted(fresh_db):
    """Done-when 4: Klitrosen on Skovscenen at 16:00 is fine while Havgus plays Solscenen."""
    book("Havgus", "Solscenen", "16:00")
    assert book("Klitrosen", "Skovscenen", "16:00") == ""
    assert lineup_text("Skovscenen") == ["Klitrosen 16:00-16:45"]


def test_the_lineup_is_shown_in_time_order(fresh_db):
    """Bookings come back sorted by start time, whatever order they were added in."""
    book("Tangsø", "Solscenen", "20:00")
    book("Havgus", "Solscenen", "16:00")
    assert lineup_text("Solscenen") == ["Havgus 16:00-17:15", "Tangsø 20:00-21:00"]


def test_scenario_a1_same_stage_conflict(fresh_db):
    """Brief A1: 16:00-17:00 is booked; 16:30-17:15 on that stage is rejected; a start at 17:00 is accepted."""
    assert book("Tangsø", "Solscenen", "16:00") == ""  # 60 minutes: 16:00-17:00
    assert book("Klitrosen", "Solscenen", "16:30") != ""  # 45 minutes: 16:30-17:15
    assert book("Klitrosen", "Solscenen", "17:00") == ""
    assert lineup_text("Solscenen") == ["Tangsø 16:00-17:00", "Klitrosen 17:00-17:45"]


def test_scenario_a2_different_stages(fresh_db):
    """Brief A2: two different artists at 16:00 on two different stages are both accepted."""
    assert book("Tangsø", "Solscenen", "16:00") == ""
    assert book("Klitrosen", "Skovscenen", "16:00") == ""
    assert len(db.get_bookings()) == 2


def test_accepted_bookings_are_in_the_file_on_disk(fresh_db):
    """Done-when 5 (restart): the bookings live in the database file, not in the program's memory."""
    book("Havgus", "Solscenen", "16:00")
    book("Tangsø", "Solscenen", "16:30")  # rejected: must not be saved
    book("Klitrosen", "Skovscenen", "16:00")
    # Open the file directly, the way a freshly started app would find it.
    connection = sqlite3.connect(str(fresh_db))
    rows = connection.execute("SELECT artist_id, stage_id, start FROM bookings ORDER BY id").fetchall()
    connection.close()
    assert rows == [
        (artist("Havgus"), stage("Solscenen"), 960),
        (artist("Klitrosen"), stage("Skovscenen"), 960),
    ]
