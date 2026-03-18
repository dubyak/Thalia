# Thalia — Agent Context

> Context file for AI coding agents working in this repo.
> **Living document** — update this file whenever you learn something new about the codebase, fix a non-obvious bug, or establish a pattern that future agents should follow. See the "Maintaining this file" section at the bottom.

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
| `backend/agent.py` | Core agent loop — session management, phase advancement, auto-advance, OpenAI call |
| `backend/prompts.py` | System prompt builder — per-phase instructions for onboarding, coaching, servicing. Contains `CONVERSATION_RULES` and `ABSOLUTE_RULES` blocks that govern tone, warmth, and extraction behavior |
| `backend/state.py` | Pydantic models for structured output: `AgentDecision`, `ExtractedFields` |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/contexts/ChatContext.tsx` | Chat state management — messages, sending, mode switching, multi-bubble staggered animation |
| `frontend/contexts/FlowContext.tsx` | Journey state machine — tracks progress through the full flow |
| `frontend/contexts/TesterContext.tsx` | Tester identity — code-based login, profile lookup |
| `frontend/services/chat-service-api.ts` | HTTP client for the backend `/chat` endpoint |
| `frontend/lib/types.ts` | Shared TypeScript types: `ChatMessage`, `FlowState`, `TesterProfile`, etc. |
| `frontend/lib/constants.ts` | Tester profiles, Mexican bank list, loan calculator |
| `frontend/components/chat/` | Chat UI — bubbles, input, camera/mic, offer card, photo upload, typing indicator |

### Docs

| File | Purpose |
|------|---------|
| `docs/msme-mx-onboarding-flow.md` | Product spec — the full agent flow, conversation design principles, prompt guidelines |
| `docs/railway-deployment.md` | Deployment guide for Railway (two-service or monolith) |

## Agent modes

The backend supports three modes, set per session:

1. **Onboarding** — Guided flow collecting business profile, presenting a credit offer. Phases 0-11 then `complete`:

| Phase | Name | What it collects |
|-------|------|-----------------|
| 0 | Welcome | Nothing — greeting + flow explanation |
| 1 | Selling channel | `sellingChannel` — how/where they sell |
| 2 | Tenure | `tenure` — how long in business |
| 3 | Typical customer | `typicalCustomer` — who they serve |
| 4 | Recent changes | `recentChanges` — what's changed lately |
| 5 | Near-term outlook | `nearTermOutlook` (+ `outlookReason` if negative) |
| 6 | Cash-cycle speed | `cashCycleSpeed` — time to recover spend |
| 7 | Working capital | `workingCapital` — how much Tala covers |
| 8 | Business evidence | Optional photo/doc upload |
| 9 | Coaching demo | 3-4 turn Socratic coaching preview |
| 10 | Offer | Credit offer presentation + loan configurator |
| 11 | Closing | Congratulations + next steps |

2. **Coaching** — Socratic business coaching. Open-ended, references the business profile collected during onboarding.
3. **Servicing** — Loan support (payments, OXXO/SPEI instructions, difficulty protocol).

## How the agent works

1. Frontend sends `POST /chat` with `session_id`, `message`, `mode`, and any collected profile data.
2. The survey page (`/(app)/survey`) collects `businessType` + `loanPurpose` before onboarding starts — these flow through as context to the agent.
3. Backend builds a **phase-specific system prompt** (`prompts.py`) that tells the LLM exactly what to ask and when to advance.
4. Backend calls OpenAI with **structured output** (`response_format=AgentDecision`) — the LLM returns `messages` (array of bubble texts), `extracted` fields, and `advance_phase` flag.
5. Backend merges extracted fields into the session and conditionally advances the phase.
6. **Auto-advance**: When a profile/health phase (1-8) advances, the backend immediately makes a **second API call** with the new phase's system prompt to generate the next question. The acknowledgment + next question are combined into a single response. This prevents dead-end "Got it." messages that require the user to say "ok" to continue.
7. Frontend renders multi-bubble responses with staggered animation (proportional to word count).

## Frontend flow (route structure)

```
/(auth)/login          Tester code entry
/(app)/survey          Business type + loan purpose (pre-chat)
/(app)/opt-in          MSME experience opt-in
/(app)/onboarding      Chat-based onboarding (agent phases 0-11)
/(app)/offer           Offer review
/(app)/terms           Terms acceptance
/(app)/cashout         Bank selection + confirmation + success
/(app)/home            Post-disbursement home (coaching entry point)
```

## Conventions

- **Locale-aware responses.** The tester profile's `locale` field (e.g. `"en"`, `"es-MX"`) controls both the LLM agent's output language and all frontend UI strings. The backend `build_system_prompt()` accepts a `locale` param; the frontend uses `useTranslation()` hook with JSON string dictionaries.
- **Structured output everywhere.** The backend never parses free-text from the LLM — all decisions come through `AgentDecision` Pydantic model.
- **Phase logic lives in the backend.** The frontend trusts the `phase` field returned by `/chat` and does not independently decide phase transitions.
- **Multi-bubble responses.** The agent returns `messages: list[str]`, rendered as separate chat bubbles with staggered animation. Use a single bubble unless content genuinely needs separation.
- **Tester profiles are hardcoded.** `frontend/lib/constants.ts` has the tester list. Supabase integration is stubbed but not wired up. `DEMOEN` tester uses `locale: 'en'`; all others use `locale: 'es-MX'`.
- **No auth.** Testers enter a code (e.g. `DEMO`, `DEMOEN`, `TESTER01`) — there's no real authentication.

## Internationalization (i18n)

The app uses a two-layer locale system controlled by the tester profile's `locale` field:

**Backend (LLM output language):**

- `backend/prompts.py` has a `LOCALE_CONFIG` dict with per-locale strings (product terms, phase copy, servicing scripts).
- `_t(locale, key)` helper resolves locale-specific strings. LLM instructions stay in English; only output language and exact copy phrases switch.
- `build_system_prompt(locale=...)` threads locale through all prompt construction.
- Locale flows: `ChatRequest.locale` → `Session.locale` → `build_system_prompt()`.

**Frontend (UI strings):**

- `frontend/lib/i18n/en.json` and `frontend/lib/i18n/es-MX.json` — parallel JSON string dictionaries (~150 keys each).
- `frontend/lib/i18n/index.ts` — `createT(locale)` function with dot-path key resolution and `{placeholder}` interpolation. Falls back to English.
- `frontend/lib/i18n/useTranslation.ts` — React hook that reads locale from the tester profile via `useTester()`.
- All page components use `const { t } = useTranslation()` and `t('section.key', { param: value })`.
- `frontend/services/chat-service-api.ts` passes `locale` in every `/chat` request body.
- `frontend/contexts/ChatContext.tsx` reads locale from tester profile via a ref and passes it to all API calls.

**Adding a new translatable string:** Add the key to both `en.json` and `es-MX.json`, then use `t('section.key')` in the component.

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

**Adding a new onboarding phase:** Update `PHASE_ORDER` in `agent.py`, add phase instructions in `prompts.py`, add `ExtractedFields` entry in `state.py` if it collects data, add advancement logic in `agent.py`'s `run_agent`, update `PHASE_FIELD` map if applicable, and update the `OnboardingPhase` type in `frontend/lib/types.ts`.

**Adding a new tester:** Add an entry to `DEFAULT_TESTERS` in `frontend/lib/constants.ts`.

**Changing agent behavior / conversation quality:** Edit `CONVERSATION_RULES`, `ABSOLUTE_RULES`, or the phase-specific prompt blocks in `prompts.py`. The `AgentDecision` model in `state.py` controls what structured fields the LLM can return.

**Tuning prompt rules:** Be careful with conflicting rules (e.g. "be brief" vs "be warm"). Test the full onboarding flow end-to-end after any prompt change — small wording changes have outsized effects on conversation quality.

## Lessons learned (update as you go)

These are hard-won insights from debugging and testing. Read before making changes.

**Prompt engineering:**
- Conversation rules that say "don't do X" (e.g. "do NOT write a full sentence reflecting what they said") are stronger signals to the LLM than rules that say "do Y." Negative rules can suppress desirable behavior — use them surgically.
- The LLM can only handle one phase's instructions per call. It doesn't know what the next phase's question is. The auto-advance pattern in `agent.py` solves this by chaining two calls.
- Extraction is fragile for casual/informal answers. Always include "ALWAYS extract... even if brief, informal, or conversational" in extraction instructions, or the model will silently skip extraction and re-ask the question.
- Each phase prompt should include an example acknowledgment (e.g. "Three years — that's solid experience!") to set the right warmth level. Without examples, the model defaults to generic "Got it." responses.

**Architecture:**
- The auto-advance pattern (second API call when phase advances) eliminates dead-end responses at the cost of ~1-2s extra latency. This is worth it — dead ends cost far more user time.
- Phase 8 (evidence) → Phase 9 (coaching) transition text must not duplicate. If Phase 8's transition introduces coaching, Phase 9's opening will repeat it.
- `PHASE_FIELD` in `agent.py` maps phases to their required extracted field. If a field is already collected (volunteered early), the phase-skip logic in the advancement block will skip past it automatically.

**Testing:**
- Always test the full onboarding flow after prompt changes — not just the phase you modified. Prompt rules interact across phases.
- Watch for: dead-end responses (user has to say "ok"), re-asked questions (extraction failure), duplicate transition text, robotic tone.
- Run `cd backend && python -m pytest tests/test_agent_loops.py -v` for loop detection and phase stall tests.

## Maintaining this file

**When to update:** After completing any task that changes agent behavior, conversation flow, phase structure, or architectural patterns. If you learned something non-obvious while debugging, add it to "Lessons learned."

**What to add:**
- New patterns or conventions established during implementation
- Bug patterns and their root causes (especially prompt-related)
- Architectural decisions and their rationale
- Common pitfalls to avoid

**What NOT to add:**
- Session-specific details (current task, temporary state)
- Speculative ideas that weren't implemented
- Duplicate information already in code comments

**Rule: If you fix a bug that took more than one attempt to diagnose, add the root cause and fix pattern to "Lessons learned" so the next agent doesn't repeat the investigation.**
