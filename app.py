"""Festival planner: the Streamlit screens. Start the app with:  uv run streamlit run app.py

This file only draws things and passes clicks on. Every rule lives in logic.py and every
read or write of the saved plan goes through db.py.
"""

import datetime
import html
import os

import streamlit as st

import db
import logic

HERE = os.path.dirname(os.path.abspath(__file__))

# How tall one minute is in the timetable drawing, in pixels.
PIXELS_PER_MINUTE = 1.25


def load_style():
    """Put the colours and fonts from style.css on the page."""
    with open(os.path.join(HERE, "style.css"), encoding="utf-8") as file:
        st.html("<style>" + file.read() + "</style>")


def times(booking):
    """A booking's start and end as text, e.g. "16:00–17:15"."""
    return logic.to_clock(booking["start"]) + "–" + logic.to_clock(logic.end_of(booking))


def finish_action(problem, ok_text):
    """Remember what to tell the user, then redraw the page so every section shows the saved data."""
    if problem == logic.ACCEPTED:
        st.session_state["message"] = ("ok", ok_text)
    else:
        st.session_state["message"] = ("refused", problem)
    st.rerun()


def show_hero():
    """The big heading, with the plan's status (draft or final) in the corner."""
    if logic.is_final():
        chip = '<div class="mil-chip final">FINAL</div>'
    else:
        chip = '<div class="mil-chip draft">DRAFT</div>'
    st.html(
        '<div class="mil-hero">' + chip
        + '<p class="mil-kicker">Musik i Lejet · Vejby 3210 · unofficial concept</p>'
        + '<h1 class="mil-title">Festival<br>planner</h1>'
        + '<p class="mil-sub">One day. Three stages. ' + logic.to_clock(logic.FESTIVAL_START) + "–"
        + logic.to_clock(logic.FESTIVAL_END) + ". " + logic.euros(logic.BUDGET) + " for artists.</p>"
        + "</div>"
        + '<div class="mil-band" aria-hidden="true"><span>' + "Program " * 40 + "</span></div>"
    )


def show_budget():
    """FA03: total artist fees and remaining budget, worked out from the saved bookings."""
    total = logic.total_fees()
    booked = len(db.get_bookings())
    missing = logic.MIN_ARTISTS_TO_FINALISE - booked
    if missing > 0:
        artists_note = str(missing) + " more needed to finalise"
    else:
        artists_note = "Enough to finalise"
    percent = total * 100 / logic.BUDGET
    st.html(
        '<div class="mil-stats">'
        + '<div class="mil-stat"><small>Fees booked</small><b>' + logic.euros(total) + "</b>"
        + "<span>" + format(percent, ".0f") + "% of " + logic.euros(logic.BUDGET) + "</span></div>"
        + '<div class="mil-stat"><small>Budget left</small><b>' + logic.euros(logic.remaining_budget()) + "</b>"
        + "<span>for more artists</span></div>"
        + '<div class="mil-stat"><small>Artists booked</small><b>' + str(booked) + "</b>"
        + "<span>" + artists_note + "</span></div>"
        + "</div>"
        + '<div class="mil-bar" role="img" aria-label="' + format(percent, ".0f") + ' percent of the budget is booked">'
        + '<i style="width:' + format(percent, ".1f") + '%"></i></div>'
    )


def show_message():
    """Show the result of the last action: accepted (yellow) or refused with the reason (orange)."""
    if "message" in st.session_state:
        kind, text = st.session_state.pop("message")
        if kind == "ok":
            st.html('<div class="mil-msg ok" role="status"><small>Saved</small>' + html.escape(text) + "</div>")
        else:
            st.html(
                '<div class="mil-msg refused" role="alert"><small>Not accepted · nothing was changed</small>'
                + html.escape(text) + "</div>"
            )


def show_booking_form():
    """FA02: choose an artist, a stage and a start time, and add the performance."""
    st.subheader("Book a set")
    artists = {}
    for artist in logic.catalogue():
        artists[artist["id"]] = artist
    stages = {}
    for stage in db.get_stages():
        stages[stage["id"]] = stage

    def artist_label(artist_id):
        artist = artists[artist_id]
        label = artist["name"] + " · " + logic.euros(artist["fee"]) + " · " + str(artist["duration"]) + " min"
        if artist["booked"]:
            label += " · already booked"
        return label

    with st.form("book"):
        artist_id = st.selectbox("Artist", list(artists.keys()), format_func=artist_label, key="book_artist")
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
        st.html('<div class="mil-locked">Nothing is booked yet.</div>')
        return
    stages = {}
    for stage in db.get_stages():
        stages[stage["id"]] = stage
    booking_id = st.selectbox(
        "Booking",
        list(bookings.keys()),
        format_func=lambda i: bookings[i]["artist_name"] + " · " + bookings[i]["stage_name"] + " · " + times(bookings[i]),
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
        if st.form_submit_button("Move booking"):
            start = start_time.hour * 60 + start_time.minute
            problem = logic.move_booking(booking_id, stage_id, start)
            finish_action(
                problem,
                booking["artist_name"] + " now plays " + stages[stage_id]["name"] + ", "
                + logic.to_clock(start) + "–" + logic.to_clock(start + booking["duration"]) + ".",
            )
        with st.container(key="remove_button"):
            if st.form_submit_button("Remove booking"):
                problem = logic.remove_booking(booking_id)
                finish_action(
                    problem,
                    booking["artist_name"] + " is removed. " + logic.euros(booking["fee"]) + " is back in the budget.",
                )


def show_status():
    """FA05: finalise the plan, or reopen a final plan as a draft."""
    if logic.is_final():
        with st.container(key="status_block_final"):
            st.html(
                '<div class="mil-status"><b>This plan is final.</b>'
                + "<span>It is read-only. Reopen it as a draft to change the programme.</span></div>"
            )
            if st.button("Reopen as draft"):
                finish_action(logic.reopen_plan(), "The plan is a draft again. You can change the programme.")
    else:
        with st.container(key="status_block"):
            st.html(
                '<div class="mil-status"><b>Ready to lock it?</b>'
                + "<span>Finalising needs at least " + str(logic.MIN_ARTISTS_TO_FINALISE)
                + " booked artists. A final plan is read-only until you reopen it.</span></div>"
            )
            if st.button("Finalise plan"):
                finish_action(logic.finalise_plan(), "The plan is final. It is read-only until you reopen it.")


def show_timetable():
    """FA03: every stage's performances in time order, drawn as blocks from 14:00 to 23:00."""
    st.subheader("Programme")
    stages = db.get_stages()
    height = (logic.FESTIVAL_END - logic.FESTIVAL_START) * PIXELS_PER_MINUTE

    head = '<div class="tt-head"><div></div>'
    for stage in stages:
        head += (
            '<div class="tt-stage stage-' + str(stage["id"]) + '"><b>' + html.escape(stage["name"]) + "</b>"
            + "<span>" + html.escape(stage["description"]) + "</span></div>"
        )
    head += "</div>"

    # The time axis and the faint hour lines.
    axis = '<div class="tt-axis">'
    lines = ""
    for minute in range(logic.FESTIVAL_START, logic.FESTIVAL_END + 1, 60):
        top = (minute - logic.FESTIVAL_START) * PIXELS_PER_MINUTE
        extra = ""
        if minute == logic.FESTIVAL_START:
            extra = " first"
        if minute == logic.FESTIVAL_END:
            extra = " last"
        axis += '<div class="tt-hour' + extra + '" style="top:' + str(top) + 'px">' + logic.to_clock(minute) + "</div>"
        lines += '<div class="tt-line" style="top:' + str(top) + 'px"></div>'
    axis += "</div>"

    columns = ""
    for stage in stages:
        columns += '<div class="tt-col">' + lines
        lineup = logic.stage_lineup(stage["id"])
        if len(lineup) == 0:
            columns += '<div class="tt-empty">Nothing booked yet</div>'
        for booking in lineup:
            top = (booking["start"] - logic.FESTIVAL_START) * PIXELS_PER_MINUTE
            block_height = booking["duration"] * PIXELS_PER_MINUTE
            columns += (
                '<div class="tt-set stage-' + str(stage["id"]) + '" style="top:' + str(top) + "px;height:"
                + str(block_height) + 'px"><b>' + html.escape(booking["artist_name"]) + "</b>"
                + "<span>" + times(booking) + "</span><span>" + html.escape(booking["genre"]) + "</span></div>"
            )
        columns += "</div>"

    st.html(
        '<div class="tt" style="--stages:' + str(len(stages)) + '">' + head
        + '<div class="tt-body" style="height:' + str(height) + 'px">' + axis + columns + "</div></div>"
    )


def show_catalogue():
    """FA01: every artist with genre, fee and set length; booked artists are clearly marked."""
    st.subheader("Artists")
    booked_at = {}
    for booking in db.get_bookings():
        booked_at[booking["artist_id"]] = booking["stage_name"] + " " + times(booking)
    cards = ""
    for artist in logic.catalogue():
        if artist["booked"]:
            card_class = "cat-card booked"
            tag = "Booked · " + html.escape(booked_at[artist["id"]])
        else:
            card_class = "cat-card"
            tag = "Available"
        cards += (
            '<div class="' + card_class + '"><b>' + html.escape(artist["name"]) + "</b>"
            + "<span>" + html.escape(artist["genre"]) + "</span>"
            + "<span>" + logic.euros(artist["fee"]) + " · " + str(artist["duration"]) + " min</span>"
            + "<em>" + tag + "</em></div>"
        )
    st.html('<div class="cat">' + cards + "</div>")


def show_footer():
    """The small print."""
    st.html(
        '<div class="mil-footer"><b>Unofficial concept.</b> Not affiliated with Musik i Lejet. '
        + "All artists are invented. Solo project for Introduction to Programming, Nova SBE 2026/27, "
        + "built on the Festival Architect brief.</div>"
    )


def planner_page():
    """Draw the whole planner, top to bottom."""
    load_style()
    show_hero()
    show_budget()
    controls, programme = st.columns([6, 8], gap="medium")
    with controls:
        show_message()
        if logic.is_final():
            st.subheader("Locked")
            st.html('<div class="mil-locked">Booking and changing are switched off while the plan is final.</div>')
        else:
            show_booking_form()
            show_change_form()
        show_status()
    with programme:
        show_timetable()
    with st.container(key="catalogue_block"):
        show_catalogue()
    show_footer()


if __name__ == "__main__":
    # Started directly (uv run streamlit run app.py): show only the planner.
    # The whole product, game included, starts from festival.py.
    st.set_page_config(page_title="Musik i Lejet planner", page_icon="🎪", layout="wide")
    planner_page()
