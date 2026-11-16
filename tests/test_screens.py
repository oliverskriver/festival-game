"""The real screens, clicked by a test: refusals are explained on screen, edits work, and a final plan is locked.

"A new session" (start_app again) has nothing in memory, so anything it shows was read from the database.
"""

import datetime
import os

from streamlit.testing.v1 import AppTest

import db
import logic
from conftest import REPO_DIR, artist, book, lineup_text, stage

APP_PATH = os.path.join(REPO_DIR, "app.py")


def start_app():
    """Start the app the way a new browser session would."""
    return AppTest.from_file(APP_PATH, default_timeout=60).run()


def page_text(app):
    """Everything the page draws as its own HTML blocks (hero, budget, messages, timetable, catalogue)."""
    text = ""
    for block in app.get("html"):
        text += block.proto.body + "\n"
    return text


def labels(app):
    """The labels of every button on the page."""
    found = []
    for button in app.button:
        found.append(button.label)
    return found


def click(app, label):
    """Click the button with this label."""
    for button in app.button:
        if button.label == label:
            return button.click().run()
    raise AssertionError("no button labelled " + label)


def test_a_refused_booking_is_explained_on_screen(fresh_db):
    """Scenario A1 on screen: the clash is refused, the reason is shown, and the lineup is unchanged."""
    book("Havgus", "Solscenen", "16:00")
    app = start_app()
    app.selectbox(key="book_artist").set_value(artist("Tangsø"))
    app.selectbox(key="book_stage").set_value(stage("Solscenen"))
    app.time_input(key="book_start").set_value(datetime.time(16, 30))
    click(app, "Add to programme")
    assert not app.exception
    page = page_text(app)
    assert "Not accepted" in page
    assert "Solscenen is taken: Havgus plays 16:00–17:15" in page
    assert lineup_text("Solscenen") == ["Havgus 16:00-17:15"]


def test_budget_and_booked_mark_are_shown(fresh_db):
    """FA01 and FA03 on screen: fees booked, budget left, and the artist marked as booked."""
    book("Havgus", "Solscenen", "16:00")
    page = page_text(start_app())
    assert "€2,400" in page
    assert "€7,600" in page
    assert "Booked · Solscenen 16:00–17:15" in page


def test_move_and_remove_on_screen(fresh_db):
    """FA04 on screen: move Havgus to Skovscenen at 18:00, then remove the booking."""
    book("Havgus", "Solscenen", "16:00")
    booking_id = db.get_bookings()[0]["id"]
    app = start_app()
    app.selectbox(key="change_stage_" + str(booking_id)).set_value(stage("Skovscenen"))
    app.time_input(key="change_start_" + str(booking_id)).set_value(datetime.time(18, 0))
    click(app, "Move booking")
    assert not app.exception
    assert lineup_text("Skovscenen") == ["Havgus 18:00-19:15"]
    assert lineup_text("Solscenen") == []

    click(app, "Remove booking")
    assert not app.exception
    assert db.get_bookings() == []
    assert logic.total_fees() == 0


def test_finalising_too_early_is_refused_on_screen(fresh_db):
    """Scenario A6 on screen: three artists are not enough, and the page says so."""
    book("Havgus", "Solscenen", "16:00")
    book("Tangsø", "Solscenen", "18:00")
    book("Klitrosen", "Skovscenen", "16:00")
    app = start_app()
    click(app, "Finalise plan")
    assert "Only 3 of the 4 artists needed are booked" in page_text(app)
    assert logic.plan_status() == "draft"


def test_a_final_plan_is_locked_on_screen_until_reopened(fresh_db):
    """Scenario A6 on screen: finalise, the forms disappear, a new session is still locked, reopen brings them back."""
    book("Havgus", "Solscenen", "16:00")
    book("Tangsø", "Solscenen", "18:00")
    book("Klitrosen", "Skovscenen", "16:00")
    book("Marehalm", "Klub3210", "20:00")
    app = start_app()
    click(app, "Finalise plan")
    assert not app.exception
    assert logic.plan_status() == "final"
    assert "Add to programme" not in labels(app)
    assert "Move booking" not in labels(app)
    assert "Remove booking" not in labels(app)

    restarted = start_app()
    assert "FINAL" in page_text(restarted)
    assert "Add to programme" not in labels(restarted)
    assert len(db.get_bookings()) == 4

    click(restarted, "Reopen as draft")
    assert logic.plan_status() == "draft"
    assert "Add to programme" in labels(restarted)
