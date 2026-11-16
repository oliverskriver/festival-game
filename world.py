"""The map of the festival site: where everything stands.

Positions were measured on the official Musik i Lejet site map (in picture pixels) and are turned
into metres here. The 3D world only draws what is in this file: move a bar here and it moves in
the game. x grows to the east, z grows to the south, and (0, 0) is the middle of the site.
"""

# One pixel on the map picture is this many metres in the game.
METRES_PER_PIXEL = 0.3
# The pixel that becomes the middle of the world.
CENTRE_PIXEL = (590, 1035)

STAGE_IDS = ["sol", "skov", "klub"]

# What you can buy at each kind of place. The prices are in game.py.
SELLS = {
    "bar": ["beer", "drink", "shot"],
    "food": ["food"],
    "coffee": ["coffee"],
    "water": ["water"],
}


def metres(pixel_x, pixel_y):
    """Turn a point on the map picture into (x, z) in metres."""
    x = (pixel_x - CENTRE_PIXEL[0]) * METRES_PER_PIXEL
    z = (pixel_y - CENTRE_PIXEL[1]) * METRES_PER_PIXEL
    return round(x, 1), round(z, 1)


def place(place_id, name, kind, pixel, size, colour, shape="stall", turn=0):
    """Describe one place. size is (width, depth, height) in metres; turn is degrees."""
    x, z = metres(pixel[0], pixel[1])
    return {
        "id": place_id,
        "name": name,
        "kind": kind,
        "x": x,
        "z": z,
        "w": size[0],
        "d": size[1],
        "h": size[2],
        "colour": colour,
        "shape": shape,
        "turn": turn,
        "sells": SELLS.get(kind, []),
    }


YELLOW, ORANGE, BLUE, INDIGO, WHITE = "#FFC607", "#FF471C", "#3374F2", "#4636AA", "#F7F3E3"
GREEN, PINK, RED, BLACK, WOOD = "#1F7A3A", "#F29BC4", "#D8342B", "#22252B", "#5A3A26"

PLACES = [
    # --- the three stages. "turn" is the direction the stage looks at (0 = south, 90 = west) ---
    place("sol", "Solscenen", "stage", (975, 700), (30, 14, 13), BLUE, "stage", 50),
    place("skov", "Skovscenen", "stage", (290, 1318), (24, 12, 10), GREEN, "stage", 232),
    place("klub", "Klub 3210", "stage", (205, 938), (16, 16, 9), WHITE, "roundtent", 270),
    # --- getting in and out ---
    place("entrance", "Indgang / Exit", "entrance", (872, 1158), (12, 2, 8), ORANGE, "gate", 315),
    place("tickets", "Billetkontor", "info", (915, 1205), (6, 4, 3), YELLOW, "stall", 315),
    place("wardrobe", "Garderobe", "info", (838, 1178), (5, 4, 3), WHITE, "stall", 315),
    place("firstaid", "Førstehjælp", "firstaid", (420, 735), (6, 5, 3), PINK, "stall", 20),
    # --- bars ---
    place("fiskerbaren", "Fiskerbaren", "bar", (684, 742), (14, 22, 9), "#8DB8EA", "barn", 15),
    place("kiosk_sol", "Kiosk", "bar", (830, 700), (5, 5, 3), YELLOW, "stall"),
    place("redbull_scenebar", "Red Bull Scenebar", "bar", (822, 745), (5, 8, 3), BLUE, "container"),
    place("tuborg_scenebar", "Tuborg Scenebar", "bar", (872, 862), (7, 14, 5), GREEN, "container", 20),
    place("havana", "Havana Bar", "bar", (556, 686), (6, 5, 3), YELLOW, "stall", 10),
    place("montergade", "Møntergade & Apéro", "bar", (372, 815), (9, 14, 6), "#3FA98C", "barn"),
    place("centralbar", "Tuborg Centralbar", "bar", (544, 880), (5, 5, 3), GREEN, "stall"),
    place("vin_ol", "Vin & Øl", "bar", (500, 992), (9, 9, 5), WHITE, "roundtent"),
    place("malfy", "Malfy", "bar", (535, 1032), (5, 5, 3), BLUE, "stall"),
    place("warpigs", "Warpigs", "bar", (500, 1052), (5, 5, 3), BLACK, "stall"),
    place("olbaren", "Ølbaren", "bar", (692, 955), (5, 5, 3), BLUE, "stall"),
    place("coffee_cocktails", "Coffee Cocktails", "bar", (662, 970), (5, 5, 3), YELLOW, "stall"),
    place("cozo", "COZO Bar", "bar", (1006, 930), (5, 7, 3), BLUE, "stall"),
    place("koskenkorva", "Koskenkorva", "bar", (1006, 972), (5, 7, 3), BLACK, "stall"),
    place("mini", "MINI Terrassen", "bar", (962, 1076), (20, 14, 5), WHITE, "terrace"),
    place("firbenet", "Firbenet", "bar", (782, 1198), (20, 10, 6), WOOD, "barn", 75),
    place("omraade1664", "1664 Område", "bar", (620, 1226), (10, 14, 7), BLUE, "barn", 15),
    place("samsoe", "Samsøe Samsøe Bar", "bar", (410, 1035), (6, 12, 5), WHITE, "roundtent"),
    place("mikkeller", "Mikkeller Bar", "bar", (187, 1002), (5, 5, 3), PINK, "stall"),
    place("skovbar", "Tuborg Skovbar", "bar", (470, 1298), (7, 5, 3), GREEN, "container", 10),
    place("containerbar", "Red Bull Containerbar", "bar", (527, 1270), (4, 8, 4), BLUE, "container"),
    # --- food ---
    place("kiosk_nord", "Kiosk", "food", (462, 708), (6, 5, 3), YELLOW, "stall", 20),
    place("fish_crisp", "Fish & Crisp", "food", (490, 700), (6, 5, 3), YELLOW, "stall", 15),
    place("taast", "TÅAST", "food", (522, 692), (6, 5, 3), PINK, "stall", 12),
    place("hummerhytten", "Hummerhytten", "food", (590, 680), (6, 5, 3), ORANGE, "stall", 8),
    place("polsen", "MiL-Pølsen", "food", (624, 674), (6, 5, 3), RED, "stall", 8),
    place("aloha", "Aloha Bowls", "food", (546, 905), (5, 5, 3), YELLOW, "stall"),
    place("fiesta", "Fiesta Mexicana", "food", (546, 928), (5, 5, 3), BLUE, "stall"),
    place("spicy", "Spicy India", "food", (550, 1068), (5, 5, 3), YELLOW, "stall"),
    place("chetipo", "CHE TIPO", "food", (560, 1092), (5, 5, 3), WHITE, "stall"),
    place("sticks", "Sticks 'n' Sushi", "food", (568, 1114), (5, 5, 3), YELLOW, "stall"),
    place("gasoline", "Gasoline Grill", "food", (770, 932), (9, 5, 3), GREEN, "stall", 340),
    place("smaeskesteg", "Smæskesteg", "food", (724, 944), (8, 5, 3), PINK, "stall", 340),
    place("crepes", "Copenhagen Crepes", "food", (668, 1000), (5, 5, 3), YELLOW, "stall"),
    place("paradis", "Paradis Is", "food", (678, 1032), (5, 5, 3), RED, "stall"),
    place("madhaven", "Madhaven", "food", (640, 1082), (13, 16, 7), WHITE, "barn", 20),
    place("kcal", "KCAL", "food", (348, 1040), (5, 5, 3), YELLOW, "stall"),
    place("trinacria", "La Trinacria", "food", (348, 1066), (5, 5, 3), YELLOW, "stall"),
    place("crisp", "Crisp", "food", (350, 1092), (5, 5, 3), YELLOW, "stall"),
    place("kokken", "Kokken & Wokkens Chinabox", "food", (330, 966), (5, 5, 3), GREEN, "stall"),
    place("paradis_vest", "Paradis Is", "food", (300, 992), (5, 5, 3), RED, "stall"),
    # --- coffee, water, toilets ---
    place("coffee_lounge", "The Coffee Lounge", "coffee", (224, 1066), (9, 9, 4), YELLOW, "stall", 30),
    place("joe", "Joe & the Juice", "coffee", (546, 962), (5, 5, 3), PINK, "stall"),
    place("water_nord", "Vandpost", "water", (682, 808), (2, 2, 2), "#5FD0E0", "waterpost"),
    place("water_midt", "Vandpost", "water", (598, 968), (2, 2, 2), "#5FD0E0", "waterpost"),
    place("water_indgang", "Vandpost", "water", (978, 1190), (2, 2, 2), "#5FD0E0", "waterpost"),
    place("toilet_nord", "Toilet", "toilet", (735, 800), (10, 4, 3), "#2C6FB7", "toilets", 20),
    place("toilet_ost", "Toilet", "toilet", (1010, 872), (4, 12, 3), "#2C6FB7", "toilets"),
    place("toilet_vest", "Toilet", "toilet", (305, 1142), (8, 4, 3), "#2C6FB7", "toilets", 330),
    place("toilet_syd", "Toilet", "toilet", (1010, 1150), (4, 10, 3), "#2C6FB7", "toilets"),
    # --- landmarks and places to hang out ---
    place("fyrtaarnet", "1664 Fyrtårnet", "landmark", (882, 1000), (6, 6, 16), BLUE, "lighthouse"),
    place("dansevand", "Dansevand", "dance", (478, 938), (10, 10, 0.3), INDIGO, "dancefloor"),
    place("magasin", "Magasin", "info", (750, 1032), (10, 12, 6), WHITE, "barn", 335),
    place("wellness", "Wellness", "rest", (284, 1056), (7, 7, 4), WHITE, "roundtent"),
    place("popup", "Pop Up", "info", (617, 868), (4, 4, 3), RED, "stall"),
    place("cirkusteltet", "Det store telt", "rest", (617, 918), (13, 13, 9), WHITE, "roundtent"),
    place("merch", "Merchandise", "info", (760, 1142), (5, 4, 3), PINK, "stall", 330),
]

# The fence around the site, as map pixels, going clockwise from the north-west corner.
FENCE_PIXELS = [
    (330, 760), (450, 688), (640, 648), (880, 636), (1040, 606), (1058, 700), (1052, 1200),
    (1000, 1238), (900, 1262), (700, 1338), (540, 1348), (390, 1398), (235, 1428), (165, 1332),
    (122, 1240), (116, 1100), (120, 900), (200, 822),
]
FENCE = [metres(px, py) for px, py in FENCE_PIXELS]

# Paths of wood chips, as lists of map pixels. The 3D world paints them on the ground.
PATH_PIXELS = [
    [(640, 668), (520, 745), (462, 860), (450, 1000), (470, 1105), (560, 1172), (700, 1152), (792, 1100), (862, 1150)],
    [(560, 762), (640, 802), (742, 862), (802, 902), (822, 962), (802, 1052), (792, 1100)],
    [(842, 772), (882, 762), (1000, 795), (1012, 902), (1000, 1100), (902, 1150), (862, 1150)],
    [(450, 1000), (380, 1042), (300, 1112), (252, 1182), (330, 1250), (400, 1272)],
    [(232, 962), (300, 942), (400, 932), (452, 952)],
    [(470, 1105), (432, 1202), (420, 1272), (520, 1300)],
    [(862, 1150), (930, 1215), (1000, 1238)],
]
PATHS = [[metres(px, py) for px, py in path] for path in PATH_PIXELS]

# Groups of trees inside the site: (map pixel x, map pixel y, radius in metres, number of trees).
TREE_PIXELS = [
    (600, 878, 5, 4), (505, 915, 6, 5), (735, 985, 9, 8), (640, 1160, 9, 7), (560, 1205, 10, 8),
    (480, 1225, 9, 7), (330, 1215, 10, 9), (250, 1235, 9, 8), (930, 1135, 9, 7), (1022, 1010, 5, 5),
    (430, 1010, 5, 4), (700, 1260, 9, 8), (860, 1215, 7, 6), (160, 1120, 8, 8), (160, 880, 7, 6),
    (300, 880, 6, 5), (780, 1010, 5, 4), (410, 1140, 6, 5), (950, 800, 3, 2), (720, 880, 4, 3),
]
TREES = [metres(px, py) + (radius, count) for px, py, radius, count in TREE_PIXELS]


def inside_site(x, z):
    """True when the point (in metres) is inside the fence.

    Counts how many fence lines a ray going east from the point crosses: an odd number means inside.
    """
    inside = False
    for index in range(len(FENCE)):
        x1, z1 = FENCE[index]
        x2, z2 = FENCE[index - 1]
        crosses = (z1 > z) != (z2 > z)
        if crosses and x < x1 + (z - z1) * (x2 - x1) / (z2 - z1):
            inside = not inside
    return inside
