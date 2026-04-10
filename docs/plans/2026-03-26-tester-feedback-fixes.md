# Tester Feedback Fixes — Implementation Plan

**Goal:** Fix all confirmed bugs and UX issues from the March 2026 usability test (7 testers).
**Architecture:** Bugs span `backend/agent.py`, `backend/prompts.py`, and frontend components. P0 bugs are data/logic errors in the backend. P1/P2 issues are mostly prompt copy + small UI fixes.
**Tech Stack:** Python FastAPI backend, Next.js 16 frontend, OpenAI structured output

> **CRITICAL: All UI text changes must update BOTH `frontend/lib/i18n/en.json` AND `frontend/lib/i18n/es-MX.json`.** The app serves English (`DEMOEN` tester profile) and Spanish (`DEMO`, `TESTER01`) locales. Never update one without the other.

---

## Feedback Summary

| Tester | Issues |
|--------|--------|
| Bethy | Offer reverts 11k→10k; disburse button missing; double Phase 12 messages; progress bar confusing |
| Hadis | Payment dates reversed; date shown after loan accepted doesn't match configurator; processing fee explanation weak |
| Avani | Wrong emoji for online store; conversation repetition; interest rate mismatch (agent says 1%, UI shows 0.83%); didn't ask what she sells |
| María | Flow restarted, never reached offer; complex language; no flexibility for "I don't know"; emoji mismatch (dessert gets 🌮) |
| Reema | "Recommended" date badge has no explanation (it's actually the highest-cost option) |
| Veer | Agent easily deviates off-topic (wrote math, generated website) |
| JessicaK | "I can't pay" servicing asks for info it already has |
| PDF notes | Offer amount inconsistency across bubbles; date in English not Spanish; `listo/a` slash; "coaching" term confusing; double greeting when opening from home; photo contradicts itself |

---

## Task 1: Fix offer amount reversion (P0)

**Root cause:** `backend/agent.py` only sets `offer_amount = session.current_offer` for Phase 11. When Phase 12 runs, `offer_amount=0` → `build_system_prompt` receives `offer_amount=0` → Phase 12 prompt says `offer_amount=$10,000 MXN` (using `approved_amount` fallback), even if customer negotiated up to $11,000.

**Files:**
- Modify: `backend/agent.py`
- Modify: `backend/prompts.py`

**Step 1: Fix `agent.py` to pass `current_offer` to Phase 12**

In `agent.py`, change lines ~161–164:

```python
# Current code:
offer_amount = 0
if session.phase == "11":
    offer_amount = session.current_offer

# Fixed:
offer_amount = 0
if session.phase in ("11", "12"):
    offer_amount = session.current_offer
```

**Step 2: Fix Phase 12 prompt to use `offer_fmt` not `amount_fmt`**

In `prompts.py`, find the Phase 12 block (~line 721):

```python
# Current:
f"     Use the collected context (offer_amount={amount_fmt} MXN) if available.\n"

# Fixed (use offer_fmt if set, else amount_fmt):
f"     The accepted amount is {offer_fmt if offer_amount > 0 else amount_fmt} MXN — use this exact figure.\n"
```

**Step 3: Verify by running `agent.py` manually**

With `approved_amount=10000`, `max_amount=11000`, and a session that negotiated to 11000, Phase 12 should say "$11,000 MXN", not "$10,000 MXN".

**Step 4: Run eval tests**
```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```
Expected: all pass

**Step 5: Commit**
```
git commit -m "fix: Phase 12 prompt uses negotiated offer amount, not approved_amount default"
```

---

## Task 2: Fix payment date hallucination in Phase 12 (P0)

**Root cause:** Phase 12 prompt instructs the LLM to include "first payment date" in the closing summary — but the backend never receives the date the customer selected in the configurator. The LLM hallucinates a date that doesn't match the UI.

**Files:**
- Modify: `backend/prompts.py`

**Step 1: Remove "first payment date" from Phase 12 closing instruction**

In `prompts.py`, Phase 12 block (~lines 718–726):

```python
# Current:
"  1. Congratulate them warmly — their loan is approved.\n"
"  2. Give a brief summary: amount, number of payments, and first payment date.\n"
f"     Use the collected context (offer_amount={amount_fmt} MXN) if available.\n"
"  3. Tell them the next step is to set up their disbursement — \n"
"     they'll confirm where to receive their funds.\n"
f"  4. End with: '{disburse_cta}'\n"
"     (A disbursement button will appear automatically — do NOT invent other UI.)\n"

# Fixed:
"  1. Congratulate them warmly — their loan is approved.\n"
f"  2. Give a brief summary: the accepted amount and number of payments.\n"
f"     The accepted amount is {offer_fmt if offer_amount > 0 else amount_fmt} MXN.\n"
"     Do NOT mention a specific payment date — the customer can see that in their app.\n"
"  3. Tell them the next step is to set up their disbursement — \n"
"     they'll confirm where to receive their funds.\n"
f"  4. End with: '{disburse_cta}'\n"
"     (A disbursement button will appear automatically — do NOT invent other UI.)\n"
```

**Step 2: Verify by testing through the full onboarding flow**

After accepting the loan, the Phase 12 closing message should NOT contain any specific date like "April 22" or "May 1". It should only state the amount and number of payments.

**Step 3: Commit**
```
git commit -m "fix: remove hallucinated payment date from Phase 12 closing — agent doesn't know selected date"
```

---

## Task 3: Force Phase 12 → complete regardless of LLM advance signal (P0)

**Root cause:** `showDisbursementButton = offerHandled && state.isComplete && !isTyping`. `state.isComplete` is only set when the backend returns `phase="complete"`. Phase 12 sets `phase="complete"` only if `result.advance_phase=True`. If the LLM fails to set `advance_phase=True`, the button never appears — matching Bethy's report that the button was missing until she explicitly asked about it.

**Files:**
- Modify: `backend/agent.py`

**Step 1: Force-advance Phase 12 to complete**

In `agent.py`, find the Phase 12 advancement block (~lines 248–250):

```python
# Current:
elif phase == "12":
    if result.advance_phase:
        session.phase = "complete"

# Fixed — Phase 12 always completes after delivering its message:
elif phase == "12":
    session.phase = "complete"
```

**Step 2: Verify the disburse button appears**

After accepting terms, the Phase 12 closing message should arrive, and the "Disburse my loan" button should appear immediately after (without needing to ask about it).

**Step 3: Run eval tests**
```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

**Step 4: Commit**
```
git commit -m "fix: Phase 12 always advances to complete — don't rely on LLM advance_phase signal"
```

---

## Task 4: Fix interest rate mismatch — agent says 1%, UI shows 0.83% (P1)

**Root cause:** `backend/agent.py` Session defaults `interest_rate_daily = 0.01` (1%). The frontend `constants.ts` uses `interestRateDaily: 0.0083` (0.83%). These must match.

**Files:**
- Modify: `backend/agent.py`
- Modify: `backend/prompts.py`

**Step 1: Update Session default in `agent.py`**

Line ~53:
```python
# Current:
interest_rate_daily: float = 0.01  # 1% per day default

# Fixed:
interest_rate_daily: float = 0.0083  # 0.83% per day — matches frontend configurator
```

**Step 2: Update Phase 11 rate format to 2 decimal places**

In `prompts.py`, Phase 11 block (~line 687):
```python
# Current:
rate_pct = f"{interest_rate_daily * 100:.1f}%"  # → "0.8%" (rounds wrong)

# Fixed:
rate_pct = f"{interest_rate_daily * 100:.2f}%"  # → "0.83%"
```

**Step 3: Verify the Phase 11 offer message says "0.83% daily interest"**

**Step 4: Run eval tests**
```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

**Step 5: Commit**
```
git commit -m "fix: align interest rate to 0.83%/day to match frontend configurator"
```

---

## Task 5: Fix payment dates shown in reverse order (P1)

**Root cause:** Hadis reported the cost summary in the configurator shows "2nd payment date" before "1st payment date". Need to find and fix the rendering order in the cost summary.

**Files:**
- Investigate: `frontend/components/chat/LoanConfigModal.tsx`
- Investigate: `frontend/app/(app)/offer/page.tsx`

**Step 1: Find the cost summary row order**

In `LoanConfigModal.tsx`, search for where `firstPaymentDate` and `secondPaymentDate` are displayed in the cost summary section. Look for rows like "1st payment date" / "2nd payment date".

**Step 2: Check rendering order**

The rows should appear in this order:
1. Principal
2. Interest
3. Processing fee
4. Total to repay
5. **1st payment date** (then 2nd if applicable)

If 2nd appears before 1st, swap their order.

**Step 3: Verify in `offer/page.tsx` as well** — it has the same cost summary. Ensure consistent ordering.

**Step 4: Commit**
```
git commit -m "fix: show 1st payment date before 2nd in cost summary"
```

---

## Task 6: Fix double intro message when opening coaching from home (P1)

**Root cause:** `ChatOverlay.tsx` useEffect fires when `state.overlayOpen` changes. The guard `if (state.mode === 'coaching' && state.messages.length > 0) return` can fail during a race condition: the overlay is opened, `startCoaching` is called, but before messages arrive, the overlay closes and reopens — `state.messages.length` is still 0, so `startCoaching` fires again.

**Files:**
- Modify: `frontend/components/chat/ChatOverlay.tsx`
- Verify: `frontend/contexts/ChatContext.tsx`

**Step 1: Add a starting guard ref in `ChatOverlay.tsx`**

```tsx
// Current:
useEffect(() => {
  if (!state.overlayOpen) return
  if (state.mode === 'coaching' && state.messages.length > 0) return
  ...
  startCoaching(...)
}, [state.overlayOpen])

// Fixed — also gate on whether coaching has already been initiated:
const coachingStarted = useRef(false)

useEffect(() => {
  if (!state.overlayOpen) return
  if (state.mode === 'coaching' && state.messages.length > 0) return
  if (coachingStarted.current) return
  coachingStarted.current = true
  ...
  startCoaching(...)
}, [state.overlayOpen])
```

Note: `coachingStarted` should NOT reset on overlay close/reopen — once coaching has started for this session, it's started. The ref persists for the component lifetime (app session).

**Step 2: Verify**

Open coaching from home, close the overlay, reopen it. Only ONE greeting bubble should appear. No duplicate intro messages.

**Step 3: Commit**
```
git commit -m "fix: prevent double coaching intro when overlay is closed and reopened"
```

---

## Task 7: Fix locale-aware date formatting in prompts (P1)

**Root cause:** `today = datetime.now().strftime("%A, %B %d, %Y")` always produces English (e.g. "Thursday, March 26, 2026"). For `es-MX` locale, the agent system prompt should say "jueves, 26 de marzo de 2026".

**Files:**
- Modify: `backend/prompts.py`

**Step 1: Replace `strftime` with locale-aware formatting**

In `prompts.py`, `build_system_prompt()` function (~line 281):

```python
# Current:
today = datetime.now().strftime("%A, %B %d, %Y")

# Fixed:
from babel.dates import format_date
import locale as _locale

def _format_today(locale: str) -> str:
    babel_locale = "es_MX" if locale == "es-MX" else "en_US"
    try:
        return format_date(datetime.now(), format="EEEE, d 'de' MMMM 'de' y", locale=babel_locale) if locale == "es-MX" \
            else format_date(datetime.now(), format="EEEE, MMMM d, y", locale=babel_locale)
    except Exception:
        return datetime.now().strftime("%A, %B %d, %Y")

# Replace the line with:
today = _format_today(locale)
```

**Step 2: Install `babel` if not already a dependency**

```bash
cd backend && pip show babel || pip install babel
```

Add `babel` to `backend/requirements.txt`.

**Step 3: Verify**

With `locale="es-MX"`, the system prompt should say "jueves, 26 de marzo de 2026". With `locale="en"`, it should say "Thursday, March 26, 2026".

**Step 4: Run eval tests**
```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

**Step 5: Commit**
```
git commit -m "fix: locale-aware date formatting in prompts — Spanish sessions get Spanish dates"
```

---

## Task 8: Fix wrong emoji for business type (P2)

**Root cause:** The emoji hint list in `prompts.py` maps `📱 online sales` — so online store sellers get a phone emoji, which is inappropriate. Dessert sellers get `🌮 food` — tacos for a dessert stand is wrong.

**Files:**
- Modify: `backend/prompts.py`

**Step 1: Expand the emoji hint list**

In `prompts.py` (~line 233–235), update the emoji map:

```python
# Current:
"- When the customer first mentions their business type, you may use ONE "
"relevant emoji to connect (🍞 bakery, ☕ coffee, 🧶 crafts, 🌮 food, "
"📱 online sales, etc.). Use this once — it's your secret weapon for rapport.\n"

# Fixed — more specific categories:
"- When the customer first mentions their business type, you may use ONE "
"relevant emoji to connect:\n"
"  🍞 bakery/bread, 🧁 desserts/sweets/cakes, ☕ coffee/drinks, 🌮 tacos/food stall,\n"
"  🥩 butcher/meat, 🧶 crafts/handmade, 💻 online store/e-commerce, 🛍️ retail/clothing,\n"
"  🚗 auto services, 💇 salon/beauty, 🏗️ construction, 🌿 plants/flowers, etc.\n"
"  Pick the MOST specific match — never use 📱 for an online store.\n"
"  Use this once — it's your secret weapon for rapport.\n"
```

**Step 2: Also fix the intro emoji in Phase 0**

The intro message in Phase 0 shows a hardcoded emoji based on `business_type`. Check if this is hardcoded and fix it too. Search for the intro emoji logic in `prompts.py`.

**Step 3: Verify**

With `businessType="online store"`, the first message referencing the business should use 💻 or 🛍️, not 📱. With `businessType="dessert stand"`, use 🧁 not 🌮.

**Step 4: Commit**
```
git commit -m "fix: expand emoji map for business types — online store gets 💻, desserts get 🧁"
```

---

## Task 9: Add explanation for "Recommended" payment date (P2)

**Root cause:** The later payment date is labeled "RECOMMENDED" with no explanation. This date is actually the most expensive option (more days = more interest). Reema reported this as misleading and trust-damaging.

The recommendation logic in `constants.ts` comment says: "more breathing room". This is the actual reason — it gives more time before the first payment, which can be helpful for cash flow. The explanation should appear as a subtitle.

**Files:**
- Modify: `frontend/app/(app)/offer/page.tsx`
- Modify: `frontend/components/chat/LoanConfigModal.tsx`

**Step 1: Add a subtitle line below the "Recommended" badge in `offer/page.tsx`**

Find the `{recommended && ...}` block (~line 137). Below the "Recommended" badge span, add:

```tsx
{recommended && (
  <div className="text-right">
    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a989e] bg-[#d2f2f4] px-2 py-0.5 rounded-full">
      {t('offer.recommended')}
    </span>
    <p className="text-[9px] text-[#939490] mt-0.5 text-right">
      {isEs ? 'Más tiempo para prepararte' : 'More time to prepare'}
    </p>
  </div>
)}
```

**Step 2: Apply the same change to `LoanConfigModal.tsx`** (~line 134)

Same pattern as Step 1.

**Step 3: Verify**

The recommended date row should show "RECOMMENDED" badge + "Más tiempo para prepararte" subtitle below it. Users can see why it's recommended without being misled.

**Step 4: Commit**
```
git commit -m "fix: add explanation text below 'Recommended' payment date badge"
```

---

## Task 10: Fix "I can't pay" servicing — stop re-asking known info (P1)

**Root cause:** JessicaK's screenshot shows the servicing agent asking "Did your due date already pass, or what exact date is it?" — but the agent already has the due date from the loan data. The servicing prompt's difficulty protocol should use pre-filled loan context instead of asking for it again.

**Files:**
- Modify: `backend/prompts.py`

**Step 1: Find the servicing difficulty protocol in `prompts.py`**

Search for the section handling "can't pay" / "late payment" / "difficulty" in the servicing mode prompts.

**Step 2: Inject loan context into the difficulty protocol**

The servicing session should have `approved_amount` and potentially `due_date` from the collected context. Update the difficulty protocol to reference them:

```python
# In the servicing difficulty protocol section:
# Add at the top:
"When a customer says they can't pay or are struggling:\n"
f"  You already know their due date and amount — do NOT ask for information you have.\n"
f"  Reference what you know: 'I can see your payment of [amount] is due on [date]...'\n"
"  Then ask: how much could you pay today?\n"
```

**Step 3: Ensure due date is threaded into the servicing session**

Check `frontend/services/chat-service-api.ts` `getServicingOpening` call — verify it passes `loan.firstPaymentDate` and `loan.monthlyPayment` in the `collected` dict so the backend has access to these.

If not, update the call to pass:
```typescript
collected: {
  ...profile,
  dueDate: loanConfig?.firstPaymentDate,
  amountDue: String(loanConfig?.monthlyPayment ?? ''),
}
```

**Step 4: Commit**
```
git commit -m "fix: servicing difficulty protocol uses known due date and amount — no re-asking"
```

---

## Task 11: Add off-topic guardrail (P2)

**Root cause:** Veer was able to get the agent to generate math calculations and a website. The current `ABSOLUTE_RULES` doesn't explicitly forbid generating arbitrary content on request.

**Files:**
- Modify: `backend/prompts.py`

**Step 1: Add guardrail to `ABSOLUTE_RULES`**

Find the `ABSOLUTE_RULES` section in `prompts.py` and add:

```python
"5. STAY ON TOPIC. Never generate math calculations, code, websites, step-by-step\n"
"   tutorials, or any content unrelated to Tala credit and business coaching.\n"
"   If asked to do something off-topic, redirect warmly: 'I'm focused on helping\n"
"   with your credit and business — let me know if you have questions about those!'\n"
```

**Step 2: Verify**

With a message like "Can you write me a website?" or "Calculate compound interest for me", the agent should politely redirect instead of complying.

**Step 3: Run eval tests**
```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

**Step 4: Commit**
```
git commit -m "fix: add off-topic guardrail to ABSOLUTE_RULES — redirect non-Tala requests"
```

---

## Task 12: Improve flexibility for "I don't know" answers (P2)

**Root cause:** María couldn't get past certain phases because the agent kept pressing for exact numbers even when she said "I don't know" or gave adjacent answers. Phases 4 (weekly revenue), 5 (outlook), 6 (cash cycle), 7 (main expenses), and 8 (working capital) all need explicit "I don't know" handling.

Note: Phases 4 and 8 already have flexibility instructions ("accept ranges, rough estimates"). The gap is phases 5, 6, and 7.

**Files:**
- Modify: `backend/prompts.py`

**Step 1: Audit phases 5, 6, 7 for "I don't know" handling**

Read the Phase 5, 6, and 7 prompts in `prompts.py`. Look for the `WHEN CUSTOMER ANSWERS` section in each.

**Step 2: Add flexibility instruction to Phase 5 (outlook)**

```python
# In Phase 5 WHEN CUSTOMER ANSWERS:
"  1. ALWAYS extract into extracted['nearTermOutlook'] — accept any description,\n"
"     vague or specific. If they say 'I don't know', extract 'uncertain' and move on.\n"
```

**Step 3: Add flexibility instruction to Phase 6 (cash cycle)**

```python
# In Phase 6 WHEN CUSTOMER ANSWERS:
"  1. ALWAYS extract into extracted['cashCycleSpeed'] — accept rough estimates or\n"
"     'I don't know.' Don't push for precision. If unsure, extract 'varies' and advance.\n"
```

**Step 4: Add flexibility instruction to Phase 7 (main expenses)**

```python
# In Phase 7 WHEN CUSTOMER ANSWERS:
"  1. ALWAYS extract into extracted['mainExpenses'] — accept any answer, including\n"
"     'I'm not sure.' Don't ask for exact numbers. Extract what they give and move on.\n"
```

**Step 5: Add a general "I don't know" fallback to `CONVERSATION_RULES`**

```python
"10. If a customer says 'I don't know', 'not sure', or gives a vague answer,\n"
"    extract what you can (use 'uncertain' or 'varies' if truly nothing extractable),\n"
"    acknowledge briefly, and advance. Never interrogate for precision.\n"
```

**Step 6: Verify**

Test a flow where responses are all "I don't know" — the agent should acknowledge and advance through phases rather than looping.

**Step 7: Run eval tests**
```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

**Step 8: Commit**
```
git commit -m "fix: accept 'I don't know' answers in all phases — never interrogate for precision"
```

---

## Task 13: Fix "Business Coach" subtitle and `listo/a` slash (P2)

**Root cause (subtitle):** `ChatOverlay.tsx` hardcodes "Business Coach" — confusing for Spanish-speaking testers. The PDF notes suggest "Asistente de negocios" is more natural.

**Root cause (listo/a):** Several strings in `prompts.py` and `es-MX.json` use "listo/a" slash notation, which looks mechanical. Should use neutral phrasing.

**Files:**
- Modify: `frontend/components/chat/ChatOverlay.tsx`
- Modify: `backend/prompts.py`
- Modify: `frontend/lib/i18n/es-MX.json`

**Step 1: Fix subtitle in `ChatOverlay.tsx`**

```tsx
// Current:
<p className="text-[10px] text-[#939490]">Business Coach</p>

// Fixed — locale-aware:
<p className="text-[10px] text-[#939490]">
  {locale === 'es-MX' ? 'Asistente de negocios' : 'Business assistant'}
</p>
```

Import `useLocale` if not already imported.

**Step 2: Fix `listo/a` in `prompts.py`**

Search for "listo/a" in `prompts.py`. Replace with gender-neutral alternatives:
- `"listo/a"` → `"listo"` (neutral in informal MX context, or)
- `"Cuando estés listo/a"` → `"Cuando estés listo"` or `"Cuando quieras"`

**Step 3: Fix `listo/a` in `es-MX.json`**

Search for "listo/a" in the i18n file. Replace with `"listo"` or reword.

**Step 4: Commit**
```
git commit -m "fix: 'Asistente de negocios' subtitle for Spanish; remove listo/a slash"
```

---

## Task 14: Add AI disclosure and improve Phase 0 opening (P3)

**Root cause (PDF):** The PDF tester noted Thalia should clarify from the first message that it's AI-powered. Currently Phase 0 doesn't mention this. Also, the second bubble starts too abruptly ("Son 2 partes") without a conversational bridge.

**Files:**
- Modify: `backend/prompts.py`

**Step 1: Find Phase 0 copy in `prompts.py`**

Search for `"p0_part1"` and `"p0_part2"` in the `LOCALE_CONFIG`. These are the exact strings used for the Phase 0 opening.

**Step 2: Add AI disclosure and conversational opener for es-MX**

In the `es-MX` config, update Phase 0 strings to include a brief AI mention:

Current `p0_part1` (es-MX equivalent): starts with direct intro.

Updated:
```python
"p0_intro_ai": "Soy Thalia, tu asistente de IA de Tala — aquí para ayudarte con crédito y consejos para tu negocio.",
"p0_part1": "Hay dos partes rápidas:",  # More conversational than "Son 2 partes"
```

**Step 3: Update Phase 0 prompt to use the new strings**

In the Phase 0 section of `build_system_prompt()`, add the AI disclosure as the first bubble, then the two-part explanation.

**Step 4: Commit**
```
git commit -m "fix: Phase 0 AI disclosure + more conversational opening for es-MX"
```

---

## Task 15: Ask online sellers what they sell (P3)

**Root cause:** Avani (online store) noted the agent never asked what she was selling. Phase 1 collects `sellingChannel` but when the channel is online/e-commerce, no follow-up on `productCategory` is asked — making the business profile feel incomplete and the coaching less relevant.

**Files:**
- Modify: `backend/prompts.py`
- Modify: `backend/state.py` (add `productCategory` to `ExtractedFields`)

**Step 1: Add `productCategory` to `ExtractedFields` in `state.py`**

```python
class ExtractedFields(BaseModel):
    ...
    productCategory: str | None = Field(default=None, description="What the business sells/offers, e.g. 'handmade jewelry', 'cupcakes', 'clothing'")
```

**Step 2: Add `productCategory` to `PHASE_FIELD` skip logic if already known**

In `agent.py`, this field doesn't need to gate a phase — it's supplementary. It gets collected during Phase 1 when selling channel is online.

**Step 3: Update Phase 1 prompt to follow up on product category for online sellers**

In Phase 1's `WHEN CUSTOMER ANSWERS` section:

```python
"  1. Extract selling channel into extracted['sellingChannel'].\n"
"  2. If they mention online/e-commerce/digital selling, also ask:\n"
"     'Great — and what are you selling? (e.g. clothing, crafts, food?)'\n"
"     Extract their answer into extracted['productCategory'].\n"
"  3. If selling channel is physical/in-person, skip productCategory.\n"
```

**Step 4: Commit**
```
git commit -m "feat: ask online sellers what they sell — extract productCategory in Phase 1"
```

---

## Task 16: Update onboarding intro screen copy (P1)

**Context:** The intro slides (`/intro` route) use i18n keys. The current JSON copy doesn't match the approved Figma design. Both EN and ES must be updated together.

The intro screen component is `frontend/app/(app)/intro/page.tsx` — it's pure i18n, no logic changes needed.

**Files:**
- Modify: `frontend/lib/i18n/en.json`
- Modify: `frontend/lib/i18n/es-MX.json`

**Step 1: Update `en.json` intro section**

Find the `"intro"` block and replace all slide strings:

```json
"intro": {
  "slide1Title": "Hey! I'm Thalía — your AI assistant and growth partner",
  "slide1Desc": "I'm here to help you get your credit quickly and easily.",
  "slide2Title": "Let's take your business to the next level",
  "slide2Desc": "I'll give you tips to boost your sales and make your business thrive. The more I know about your goals, the more I can help turn them into reality.",
  "slide3Title": "You've got a partner every step of the way",
  "slide3Desc": "From managing your credit to adjusting payments when needed, I'm here to make things simpler and smoother.",
  "slide4Title": "Let's chat — and make things happen",
  "slide4Desc": "Chatting with me is 100% secure. Share your goals and needs, and together we'll make your financial journey faster, smarter, and more rewarding.",
  "privacyTitle": "About your privacy",
  "privacyDesc": "Tala prioritizes the privacy of your data. The information you share is confidential. This assistant does not offer financial advice.",
  "privacyLink": "View Privacy Policy",
  "letsGo": "Let's go",
  "notNow": "Not now",
  "next": "Next"
}
```

Note: slide3Desc uses "credit" not "loan" — matches product rules.

**Step 2: Update `es-MX.json` intro section**

```json
"intro": {
  "slide1Title": "¡Hola! Soy Thalía, tu asistente de IA y aliada para crecer",
  "slide1Desc": "Estoy aquí para ayudarte a recibir tu crédito de forma rápida y sencilla.",
  "slide2Title": "Llevemos tu negocio al siguiente nivel",
  "slide2Desc": "Te daré consejos para impulsar tus ventas y hacer que tu negocio prospere. Mientras más conozca tus metas, mejor podré ayudarte a hacerlas realidad.",
  "slide3Title": "Seré tu aliada en cada momento",
  "slide3Desc": "Desde administrar tu crédito hasta ajustar tus pagos cuando lo necesites, estoy aquí para que todo sea más fácil y sencillo.",
  "slide4Title": "¡Hagamos tus metas realidad!",
  "slide4Desc": "Platicar conmigo es 100% seguro. Cuéntame tus metas y necesidades, y juntos haremos que tu experiencia financiera sea más rápida, inteligente y llena de beneficios.",
  "privacyTitle": "Sobre tu privacidad",
  "privacyDesc": "Tala prioriza la privacidad de tus datos. La información que compartes es confidencial. Este asistente no ofrece asesoramiento financiero.",
  "privacyLink": "Ver Política de Privacidad",
  "letsGo": "¡Empecemos!",
  "notNow": "Tal vez después",
  "next": "Siguiente"
}
```

Note: slide1Desc and slide3Desc use "crédito" not "préstamo" — matches product rules.

**Step 3: Verify**

Load `/intro` with `DEMOEN` (English) and `DEMO` (Spanish) tester profiles. All 4 slides should show the updated copy. Slide 3 must NOT say "loan" / "préstamo" — only "credit" / "crédito".

**Step 4: Commit**
```
git commit -m "fix: update intro onboarding slides copy for EN and ES — credit not loan, new slide text"
```

---

## Task 17: Redesign Phase 11 offer flow — expectations check + auto-show configure after negotiation (P1)

**Context:** Currently Phase 11:
1. Presents offer
2. Waits for customer response
3. If YES → opens configurator
4. If NO (negotiate) → presents max offer, waits for YES again → opens configurator

**Desired flow:**
1. Present offer → ask "does this meet your expectations?"
2. If YES → "great, let me open it up for you" → configure button shows
3. If NO → present max offer, say "that's the best I can do" → configure button shows **automatically** (no second YES required)

The configure button currently shows when `lastMessage.isOffer === true`. For auto-show after negotiation, the negotiated-offer response also needs `is_offer=true`.

**Files:**
- Modify: `backend/prompts.py`
- Modify: `backend/agent.py`
- Modify: `backend/main.py` (verify `is_offer` flag logic)

**Step 1: Update Phase 11 prompt in `prompts.py`**

Find the Phase 11 block (~line 685). Replace Steps 1-4 with:

```python
"STEP 1 — PRESENT THE OFFER (advance_phase=false):\n"
"  ONE bubble. Lead with warm congratulations, state the key terms:\n"
f"  '✨ Great news — you're approved for **{amount_fmt} MXN** at **{rate_pct} daily interest**,\n"
f"  for up to **60 days** (1 or 2 payments).'\n"
"  End with: 'Does this offer meet your expectations?'\n"
"  Set advance_phase=false. Set offer_negotiated=false.\n\n"

"STEP 2 — CUSTOMER SAYS YES (they accept the initial offer):\n"
f"  ONE short bubble: '{t('p11_ready_cta')}'\n"
"  Set advance_phase=false. Set is_offer=true. The configure button will appear automatically.\n\n"

"STEP 3 — CUSTOMER SAYS NO / ASKS FOR MORE:\n"
f"  Increase to {max_fmt} MXN (absolute ceiling). ONE bubble:\n"
f"  'I can stretch it to **{max_fmt} MXN** for you — that's the best I can do.\n"
f"  {t('p11_ready_cta')}'\n"
"  Set offer_negotiated=true. Set advance_phase=false. Set is_offer=true.\n"
"  The configure button will appear automatically — do NOT wait for another confirmation.\n\n"

"STEP 4 — CUSTOMER HAS ACCEPTED VIA THE APP (message says 'I've accepted the loan of...'):\n"
"  Write ONE warm congratulations bubble. Set advance_phase=true.\n"
```

**Step 2: Verify `is_offer` flag is returned in `main.py`**

In `main.py`, check how `is_offer` is set in `ChatResponse`. It must be `True` for both the initial offer acknowledgment (Step 2) and the negotiated offer (Step 3).

The `is_offer` field in `AgentDecision` (in `state.py`) should be set by the LLM when instructed. Verify the `state.py` model has an `is_offer` field and the prompt now explicitly instructs `Set is_offer=true` in Steps 2 and 3.

If `is_offer` is not currently in `AgentDecision`, add it:
```python
# In state.py AgentDecision:
is_offer: bool = Field(default=False, description="True when presenting a final offer ready for configuration.")
```

And in `main.py`, pass it through:
```python
is_offer=result.is_offer if hasattr(result, 'is_offer') else False,
```

**Step 3: Verify**

Full Phase 11 test:
- **Happy path:** Offer presented → "Yes" → configure button shows → complete flow
- **Negotiate:** Offer presented → "Can you give me more?" → improved offer appears + configure button shows immediately without needing to say "yes" again
- Configure button must NOT appear during the initial offer presentation (only after YES or after negotiation)

**Step 4: Run eval tests**
```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

**Step 5: Commit**
```
git commit -m "feat: Phase 11 offer flow — expectations check + auto-show configure after negotiation"
```

---

## Execution order

Run tasks in this priority order:
1. **Task 1** — Offer amount reversion (blocks full-flow testing)
2. **Task 2** — Payment date hallucination (blocking trust)
3. **Task 3** — Force Phase 12 → complete (disbursement button)
4. **Task 16** — Onboarding intro copy (quick i18n-only change, good warmup)
5. **Task 4** — Interest rate mismatch
6. **Task 17** — Phase 11 offer flow redesign
7. **Task 5** — Payment dates reversed in UI
8. **Task 6** — Double intro in coaching
9. **Task 7** — Locale-aware date formatting
10. **Task 10** — "Can't pay" flow
11. **Task 11** — Off-topic guardrail
12. **Task 12** — "I don't know" flexibility
13. **Task 8** — Emoji fixes
14. **Task 9** — "Recommended" badge explanation
15. **Task 13** — Business Coach subtitle / listo/a
16. **Task 14** — AI disclosure
17. **Task 15** — Online seller product category

**After all prompt changes:** Run the full onboarding flow end-to-end with both `DEMO` and `DEMOEN` tester profiles, then:
```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```
Then push to `dubyak` for Railway deployment.
