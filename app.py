"""Festival planner: the Streamlit screens. Start the app with:  uv run streamlit run app.py"""

import datetime

import streamlit as st

import db
import logic

st.set_page_config(page_title="Musik i Lejet planner", page_icon="🎪", layout="wide")


def euros(amount):
    """Format whole euros for the screen: 2400 -> "€2,400"."""
    return "€" + format(amount, ",")


def show_message():
    """Show the result of the last action (kept across the redraw that follows it)."""
    if "message" in st.session_state:
        kind, text = st.session_state.pop("message")
        if kind == "ok":
            st.success(text)
        else:
            st.error(text)


def finish_action(problem, ok_text):
    """Remember what to tell the user, then redraw the page so every section shows the saved data."""
    if problem == logic.ACCEPTED:
        st.session_state["message"] = ("ok", ok_text)
    else:
        st.session_state["message"] = ("refused", problem)
    st.rerun()


def show_catalogue():
    """FA01: the artist catalogue with genre, fee and set length."""
    st.subheader("Artists")
    rows = []
    for artist in db.get_artists():
        rows.append({
            "Artist": artist["name"],
            "Genre": artist["genre"],
            "Fee": euros(artist["fee"]),
            "Set length": str(artist["duration"]) + " min",
        })
    st.table(rows)


def show_booking_form():
    """FA02: choose an artist, a stage and a start time, and add the performance."""
    st.subheader("Book a set")
    artists = {}
    for artist in db.get_artists():
        artists[artist["id"]] = artist
    stages = {}
    for stage in db.get_stages():
        stages[stage["id"]] = stage
    with st.form("book"):
        artist_id = st.selectbox(
            "Artist",
            list(artists.keys()),
            format_func=lambda i: artists[i]["name"] + " · " + euros(artists[i]["fee"]) + " · " + str(artists[i]["duration"]) + " min",
            key="book_artist",
        )
        stage_id = st.selectbox("Stage", list(stages.keys()), format_func=lambda i: stages[i]["name"], key="book_stage")
        start_time = st.time_input("Start time", value=datetime.time(16, 0), step=300, key="book_start")
        if st.form_submit_button("Add to programme"):
            start = start_time.hour * 60 + start_time.minute
            problem = logic.add_booking(artist_id, stage_id, start)
            end = start + artists[artist_id]["duration"]
            finish_action(
                problem,
                artists[artist_id]["name"] + " is booked on " + stages[stage_id]["name"]
                + ", " + logic.to_clock(start) + "–" + logic.to_clock(end) + ".",
            )


def show_timetable():
    """FA03: the performances of every stage in time order, with start and end times."""
    st.subheader("Programme")
    columns = st.columns(len(db.get_stages()))
    for column, stage in zip(columns, db.get_stages()):
        column.markdown("**" + stage["name"] + "**")
        lineup = logic.stage_lineup(stage["id"])
        if len(lineup) == 0:
            column.caption("Nothing booked yet.")
        for booking in lineup:
            column.write(
                logic.to_clock(booking["start"]) + "–" + logic.to_clock(logic.end_of(booking)) + "  " + booking["artist_name"]
            )


def main():
    """Draw the whole page, top to bottom."""
    st.title("Musik i Lejet · festival planner")
    show_message()
    show_timetable()
    left, right = st.columns(2)
    with left:
        show_booking_form()
    with right:
        show_catalogue()


main()
