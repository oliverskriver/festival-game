"""Finalise and reopen the plan.

Written from specs/finalise-reopen.md before the code. Covers scenario A6 of the brief.
"""

import sqlite3

import db
import logic
from conftest import artist, book, lineup_text, stage


def book_three():
    """Three valid bookings: €2,400 + €2,000 + €1,000."""
    assert book("Havgus", "Solscenen", "16:00") == ""
    assert book("Tangsø", "Solscenen", "18:00") == ""
    assert book("Klitrosen", "Skovscenen", "16:00") == ""


def book_four():
    """Four valid bookings: the three above plus Marehalm (€800)."""
    book_three()
    assert book("Marehalm", "Klub3210", "20:00") == ""


def first_booking_id():
    return db.get_bookings()[0]["id"]


def test_a_new_plan_is_a_draft(fresh_db):
    assert logic.plan_status() == "draft"
    assert logic.is_final() is False


def test_scenario_a6_three_artists_cannot_be_finalised(fresh_db):
    """Brief A6: finalisation with three artists is rejected."""
    book_three()
    problem = logic.finalise_plan()
    assert problem != ""
    assert "4" in problem or "four" in problem
    assert logic.plan_status() == "draft"


def test_scenario_a6_four_valid_bookings_can_be_finalised(fresh_db):
    """Brief A6: with four valid bookings finalisation succeeds."""
    book_four()
    assert logic.finalise_plan() == ""
    assert logic.plan_status() == "final"
    assert logic.is_final() is True


def test_a_final_plan_is_read_only(fresh_db):
    """Rule R5: no adding, moving or removing while the plan is final. Nothing changes."""
    book_four()
    logic.finalise_plan()
    before = db.get_bookings()
    added = book("Blå Time", "Skovscenen", "20:00")
    moved = logic.move_booking(first_booking_id(), stage("Solscenen"), logic.to_minutes("14:00"))
    removed = logic.remove_booking(first_booking_id())
    for problem in [added, moved, removed]:
        assert problem != ""
        assert "final" in problem
    assert db.get_bookings() == before
    assert logic.total_fees() == 6200


def test_scenario_a6_lineup_totals_and_status_persist(fresh_db):
    """Brief A6: the lineup, the totals and the final status are in the file, so they survive a restart."""
    book_four()
    logic.finalise_plan()
    # Read the file directly, the way a freshly started app would find it.
    connection = sqlite3.connect(str(fresh_db))
    status = connection.execute("SELECT status FROM plan").fetchone()[0]
    bookings = connection.execute("SELECT COUNT(*) FROM bookings").fetchone()[0]
    fees = connection.execute(
        "SELECT SUM(artists.fee) FROM bookings JOIN artists ON artists.id = bookings.artist_id"
    ).fetchone()[0]
    connection.close()
    assert status == "final"
    assert bookings == 4
    assert fees == 6200
    assert logic.total_fees() == 6200  # the app's total agrees with the saved bookings
    assert logic.remaining_budget() == 3800
    # Still read-only until it is explicitly reopened.
    assert book("Blå Time", "Skovscenen", "20:00") != ""


def test_reopening_makes_the_plan_editable_again(fresh_db):
    """Reopen: back to draft, every booking kept, changes allowed again."""
    book_four()
    logic.finalise_plan()
    assert logic.reopen_plan() == ""
    assert logic.plan_status() == "draft"
    assert len(db.get_bookings()) == 4
    assert book("Blå Time", "Skovscenen", "20:00") == ""
    assert logic.remove_booking(first_booking_id()) == ""


def test_finalising_twice_or_reopening_a_draft_is_refused(fresh_db):
    """The two buttons only make sense in one direction each."""
    book_four()
    assert logic.reopen_plan() != ""
    logic.finalise_plan()
    assert logic.finalise_plan() != ""
    assert logic.plan_status() == "final"


def test_a_plan_with_a_broken_booking_cannot_be_finalised(fresh_db):
    """FA05 'all rules pass': if a clashing booking ever got into the file, finalising catches it."""
    book_four()
    # Bypass the rules on purpose: write a clash on Solscenen straight into the database.
    db.add_booking(artist("Blå Time"), stage("Solscenen"), logic.to_minutes("16:30"))
    assert len(logic.plan_problems()) > 0
    assert logic.finalise_plan() != ""
    assert logic.plan_status() == "draft"


def test_a_valid_plan_has_no_problems(fresh_db):
    book_four()
    assert logic.plan_problems() == []
