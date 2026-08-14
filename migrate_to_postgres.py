import sqlite3
import psycopg2
import os
from psycopg2.extras import RealDictCursor

# Load environment variables if .env exists
if os.path.exists('.env'):
    with open('.env', 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ[k] = v

DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable is not set. Cannot connect to PostgreSQL.")
    print("Please set your Render Postgres internal/external URL in .env to migrate.")
    exit(1)

def migrate():
    print("Connecting to local SQLite database...")
    if not os.path.exists('stylemate.db'):
        print("No stylemate.db found. Nothing to migrate.")
        return
        
    sl_conn = sqlite3.connect('stylemate.db')
    sl_conn.row_factory = sqlite3.Row
    sl_cur = sl_conn.cursor()

    print(f"Connecting to PostgreSQL database at {DATABASE_URL}...")
    pg_conn = psycopg2.connect(DATABASE_URL)
    pg_cur = pg_conn.cursor()

    # 1. Create tables in Postgres
    pg_cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            password_hash TEXT,
            created_at TEXT
        )
    ''')
    
    pg_cur.execute('''
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
    
    pg_cur.execute('''
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
    pg_conn.commit()
    print("PostgreSQL tables ensured.")

    # 2. Migrate users
    users = sl_cur.execute('SELECT * FROM users').fetchall()
    for u in users:
        try:
            pg_cur.execute(
                "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (u['id'], u['name'], u['email'], u['password_hash'] if 'password_hash' in u.keys() else None, u['created_at'])
            )
        except Exception as e:
            print(f"Error migrating user {u['email']}: {e}")
            pg_conn.rollback()
    pg_conn.commit()
    print(f"Migrated {len(users)} users.")

    # 3. Migrate wardrobe_items
    items = sl_cur.execute('SELECT * FROM wardrobe_items').fetchall()
    for i in items:
        try:
            pg_cur.execute(
                "INSERT INTO wardrobe_items (id, user_id, image_path, category, style, color, name, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (i['id'], i['user_id'], i['image_path'], i['category'], i['style'], i['color'], i['name'] if 'name' in i.keys() else None, i['created_at'])
            )
        except Exception as e:
            print(f"Error migrating item {i['id']}: {e}")
            pg_conn.rollback()
    pg_conn.commit()
    print(f"Migrated {len(items)} wardrobe items.")

    # 4. Migrate saved_outfits
    outfits = sl_cur.execute('SELECT * FROM saved_outfits').fetchall()
    for o in outfits:
        try:
            pg_cur.execute(
                "INSERT INTO saved_outfits (id, user_id, top_id, bottom_id, shoes_id, accessory_id, style, weather, description, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (o['id'], o['user_id'], o['top_id'], o['bottom_id'], o['shoes_id'], o['accessory_id'], o['style'], o['weather'], o['description'], o['created_at'])
            )
        except Exception as e:
            print(f"Error migrating outfit {o['id']}: {e}")
            pg_conn.rollback()
    pg_conn.commit()
    print(f"Migrated {len(outfits)} saved outfits.")

    sl_conn.close()
    pg_cur.close()
    pg_conn.close()
    print("Migration complete!")

if __name__ == '__main__':
    migrate()
