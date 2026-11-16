"""Smoke tests: the real screens render, and a booking made on screen is there for a newly started session."""

import datetime
import os

from streamlit.testing.v1 import AppTest

import db
from conftest import REPO_DIR, artist, lineup_text, stage

APP_PATH = os.path.join(REPO_DIR, "app.py")


def start_app():
    """Start the app the way a new browser session would: with nothing remembered in memory."""
    return AppTest.from_file(APP_PATH, default_timeout=60).run()


def click(app, label):
    """Click the button with this label."""
    for button in app.button:
        if button.label == label:
            return button.click().run()
    raise AssertionError("no button labelled " + label)


def test_the_app_renders(fresh_db):
    """The page draws without any error on a brand-new database."""
    app = start_app()
    assert not app.exception


def test_booking_on_screen_survives_a_new_session(fresh_db):
    """Book through the form, then start a fresh session: the booking is read back from the database."""
    app = start_app()
    app.selectbox(key="book_artist").set_value(artist("Havgus"))
    app.selectbox(key="book_stage").set_value(stage("Solscenen"))
    app.time_input(key="book_start").set_value(datetime.time(16, 0))
    click(app, "Add to programme")
    assert not app.exception
    assert lineup_text("Solscenen") == ["Havgus 16:00-17:15"]

    restarted = start_app()
    assert not restarted.exception
    assert "Havgus" in str(restarted.main)
    assert len(db.get_bookings()) == 1
