"""Storage for the festival planner and the game. Everything is saved in one SQLite file: data/festival.db.

One exception: online, the high scores go to a free Postgres database instead, because the online
host wipes its files on every restart (see "where the high scores live" below).

Nothing is kept in memory between two calls: every function opens the file, does one thing and
closes it again. That is why the plan is still there after the app is stopped and started again.
"""

import datetime
import json
import os
import sqlite3

import streamlit as st

# The database file. Tests point this at a throwaway file instead.
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "festival.db")

# Fixed content: the stages (name, description). Solscenen and Skovscenen are the two stages the
# brief asks for; Klub3210 is this project's extension.
STAGES = [
    ("Solscenen", "The main stage, out in the open"),
    ("Skovscenen", "The smaller stage among the trees"),
    ("Klub3210", "Intimate oasis for new Danish music and jazz"),
]

# Fixed content: the artist catalogue (name, genre, fee in whole euros, set length in minutes).
# All artists are invented.
ARTISTS = [
    ("Sommerfugl", "Pop", 3200, 90),
    ("Solsort & Stær", "Hip hop", 2600, 60),
    ("Havgus", "Indie pop", 2400, 75),
    ("Tangsø", "Rock", 2000, 60),
    ("Nordlys Kollektivet", "Electronic", 1800, 60),
    ("Brændingen", "Surf rock", 1600, 60),
    ("Blå Time", "Soul", 1500, 60),
    ("Fyrtårnet", "Disco DJ set", 1400, 90),
    ("Vejby Brass Band", "Brass funk", 1200, 50),
    ("Klitrosen", "Folk", 1000, 45),
    ("Lyngbakken Jazz Trio", "Jazz", 900, 60),
    ("Marehalm", "New Danish songwriter", 800, 45),
]


def create_tables(connection):
    """Create the tables if they are missing, and load the fixed content into a brand-new database."""
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS stages (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS artists (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            genre TEXT NOT NULL,
            fee INTEGER NOT NULL,
            duration INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY,
            artist_id INTEGER NOT NULL UNIQUE REFERENCES artists(id),
            stage_id INTEGER NOT NULL REFERENCES stages(id),
            start INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS plan (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            status TEXT NOT NULL
        );
        INSERT OR IGNORE INTO plan (id, status) VALUES (1, 'draft');
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY,
            player TEXT NOT NULL,
            day TEXT NOT NULL,
            mission TEXT NOT NULL,
            points INTEGER NOT NULL,
            stars INTEGER NOT NULL,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL,
            summary TEXT NOT NULL,
            played_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS player (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT NOT NULL,
            look TEXT NOT NULL
        );
        """
    )
    if connection.execute("SELECT COUNT(*) FROM stages").fetchone()[0] == 0:
        connection.executemany("INSERT INTO stages (name, description) VALUES (?, ?)", STAGES)
        connection.executemany("INSERT INTO artists (name, genre, fee, duration) VALUES (?, ?, ?, ?)", ARTISTS)
    connection.commit()


def connect():
    """Open the database file. The first time, the file, its tables and the fixed content are created."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    create_tables(connection)
    return connection


def read(sql, values=()):
    """Run a SELECT and return the rows as a list of dicts."""
    connection = connect()
    rows = []
    for row in connection.execute(sql, values).fetchall():
        rows.append(dict(row))
    connection.close()
    return rows


def write(sql, values=()):
    """Run an INSERT, UPDATE or DELETE, save it to the file, and return the id of a newly inserted row."""
    connection = connect()
    cursor = connection.execute(sql, values)
    connection.commit()
    connection.close()
    return cursor.lastrowid


def get_stages():
    """Return every stage, in festival order."""
    return read("SELECT id, name, description FROM stages ORDER BY id")


def get_artists():
    """Return the whole artist catalogue."""
    return read("SELECT id, name, genre, fee, duration FROM artists ORDER BY id")


def get_artist(artist_id):
    """Return one artist, or None if there is no artist with this id."""
    rows = read("SELECT id, name, genre, fee, duration FROM artists WHERE id = ?", (artist_id,))
    if len(rows) == 0:
        return None
    return rows[0]


def get_stage(stage_id):
    """Return one stage, or None if there is no stage with this id."""
    rows = read("SELECT id, name, description FROM stages WHERE id = ?", (stage_id,))
    if len(rows) == 0:
        return None
    return rows[0]


def add_artist(name, genre, fee, duration):
    """Add one artist to the catalogue and return its id."""
    return write("INSERT INTO artists (name, genre, fee, duration) VALUES (?, ?, ?, ?)", (name, genre, fee, duration))


def get_bookings():
    """Return every saved booking, with the artist's and the stage's details, by stage and start time.

    Only artist, stage and start time are stored. Name, fee and set length are looked up in the
    catalogue, so a booking can never disagree with it.
    """
    return read(
        """
        SELECT bookings.id, bookings.artist_id, bookings.stage_id, bookings.start,
               artists.name AS artist_name, artists.genre, artists.fee, artists.duration,
               stages.name AS stage_name
        FROM bookings
        JOIN artists ON artists.id = bookings.artist_id
        JOIN stages ON stages.id = bookings.stage_id
        ORDER BY bookings.stage_id, bookings.start
        """
    )


def add_booking(artist_id, stage_id, start):
    """Save a new booking and return its id. The rules are checked in logic.py, not here."""
    return write("INSERT INTO bookings (artist_id, stage_id, start) VALUES (?, ?, ?)", (artist_id, stage_id, start))


def get_booking(booking_id):
    """Return one saved booking (with artist and stage details), or None if it does not exist."""
    for booking in get_bookings():
        if booking["id"] == booking_id:
            return booking
    return None


def update_booking(booking_id, stage_id, start):
    """Change the stage and start time of a saved booking. The artist stays the same."""
    write("UPDATE bookings SET stage_id = ?, start = ? WHERE id = ?", (stage_id, start, booking_id))


def delete_booking(booking_id):
    """Delete one saved booking."""
    write("DELETE FROM bookings WHERE id = ?", (booking_id,))


def get_plan_status():
    """Return "draft" or "final". There is exactly one plan, so the plan table has exactly one row."""
    return read("SELECT status FROM plan WHERE id = 1")[0]["status"]


def set_plan_status(status):
    """Save whether the plan is "draft" or "final"."""
    write("UPDATE plan SET status = ? WHERE id = 1", (status,))


def reset_plan():
    """Start over: delete every booking and make the plan a draft. The catalogue and stages stay."""
    write("DELETE FROM bookings")
    set_plan_status("draft")


# ---------- the game: finished nights (high scores) and the player's outfit ----------


# ---------- where the high scores live ----------
# On our computers and in the tests: the local file, like everything else.
# Online: a free Postgres database at Neon. Its address (with its password inside) is the secret
# SCORES_DATABASE_URL, kept in Streamlit's secrets settings, never in the code or on GitHub.


def scores_url():
    """The online database's address, or "" when there is none (then the local file is used)."""
    if "SCORES_DATABASE_URL" in os.environ:  # tests and our own computers can set this
        return os.environ["SCORES_DATABASE_URL"]
    try:
        return st.secrets.get("SCORES_DATABASE_URL", "")
    except Exception:  # no secrets file at all
        return ""


def connect_online():
    """Open the online database and make sure the runs table exists (same columns as in the file)."""
    import psycopg  # only needed online, so it is imported here
    from psycopg.rows import dict_row

    connection = psycopg.connect(scores_url(), connect_timeout=5, row_factory=dict_row)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS runs (
            id SERIAL PRIMARY KEY,
            player TEXT NOT NULL,
            day TEXT NOT NULL,
            mission TEXT NOT NULL,
            points INTEGER NOT NULL,
            stars INTEGER NOT NULL,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL,
            summary TEXT NOT NULL,
            played_at TEXT NOT NULL
        )
        """
    )
    return connection


def delete_online_runs(player):
    """Remove one player's nights from the online database. Only the tests use this, to clean up."""
    with connect_online() as connection:
        connection.execute("DELETE FROM runs WHERE player = %s", (player,))


def save_run(run):
    """Save one finished night: online if the app has a database address, otherwise in the file.

    The summary (a dictionary) is stored as JSON text. If the online database cannot be reached,
    the night is saved in the file instead, so a player never loses it to a crash."""
    values = (
        run["player"],
        run["day"],
        run["mission"],
        run["points"],
        run["stars"],
        run["title"],
        1 if run["completed"] else 0,
        json.dumps(run["summary"]),
        datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
    )
    columns = "player, day, mission, points, stars, title, completed, summary, played_at"
    if scores_url():
        try:
            with connect_online() as connection:  # "with" saves (commits) and closes it for us
                connection.execute("INSERT INTO runs (" + columns + ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", values)
            return None
        except Exception as error:
            print("Online high scores not reachable, saving in the file instead:", error)
    return write("INSERT INTO runs (" + columns + ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", values)


def get_runs(limit=20):
    """The saved nights, best score first (the newest first when two scores are equal).

    Read from the online database if there is one; if it cannot be reached, from the file."""
    runs = None
    if scores_url():
        try:
            with connect_online() as connection:
                runs = connection.execute("SELECT * FROM runs ORDER BY points DESC, id DESC LIMIT %s", (limit,)).fetchall()
        except Exception as error:
            print("Online high scores not reachable, reading the file instead:", error)
    if runs is None:
        runs = read("SELECT * FROM runs ORDER BY points DESC, id DESC LIMIT ?", (limit,))
    for run in runs:
        run["summary"] = json.loads(run["summary"])
        run["completed"] = run["completed"] == 1
    return runs


def save_player(name, look):
    """Remember the player's name and outfit. There is one player, so the table has one row."""
    write("INSERT OR REPLACE INTO player (id, name, look) VALUES (1, ?, ?)", (name, json.dumps(look)))


def get_player():
    """The remembered player as {"name": ..., "look": {...}}, or None before the first game."""
    rows = read("SELECT name, look FROM player WHERE id = 1")
    if len(rows) == 0:
        return None
    return {"name": rows[0]["name"], "look": json.loads(rows[0]["look"])}


if __name__ == "__main__":
    # uv run python db.py --reset
    import sys

    if "--reset" in sys.argv:
        reset_plan()
        print("The plan is empty again. Stages and artists are unchanged.")
    else:
        print("Database: " + DB_PATH)
        print(str(len(get_bookings())) + " bookings saved, plan is " + get_plan_status() + ".")
        print("Run with --reset to delete all bookings.")
