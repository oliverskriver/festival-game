"""En nat i Lejet: the whole product. Start it with:  uv run streamlit run festival.py

This file is only the front door. It shows the three buttons at the top and then lets one of
the other files draw the page:

    Play the festival    -> game_screens.py  (rules in game.py, 3D world in game3d/)
    Plan the programme   -> app.py           (rules in logic.py)
    High scores          -> game_screens.py

Everything that is saved goes through db.py into the file data/festival.db.
"""

import streamlit as st

import app
import game_screens

st.set_page_config(page_title="En nat i Lejet", page_icon="🎪", layout="wide")

MODES = {"play": "PLAY THE FESTIVAL", "plan": "PLAN THE PROGRAMME", "scores": "HIGH SCORES"}


def show_menu(current):
    """The three buttons at the top. The one you are on is filled in."""
    columns = st.columns(len(MODES))
    for column, (mode, label) in zip(columns, MODES.items()):
        if column.button(label, key="menu_" + mode, type="primary" if mode == current else "secondary", width="stretch"):
            st.session_state["mode"] = mode
            if mode == "play" and st.session_state.get("game_step") in ("recap", None):
                st.session_state["game_step"] = "title"
            st.rerun()


def main():
    game_screens.dev_shortcut()
    mode = st.session_state.get("mode", "play")
    game_screens.load_game_style()
    playing = mode == "play" and st.session_state.get("game_step") == "playing"
    if not playing:
        show_menu(mode)
    if mode == "plan":
        app.planner_page()
    elif mode == "scores":
        game_screens.scores_page()
        game_screens.show_footer()
    else:
        game_screens.game_page()
        if not playing:
            game_screens.show_footer()


main()
