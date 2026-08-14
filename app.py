import os
import json
import uuid
import random
import functools
from datetime import datetime
from flask import Flask, request, jsonify, render_template, url_for, session
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import google.generativeai as genai
import psycopg2
from psycopg2.extras import RealDictCursor
import cloudinary
import cloudinary.uploader

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

if os.path.exists('.env'):
    with open('.env', 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ[k] = v

app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super-secret-fallback-key")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Configure Cloudinary
cloudinary.config(
    secure=True
    # Uses CLOUDINARY_URL from environment automatically
)

DATABASE_URL = os.environ.get("DATABASE_URL")

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    if not DATABASE_URL:
        raise Exception("DATABASE_URL environment variable is not set. A PostgreSQL database is required.")
    conn = psycopg2.connect(DATABASE_URL)
    return conn

def init_db():
    if not DATABASE_URL:
        print("Warning: DATABASE_URL not set. Database not initialized.")
        return
        
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            password_hash TEXT,
            created_at TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS wardrobe_items (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            image_path TEXT,
            category TEXT,
            style TEXT,
            color TEXT,
            name TEXT,
            created_at TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS saved_outfits (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            top_id TEXT,
            bottom_id TEXT,
            shoes_id TEXT,
            accessory_id TEXT,
            style TEXT,
            weather TEXT,
            description TEXT,
            created_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

# AUTHENTICATION ROUTES
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    if not all([name, email, password]):
        return jsonify({'error': 'All fields are required.'}), 400
        
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=RealDictCursor)
    c.execute('SELECT id FROM users WHERE email = %s', (email,))
    existing = c.fetchone()
    if existing:
        conn.close()
        return jsonify({'error': 'Email is already registered.'}), 400
        
    user_id = str(uuid.uuid4())
    pass_hash = generate_password_hash(password)
    
    c.execute('''
        INSERT INTO users (id, name, email, password_hash, created_at)
        VALUES (%s, %s, %s, %s, %s)
    ''', (user_id, name, email, pass_hash, datetime.now().isoformat()))
    conn.commit()
    conn.close()
    
    session['user_id'] = user_id
    session['user_name'] = name
    
    return jsonify({'success': True, 'user': {'name': name, 'email': email}})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=RealDictCursor)
    c.execute('SELECT * FROM users WHERE email = %s', (email,))
    user = c.fetchone()
    conn.close()
    
    if user and user['password_hash'] and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        return jsonify({'success': True, 'user': {'name': user['name'], 'email': user['email']}})
        
    return jsonify({'error': 'Invalid email or password.'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/me', methods=['GET'])
def get_me():
    if 'user_id' in session:
        return jsonify({'logged_in': True, 'user': {'name': session.get('user_name')}})
    return jsonify({'logged_in': False}), 401


# PROTECTED WARDROBE ROUTES
@app.route('/api/wardrobe', methods=['GET'])
@login_required
def get_wardrobe():
    user_id = session['user_id']
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=RealDictCursor)
    c.execute('SELECT * FROM wardrobe_items WHERE user_id = %s ORDER BY created_at DESC', (user_id,))
    items = c.fetchall()
    conn.close()
    return jsonify({'wardrobe': items})

@app.route('/upload', methods=['POST'])
@login_required
def upload_item():
    user_id = session['user_id']
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        try:
            # Upload directly to Cloudinary
            upload_result = cloudinary.uploader.upload(file, folder="stylemate_wardrobe")
            image_path = upload_result.get("secure_url")
        except Exception as e:
            return jsonify({'error': f'Failed to upload to Cloudinary: {str(e)}'}), 500
        
        item_id = str(uuid.uuid4())
        category = request.form.get('category', 'top')
        style = request.form.get('style', 'casual')
        color = request.form.get('color', '').lower()
        name = request.form.get('name', '')
        created_at = datetime.now().isoformat()
        
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('''
            INSERT INTO wardrobe_items (id, user_id, image_path, category, style, color, name, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (item_id, user_id, image_path, category, style, color, name, created_at))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'item': {
            'id': item_id,
            'image_path': image_path,
            'category': category,
            'style': style,
            'color': color,
            'name': name
        }})
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/wardrobe/<item_id>', methods=['PUT'])
@login_required
def edit_item(item_id):
    user_id = session['user_id']
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=RealDictCursor)
    c.execute('SELECT * FROM wardrobe_items WHERE id = %s AND user_id = %s', (item_id, user_id))
    item = c.fetchone()
    if not item:
        conn.close()
        return jsonify({'error': 'Item not found'}), 404
        
    category = request.form.get('category', item['category'])
    style = request.form.get('style', item['style'])
    color = request.form.get('color', item['color']).lower()
    name = request.form.get('name', item['name'] if item['name'] else '')
    image_path = item['image_path']
    
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename != '' and allowed_file(file.filename):
            try:
                # Optionally: Delete old image from Cloudinary here by parsing public_id
                upload_result = cloudinary.uploader.upload(file, folder="stylemate_wardrobe")
                image_path = upload_result.get("secure_url")
            except Exception as e:
                pass # Fallback to original image path if upload fails
            
    c.execute('''
        UPDATE wardrobe_items 
        SET category = %s, style = %s, color = %s, name = %s, image_path = %s
        WHERE id = %s AND user_id = %s
    ''', (category, style, color, name, image_path, item_id, user_id))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'item': {
        'id': item_id,
        'image_path': image_path,
        'category': category,
        'style': style,
        'color': color,
        'name': name
    }})

@app.route('/api/wardrobe/<item_id>', methods=['DELETE'])
@login_required
def delete_item(item_id):
    user_id = session['user_id']
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=RealDictCursor)
    c.execute('SELECT * FROM wardrobe_items WHERE id = %s AND user_id = %s', (item_id, user_id))
    item = c.fetchone()
    if item:
        # We don't strictly delete from Cloudinary here to keep code simple, 
        # but the DB record is removed.
        c.execute('DELETE FROM wardrobe_items WHERE id = %s', (item_id,))
        c.execute('''
            DELETE FROM saved_outfits 
            WHERE top_id = %s OR bottom_id = %s OR shoes_id = %s OR accessory_id = %s
        ''', (item_id, item_id, item_id, item_id))
        conn.commit()
    conn.close()
    return jsonify({'success': True})

def color_score(c1, c2):
    if not c1 or not c2: return 1
    c1, c2 = c1.lower(), c2.lower()
    
    if c1 == 'black' and c2 in ['silver', 'white', 'beige', 'red', 'gold']: return 5
    if c2 == 'black' and c1 in ['silver', 'white', 'beige', 'red', 'gold']: return 5
    if c1 == 'white' or c2 == 'white': return 4
    if c1 == 'navy' and c2 in ['white', 'beige', 'silver']: return 4
    if c2 == 'navy' and c1 in ['white', 'beige', 'silver']: return 4
    if c1 == 'beige' and c2 in ['brown', 'white', 'black']: return 4
    if c2 == 'beige' and c1 in ['brown', 'white', 'black']: return 4
    if c1 == 'red' and c2 in ['black', 'white', 'silver']: return 4
    if c2 == 'red' and c1 in ['black', 'white', 'silver']: return 4
    
    pastels = ['pink', 'light blue', 'mint', 'pastel', 'lavender', 'peach']
    neutrals = ['white', 'beige', 'gray', 'silver', 'grey', 'cream']
    is_pastel1 = any(p in c1 for p in pastels)
    is_pastel2 = any(p in c2 for p in pastels)
    
    if is_pastel1 and c2 in neutrals: return 4
    if is_pastel2 and c1 in neutrals: return 4
    if c1 == c2 and c1 in ['black', 'white', 'navy']: return 3
    if c1 == c2: return 1
    
    return 2 

@app.route('/generate', methods=['GET'])
@login_required
def generate_outfit():
    user_id = session['user_id']
    style_pref = request.args.get('style', 'casual')
    weather = request.args.get('weather', 'sunny')
    
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=RealDictCursor)
    c.execute('SELECT * FROM wardrobe_items WHERE user_id = %s', (user_id,))
    wardrobe = c.fetchall()
    conn.close()
    
    filtered_wardrobe = []
    for item in wardrobe:
        st = item.get('style', '').lower()
        if weather == 'hot' and st == 'winter': continue
        if weather == 'cold' and st == 'summer': continue
        filtered_wardrobe.append(item)
    
    style_pool = [i for i in filtered_wardrobe if i['style'] == style_pref]
    if not style_pool: 
        style_pool = filtered_wardrobe

    one_pieces = [i for i in style_pool if i['category'] == 'one-piece']
    tops = [i for i in style_pool if i['category'] == 'top']
    bottoms = [i for i in style_pool if i['category'] == 'bottom']
    shoes = [i for i in style_pool if i['category'] == 'shoes']
    accessories = [i for i in style_pool if i['category'] == 'accessory']
    
    if not one_pieces: one_pieces = [i for i in filtered_wardrobe if i['category'] == 'one-piece']
    if not tops: tops = [i for i in filtered_wardrobe if i['category'] == 'top']
    if not bottoms: bottoms = [i for i in filtered_wardrobe if i['category'] == 'bottom']
    if not shoes: shoes = [i for i in filtered_wardrobe if i['category'] == 'shoes']
    if not accessories: accessories = [i for i in filtered_wardrobe if i['category'] == 'accessory']
    
    can_do_one_piece = len(one_pieces) > 0 and len(shoes) > 0
    can_do_two_piece = len(tops) > 0 and len(bottoms) > 0 and len(shoes) > 0
    
    if not can_do_one_piece and not can_do_two_piece:
        return jsonify({'error': 'Not enough wardrobe items to generate an outfit. Add more pieces!'}), 400

    use_one_piece = False
    if can_do_one_piece and can_do_two_piece:
        use_one_piece = random.choice([True, False])
    elif can_do_one_piece:
        use_one_piece = True
        
    outfit = {}
    if use_one_piece:
        best_score = -1
        best_combo = None
        for o in one_pieces:
            for s in shoes:
                score = color_score(o.get('color'), s.get('color'))
                if score > best_score:
                    best_score = score
                    best_combo = (o, s)
        outfit['top'] = best_combo[0] 
        outfit['bottom'] = None
        outfit['shoes'] = best_combo[1]
    else:
        best_score = -1
        best_combo = None
        for t in tops:
            for b in bottoms:
                score = color_score(t.get('color'), b.get('color'))
                if score > best_score:
                    best_score = score
                    best_combo = (t, b)
        outfit['top'] = best_combo[0]
        outfit['bottom'] = best_combo[1]
        outfit['shoes'] = random.choice(shoes)
        
    outfit['accessory'] = random.choice(accessories) if accessories else None

    if weather in ['cold', 'winter']:
        aesthetic = "LAYER WITH INTENTION."
        description = "Warmth meets effortless sophistication."
    elif style_pref == 'formal':
        aesthetic = "MAKE EVERY LOOK COUNT."
        description = "Refined pieces. Effortless combinations."
    elif style_pref == 'party':
        aesthetic = "OWN THE ROOM."
        description = "A statement look, built from your wardrobe."
    elif style_pref == 'casual':
        aesthetic = "YOUR STYLE. ELEVATED."
        description = "Curated intelligently. Worn effortlessly."
    else:
        aesthetic = "LESS, BUT BETTER."
        description = "Clean lines. Intentional style."

    tip = "Style tip: Balance your look by pairing these pieces confidently."
    
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel('gemini-pro')
            pieces_str = f"{outfit['top'].get('color','')} {outfit['top'].get('category','')}"
            if outfit['bottom']:
                pieces_str += f", {outfit['bottom'].get('color','')} bottom"
            pieces_str += f", and {outfit['shoes'].get('color','')} shoes"
            
            prompt = f"Create a short styling tip (1 sentence) for an outfit with {pieces_str}. Style is {style_pref}, weather is {weather}. Return JSON format with key: 'tip'."
            response = model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:-3]
            elif text.startswith('```'):
                text = text[3:-3]
            ai_data = json.loads(text)
            tip = ai_data.get('tip', tip)
        except Exception as e:
            print(f"Gemini error: {e}")

    return jsonify({
        'outfit': outfit,
        'ai_suggestion': {
            'description': description,
            'tip': tip,
            'aesthetic': aesthetic
        }
    })

@app.route('/api/outfits/save', methods=['POST'])
@login_required
def save_outfit():
    user_id = session['user_id']
    data = request.json
    outfit_id = str(uuid.uuid4())
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO saved_outfits (id, user_id, top_id, bottom_id, shoes_id, accessory_id, style, weather, description, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ''', (
        outfit_id, user_id, 
        data.get('top_id'), data.get('bottom_id'), data.get('shoes_id'), data.get('accessory_id'),
        data.get('style'), data.get('weather'), data.get('description'), datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/outfits', methods=['GET'])
@login_required
def get_outfits():
    user_id = session['user_id']
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=RealDictCursor)
    c.execute('SELECT * FROM saved_outfits WHERE user_id = %s ORDER BY created_at DESC', (user_id,))
    outfits = c.fetchall()
    
    result = []
    for o_dict in outfits:
        items = {}
        for role in ['top', 'bottom', 'shoes', 'accessory']:
            item_id = o_dict[f'{role}_id']
            if item_id:
                c.execute('SELECT * FROM wardrobe_items WHERE id = %s', (item_id,))
                item = c.fetchone()
                if item:
                    items[role] = item
        o_dict['items'] = items
        result.append(o_dict)
    
    conn.close()
    return jsonify({'outfits': result})

if __name__ == '__main__':
    app.run(debug=True)