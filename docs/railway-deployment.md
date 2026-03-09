# Deploying Thalia to Railway

You can run Thalia as **two services** (frontend + backend separately) or as a **single service** (monolith).

**Build options (per service):** Use a **Dockerfile** (e.g. `backend/Dockerfile`, `frontend/Dockerfile`) or **Nixpacks** (no Docker). Each service has both: if the service Root Directory is set and no Dockerfile is used, Railway may use Nixpacks and the `nixpacks.toml` in that directory for build/start.

---

## Option A: Two services (recommended)

Frontend and backend each get their own Railway service, Dockerfile, and URL.

### 1. Create a new project and add two services

1. In [Railway](https://railway.app): **New Project**.
2. **Add first service:** **Empty Service** (or “Deploy from GitHub” and pick this repo once).
3. **Add second service:** **+ New** → **Empty Service** again.
4. Connect the repo to the project if you haven’t: **Settings** → **Connect Repo** → select the Thalia repo.

### 2. Backend service

1. Open the **first** service (rename it to e.g. `thalia-backend`).
2. **Settings** → **Source** (or **Build**):
   - **Root Directory:** `backend`
   - **Dockerfile Path:** leave default so it uses `backend/Dockerfile`.
3. **Variables:** add
   - `OPENAI_API_KEY` (required)
   - Optional: `ARIZE_SPACE_ID`, `ARIZE_API_KEY`, `ARIZE_PROJECT_NAME`
4. **Settings** → **Networking** → **Generate Domain**. Copy the URL (e.g. `https://thalia-backend-xxxx.up.railway.app`). You need this for the frontend.
5. Do **not** set `PORT`; Railway sets it.

### 3. Frontend service

1. Open the **second** service (rename to e.g. `thalia-frontend`).
2. **Settings** → **Source**:
   - **Root Directory:** `frontend`
   - Uses `frontend/Dockerfile` automatically.
3. **Variables:** add
   - `BACKEND_URL` = the backend domain from step 2, **no trailing slash** (e.g. `https://thalia-backend-xxxx.up.railway.app`).
4. **Settings** → **Networking** → **Generate Domain**. This is the app URL you give to users.
5. Do **not** set `PORT`.

### 4. CORS

The backend already allows `https://*.railway.app`. If you use a custom domain for the frontend, add that origin in `backend/main.py` in `allow_origins` (e.g. `"https://your-app.example.com"`).

### Summary (two services)

| Service   | Root Directory | Key variables                          | Health check      |
|----------|-----------------|----------------------------------------|-------------------|
| Backend  | `backend`       | `OPENAI_API_KEY`                       | `GET /health`     |
| Frontend | `frontend`      | `BACKEND_URL` = backend’s public URL   | `GET /api/health` |

---

## Option B: Single service (monolith)

One Railway service runs both frontend and backend in one container (root `Dockerfile` + supervisord).

1. **New Project** → deploy from this repo **without** setting a Root Directory (so the repo root is used).
2. Railway will use the **root** `Dockerfile` and run both processes in one container.
3. **Variables:** set `OPENAI_API_KEY` only. Do **not** set `BACKEND_URL` (default `http://127.0.0.1:8000` is correct).
4. **Generate Domain** on this single service. All traffic goes to the frontend; it proxies `/api/chat` to the backend internally.

See the rest of this doc for how the monolith runs (supervisord, ports).

---

## Troubleshooting

- **Frontend: “Chat service unavailable” / 502:** Backend is unreachable. Check `BACKEND_URL` is the backend’s **public** URL (https, no trailing slash) and the backend service is deployed and healthy.
- **Backend CORS errors:** Add the frontend’s origin (e.g. your Railway frontend URL or custom domain) to `allow_origins` in `backend/main.py`.
- **Build fails (frontend):** Ensure `frontend/next.config.mjs` has `output: 'standalone'`.
- **Port:** Never set `PORT` in variables; Railway injects it.
