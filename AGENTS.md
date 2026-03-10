# Thalia — Agent Context

> Context file for AI coding agents working in this repo.

## What this is

Thalia is a **usability testing prototype** for Tala (a lending app targeting MSMEs in Mexico). It simulates an AI-powered loan onboarding + business coaching experience. The app is built for internal testers — not end users — to walk through the full flow and give feedback.

## Architecture

```
frontend/          Next.js 16 + Tailwind — mobile-first UI
backend/           FastAPI + OpenAI (GPT) — agent logic, structured output
figma/             Figma exports (design source of truth)
docs/              Product specs and deployment guides
```

**Frontend** calls **Backend** via a single `POST /chat` endpoint. No database — sessions are in-memory on the backend, flow state persists in `localStorage` on the frontend.

## Tech stack

| Layer    | Stack                                        |
|----------|----------------------------------------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind 3 |
| Backend  | Python, FastAPI, OpenAI SDK, Pydantic 2      |
| LLM      | OpenAI GPT (gpt-5.2) via structured output   |
| Tracing  | Arize AX (optional, OpenTelemetry)            |
| Deploy   | Railway (two-service) or Docker               |

## Key files

### Backend

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI app, `/chat` and `/health` endpoints, request/response models |
| `backend/agent.py` | Core agent loop — session management, phase advancement, OpenAI call |
| `backend/prompts.py` | System prompt builder — per-phase instructions for onboarding, coaching, servicing |
| `backend/state.py` | Pydantic models for structured output: `AgentDecision`, `ExtractedFields` |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/contexts/ChatContext.tsx` | Chat state management — messages, sending, mode switching |
| `frontend/contexts/FlowContext.tsx` | Journey state machine — tracks progress through the full flow |
| `frontend/contexts/TesterContext.tsx` | Tester identity — code-based login, profile lookup |
| `frontend/services/chat-service-api.ts` | HTTP client for the backend `/chat` endpoint |
| `frontend/services/chat-service-mock.ts` | Offline mock for development without the backend |
| `frontend/services/chat-service.ts` | Interface + factory for switching between API and mock |
| `frontend/lib/types.ts` | Shared TypeScript types: `ChatMessage`, `FlowState`, `TesterProfile`, etc. |
| `frontend/lib/constants.ts` | Tester profiles, Mexican bank list, loan calculator |
| `frontend/components/chat/` | Chat UI — bubbles, input, quick replies, offer card, photo upload, typing indicator |

### Docs

| File | Purpose |
|------|---------|
| `docs/msme-mx-onboarding-flow.md` | Product spec — the full agent flow, conversation design principles, prompt guidelines |
| `docs/railway-deployment.md` | Deployment guide for Railway (two-service or monolith) |

## Agent modes

The backend supports three modes, set per session:

1. **Onboarding** — Guided flow collecting business profile, presenting a credit offer. Phases: `0` (welcome) → `1` (business type) → `2` (revenue) → `3` (costs) → `4` (loan purpose) → `5` (optional doc) → `6` (coaching demo) → `7` (offer) → `8` (closing) → `complete`.
2. **Coaching** — Socratic business coaching. Open-ended, references the business profile collected during onboarding.
3. **Servicing** — Loan support (payments, OXXO/SPEI instructions, difficulty protocol).

## How the agent works

1. Frontend sends `POST /chat` with `session_id`, `message`, `mode`, and any collected profile data.
2. Backend builds a **phase-specific system prompt** (`prompts.py`) that tells the LLM exactly what to ask and when to advance.
3. Backend calls OpenAI with **structured output** (`response_format=AgentDecision`) — the LLM returns a response, extracted fields, `advance_phase` flag, and quick reply suggestions.
4. Backend merges extracted fields into the session, conditionally advances the phase, and returns the response.
5. Frontend renders the message, quick replies, offer card, etc. based on the response metadata.

## Frontend flow (route structure)

```
/(auth)/login          Tester code entry
/(app)/survey          Loan purpose survey
/(app)/opt-in          MSME experience opt-in
/(app)/onboarding      Chat-based onboarding (agent phases 0-8)
/(app)/offer           Offer review
/(app)/terms           Terms acceptance
/(app)/cashout         Bank selection + confirmation + success
/(app)/home            Post-disbursement home (coaching entry point)
```

## Conventions

- **Backend responses are English-only.** The system prompt enforces this even if the user writes in Spanish.
- **Structured output everywhere.** The backend never parses free-text from the LLM — all decisions come through `AgentDecision` Pydantic model.
- **Phase logic lives in the backend.** The frontend trusts the `phase` field returned by `/chat` and does not independently decide phase transitions.
- **Quick replies are LLM-generated.** The system prompt guides what quick replies to produce per phase, but the LLM generates the actual text.
- **Tester profiles are hardcoded.** `frontend/lib/constants.ts` has the tester list. Supabase integration is stubbed but not wired up.
- **No auth.** Testers enter a code (e.g. `DEMO`, `TESTER01`) — there's no real authentication.

## Running locally

```bash
# Backend
cd backend
pip install -r requirements.txt
OPENAI_API_KEY=sk-... uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev          # runs on port 3001
```

The frontend expects the backend at `http://localhost:8000` by default. Set `BACKEND_URL` env var to override.

## Common tasks

**Adding a new onboarding phase:** Update `PHASE_ORDER` in `agent.py`, add phase instructions in `prompts.py`, add advancement logic in `agent.py`'s `run_agent`, and update the `OnboardingPhase` type in `frontend/lib/types.ts`.

**Adding a new tester:** Add an entry to `DEFAULT_TESTERS` in `frontend/lib/constants.ts`.

**Changing agent behavior:** Edit the phase-specific prompt blocks in `prompts.py`. The `AgentDecision` model in `state.py` controls what structured fields the LLM can return.

**Switching between mock and API chat service:** The factory in `frontend/services/chat-service.ts` controls this.
