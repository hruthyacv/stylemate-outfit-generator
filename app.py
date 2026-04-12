# =============================================================
#  StyleMate — app.py
#  Flask backend: handles image upload, wardrobe storage,
#  and intelligent outfit generation with styling tips.
# =============================================================

import os
import json
import random
from flask import (
    Flask, request, jsonify,
    render_template, send_from_directory
)
from werkzeug.utils import secure_filename

# ── App configuration ─────────────────────────────────────────
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024   # 8 MB max upload
app.config["UPLOAD_FOLDER"]      = os.path.join("static", "uploads")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

# ── In-memory wardrobe (list of item dicts) ───────────────────
# Each item: { id, filename, url, type, style, color, weight }
wardrobe = []
_id_counter = 0


# ─────────────────────────────────────────────────────────────
#  COLOR COMPATIBILITY ENGINE
# ─────────────────────────────────────────────────────────────

COLOR_GROUPS = {
    "neutrals": [
        "white", "cream", "ivory", "beige", "khaki", "sand",
        "grey", "gray", "charcoal", "black", "navy", "off-white",
    ],
    "earthy": [
        "brown", "camel", "tan", "rust", "terracotta", "olive",
        "mustard", "taupe", "burgundy", "wine", "chocolate",
    ],
    "cool": [
        "blue", "light blue", "sky blue", "teal", "cyan", "mint",
        "sage", "green", "forest green", "emerald", "cobalt",
    ],
    "warm": [
        "red", "pink", "coral", "salmon", "rose", "blush",
        "peach", "hot pink", "magenta", "fuchsia",
    ],
    "bright": [
        "neon green", "neon pink", "neon yellow", "lime",
        "bright yellow", "electric blue", "orange",
    ],
    "purples": [
        "purple", "violet", "lavender", "lilac", "mauve", "plum",
    ],
}

CLASH_PAIRS = [
    ("bright", "warm"),
    ("bright", "cool"),
    ("bright", "purples"),
]


def get_color_group(color_str):
    """Return the color group for a given color string."""
    if not color_str:
        return "neutrals"
    lower = color_str.lower()
    for group, keywords in COLOR_GROUPS.items():
        if any(k in lower for k in keywords):
            return group
    return "neutrals"


def colors_clash(color_a, color_b):
    """Return True if two colors are likely to clash visually."""
    ga, gb = get_color_group(color_a), get_color_group(color_b)
    if ga == "neutrals" or gb == "neutrals":
        return False
    if ga == gb:
        return False
    return any(
        (ga == x and gb == y) or (ga == y and gb == x)
        for x, y in CLASH_PAIRS
    )


def score_harmony(items):
    """Score a candidate outfit for color harmony (higher = better)."""
    score = 0
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if colors_clash(items[i].get("color"), items[j].get("color")):
                score -= 2
            else:
                score += 1
    return score


# ─────────────────────────────────────────────────────────────
#  STYLE ADJACENCY & WEATHER LOGIC
# ─────────────────────────────────────────────────────────────

STYLE_ADJACENCY = {
    "casual":   ["casual", "sporty", "boho"],
    "formal":   ["formal", "business"],
    "party":    ["party", "formal"],
    "sporty":   ["sporty", "casual"],
    "business": ["business", "formal", "casual"],
}

WEIGHT_FOR_WEATHER = {
    "hot":  ["light"],
    "warm": ["light", "medium"],
    "cool": ["medium", "heavy"],
    "cold": ["heavy"],
}


def filter_by_weather(items, weather):
    if not weather:
        return items
    ok = WEIGHT_FOR_WEATHER.get(weather, ["light", "medium", "heavy"])
    filtered = [i for i in items if i.get("weight", "medium") in ok]
    return filtered if filtered else items


def filter_by_style(items, style):
    if not style:
        return items
    adjacent = STYLE_ADJACENCY.get(style, [style])
    strict   = [i for i in items if i.get("style") == style]
    relaxed  = [i for i in items if i.get("style") in adjacent]
    if strict:   return strict
    if relaxed:  return relaxed
    return items


# ─────────────────────────────────────────────────────────────
#  STYLING TIPS
# ─────────────────────────────────────────────────────────────

TIPS = {
    "casual-hot":    [
        "Breathable linen and loose cotton are your warm-weather wardrobe essentials.",
        "A white tee and light-wash denim is the timeless formula for effortless summer style.",
        "Keep accessories minimal — one delicate gold piece elevates even the simplest casual look.",
    ],
    "casual-warm":   [
        "Layer a fine-knit cardigan over your casual outfit — instant polish with zero effort.",
        "Earth tones and soft neutrals feel effortlessly put-together for everyday looks.",
        "Clean white sneakers complete almost any casual pairing.",
    ],
    "casual-cool":   [
        "A relaxed blazer over a casual base adds structure without formality.",
        "Mix textures — a chunky knit against smooth denim adds tactile interest.",
        "Ankle boots are the ultimate transitional shoe — elevating any casual bottom.",
    ],
    "casual-cold":   [
        "Layering is the art of cold-weather dressing. Build from thin base layers outward.",
        "A chunky knit scarf does double duty as a wrap — functional and stylish.",
        "Monochromatic layering in deep tones looks rich and avoids a bundled effect.",
    ],
    "formal-hot":    [
        "Tropical-weight wool or structured ponte keeps formal silhouettes crisp in the heat.",
        "A sleeveless blazer or shell blouse keeps the aesthetic formal while staying cool.",
        "Tan leather loafers or strappy heels lighten a formal summer look beautifully.",
    ],
    "formal-cold":   [
        "A well-cut overcoat is the single most powerful formal winter garment.",
        "Velvet and brocade are cold-season textures that read as inherently luxurious.",
        "Deep tones — burgundy, navy, forest green — are the formal cold-weather palette.",
    ],
    "formal-warm":   [
        "Monochromatic formal dressing — one tone head to toe — is the ultimate quiet luxury.",
        "Fit is everything in formal wear. One well-tailored piece outperforms ten mediocre ones.",
        "Invest in one beautiful pair of shoes — they anchor the entire formal silhouette.",
    ],
    "party-hot":     [
        "Shimmer fabrics catch light beautifully — perfect for warm-weather evening events.",
        "Bold statement earrings with a minimal outfit always lands better than a busy look.",
        "The right heel transforms any outfit from dressed-up to dressed.",
    ],
    "party-cold":    [
        "Velvet is your party weapon in cold weather — rich, glamorous, always right.",
        "Metallics — silver, gold, champagne — read as festive and work across all party codes.",
        "A faux-fur stole over a sleek look is theatrical warmth done beautifully.",
    ],
    "sporty-hot":    [
        "Moisture-wicking fabrics in a restrained palette keep sporty looks intentional.",
        "Matching two-piece activewear sets always look more put-together than mismatched pieces.",
        "A clean white sneaker elevates any sporty outfit instantly.",
    ],
    "sporty-cold":   [
        "A zip-up or technical half-zip over a base layer is sporty, functional, and current.",
        "Puffer with tapered joggers is the quintessential cold-weather sporty hybrid.",
        "Stick to two or three tones maximum for clean, cohesive sporty layering.",
    ],
    "fallback": [
        "Great style begins with confidence — wear what makes you feel most like yourself.",
        "When uncertain, edit ruthlessly. Remove the last piece you added.",
        "Fit matters more than price. A well-fitted affordable outfit outperforms everything.",
        "Build outfits around one hero piece, then let everything else quietly support it.",
        "The best accessory is always restraint — know when to stop.",
    ],
}


def pick_tip(outfit_items, weather):
    """Pick the most relevant styling tip for the generated outfit."""
    counts = {}
    for item in outfit_items:
        s = item.get("style", "")
        counts[s] = counts.get(s, 0) + 1
    dominant = max(counts, key=counts.get) if counts else ""
    key      = f"{dominant}-{weather}"
    pool     = TIPS.get(key) or TIPS.get(f"{dominant}-warm") or TIPS["fallback"]
    return random.choice(pool)


# ─────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────

def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def make_upload_dir():
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


# ─────────────────────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Serve the main HTML page."""
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    """
    POST /upload
    Accepts: multipart/form-data with fields:
        file     — image file
        type     — top | bottom | shoes | accessory
        style    — casual | formal | party | sporty | business
        color    — (optional) text description
        weight   — light | medium | heavy
        name     — (optional) label
    Returns: JSON item object on success, error on failure.
    """
    global _id_counter

    make_upload_dir()

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    # Save file with a secure, unique name
    ext      = file.filename.rsplit(".", 1)[1].lower()
    _id_counter += 1
    item_id  = _id_counter
    filename = secure_filename(f"item_{item_id}.{ext}")
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(save_path)

    # Build item record
    item = {
        "id":       item_id,
        "filename": filename,
        "url":      f"/static/uploads/{filename}",
        "type":     request.form.get("type",   "top"),
        "style":    request.form.get("style",  "casual"),
        "color":    request.form.get("color",  "").strip().lower() or None,
        "weight":   request.form.get("weight", "medium"),
        "name":     request.form.get("name",   "").strip() or request.form.get("type", "Item").capitalize(),
    }

    wardrobe.append(item)
    return jsonify(item), 200


@app.route("/wardrobe", methods=["GET"])
def get_wardrobe():
    """GET /wardrobe — return all wardrobe items."""
    return jsonify(wardrobe), 200


@app.route("/wardrobe/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    """DELETE /wardrobe/<id> — remove an item from the wardrobe."""
    global wardrobe
    item = next((i for i in wardrobe if i["id"] == item_id), None)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    # Remove physical file
    try:
        path = os.path.join(app.config["UPLOAD_FOLDER"], item["filename"])
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        pass  # Non-fatal — just remove from list

    wardrobe = [i for i in wardrobe if i["id"] != item_id]
    return jsonify({"deleted": item_id}), 200


@app.route("/generate", methods=["GET"])
def generate():
    """
    GET /generate?style=<style>&weather=<weather>
    Generates the best outfit from the current wardrobe using
    weather + style filtering and colour-harmony scoring.
    Returns: JSON { outfit: [...items], tip: "..." }
    """
    style   = request.args.get("style",   "").strip()
    weather = request.args.get("weather", "").strip()

    # Separate wardrobe by category
    tops      = [i for i in wardrobe if i["type"] == "top"]
    bottoms   = [i for i in wardrobe if i["type"] == "bottom"]
    shoes_all = [i for i in wardrobe if i["type"] == "shoes"]
    access    = [i for i in wardrobe if i["type"] == "accessory"]

    # Require at least top + bottom + shoes
    if not tops or not bottoms or not shoes_all:
        return jsonify({
            "error": "Please upload at least one top, one bottom, and one pair of shoes."
        }), 400

    # Apply weather filter
    tops      = filter_by_weather(tops,      weather)
    bottoms   = filter_by_weather(bottoms,   weather)
    shoes_all = filter_by_weather(shoes_all, weather)
    access    = filter_by_weather(access,    weather)

    # Apply style filter
    tops      = filter_by_style(tops,      style)
    bottoms   = filter_by_style(bottoms,   style)
    shoes_all = filter_by_style(shoes_all, style)
    access    = filter_by_style(access,    style)

    # Generate 14 random candidates and pick the best colour-harmony score
    NUM_CANDIDATES = 14
    best_outfit = None
    best_score  = float("-inf")

    for _ in range(NUM_CANDIDATES):
        candidate = [
            random.choice(tops),
            random.choice(bottoms),
            random.choice(shoes_all),
        ]
        # Include accessory with 65% probability
        if access and random.random() < 0.65:
            candidate.append(random.choice(access))

        score = score_harmony(candidate)
        if score > best_score:
            best_score  = score
            best_outfit = candidate

    tip = pick_tip(best_outfit, weather)

    return jsonify({"outfit": best_outfit, "tip": tip}), 200


@app.route("/static/uploads/<filename>")
def uploaded_file(filename):
    """Serve uploaded files."""
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    make_upload_dir()
    app.run(debug=True, port=5000)
