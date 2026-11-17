"""The game's screens: title, setting up a night, the 3D game itself, the recap and the high scores.

Like app.py, this file only draws things and passes clicks on. The rules are in game.py, the
content in programme.py and world.py, and saving is done by db.py. The 3D world is the
JavaScript in the folder game3d/, which this file hands to the browser as one piece.
"""

import base64
import glob
import hashlib
import html
import os
import uuid

import streamlit as st

import db
import game
import programme

HERE = os.path.dirname(os.path.abspath(__file__))

COLOUR_NAMES = {
    "#F2C9A5": "Light", "#E0A878": "Tan", "#B97A50": "Brown", "#8A5A3A": "Dark brown", "#5E3B28": "Deep brown",
    "#E8C36B": "Blond", "#5A3A22": "Brown hair", "#1E1A18": "Black", "#B5562B": "Red", "#D9D9D9": "Grey", "#E85D9E": "Pink",
    "#FFFFFF": "White", "#FF471C": "Orange-red", "#3374F2": "Blue", "#FFC607": "Yellow", "#4636AA": "Indigo",
    "#22252B": "Black", "#F29BC4": "Pink", "#1F7A3A": "Green", "#3A5A8C": "Denim blue", "#F7F3E3": "Cream",
    "#D8342B": "Red", "#C9A66B": "Sand",
}
PART_LABELS = {
    "skin": "Skin", "hair": "Hair", "hair_colour": "Hair colour", "top": "Top", "top_colour": "Top colour",
    "bottom": "Bottom", "bottom_colour": "Bottom colour", "hat": "Hat", "glasses": "Glasses", "shoes": "Shoes",
    "into": "In the flirt mission, introduce me to",
}
WORDS = {
    "tshirt": "T-shirt", "shirt": "Long-sleeved shirt", "top": "Sleeveless top", "hoodie": "Hoodie",
    "short": "Short", "long": "Long", "bun": "Bun", "bald": "Bald", "shorts": "Shorts", "jeans": "Jeans", "skirt": "Skirt",
    "none": "None", "bucket": "Bucket hat", "cap": "Cap", "cowboy": "Cowboy hat", "sun": "Sunglasses",
    "sneakers": "Sneakers", "boots": "Boots", "sandals": "Sandals", "everyone": "Everyone", "women": "Women", "men": "Men",
}
END_WORDS = {
    "closing": "stayed until the lights came on at 04:00",
    "went_home": "went home",
    "passed_out": "slept through the end of the festival",
    "thrown_out": "was thrown out by security",
    "unknown": "left",
}


# ---------- the 3D game as one piece of JavaScript ----------


def read_file(*parts):
    with open(os.path.join(HERE, *parts), encoding="utf-8") as file:
        return file.read()


def game_code():
    """All files in game3d/, glued together in file-name order."""
    paths = sorted(glob.glob(os.path.join(HERE, "game3d", "*.js")))
    return "\n".join(read_file(path) for path in paths)


@st.cache_resource
def game_component(version):
    """Tell Streamlit about the 3D game once. "version" changes when the JavaScript changes."""
    return st.components.v2.component("lejet_game", js=game_code())


def code_version():
    return hashlib.md5(game_code().encode("utf-8")).hexdigest()


# ---------- small drawing helpers ----------


def load_game_style():
    st.html("<style>" + read_file("style.css") + read_file("game_style.css") + "</style>")


def word(value):
    """A choice as readable text: colours get their name, other values a nicer word."""
    return COLOUR_NAMES.get(value, WORDS.get(value, str(value)))


def character_html(look):
    """A small drawing of the character made of coloured boxes, so you can see your choices."""
    skin, top, bottom, hair = look["skin"], look["top_colour"], look["bottom_colour"], look["hair_colour"]
    sleeve = {"top": 0, "tshirt": 26, "shirt": 70, "hoodie": 70}[look["top"]]
    leg_cover = {"jeans": 96, "shorts": 40, "skirt": 0}[look["bottom"]]
    shoe = {"sneakers": "#F3F3F3", "boots": "#5A3A26", "sandals": "#C9A66B"}[look["shoes"]]
    boot = 22 if look["shoes"] == "boots" else 0
    boxes = []

    def add(x, y, width, height, colour, extra=""):
        boxes.append(
            '<i style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;background:%s;%s"></i>' % (x, y, width, height, colour, extra)
        )

    for x in (72, 104):  # legs and shoes
        add(x, 200, 24, 96, skin)
        if leg_cover:
            add(x, 200, 24, leg_cover, bottom)
        add(x - 2, 296 - boot, 28, 14 + boot, shoe)
    if look["bottom"] == "skirt":
        add(60, 196, 80, 50, bottom)
    for x in (44, 138):  # arms
        add(x, 126, 18, 70, skin)
        if sleeve:
            add(x, 126, 18, sleeve, top)
    add(64, 124, 72, 80, top, "outline:1px solid rgba(0,0,0,0.25);")
    if look["top"] == "hoodie":
        add(74, 112, 52, 18, top)
    add(92, 108, 16, 18, skin)
    add(74, 60, 52, 54, skin)
    if look["hair"] != "bald":
        add(70, 52, 60, 20, hair)
        if look["hair"] == "long":
            add(66, 60, 12, 76, hair)
            add(122, 60, 12, 76, hair)
        if look["hair"] == "bun":
            add(88, 34, 24, 22, hair)
    if look["glasses"] == "sun":
        add(76, 78, 48, 12, "#111111")
    else:
        add(84, 80, 8, 8, "#1a1a1a")
        add(108, 80, 8, 8, "#1a1a1a")
    add(90, 100, 20, 4, "#8a3a3a")
    if look["hat"] == "bucket":
        add(76, 36, 48, 26, "#F7F3E3", "outline:1px solid #000;")
        add(56, 58, 88, 8, "#F7F3E3", "outline:1px solid #000;")
    elif look["hat"] == "cap":
        add(70, 44, 60, 20, "#D8342B")
        add(118, 58, 36, 7, "#D8342B")
    elif look["hat"] == "cowboy":
        add(80, 30, 40, 30, "#C9A66B")
        add(44, 56, 112, 9, "#C9A66B")
    return '<div class="lj-doll">' + "".join(boxes) + "</div>"


def programme_html(day_id):
    """The day's programme as three columns, one per stage."""
    names = {"sol": "Solscenen", "skov": "Skovscenen", "klub": "Klub 3210"}
    acts = programme.acts_for(day_id)
    favourites = game.favourites(acts)
    columns = ""
    for stage_id, name in names.items():
        rows = ""
        for act in acts:
            if act["stage"] != stage_id:
                continue
            star = " ★" if act["artist"] in favourites else ""
            guess = "" if act["known"] else ' <i title="time or stage is an estimate">≈</i>'
            rows += (
                '<div class="lj-act"><b>' + game.clock(act["start"]) + "–" + game.clock(act["end"]) + "</b>"
                + "<span>" + html.escape(act["artist"]) + star + guess + "</span></div>"
            )
        columns += '<div class="lj-col"><h4>' + name + "</h4>" + (rows or '<div class="lj-act empty">nothing booked</div>') + "</div>"
    return '<div class="lj-programme">' + columns + "</div>"


# ---------- the screens ----------


def title_page():
    photo = base64.b64encode(open(os.path.join(HERE, "assets", "entrance.webp"), "rb").read()).decode("ascii")
    st.html(
        '<div class="lj-title"><div class="lj-title-photo" style="background-image:url(data:image/webp;base64,' + photo + ')"></div>'
        + '<div class="lj-title-text"><p class="mil-kicker">Vejby 3210 · 16.–18. juli · an unofficial fan game</p>'
        + "<h1>En nat<br>i Lejet</h1>"
        + "<p>Walk through the gate, find your friends at the bar, catch the headliner on Solscenen and try not to "
        + "fall over before the lights come on at 04:00.</p></div></div>"
        + '<div class="mil-band" aria-hidden="true"><span>' + "Spil festivalen " * 30 + "</span></div>"
    )
    left, middle, right = st.columns(3)
    left.html('<div class="lj-blurb"><b>01</b><h3>Pick your night</h3><p>Thursday, Friday or Saturday with the real 2026 programme, or the programme you planned yourself.</p></div>')
    middle.html('<div class="lj-blurb"><b>02</b><h3>Choose a mission</h3><p>See your favourites, party hardest, find a festival flirt or sneak backstage.</p></div>')
    right.html('<div class="lj-blurb"><b>03</b><h3>Live it in 3D</h3><p>Three stages, sixty bars and stalls, and a crowd that follows the music.</p></div>')
    if st.button("START A NIGHT", key="start_night", type="primary", width="stretch"):
        st.session_state["game_step"] = "setup"
        st.rerun()


def setup_page():
    saved = db.get_player()
    st.html('<div class="lj-head"><p class="mil-kicker">Before you go</p><h2>Set up your night</h2></div>')

    st.subheader("1 · Which day?")
    day_ids = programme.day_ids()
    day_id = st.radio("Day", day_ids, format_func=programme.day_label, horizontal=True, key="pick_day", label_visibility="collapsed")
    if len(programme.acts_for(day_id)) == 0:
        st.html('<div class="mil-msg refused">Your own programme is empty. Open “Plan the programme” and book some artists first.</div>')
    else:
        st.html(programme_html(day_id) + '<p class="lj-note">★ the three biggest names of the day · ≈ time or stage estimated (see docs/programme-2026-sources.md)</p>')

    st.subheader("2 · Who are you?")
    look = dict(game.default_look())
    if saved:
        look.update({part: value for part, value in saved["look"].items() if part in look})
    doll, choices = st.columns([2, 6], gap="large")
    with choices:
        name = st.text_input("Your name", value=saved["name"] if saved else "", max_chars=20, key="player_name", placeholder="Your name")
        first, second = st.columns(2)
        for index, (part, options) in enumerate(game.LOOK_CHOICES.items()):
            column = first if index % 2 == 0 else second
            start = options.index(look[part]) if look[part] in options else 0
            look[part] = column.selectbox(PART_LABELS[part], options, index=start, format_func=word, key="look_" + part)
    with doll:
        st.html('<div class="lj-doll-box">' + character_html(look) + "</div>")

    st.subheader("3 · What is your mission?")
    mission = st.radio(
        "Mission", list(game.MISSIONS), key="pick_mission", label_visibility="collapsed",
        format_func=lambda key: game.MISSIONS[key]["name"] + " — " + game.MISSIONS[key]["goal"],
    )

    st.subheader("4 · When do you arrive?")
    arrival = st.radio("Arrival", list(game.ARRIVALS), index=2, horizontal=True, key="pick_arrival", label_visibility="collapsed")
    st.html('<p class="lj-note">A whole day takes about ten minutes to play. In the game, hold T to let time fly.</p>')

    if st.button("ENTER THE FESTIVAL", key="enter_festival", type="primary", width="stretch"):
        problem = game.check_choice(day_id, mission, game.ARRIVALS[arrival])
        if name.strip() == "":
            problem = "Write your name first, so your score can go on the high-score list."
        if problem != game.ACCEPTED:
            st.html('<div class="mil-msg refused">' + html.escape(problem) + "</div>")
            return
        db.save_player(name.strip(), look)
        start_game(day_id, mission, look, name.strip(), game.ARRIVALS[arrival])
        st.rerun()


def start_game(day_id, mission, look, name, start_minute):
    """Build what the 3D world needs and switch to the game screen."""
    config = game.build_config(day_id, mission, look, name, start_minute)
    config["run_id"] = uuid.uuid4().hex
    config["css"] = read_file("game3d", "hud.css")
    config["debug"] = st.query_params.get("debug") == "1"
    st.session_state["game_config"] = config
    st.session_state["game_step"] = "playing"


def play_page():
    config = st.session_state["game_config"]
    st.html('<div class="lj-head"><p class="mil-kicker">' + html.escape(config["day"]["label"]) + "</p><h2>The festival is loading…</h2></div>")
    component = game_component(code_version())
    result = component(data=config, key="game_" + config["run_id"], on_result_change=lambda: None, on_finished_change=lambda: None)
    payload = result.result
    if isinstance(payload, dict) and payload.get("run_id") == config["run_id"]:
        finish_game(config, payload)
        st.rerun()
    if st.button("Leave the game", key="leave_game"):
        st.session_state["game_step"] = "title"
        st.rerun()


def finish_game(config, payload):
    """The 3D world reports the night is over: let the referee count it and show the recap."""
    if payload.get("reason") == "error":
        st.session_state["game_step"] = "setup"
        return
    acts = config["acts"]  # the same acts the game was played with
    run = game.finish_night(config["player"]["name"], config["day"]["id"], config["mission"]["id"], payload.get("events"), acts)
    st.session_state["last_run"] = run
    st.session_state["game_step"] = "recap"


def recap_page():
    run = st.session_state.get("last_run")
    if run is None:
        st.session_state["game_step"] = "title"
        st.rerun()
    summary = run["summary"]
    mission = game.MISSIONS[run["mission"]]
    verdict = "MISSION COMPLETE" if run["completed"] else "MISSION FAILED"
    st.html(
        '<div class="lj-recap ' + ("won" if run["completed"] else "lost") + '">'
        + '<p class="mil-kicker">' + html.escape(programme.day_label(run["day"])) + " · " + html.escape(run["player"]) + "</p>"
        + '<div class="lj-stars">' + "★" * run["stars"] + '<span>' + "★" * (5 - run["stars"]) + "</span></div>"
        + "<h1>" + html.escape(run["title"]) + "</h1>"
        + '<div class="lj-points">' + str(run["points"]) + " points</div>"
        + '<div class="lj-verdict">' + verdict + " · " + html.escape(mission["name"]) + "</div></div>"
    )
    facts, counting = st.columns([7, 5], gap="large")
    with facts:
        st.subheader("Your night")
        concerts = ", ".join(summary["concerts"]) if summary["concerts"] else "none"
        tiles = [
            (str(len(summary["concerts"])), "concerts seen"), (str(summary["beers"]), "fadøl"),
            (str(summary["drinks"] + summary["shots"]), "drinks and shots"), (str(summary["waters"]), "cups of water"),
            (str(summary["meals"]), "meals"), (str(summary["spent"]) + " kr", "spent"),
            (str(summary["peak_buzz"]), "top buzz (100 = lights out)"), (game.clock(summary["end_minute"]), END_WORDS[summary["end_reason"]]),
        ]
        st.html('<div class="lj-tiles">' + "".join("<div><b>" + big + "</b><span>" + small + "</span></div>" for big, small in tiles) + "</div>")
        st.html('<p class="lj-note"><b>Concerts that counted:</b> ' + html.escape(concerts) + "</p>")
        if summary["passed_out"]:
            st.html('<div class="mil-msg refused">You passed out. The medic at Førstehjælp says hi.</div>')
        if summary["times_caught"] > 0:
            st.html('<div class="mil-msg refused">Caught by security ' + str(summary["times_caught"]) + " time(s).</div>")
    with counting:
        st.subheader("How the referee counted")
        rows = "".join("<div><span>" + html.escape(text) + "</span><b>" + ("+" if points > 0 else "") + str(points) + "</b></div>" for text, points in run["score_lines"])
        st.html('<div class="lj-score">' + (rows or "<div><span>Nothing to count</span><b>0</b></div>") + '<div class="total"><span>Score</span><b>' + str(run["points"]) + "</b></div></div>")
        st.html('<p class="lj-note">The 3D world only reported what happened. The points were worked out by game.py.</p>')
    again, scores = st.columns(2)
    if again.button("PLAY ANOTHER NIGHT", key="play_again", type="primary", width="stretch"):
        st.session_state["game_step"] = "setup"
        st.rerun()
    if scores.button("HIGH SCORES", key="to_scores", width="stretch"):
        st.session_state["mode"] = "scores"
        st.rerun()


def scores_page():
    st.html('<div class="lj-head"><p class="mil-kicker">Saved in the database</p><h2>High scores</h2></div>')
    runs = db.get_runs()
    if len(runs) == 0:
        st.html('<div class="mil-locked">Nobody has played yet. Be the first.</div>')
        return
    rows = ""
    for place, run in enumerate(runs, start=1):
        rows += (
            "<tr><td>" + str(place) + "</td><td><b>" + html.escape(run["player"]) + "</b></td><td>" + "★" * run["stars"] + "</td>"
            + "<td><b>" + str(run["points"]) + "</b></td><td>" + html.escape(game.MISSIONS[run["mission"]]["name"]) + (" ✔" if run["completed"] else " ✘") + "</td>"
            + "<td>" + html.escape(programme.day_label(run["day"])) + "</td><td>" + html.escape(run["played_at"]) + "</td></tr>"
        )
    st.html(
        '<table class="lj-table"><tr><th>#</th><th>Player</th><th>Stars</th><th>Points</th><th>Mission</th><th>Day</th><th>Played</th></tr>'
        + rows + "</table>"
    )


def dev_shortcut():
    """For testing only: the address ?dev=music&day=fri&time=1230 jumps straight into the 3D game."""
    mission = st.query_params.get("dev")
    if mission in game.MISSIONS and "game_step" not in st.session_state:
        saved = db.get_player()
        look = saved["look"] if saved else game.default_look()
        day_id = st.query_params.get("day", "fri")
        start_minute = int(st.query_params.get("time", "1230"))
        if game.check_choice(day_id, mission, start_minute) == game.ACCEPTED:
            start_game(day_id, mission, look, "Tester", start_minute)


def game_page():
    """Show the right game screen for where the player is."""
    step = st.session_state.get("game_step", "title")
    if step == "setup":
        setup_page()
    elif step == "playing":
        play_page()
    elif step == "recap":
        recap_page()
    else:
        title_page()


def show_footer():
    """The small print under the game's pages."""
    st.html(
        '<div class="mil-footer"><b>Unofficial fan project.</b> Not affiliated with Musik i Lejet. '
        + "Artist names, stages and times are from the public 2026 programme and partly estimated. "
        + "No logos, photos, map artwork or music from the festival or the artists are used; the music is made by the computer. "
        + "Team project for Introduction to Programming, Nova SBE 2026/27.</div>"
    )
