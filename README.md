# StyleMate

An AI-powered wardrobe manager and outfit generator. Upload your clothing, and StyleMate will build coordinated outfits using color theory and Google Gemini.

## Overview

StyleMate helps you get more out of the clothes you already own. You photograph your wardrobe items, categorize them, and the app generates complete outfits by evaluating color compatibility, clothing style, and current weather. Google Gemini provides a personalized styling tip for each generated look.

The project ships as a **Flask web application** with a full browser UI and a **Flutter mobile app** (Android) that communicates with the same backend API. The backend is deployed on Render with a managed PostgreSQL database and Cloudinary for persistent image storage.

## Features

### Authentication
- Email/password registration and login
- Server-side session management (Flask sessions with cookie persistence on mobile)
- Protected API routes — all wardrobe and outfit operations require authentication

### Wardrobe Management
- Upload clothing images with metadata: category, style, color, and an optional name/label
- Supported categories: **Top**, **Bottom**, **One-Piece** (dress/jumpsuit), **Shoes**, **Accessory**
- Supported styles: Casual, Formal, Party, Minimalist, Streetwear, Traditional, Sporty, Winter, Summer
- Edit any wardrobe item (update metadata or replace the image)
- Delete items from the wardrobe
- Filter wardrobe view by category
- Drag-and-drop image upload on the web UI

### AI Outfit Generation
- Generates outfits from your uploaded wardrobe using a built-in **color scoring algorithm** that evaluates how well pieces pair together (neutrals, pastels, complementary combinations)
- Supports both **two-piece outfits** (top + bottom + shoes) and **one-piece outfits** (dress/jumpsuit + shoes)
- Weather-aware filtering: excludes winter pieces in hot weather and summer pieces in cold weather
- Style-preference filtering: prioritizes items matching the selected occasion
- Accessories are included when available
- **Gemini AI** generates a one-sentence styling tip tailored to the specific outfit, style, and weather

### Saved Looks
- Save any generated outfit for future reference
- Browse all previously saved looks with their style, weather context, and creation date
- Saved looks persist across sessions and devices (tied to user account)

### Web Application
- Three-column layout: Upload panel, Wardrobe grid, Outfit generator + Saved looks
- Dark luxury aesthetic with glassmorphism cards, silver gradient accents, animated particle background
- Custom hanger and upload icons
- Responsive design with breakpoints at 1200px and 900px

### Mobile Application (Flutter/Android)
- Three-tab navigation: Generate, Wardrobe, Saved
- Same dark theme carried over from the web UI (Great Vibes, Cinzel, Inter fonts via Google Fonts)
- Image picker for uploading photos from device gallery
- Glassmorphism card components and silver gradient buttons matching the web design

## How It Works

```
Register / Login
       │
       ▼
Upload wardrobe items
(image + category + style + color)
       │
       ▼
Images stored on Cloudinary
Metadata stored in PostgreSQL
       │
       ▼
Select occasion and weather
       │
       ▼
Backend filters wardrobe by style and weather,
scores color combinations, selects best-matching pieces
       │
       ▼
Gemini generates a styling tip for the outfit
       │
       ▼
View the generated outfit
       │
       ▼
Save the look (optional)
```

## System Architecture

```mermaid
flowchart LR
    A["Flutter Mobile App<br/>(Android)"] -- "REST API<br/>(HTTP + JSON)" --> B["Flask Backend<br/>(Gunicorn)"]
    C["Web Browser"] -- "HTML / JS" --> B
    B -- "psycopg2" --> D[("PostgreSQL<br/>(Render Managed)")]
    B -- "Image Upload" --> E["Cloudinary"]
    B -- "Styling Tips" --> F["Google Gemini API"]
    B -- "Deployed on" --> G["Render"]
```

### Backend (Flask)
- `app.py` — Single-file Flask application containing all routes, database logic, color scoring, and Gemini integration
- `psycopg2` for PostgreSQL connections with `RealDictCursor` for dictionary-style row access
- `cloudinary.uploader.upload()` streams images directly to Cloudinary and stores the returned `secure_url`
- `google-generativeai` SDK calls Gemini Pro for outfit-specific styling tips
- `werkzeug` password hashing for authentication
- Served with Gunicorn in production

### Mobile (Flutter)
- `lib/api/api_service.dart` — HTTP client that manages session cookies via `shared_preferences` and communicates with the Flask API
- `lib/models/models.dart` — `WardrobeItem` and `SavedOutfit` data models
- `lib/screens/` — Login, Register, Home (outfit generation), Wardrobe (upload/edit/delete/filter), Saved Looks
- `lib/widgets/widgets.dart` — Reusable `LuxuryGlassCard`, `LuxuryButton`, and `LuxuryTextField` components

### Database Schema

| Table | Purpose |
|---|---|
| `users` | User accounts (id, name, email, password_hash, created_at) |
| `wardrobe_items` | Clothing items (id, user_id, image_path, category, style, color, name, created_at) |
| `saved_outfits` | Saved outfit combinations (id, user_id, top_id, bottom_id, shoes_id, accessory_id, style, weather, description, created_at) |

## Project Structure

```
STYLE MATE/
├── app.py                  # Flask backend (routes, DB, AI, auth)
├── requirements.txt        # Python dependencies
├── render.yaml             # Render deployment blueprint
├── migrate_to_postgres.py  # SQLite → PostgreSQL migration utility
├── .gitignore
├── static/
│   ├── style.css           # Web UI styles
│   ├── script.js           # Web UI logic (auth, upload, wardrobe, outfit generation)
│   ├── upload-icon.png     # Custom upload icon
│   └── hanger-icon.png     # Custom hanger icon
├── templates/
│   └── index.html          # Web application (single-page)
└── mobile/
    ├── pubspec.yaml         # Flutter dependencies
    ├── assets/icons/        # Mobile icon assets
    └── lib/
        ├── main.dart        # App entry point and theme
        ├── api/
        │   └── api_service.dart    # HTTP client + session management
        ├── models/
        │   └── models.dart         # WardrobeItem, SavedOutfit
        ├── screens/
        │   ├── login_screen.dart
        │   ├── register_screen.dart
        │   ├── main_navigation.dart
        │   ├── home_screen.dart         # Outfit generator
        │   ├── wardrobe_screen.dart      # Upload, edit, delete, filter
        │   └── saved_looks_screen.dart
        └── widgets/
            └── widgets.dart             # LuxuryGlassCard, LuxuryButton, LuxuryTextField
```

## Setup

### Prerequisites
- Python 3.12+
- Flutter SDK
- A [Cloudinary](https://cloudinary.com/) account (free tier)
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier)
- PostgreSQL (for production; the repo includes a local `stylemate.db` for legacy/development reference)

### Backend

```bash
# Clone the repository
git clone https://github.com/hruthyacv/stylemate.git
cd stylemate

# Install Python dependencies
pip install -r requirements.txt

# Create a .env file with your credentials (never commit this file)
# DATABASE_URL=postgresql://user:password@host:port/dbname
# GEMINI_API_KEY=your_gemini_api_key
# CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
# FLASK_SECRET_KEY=any_random_string

# Run the development server
python app.py
```

### Mobile (Flutter)

```bash
cd mobile

# Install dependencies
flutter pub get

# Run in debug mode (with a connected device or emulator)
flutter run

# Build release APK
flutter build apk --release
```

The release APK will be at `mobile/build/app/outputs/flutter-apk/app-release.apk`.

To point the mobile app at a different backend, edit the `baseUrl` in `mobile/lib/api/api_service.dart`.

### Data Migration (SQLite → PostgreSQL)

If you have existing data in a local `stylemate.db`, set `DATABASE_URL` in your environment and run:

```bash
python migrate_to_postgres.py
```

This migrates users, wardrobe items, and saved outfits to the target PostgreSQL database using `ON CONFLICT DO NOTHING` to avoid duplicates.

## Deployment

The project includes a `render.yaml` blueprint for one-click deployment on [Render](https://render.com/).

**What it provisions:**
- A free managed PostgreSQL database (`stylemate-db`)
- A free Python web service (`stylemate-api`) running Gunicorn on Python 3.12

**Required environment variables** (set in the Render dashboard, not in source code):

| Variable | Source |
|---|---|
| `DATABASE_URL` | Auto-injected by Render from the managed database |
| `FLASK_SECRET_KEY` | Auto-generated by Render |
| `GEMINI_API_KEY` | Your Google AI Studio key |
| `CLOUDINARY_URL` | Your Cloudinary API Environment Variable |

**Deploy steps:**
1. Push the repository to GitHub
2. In the Render dashboard, create a new **Blueprint** and connect the repository
3. Render reads `render.yaml` and creates both the database and web service
4. Add `GEMINI_API_KEY` and `CLOUDINARY_URL` in the web service's Environment tab

## Environment Variables

All secrets are loaded from environment variables at runtime. The `.env` file is gitignored and must never be committed.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key for styling tips |
| `CLOUDINARY_URL` | Cloudinary credentials in URL format |
| `FLASK_SECRET_KEY` | Secret key for Flask session signing |
| `PYTHON_VERSION` | Set to `3.12.4` in `render.yaml` for Render compatibility |

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask, Gunicorn |
| Database | PostgreSQL (psycopg2) |
| Image Storage | Cloudinary |
| AI | Google Gemini Pro (google-generativeai) |
| Web Frontend | HTML, CSS, vanilla JavaScript |
| Mobile | Flutter, Dart |
| Hosting | Render |

