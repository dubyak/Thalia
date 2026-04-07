# Feedback Round 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 3 changes from stakeholder feedback: compliance disclaimer on intro page, gender-aware Spanish from access codes, and 3-bubble welcome message.

**Architecture:** Three independent changes. Task 1 is i18n-only. Task 2 threads a new `gender` field from `shared/access-codes.json` → frontend types → API request → backend session → prompt builder. Task 3 rewrites Phase 0 prompt instructions and locale strings from 2 bubbles to 3 (requires a Phase 0 exception to the 2-bubble ABSOLUTE_RULE).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 3, Python FastAPI, OpenAI structured output

---

## File Map

| File | Change |
|------|--------|
| `frontend/lib/i18n/en.json:55-56` | Update `intro.privacyTitle` and `intro.privacyDesc` |
| `frontend/lib/i18n/es-MX.json:55-56` | Update `intro.privacyTitle` and `intro.privacyDesc` |
| `frontend/lib/access-codes.ts:3-10` | Add `gender` to `CodeEntry` interface |
| `frontend/lib/types.ts:2-15` | Add `gender` to `TesterProfile` |
| `frontend/contexts/TesterContext.tsx:46-49` | Pass `gender` through when building profile |
| `frontend/services/chat-service-api.ts` | Add `gender` param to `getOpeningMessage`, `sendMessage`, `getServicingOpening` |
| `frontend/contexts/ChatContext.tsx` | Thread `gender` from tester profile to all API calls |
| `backend/main.py:52-67` | Add `gender` to `ChatRequest` |
| `backend/agent.py:35-59` | Add `gender` to `Session` dataclass |
| `backend/agent.py:81-97,120-138` | Add `gender` param to `run_agent` and `_run_agent_inner` |
| `backend/agent.py:148-159` | Pass `gender` to `Session()` constructor |
| `backend/agent.py:226-240,345-359` | Pass `gender` to both `build_system_prompt()` calls |
| `backend/prompts.py:42-46,100-104` | Replace Phase 0 locale strings with 3-bubble versions |
| `backend/prompts.py:288-291` | Add Phase 0 exception to 2-bubble ABSOLUTE_RULE |
| `backend/prompts.py:319-333` | Add `gender` param to `build_system_prompt()` |
| `backend/prompts.py:536-556` | Rewrite Phase 0 instructions for 3 bubbles |

---

## Task 1: Compliance Disclaimer on Intro Page

**Files:**
- Modify: `frontend/lib/i18n/en.json:55-56`
- Modify: `frontend/lib/i18n/es-MX.json:55-56`

- [ ] **Step 1: Update English i18n strings**

In `frontend/lib/i18n/en.json`, replace lines 55-56:

```json
    "privacyTitle": "About this assistant",
    "privacyDesc": "This assistant uses AI to provide general and educational information. The responses are AI generated and may contain errors. It does not constitute financial advice or personalized recommendations, nor does it create an advisory relationship with Tala.\n\nTala prioritizes the privacy of your data. The information you share is confidential.",
```

- [ ] **Step 2: Update Spanish i18n strings**

In `frontend/lib/i18n/es-MX.json`, replace lines 55-56:

```json
    "privacyTitle": "Sobre este asistente",
    "privacyDesc": "Este asistente usa IA para brindar información general y educativa. Las respuestas son automatizadas y pueden contener imprecisiones. No constituye asesoría financiera ni recomendaciones personalizadas, ni crea relación de asesoría con Tala.\n\nTala prioriza la privacidad de tus datos. La información que compartes es confidencial.",
```

- [ ] **Step 3: Build check**

Run: `cd frontend && npm run build`
Expected: Exit 0, no errors.

- [ ] **Step 4: Visual check**

Run `cd frontend && npm run dev`. Navigate to `/intro`, swipe to slide 4. Verify:
- Title says "About this assistant" (EN) / "Sobre este asistente" (ES)
- Body shows both the compliance text and privacy text, separated by a blank line
- "View Privacy Policy" link still present

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/i18n/en.json frontend/lib/i18n/es-MX.json
git commit -m "feat: add compliance AI disclaimer to intro privacy card"
```

---

## Task 2: Gender from Access Codes

**Files:**
- Modify: `frontend/lib/access-codes.ts:3-10`
- Modify: `frontend/lib/types.ts:2-15`
- Modify: `frontend/contexts/TesterContext.tsx:39-49`
- Modify: `frontend/services/chat-service-api.ts`
- Modify: `frontend/contexts/ChatContext.tsx`
- Modify: `backend/main.py:52-67`
- Modify: `backend/agent.py:35-59,81-97,120-138,148-159,226-240,345-359`
- Modify: `backend/prompts.py:160-316,319-333`

### Step Group A: Frontend data threading

- [ ] **Step 1: Add `gender` to `CodeEntry` in `access-codes.ts`**

In `frontend/lib/access-codes.ts`, add `gender` to the `CodeEntry` interface at line 10 (before the closing brace):

```typescript
interface CodeEntry {
  firstName: string
  name?: string       // full name, if different from firstName
  initialOffer: number
  maxOffer: number
  signUpDate?: string
  loanNumber?: number
  gender?: 'male' | 'female' | 'neutral'
}
```

- [ ] **Step 2: Add `gender` to `TesterProfile` in `types.ts`**

In `frontend/lib/types.ts`, add `gender` after `locale` (line 12):

```typescript
export interface TesterProfile {
  id: string
  code: string
  name: string
  firstName: string
  approvedAmount?: number
  maxAmount?: number
  interestRateDaily: number
  processingFeeRate: number
  businessType?: string
  locale: string
  gender?: 'male' | 'female' | 'neutral'
  signUpDate?: string
  loanNumber?: number
}
```

- [ ] **Step 3: Pass `gender` through in `TesterContext.tsx`**

In `frontend/contexts/TesterContext.tsx`, update the `extras` object at line 33 to include `gender`:

```typescript
    const extras = {
      approvedAmount: offer.initialOffer,
      maxAmount: offer.maxOffer,
      ...(offer.signUpDate !== undefined ? { signUpDate: offer.signUpDate } : {}),
      ...(offer.loanNumber !== undefined ? { loanNumber: offer.loanNumber } : {}),
      ...(offer.gender !== undefined ? { gender: offer.gender } : {}),
    }
```

- [ ] **Step 4: Add `gender` param to `chat-service-api.ts`**

In `frontend/services/chat-service-api.ts`, add `gender` to all three API methods:

**`getOpeningMessage` (line 87):** Add `gender` parameter after `testerContext`:

```typescript
  async getOpeningMessage(
    firstName: string,
    approvedAmount = 8000,
    maxAmount = 12000,
    businessType?: string,
    loanPurpose?: string,
    locale = 'en',
    testerContext?: string,
    gender?: string,
  ): Promise<AgentResponse> {
```

And add it to the request body (inside `JSON.stringify` at line 102):

```typescript
        body: JSON.stringify({
          session_id: getSessionId(),
          tester_name: firstName,
          approved_amount: approvedAmount,
          max_amount: maxAmount,
          mode: 'onboarding',
          business_type: businessType,
          loan_purpose: loanPurpose,
          locale,
          ...(testerContext ? { tester_context: testerContext } : {}),
          ...(gender ? { gender } : {}),
        }),
```

**`sendMessage` (line 125):** Add `gender` parameter after `testerContext`:

```typescript
  async sendMessage(
    content: string,
    currentPhase: OnboardingPhase,
    mode: 'onboarding' | 'servicing' | 'coaching',
    testerName?: string,
    approvedAmount = 8000,
    maxAmount = 12000,
    collected?: Record<string, string>,
    imageData?: string,
    businessType?: string,
    loanPurpose?: string,
    locale = 'en',
    customerId?: string,
    customerName?: string,
    testerContext?: string,
    gender?: string,
  ): Promise<AgentResponse> {
```

And add it to the request body (inside `JSON.stringify` at line 145):

```typescript
          ...(testerContext ? { tester_context: testerContext } : {}),
          ...(gender ? { gender } : {}),
```

**`getServicingOpening` (line 50):** Add `gender` parameter after `locale`:

```typescript
  async getServicingOpening(
    firstName: string,
    profile: Record<string, string>,
    approvedAmount = 8000,
    maxAmount = 12000,
    mode: 'servicing' | 'coaching' = 'servicing',
    isFirstVisit = true,
    locale = 'en',
    gender?: string,
  ): Promise<AgentResponse> {
```

And add it to the request body:

```typescript
          locale,
          ...(gender ? { gender } : {}),
```

- [ ] **Step 5: Thread `gender` from tester profile through `ChatContext.tsx`**

The `ChatContext` doesn't directly import `useTester` — it reads `locale` from `useLocale()`. Gender needs similar treatment. Add a gender ref alongside `localeRef`.

In `frontend/contexts/ChatContext.tsx`, after the locale ref (around line 214-216), add:

```typescript
  // Read gender from tester profile for gendered Spanish
  const { tester } = useTester()
  const genderRef = useRef(tester?.gender)
  genderRef.current = tester?.gender
```

Note: `useTester` may already be imported elsewhere in the file. If not, add the import at the top:

```typescript
import { useTester } from '@/contexts/TesterContext'
```

Then update the three API call sites:

**`startOnboarding` (line 255):** Add gender as last arg:

```typescript
      const response = await apiChatService.getOpeningMessage(firstName, approvedAmount, maxAmount, businessType, loanPurpose, localeRef.current, testerContext, genderRef.current)
```

**`sendMessage` (line 319):** Add gender after testerContext:

```typescript
      const response = await apiChatService.sendMessage(
        content,
        s.phase,
        s.mode,
        s.testerFirstName ?? undefined,
        s.approvedAmount,
        s.ceilingAmount,
        (s.mode === 'servicing' || s.mode === 'coaching')
          ? (s.businessProfile as Record<string, string>)
          : undefined,
        undefined,
        s.businessType ?? undefined,
        s.loanPurpose ?? undefined,
        localeRef.current,
        customer.customerId || undefined,
        customer.firstName && customer.lastName
          ? `${customer.firstName} ${customer.lastName}`
          : undefined,
        s.testerContext ?? undefined,
        genderRef.current,
      )
```

**`sendImage` (line 367):** Same pattern — add `genderRef.current` as the last argument to the `sendMessage` call inside `sendImage`.

- [ ] **Step 6: Build check**

Run: `cd frontend && npm run build`
Expected: Exit 0, no TypeScript errors.

### Step Group B: Backend data threading

- [ ] **Step 7: Add `gender` to `ChatRequest` in `main.py`**

In `backend/main.py`, add after `locale` (line 67):

```python
    tester_context: str | None = None
    gender: str | None = None         # "male", "female", or "neutral"
```

And pass it to `run_agent` (after line 103):

```python
    result = await run_agent(
        session_id=req.session_id,
        message=req.message,
        tester_name=req.tester_name,
        approved_amount=req.approved_amount,
        max_amount=req.max_amount,
        mode=req.mode,
        collected=req.collected,
        business_type=req.business_type,
        loan_purpose=req.loan_purpose,
        is_first_visit=req.is_first_visit,
        image_data=req.image_data,
        customer_id=req.customer_id,
        customer_name=req.customer_name,
        locale=req.locale,
        tester_context=req.tester_context,
        gender=req.gender,
    )
```

- [ ] **Step 8: Add `gender` to `Session` dataclass and `run_agent` in `agent.py`**

In `backend/agent.py`, add `gender` to the `Session` dataclass after `tester_context` (line 59):

```python
    tester_context: str | None = None
    gender: str | None = None  # "male", "female", or "neutral" — for gendered Spanish
```

Add `gender` param to `run_agent` (after `tester_context` at line 97):

```python
    tester_context: str | None = None,
    gender: str | None = None,
```

And pass it through to `_run_agent_inner` in the `return await _run_agent_inner(...)` call:

```python
            gender=gender,
```

Add `gender` param to `_run_agent_inner` (after `tester_context` at line 137):

```python
    tester_context: str | None = None,
    gender: str | None = None,
```

Pass `gender` to Session constructor (after `tester_context` at line 159):

```python
            tester_context=tester_context,
            gender=gender,
```

Pass `gender` to both `build_system_prompt` calls (after `tester_context` at lines 239 and 358):

```python
            tester_context=session.tester_context,
            gender=session.gender,
```

- [ ] **Step 9: Add `gender` to `build_system_prompt` in `prompts.py`**

Add `gender` parameter after `tester_context` (line 332):

```python
    tester_context: str | None = None,
    gender: str | None = None,
```

### Step Group C: Gender prompt instruction

- [ ] **Step 10: Add gender instruction to CONVERSATION DESIGN rules**

In `backend/prompts.py`, in the `_build_conversation_rules` function, add a gender rule at the end of the CONVERSATION DESIGN section (before the ABSOLUTE RULES block).

After the existing rules (around line 278, before the `ABSOLUTE RULES:` line), add:

```python
{"" if locale != "es-MX" or not gender else f'''
GENDER RULE: The customer's gender is {gender}. Use appropriately gendered Spanish:
- Male: "listo", "bienvenido", "interesado", "seguro"
- Female: "lista", "bienvenida", "interesada", "segura"
- Neutral: Use gender-neutral alternatives ("¡Perfecto!", "¡Excelente!", "Bienvenid@")
Never use slash constructions like "listo/a" or "bienvenido/a".
'''}
```

This conditionally inserts the gender block only for Spanish locale with a known gender.

- [ ] **Step 11: Backend test**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All existing tests pass.

- [ ] **Step 12: Commit**

```bash
git add frontend/lib/access-codes.ts frontend/lib/types.ts frontend/contexts/TesterContext.tsx frontend/services/chat-service-api.ts frontend/contexts/ChatContext.tsx backend/main.py backend/agent.py backend/prompts.py
git commit -m "feat: thread gender from access codes to prompt for gendered Spanish"
```

---

## Task 3: 3-Bubble Welcome Message

**Files:**
- Modify: `backend/prompts.py:42-46,100-104` (locale strings)
- Modify: `backend/prompts.py:288-291` (ABSOLUTE_RULE exception)
- Modify: `backend/prompts.py:536-556` (Phase 0 instructions)

- [ ] **Step 1: Replace Phase 0 locale strings (English)**

In `backend/prompts.py`, replace the EN Phase 0 strings (lines 42-46):

```python
        # Phase 0 exact copy — 3 bubbles
        "p0_bubble1": "Hi there! I'm Thalia, your AI assistant for loans and business. It's a pleasure to help you with your {business_type}.",
        "p0_bubble2": "First, I'll ask you a few quick questions to find the best loan offer for you. And then, we'll work together on a real challenge from your business so you can see how I can help you day-to-day. It will only take a few minutes. You can type or use your microphone — whichever is easiest for you.",
        "p0_bubble3": "Now, tell me, how and where do you usually sell (for example: local, street market, home delivery, via WhatsApp, etc.)?",
```

Remove the old `p0_ai_disclosure`, `p0_part1`, `p0_part2`, `p0_cta` strings.

- [ ] **Step 2: Replace Phase 0 locale strings (Spanish)**

In `backend/prompts.py`, replace the ES-MX Phase 0 strings (lines 100-104):

```python
        # Phase 0 exact copy — 3 bubbles
        "p0_bubble1": "¡Hola! Yo soy Thalía, tu asistente de IA para préstamos y negocios. Estoy aquí para ayudarte con tu {business_type}.",
        "p0_bubble2": "Primero, te haré unas preguntas rápidas para encontrar la mejor oferta de préstamo para ti. Después, trabajaremos un reto real de tu negocio para que veas cómo puedo ayudarte en el día a día. Solo tomará unos minutos, puedes escribir o usar el micrófono — lo que te sea más fácil.",
        "p0_bubble3": "Ahora sí, cuéntame, ¿cómo y dónde vendes usualmente (por ejemplo: en un local, tianguis/mercado, a domicilio, por WhatsApp, etc.)?",
```

Remove the old `p0_ai_disclosure`, `p0_part1`, `p0_part2`, `p0_cta` strings.

- [ ] **Step 3: Add Phase 0 exception to ABSOLUTE_RULE #6**

In `backend/prompts.py`, update rule 6 (line 288) to allow 3 bubbles in Phase 0:

```python
6. Each message in the messages array: 40 words max. DEFAULT TO ONE BUBBLE.
   Only use 2 bubbles when content genuinely needs separation (e.g. intro + CTA, or
   acknowledgment covers a different topic than the question). Most turns should be 1 bubble.
   HARD LIMIT: NEVER return more than 2 messages in the messages array — EXCEPT Phase 0,
   which must return exactly 3 messages.
```

- [ ] **Step 4: Rewrite Phase 0 instructions**

In `backend/prompts.py`, replace the Phase 0 block (lines 536-556):

```python
    if phase == "0":
        business_intro = (
            f"your {business_type}" if business_type and business_type != "your business"
            else "your business"
        )
        instructions = (
            "PHASE 0 — WELCOME\n\n"
            "Send EXACTLY 3 messages (bubbles). Use the exact copy below, only substituting\n"
            f"{{business_type}} with a warm, natural reference to {business_intro}.\n\n"
            f"Bubble 1: '{t('p0_bubble1')}'\n"
            f"  Replace '{{business_type}}' with a natural reference to {business_intro}.\n\n"
            f"Bubble 2: '{t('p0_bubble2')}'\n"
            f"  Use this text EXACTLY as written. Do not change or rephrase.\n\n"
            f"Bubble 3: '{t('p0_bubble3')}'\n"
            f"  Use this text EXACTLY as written. Do not change or rephrase.\n\n"
            "Set advance_phase=true.\n"
        )
```

- [ ] **Step 5: Backend test**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All tests pass.

- [ ] **Step 6: Manual test**

Run both frontend and backend locally. Start a new onboarding session.
Verify:
- Thalia sends exactly 3 bubbles
- Bubble 1 is the greeting with business type substituted
- Bubble 2 is the explanation (verbatim from spec)
- Bubble 3 is the selling channel question (verbatim from spec)
- User's response is correctly extracted as `sellingChannel` and Phase 1 advances

- [ ] **Step 7: Commit**

```bash
git add backend/prompts.py
git commit -m "feat: restructure Phase 0 welcome to 3 bubbles with exact copy"
```

---

## Final Verification

- [ ] **Step 1: Full build**

```bash
cd frontend && npm run build && cd ../backend && python -m pytest tests/test_agent_loops.py -v
```

- [ ] **Step 2: End-to-end flow test**

Run the full onboarding flow from intro → onboarding → offer. Check:
- Slide 4 privacy card shows compliance disclaimer + privacy text
- Phase 0 sends 3 bubbles with correct copy
- Gendered Spanish is used throughout (if `gender` is set in access codes)
- No regressions in later phases
