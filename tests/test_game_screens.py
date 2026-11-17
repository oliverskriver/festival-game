"""The game's screens, clicked by a test: title, set-up, recap, high scores and the menu."""

import os

from streamlit.testing.v1 import AppTest

import db
import game
import programme
from conftest import REPO_DIR, book

APP_PATH = os.path.join(REPO_DIR, "festival.py")


def start_app():
    """Start the whole product the way a new browser session would."""
    return AppTest.from_file(APP_PATH, default_timeout=60).run()


def page_text(app):
    text = ""
    for block in app.get("html"):
        text += block.proto.body + "\n"
    return text


def click(app, key):
    return app.button(key=key).click().run()


def test_the_front_door_shows_the_title_screen(fresh_db):
    app = start_app()
    assert not app.exception
    assert "En nat" in page_text(app)
    assert [button.label for button in app.button][:3] == ["PLAY THE FESTIVAL", "PLAN THE PROGRAMME", "HIGH SCORES"]


def test_the_planner_is_one_click_away_and_still_works(fresh_db):
    app = click(start_app(), "menu_plan")
    assert not app.exception
    assert "Festival<br>planner" in page_text(app)
    assert any(button.label == "Add to programme" for button in app.button)


def test_set_up_shows_the_real_programme(fresh_db):
    app = click(start_app(), "start_night")
    assert not app.exception
    app.radio(key="pick_day").set_value("sat").run()
    assert "Christopher" in page_text(app)


def test_a_night_cannot_start_without_a_name(fresh_db):
    app = click(start_app(), "start_night")
    app = click(app, "enter_festival")
    assert "Write your name first" in page_text(app)
    assert app.session_state["game_step"] == "setup"
    assert db.get_player() is None


def test_an_empty_own_programme_is_refused(fresh_db):
    app = click(start_app(), "start_night")
    app.radio(key="pick_day").set_value("own").run()
    app.text_input(key="player_name").set_value("Oliver").run()
    app = click(app, "enter_festival")
    assert "Your own programme is empty" in page_text(app)
    assert app.session_state["game_step"] == "setup"


def test_starting_a_night_saves_the_player_and_builds_the_world(fresh_db):
    app = click(start_app(), "start_night")
    app.radio(key="pick_day").set_value("fri").run()
    app.text_input(key="player_name").set_value("Oliver").run()
    app.selectbox(key="look_hat").set_value("bucket").run()
    app.radio(key="pick_mission").set_value("backstage").run()
    app = click(app, "enter_festival")
    assert app.session_state["game_step"] == "playing"
    config = app.session_state["game_config"]
    assert config["mission"]["id"] == "backstage"
    assert config["day"]["id"] == "fri"
    assert config["player"]["look"]["hat"] == "bucket"
    assert db.get_player()["name"] == "Oliver"


def test_the_planners_programme_can_be_played(fresh_db):
    assert book("Havgus", "Solscenen", "16:00") == ""
    app = click(start_app(), "start_night")
    app.radio(key="pick_day").set_value("own").run()
    app.text_input(key="player_name").set_value("Oliver").run()
    app = click(app, "enter_festival")
    assert app.session_state["game_step"] == "playing"
    assert [act["artist"] for act in app.session_state["game_config"]["acts"]] == ["Havgus"]


def test_the_recap_shows_what_the_referee_counted(fresh_db):
    acts = programme.acts_for("sat")
    christopher = [act for act in acts if act["artist"] == "Christopher"][0]
    events = [
        {"type": "buy", "minute": 1250, "item": "beer"},
        {"type": "watch", "act": christopher["id"], "from": 1260, "to": 1290},
        {"type": "end", "minute": 1400, "reason": "went_home"},
    ]
    app = start_app()
    app.session_state["last_run"] = game.finish_night("Oliver", "sat", "music", events, acts)
    app.session_state["game_step"] = "recap"
    app = app.run()
    text = page_text(app)
    assert not app.exception
    assert "100 points" in text
    assert "1 concert seen" in text
    assert "MISSION FAILED" in text
    assert "Christopher" in text


def test_high_scores_survive_a_new_session(fresh_db):
    game.finish_night("Oliver", "sat", "music", [], programme.acts_for("sat"))
    app = click(start_app(), "menu_scores")
    assert not app.exception
    assert "<b>Oliver</b>" in page_text(app)
