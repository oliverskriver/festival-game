"""Booking rules: opening hours, one booking per artist, and the €10,000 budget.

Written from specs/booking-rules.md before the code. Covers scenarios A3 and A4 of the brief.
"""

import db
import logic
from conftest import artist, book, lineup_text, stage


def book_nine_thousand():
    """Commit exactly €9,000: 3,200 + 2,600 + 2,400 + 800."""
    assert book("Sommerfugl", "Solscenen", "14:00") == ""
    assert book("Solsort & Stær", "Solscenen", "16:00") == ""
    assert book("Havgus", "Skovscenen", "14:00") == ""
    assert book("Marehalm", "Skovscenen", "16:00") == ""
    assert logic.total_fees() == 9000


def test_the_festival_day_and_budget_are_as_in_the_brief():
    """14:00 to 23:00, and €10,000 for artists."""
    assert logic.FESTIVAL_START == logic.to_minutes("14:00")
    assert logic.FESTIVAL_END == logic.to_minutes("23:00")
    assert logic.BUDGET == 10000


def test_scenario_a3_festival_boundaries(fresh_db):
    """Brief A3: a 60-minute set at 13:59 or 22:01 is rejected; 22:00 is allowed."""
    early = book("Tangsø", "Solscenen", "13:59")
    assert early != ""
    assert "14:00" in early
    late = book("Tangsø", "Solscenen", "22:01")
    assert late != ""
    assert "23:00" in late
    assert db.get_bookings() == []
    assert book("Tangsø", "Solscenen", "22:00") == ""
    assert lineup_text("Solscenen") == ["Tangsø 22:00-23:00"]


def test_a_set_may_start_exactly_at_opening(fresh_db):
    """14:00 itself is allowed."""
    assert book("Tangsø", "Solscenen", "14:00") == ""


def test_budget_starts_full_and_follows_the_bookings(fresh_db):
    """Total fees and remaining budget are worked out from the saved bookings."""
    assert logic.total_fees() == 0
    assert logic.remaining_budget() == 10000
    book("Havgus", "Solscenen", "16:00")
    assert logic.total_fees() == 2400
    assert logic.remaining_budget() == 7600


def test_scenario_a4_budget(fresh_db):
    """Brief A4: with €9,000 committed, a €1,001 artist is rejected and a €1,000 artist is accepted."""
    book_nine_thousand()
    too_dear = db.add_artist("Dyr Gæst", "Test", 1001, 30)
    problem = logic.add_booking(too_dear, stage("Klub3210"), logic.to_minutes("18:00"))
    assert problem != ""
    assert "budget" in problem
    assert logic.total_fees() == 9000
    assert len(db.get_bookings()) == 4
    assert book("Klitrosen", "Klub3210", "18:00") == ""  # €1,000: lands exactly on the budget
    assert logic.total_fees() == 10000
    assert logic.remaining_budget() == 0


def test_scenario_a4_duplicates(fresh_db):
    """Brief A4: an artist already in the lineup is rejected regardless of stage."""
    assert book("Havgus", "Solscenen", "16:00") == ""
    same_stage = book("Havgus", "Solscenen", "20:00")
    other_stage = book("Havgus", "Skovscenen", "20:00")
    assert same_stage != ""
    assert other_stage != ""
    assert "already" in other_stage
    assert len(db.get_bookings()) == 1
    assert logic.total_fees() == 2400  # the fee is charged once


def test_catalogue_marks_booked_artists(fresh_db):
    """FA01: the catalogue says which artists are already booked."""
    book("Havgus", "Solscenen", "16:00")
    booked = {}
    for row in logic.catalogue():
        booked[row["name"]] = row["booked"]
    assert booked["Havgus"] is True
    assert booked["Tangsø"] is False
    assert len(booked) == len(db.get_artists())
