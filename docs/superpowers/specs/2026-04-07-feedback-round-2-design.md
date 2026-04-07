# Feedback Round 2 — Design Spec

**Source:** "Notes for Thalia in Spanish" (PDF + MD), received 2026-04-07
**Scope:** 3 changes from stakeholder feedback on the prototype

---

## Change 1: Compliance AI Disclaimer

**Goal:** Add compliance-required AI disclosure text to the intro page privacy card, alongside the existing privacy text.

**What changes:**
- Update `intro.privacyDesc` in both `frontend/lib/i18n/en.json` and `frontend/lib/i18n/es-MX.json` to prepend compliance text before the existing privacy text
- Update `intro.privacyTitle` to reflect the broader scope

**Title (EN):** "About this assistant"
**Title (ES-MX):** "Sobre este asistente"

**Description (EN):**
> This assistant uses AI to provide general and educational information. The responses are AI generated and may contain errors. It does not constitute financial advice or personalized recommendations, nor does it create an advisory relationship with Tala.
>
> Tala prioritizes the privacy of your data. The information you share is confidential.

**Description (ES-MX):**
> Este asistente usa IA para brindar información general y educativa. Las respuestas son automatizadas y pueden contener imprecisiones. No constituye asesoría financiera ni recomendaciones personalizadas, ni crea relación de asesoría con Tala.
>
> Tala prioriza la privacidad de tus datos. La información que compartes es confidencial.

**Files:**
- `frontend/lib/i18n/en.json` — update `intro.privacyTitle`, `intro.privacyDesc`
- `frontend/lib/i18n/es-MX.json` — update `intro.privacyTitle`, `intro.privacyDesc`

**No component changes.** The privacy card and "View Privacy Policy" link stay as-is.

---

## Change 2: Gender from Access Codes

**Goal:** Thalia should use correctly gendered Spanish (e.g., "listo" vs "lista") based on a `gender` field in tester profiles.

**Data flow:**
1. User adds `gender` field to `shared/access-codes.json` (values: `"male"`, `"female"`, or `"neutral"`)
2. `TesterProfile` type gains a `gender` field
3. Frontend passes `gender` to backend via `/chat` request body
4. Backend stores `gender` on session, passes to `build_system_prompt()`
5. Prompt instructions: "The customer's gender is {gender}. Use appropriately gendered Spanish (e.g., 'listo' for male, 'lista' for female). If gender is 'neutral', use gender-neutral phrasing."
6. Gender instruction only applies when `locale === 'es-MX'`; skipped for English.

**Files:**
- `shared/access-codes.json` — user adds `gender` field per tester
- `frontend/lib/types.ts` — add `gender?: 'male' | 'female' | 'neutral'` to `TesterProfile`
- `frontend/services/chat-service-api.ts` — pass `gender` in `/chat` request
- `backend/main.py` — add `gender: Optional[str]` to `ChatRequest`
- `backend/agent.py` — store `gender` on session, pass to prompt builder
- `backend/prompts.py` — add gender instruction to `CONVERSATION_RULES` block (Spanish locale only). This goes in the rules section, not per-phase, since it applies globally.

---

## Change 3: 3-Bubble Welcome Message

**Goal:** Restructure Phase 0 from 2 bubbles to 3, using exact copy from the feedback document.

**Current behavior (2 bubbles):**
1. AI disclosure + warm line about the business
2. Explain two parts + first question merged together

**New behavior (3 bubbles):**

**Bubble 1 — Greeting**
- ES: "¡Hola! Yo soy Thalía, tu asistente de IA para préstamos y negocios. Estoy aquí para ayudarte con tu {tipo de negocio}."
- EN: "Hi there! I'm Thalia, your AI assistant for loans and business. It's a pleasure to help you with your {business type}."

**Bubble 2 — Explanation**
- ES: "Primero, te haré unas preguntas rápidas para encontrar la mejor oferta de préstamo para ti. Después, trabajaremos un reto real de tu negocio para que veas cómo puedo ayudarte en el día a día. Solo tomará unos minutos, puedes escribir o usar el micrófono — lo que te sea más fácil."
- EN: "First, I'll ask you a few quick questions to find the best loan offer for you. And then, we'll work together on a real challenge from your business so you can see how I can help you day-to-day. It will only take a few minutes. You can type or use your microphone — whichever is easiest for you."

**Bubble 3 — First question**
- ES: "Ahora sí, cuéntame, ¿cómo y dónde vendes usualmente (por ejemplo: en un local, tianguis/mercado, a domicilio, por WhatsApp, etc.)?"
- EN: "Now, tell me, how and where do you usually sell (for example: local, street market, home delivery, via WhatsApp, etc.)?"

**Implementation:**
- Add these as exact-copy locale strings in `LOCALE_CONFIG` in `backend/prompts.py` (e.g., `p0_bubble1`, `p0_bubble2`, `p0_bubble3`)
- Update Phase 0 instructions: "Send exactly 3 messages" with each bubble being the verbatim locale string
- `{business type}` in bubble 1 is substituted dynamically by the LLM based on survey context (e.g., "tu venta de ropa", "tu puesto de chilaquiles")
- `advance_phase=true` still set immediately — Phase 1 expects the selling channel answer

**Files:**
- `backend/prompts.py` — add 6 locale strings (3 EN, 3 ES-MX), rewrite Phase 0 instructions

**No frontend changes** — multi-bubble rendering already handles 3 bubbles.

---

## Out of Scope

These items from the feedback are already addressed by prior plans/commits:
- Start button removal
- Repeated questions / dead-end acknowledgments
- Double congratulatory offer message
- Double greeting in coaching mode
- Formal vocabulary ("surtir inventario", etc.)
