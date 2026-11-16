"""Revise a booking: move it (stage and/or time) or remove it.

Written from specs/revise-booking.md before the code. Covers scenario A5 of the brief.
"""

import db
import logic
from conftest import book, lineup_text, stage


def booking_id(artist_name):
    """Return the id of the saved booking of this artist."""
    for booking in db.get_bookings():
        if booking["artist_name"] == artist_name:
            return booking["id"]
    raise AssertionError(artist_name + " is not booked")


def move(artist_name, stage_name, clock):
    """Try to move an artist's booking. Returns "" when accepted, else the reason."""
    return logic.move_booking(booking_id(artist_name), stage(stage_name), logic.to_minutes(clock))


def two_sets_on_solscenen():
    """Havgus 16:00-17:15 and Tangsø 18:00-19:00, both on Solscenen. Fees: 2,400 + 2,000."""
    assert book("Havgus", "Solscenen", "16:00") == ""
    assert book("Tangsø", "Solscenen", "18:00") == ""


def test_scenario_a5_conflicting_edit_keeps_the_original(fresh_db):
    """Brief A5: a move into another set is refused and the original booking remains."""
    two_sets_on_solscenen()
    problem = move("Tangsø", "Solscenen", "16:30")
    assert problem != ""
    assert "Havgus" in problem
    assert lineup_text("Solscenen") == ["Havgus 16:00-17:15", "Tangsø 18:00-19:00"]


def test_scenario_a5_valid_edit_does_not_duplicate_artist_or_fee(fresh_db):
    """Brief A5: a valid move changes the one booking; there is still one Tangsø and one fee."""
    two_sets_on_solscenen()
    assert move("Tangsø", "Skovscenen", "16:30") == ""
    assert lineup_text("Solscenen") == ["Havgus 16:00-17:15"]
    assert lineup_text("Skovscenen") == ["Tangsø 16:30-17:30"]
    assert len(db.get_bookings()) == 2
    assert logic.total_fees() == 4400


def test_scenario_a5_remove_releases_slot_and_fee(fresh_db):
    """Brief A5: removing a booking frees its slot and gives the full fee back."""
    two_sets_on_solscenen()
    assert logic.remove_booking(booking_id("Havgus")) == ""
    assert lineup_text("Solscenen") == ["Tangsø 18:00-19:00"]
    assert logic.total_fees() == 2000
    assert book("Klitrosen", "Solscenen", "16:00") == ""  # the slot is free again
    assert book("Havgus", "Skovscenen", "20:00") == ""  # and Havgus can be booked again


def test_a_booking_does_not_clash_with_its_own_old_slot(fresh_db):
    """An edit replaces the original: sliding Tangsø from 18:00 to 18:30 on the same stage is fine."""
    two_sets_on_solscenen()
    assert move("Tangsø", "Solscenen", "18:30") == ""
    assert lineup_text("Solscenen") == ["Havgus 16:00-17:15", "Tangsø 18:30-19:30"]


def test_a_move_does_not_count_the_fee_twice(fresh_db):
    """With the budget fully spent, a booking can still be moved: its own fee is not added again."""
    assert book("Sommerfugl", "Solscenen", "14:00") == ""
    assert book("Solsort & Stær", "Solscenen", "16:00") == ""
    assert book("Havgus", "Skovscenen", "14:00") == ""
    assert book("Marehalm", "Skovscenen", "16:00") == ""
    assert book("Klitrosen", "Klub3210", "18:00") == ""
    assert logic.remaining_budget() == 0
    assert move("Klitrosen", "Klub3210", "19:00") == ""
    assert logic.total_fees() == 10000


def test_a_move_outside_the_festival_day_keeps_the_original(fresh_db):
    """The opening-hours rule applies to edits too."""
    two_sets_on_solscenen()
    assert move("Tangsø", "Solscenen", "22:30") != ""
    assert move("Tangsø", "Solscenen", "13:00") != ""
    assert lineup_text("Solscenen") == ["Havgus 16:00-17:15", "Tangsø 18:00-19:00"]


def test_moving_or_removing_a_booking_that_does_not_exist_is_refused(fresh_db):
    """A stale id (for example a booking that was already removed) changes nothing."""
    two_sets_on_solscenen()
    assert logic.move_booking(999, stage("Solscenen"), logic.to_minutes("20:00")) != ""
    assert logic.remove_booking(999) != ""
    assert len(db.get_bookings()) == 2
