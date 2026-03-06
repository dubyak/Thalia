# Deploying Thalia to Railway

This app is a single Docker service: Next.js frontend (port from `PORT`) and FastAPI backend (internal port 8000), managed by supervisord.

## Prerequisites

- Railway account and CLI (optional): `npm i -g @railway/cli`
- Repo connected to Railway (GitHub/GitLab or `railway link`)

## Deploy

1. **New project from repo**
   - In [Railway](https://railway.app): New Project → Deploy from GitHub repo → select this repo.
   - Railway will detect the root `Dockerfile` and build the image.

2. **Variables**
   In the service **Variables** tab, set:
   - `OPENAI_API_KEY` (required) – for the chat agent.
   - Optional: `ARIZE_SPACE_ID`, `ARIZE_API_KEY`, `ARIZE_PROJECT_NAME` for tracing (backend runs without them).
   - `BACKEND_URL` is only needed if the backend runs as a separate service; for the single-container setup leave it unset (default `http://127.0.0.1:8000`).

3. **Domain**
   - In the service: Settings → Networking → Generate Domain. Use the generated URL to access the app.

4. **Health check**
   - Railway uses `railway.toml` → `healthcheckPath = "/api/health"`. The frontend exposes `GET /api/health` for this.

## How it runs

- **Build:** Dockerfile builds the Next.js app in standalone mode, then copies backend + frontend into a Python slim image with Node and supervisord.
- **Runtime:** supervisord starts:
  - Backend: `uvicorn` on `0.0.0.0:8000` (internal).
  - Frontend: `node server.js` in `/app/frontend`; it listens on the container `PORT` (set by Railway).
- **Traffic:** All public traffic goes to the frontend (Next.js). `/api/chat` proxies to the backend.

## Troubleshooting

- **Build fails:** Ensure `frontend/next.config.mjs` has `output: 'standalone'` (required by the Dockerfile).
- **502 / "Chat service unavailable":** Backend may not be up or BACKEND_URL may be wrong. In single-container deploy, BACKEND_URL should be unset or `http://127.0.0.1:8000`.
- **Port:** Do not set `PORT` in variables; Railway injects it at runtime.
