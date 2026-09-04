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
# Optional: photoreal try-on via fal.ai
FAL_KEY=your_fal_key
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
2. **Python backend → Streamlit Community Cloud** (`streamlit_backend/app.py`): same catalog, intelligence strip, Groq AI Style Preview, and bag — using Streamlit secrets for `GROQ_API_KEY`.
3. **Express API** (needed if the Vercel React app should call `/api`): host `backend/` on a Node platform such as [Render](https://render.com) (`render.yaml`). Then set Vercel env `VITE_API_URL` to `https://your-api.onrender.com/api` and Render `FRONTEND_URL` to the Vercel origin.

### Vercel (frontend + AI endpoint)

Import the GitHub repo with **Root Directory left as `.`** (repo root). A root `package.json` + `vercel.json` force a Vite build of `frontend/` so Vercel does not treat this as a Python app.

If you already created the project as Python, in Vercel go to **Settings → General → Framework Preset**, set it to **Vite**, then **Redeploy**.

The Vercel deployment is self-contained:

- Wishlist and bag run on browser `localStorage`, seeded from `frontend/src/data/catalog.js`, so the storefront is never empty without a backend.
- AI Style Preview posts the resized photo to the `api/style.js` serverless function, which calls Groq directly. Add `GROQ_API_KEY` (and optionally `GROQ_VISION_MODEL`) in **Settings → Environment Variables**. Without it the modal reports that AI Style is not configured.
- Photoreal try-on runs through `api/tryon.js` on [fal.ai](https://fal.ai) (FASHN v1.6). Add `FAL_KEY` in the same settings page to turn it on. Without the key the result image falls back to the browser-side style preview and no error is shown.

### Virtual try-on

Try-on is optional and independent of Groq — Groq only writes the text analysis and is never asked to generate images.

| Variable | Default | Purpose |
| --- | --- | --- |
| `FAL_KEY` | unset | fal.ai key. Try-on stays off until this is set. |
| `VTON_MODEL` | `fal-ai/fashn/tryon/v1.6` | Any fal try-on endpoint taking `model_image` + `garment_image`. |
| `VTON_MODE` | `balanced` | `performance`, `balanced`, or `quality`. |

FASHN v1.6 bills about $0.075 per generated image. The garment category is derived from the product record, so sarees, kurtis and dresses map to `one-pieces`, jeans to `bottoms`, and shirts or blazers to `tops`.

When try-on is unavailable the modal still shows a style preview generated from the shopper's own photo, labelled as a preview rather than a try-on.

To use the Express API instead, set `VITE_API_URL` = `https://<api-host>/api`; the frontend then prefers it and falls back to local data if it is unreachable.

Or from a machine already logged in to Vercel:

```powershell
cd frontend
npx vercel login
npx vercel --prod --yes
```

### Streamlit Community Cloud (Python backend)

1. Open [share.streamlit.io](https://share.streamlit.io/) and sign in with GitHub.
2. Deploy `Somu639/Wishlist`, branch `main`, main file path **`streamlit_backend/app.py`**. Dependencies come from `streamlit_backend/requirements.txt`, which sits beside the app so the repo root stays free of Python markers that would confuse Vercel.
3. In **Secrets**, add:

```toml
GROQ_API_KEY = "your_groq_key"
GROQ_VISION_MODEL = "qwen/qwen3.6-27b"
```

Local:

```powershell
pip install -r streamlit_backend/requirements.txt
streamlit run streamlit_backend/app.py
```

For local runs the Groq key is read from `.streamlit/secrets.toml` (gitignored) or the `GROQ_API_KEY` environment variable.

## Project layout

```
backend/src/            Express API, Groq service, SQLite
frontend/src/           Storefront, Wishlist, Style Preview, Bag
frontend/src/data/      Catalog + localStorage fallback store
api/style.js            Vercel serverless Groq analysis endpoint
streamlit_backend/      Streamlit Cloud app: app.py, catalog, Groq, intelligence
```
