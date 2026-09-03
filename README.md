# StyleAI — Myntra AI Wishlist Try-On & Style Confidence

MVP that reduces wishlist purchase uncertainty with **AI Style Preview** (not a generated virtual try-on). Shoppers upload a photo, Groq analyzes it with the product image and metadata, and the app returns structured style confidence guidance.

## Product flow

Wishlist → select product → AI Style Preview → upload photo → Groq analysis → recommendation → Add to Cart / Buy Now / Save Styling / Try another item

## Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, SQLite via built-in `node:sqlite` (Node 22+)
- **AI:** Groq vision model (`qwen/qwen3.6-27b` by default). API key stays on the server.

## Prerequisites

- Node.js 22+ (this project uses the built-in `node:sqlite` module)
- A Groq API key from [console.groq.com](https://console.groq.com)

## Local setup

### 1. Backend

```powershell
cd backend
copy .env.example .env
```

Edit `backend/.env` and set:

```
GROQ_API_KEY=your_real_key
GROQ_VISION_MODEL=qwen/qwen3.6-27b
PORT=5000
FRONTEND_URL=http://localhost:5173
```

```powershell
npm install
npm run dev
```

Backend: `http://localhost:5000`  
Health: `http://localhost:5000/health`

### 2. Frontend (new terminal)

```powershell
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Vite proxies `/api` to the backend.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/api/wishlist` | Wishlist products |
| POST | `/api/wishlist` | Add to wishlist `{ product_id }` |
| DELETE | `/api/wishlist/:productId` | Remove from wishlist |
| GET | `/api/cart` | Cart |
| POST | `/api/cart` | Add to cart `{ product_id, size?, quantity?, source? }` |
| DELETE | `/api/cart/:id` | Remove cart line |
| POST | `/api/analyze-style` | Multipart: `userPhoto` + `product_id` |
| POST | `/api/analyze-style/save` | Save analysis JSON |
| POST | `/api/analytics/event` | Client events |
| GET | `/api/analytics/summary` | Event counts, avg AI score, conversion after AI |

### Analyze style (PowerShell)

```powershell
curl.exe -X POST http://localhost:5000/api/analyze-style -F "product_id=PROD001" -F "userPhoto=@C:\path\to\photo.jpg"
```

User photos are held in memory, resized, sent to Groq, and discarded. They are not written to disk.

## Privacy & safety

- Photos are processed in memory and sent to Groq for analysis only.
- The UI labels this **AI Style Preview**, not a virtual try-on.
- The model is instructed not to infer race, health, age, attractiveness, or measurements, and not to body-shame.

## Metrics

North star: **30-day wishlist → purchase conversion**.

Experiment: conversion among users who use AI Style Preview vs those who do not.

Tracked events include `wishlist_view`, `try_on_started`, `ai_analysis_completed`, `add_to_cart_after_ai`, `buy_now_after_ai`, plus `ai_score`, `product_category`, `analysis_latency`, and `conversion_after_ai`.

## Deploy

Streamlit Community Cloud runs **Python Streamlit apps only**. It cannot host the Node/Express REST API that the React app calls. This repo therefore deploys in two complementary ways:

1. **Frontend → Vercel** (`frontend/`): React wishlist UI.
2. **Python backend → Streamlit Community Cloud** (`streamlit_app.py`): same catalog, intelligence strip, Groq AI Style Preview, and bag — using Streamlit secrets for `GROQ_API_KEY`.
3. **Express API** (needed if the Vercel React app should call `/api`): host `backend/` on a Node platform such as [Render](https://render.com) (`render.yaml`). Then set Vercel env `VITE_API_URL` to `https://your-api.onrender.com/api` and Render `FRONTEND_URL` to the Vercel origin.

### Vercel (frontend)

1. Open [vercel.com/new](https://vercel.com/new) and import `Somu639/Wishlist`.
2. Set **Root Directory** to `frontend`.
3. Framework: Vite. Build: `npm run build`. Output: `dist`.
4. After the Express API is live, add env `VITE_API_URL` = `https://<api-host>/api` and redeploy.

Or from a machine already logged in to Vercel:

```powershell
cd frontend
npx vercel login
npx vercel --prod --yes
```

### Streamlit Community Cloud (Python backend)

1. Open [share.streamlit.io](https://share.streamlit.io/) and sign in with GitHub.
2. Deploy `Somu639/Wishlist`, main file `streamlit_app.py`.
3. In **Secrets**, add:

```toml
GROQ_API_KEY = "your_groq_key"
GROQ_VISION_MODEL = "qwen/qwen3.6-27b"
```

Local:

```powershell
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Project layout

```
backend/src/            Express API, Groq service, SQLite
frontend/src/           Wishlist, Style Preview, Cart
streamlit_app.py        Streamlit Community Cloud backend UI
streamlit_backend/      Catalog, Groq, intelligence for Streamlit
```
