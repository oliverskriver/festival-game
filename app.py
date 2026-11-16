"""Festival planner: the Streamlit screens. Start the app with:  uv run streamlit run app.py"""

import datetime

import streamlit as st

import db
import logic

st.set_page_config(page_title="Musik i Lejet planner", page_icon="🎪", layout="wide")


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
    for artist in logic.catalogue():
        rows.append({
            "Status": "Booked" if artist["booked"] else "Available",
            "Artist": artist["name"],
            "Genre": artist["genre"],
            "Fee": logic.euros(artist["fee"]),
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
            format_func=lambda i: artists[i]["name"] + " · " + logic.euros(artists[i]["fee"]) + " · " + str(artists[i]["duration"]) + " min",
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


def show_change_form():
    """FA04: move a booking to another stage or time, or remove it."""
    st.subheader("Change a booking")
    bookings = {}
    for booking in db.get_bookings():
        bookings[booking["id"]] = booking
    if len(bookings) == 0:
        st.caption("Nothing booked yet.")
        return
    stages = {}
    for stage in db.get_stages():
        stages[stage["id"]] = stage
    booking_id = st.selectbox(
        "Booking",
        list(bookings.keys()),
        format_func=lambda i: bookings[i]["artist_name"] + " · " + bookings[i]["stage_name"] + " · "
        + logic.to_clock(bookings[i]["start"]) + "–" + logic.to_clock(logic.end_of(bookings[i])),
        key="change_booking",
    )
    booking = bookings[booking_id]
    # The keys contain the booking id, so the boxes start at this booking's own stage and time.
    with st.form("change"):
        stage_ids = list(stages.keys())
        stage_id = st.selectbox(
            "New stage",
            stage_ids,
            index=stage_ids.index(booking["stage_id"]),
            format_func=lambda i: stages[i]["name"],
            key="change_stage_" + str(booking_id),
        )
        start_time = st.time_input(
            "New start time",
            value=datetime.time(booking["start"] // 60, booking["start"] % 60),
            step=300,
            key="change_start_" + str(booking_id),
        )
        move_column, remove_column = st.columns(2)
        if move_column.form_submit_button("Move booking"):
            start = start_time.hour * 60 + start_time.minute
            problem = logic.move_booking(booking_id, stage_id, start)
            finish_action(
                problem,
                booking["artist_name"] + " now plays " + stages[stage_id]["name"] + ", "
                + logic.to_clock(start) + "–" + logic.to_clock(start + booking["duration"]) + ".",
            )
        if remove_column.form_submit_button("Remove booking"):
            problem = logic.remove_booking(booking_id)
            finish_action(
                problem,
                booking["artist_name"] + " is removed. " + logic.euros(booking["fee"]) + " is back in the budget.",
            )


def show_budget():
    """FA03: total artist fees and remaining budget, read from the saved bookings."""
    booked, left, count = st.columns(3)
    booked.metric("Fees booked", logic.euros(logic.total_fees()))
    left.metric("Budget left", logic.euros(logic.remaining_budget()))
    count.metric("Artists booked", len(db.get_bookings()))


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
    show_budget()
    show_timetable()
    left, right = st.columns(2)
    with left:
        show_booking_form()
        show_change_form()
    with right:
        show_catalogue()


main()
