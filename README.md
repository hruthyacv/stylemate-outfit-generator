# StyleMate

An AI-powered wardrobe manager and outfit generator. Upload your clothing, and StyleMate will build coordinated outfits using color theory and Google Gemini.

# try: https://stylemate-api-jmhx.onrender.com/

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
