# Research Feedback Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address six issues surfaced by the research team from customer usability sessions: default locale, loan number inconsistency, confusing CTA, coaching off-ramp, session persistence, and agent communication quality.

**Architecture:** Mostly isolated, single-file changes to existing frontend contexts, components, and the backend prompt builder. Session persistence follows the FlowContext pattern (localStorage + useReducer init). Loan number bug is a missing `firstDueDate` argument in `TermsModal`. Tasks are independent and can be executed in any order.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 3, Python FastAPI, OpenAI structured output

---

## File Map

| File | Change |
|------|--------|
| `frontend/contexts/LocaleContext.tsx` | Change default locale from `'en'` to `'es-MX'` |
| `frontend/contexts/ChatContext.tsx` | Persist messages + phase to localStorage; restore on mount |
| `frontend/services/chat-service-api.ts` | Move session_id from sessionStorage → localStorage |
| `frontend/app/(app)/onboarding/page.tsx` | Skip reset+start if restored messages exist |
| `frontend/components/chat/TermsModal.tsx` | Pass `firstDueDate` from `getSmartDueDates()` to `calculateLoan` |
| `frontend/app/(app)/home/page.tsx` | Fix hardcoded `'March 1'` fallback date |
| `frontend/components/chat/ChatWindow.tsx` | Improve CTA button affordance; add Phase 9 "Skip to offer" button |
| `frontend/components/chat/ChatOverlay.tsx` | Make close button more obvious |
| `backend/prompts.py` | Add hard 2-bubble cap, plain-language rule, examples framing rule; fix Phase 11 advance trigger |

---

## Task 1: Default locale to Spanish

**Files:**
- Modify: `frontend/contexts/LocaleContext.tsx:18`

- [ ] **Step 1: Write the failing test**

There's no automated test for this — visually verify. Skip directly to implementation.

- [ ] **Step 2: Change the default**

In `frontend/contexts/LocaleContext.tsx`, change line 18:

```typescript
// Before
const [locale, setLocaleState] = useState<Locale>('en')

// After
const [locale, setLocaleState] = useState<Locale>('es-MX')
```

The `useEffect` on line 21-26 still reads from localStorage and overrides if a saved value exists — so returning testers with `'en'` saved will still get English. New testers get Spanish by default.

- [ ] **Step 3: Verify**

Run: `cd frontend && npm run build`
Expected: No type errors. Exit 0.

- [ ] **Step 4: Visual check**

Run `cd frontend && npm run dev`, open the app as a new user (no `tala_locale` in localStorage). The entire UI should be in Spanish.

- [ ] **Step 5: Commit**

```bash
git add frontend/contexts/LocaleContext.tsx
git commit -m "fix: default locale to es-MX for new users"
```

---

## Task 2: Fix inconsistent loan numbers

**Root cause:** `TermsModal.tsx` calls `calculateLoan` without a `firstDueDate`, defaulting to 30 days from today. The offer page uses `getSmartDueDates()` (1st or 16th of next month). The resulting dates and totals diverge. Separately, `home/page.tsx` has a hardcoded `'March 1'` fallback.

**Files:**
- Modify: `frontend/components/chat/TermsModal.tsx:65-71`
- Modify: `frontend/app/(app)/home/page.tsx:11-24`

- [ ] **Step 1: Fix TermsModal — add firstDueDate**

In `frontend/components/chat/TermsModal.tsx`, update the import on line 7 and the `loan` calculation on lines 65-71:

```typescript
// Line 7 — updated import
import { calculateLoan, formatMXN, getSmartDueDates } from '@/lib/constants'
```

```typescript
// Lines 65-71 — updated loan calculation (inside the component body, before the return)
const dueDateOptions = getSmartDueDates()
const defaultDueDate = dueDateOptions.find(d => d.recommended)?.date ?? dueDateOptions[0]?.date

const loan = calculateLoan(
  amount,
  installments,
  tester?.interestRateDaily ?? 0.0028,
  tester?.processingFeeRate ?? 0.04,
  locale,
  defaultDueDate
)
```

This matches the default selected date on the offer page, which also marks the last `getSmartDueDates()` entry as recommended.

- [ ] **Step 2: Fix home/page.tsx fallback date**

In `frontend/app/(app)/home/page.tsx`, update the import on line 8 and the fallback on line 24:

```typescript
// Line 8 — updated import
import { formatMXN, getSmartDueDates, formatDate } from '@/lib/constants'
```

Add this block after line 15 (after `const { t } = useTranslation()`):

```typescript
const locale = tester?.locale ?? 'es-MX'
```

Update lines 20-24 (the loan variable block):

```typescript
const loan = mounted ? flow.loanConfig : undefined
const amount = loan?.amount ?? tester?.approvedAmount ?? 8000
const totalRepayment = loan?.totalRepayment ?? amount * 1.12
const monthlyPayment = loan?.monthlyPayment ?? totalRepayment
const fallbackDate = getSmartDueDates().find(d => d.recommended)?.date
const firstPaymentDate = loan?.firstPaymentDate
  ?? (fallbackDate ? formatDate(fallbackDate, locale) : '')
```

Remove the old `const firstPaymentDate = loan?.firstPaymentDate ?? 'March 1'` line.

- [ ] **Step 3: Build check**

Run: `cd frontend && npm run build`
Expected: Exit 0, no TypeScript errors.

- [ ] **Step 4: Manual verify**

Go through the in-chat offer flow (LoanConfigModal → TermsModal → accept). On home screen, confirm the payment date matches what was shown in the modal (both should show the recommended date from `getSmartDueDates()`).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/chat/TermsModal.tsx frontend/app/(app)/home/page.tsx
git commit -m "fix: align loan dates between TermsModal and home screen"
```

---

## Task 3: Improve CTA button affordance

**Context:** After the Phase 0 welcome, a "Continuar mi solicitud" / "Continue my application" button appears. Customers are typing "continuar" instead of clicking it — they don't perceive it as a button. Make it visually unambiguous with a larger tap target, arrow icon, and subtle pulse.

**Files:**
- Modify: `frontend/components/chat/ChatWindow.tsx:116-130`

- [ ] **Step 1: Replace the ready button markup**

In `frontend/components/chat/ChatWindow.tsx`, the import line 1-6 already imports from 'react'. Add `ChevronRight` to the lucide-react import if not already present. Check line 3 — currently imports `dynamic` from 'next/dynamic'. Add this import if not present:

```typescript
import { ChevronRight } from 'lucide-react'
```

Replace lines 116-130 (the `showReadyButton` block):

```tsx
{showReadyButton && (
  <div className="flex flex-col items-center gap-2 pt-3 pb-2 animate-fade-in">
    <p className="text-xs text-[#939490] font-light">
      {isEs ? 'Toca para continuar' : 'Tap to continue'}
    </p>
    <button
      onClick={() => sendMessage(isEs ? 'Continuar mi solicitud' : 'Continue my application')}
      className="flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold transition-all active:scale-95 touch-active animate-pulse-once"
      style={{
        background: '#00A69C',
        color: '#FFFFFF',
        boxShadow: '0 4px 16px rgba(0,166,156,0.45)',
        minWidth: 220,
        justifyContent: 'center',
      }}
    >
      {isEs ? 'Continuar mi solicitud' : 'Continue my application'}
      <ChevronRight size={18} />
    </button>
  </div>
)}
```

- [ ] **Step 2: Add pulse animation to globals.css or tailwind config**

Check if `animate-pulse-once` is defined. Open `frontend/app/globals.css` or `frontend/tailwind.config.ts`. If `animate-pulse-once` isn't there, add a one-shot scale pulse. In `globals.css`:

```css
@keyframes pulse-once {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
.animate-pulse-once {
  animation: pulse-once 1.2s ease-in-out 0.5s 2;
}
```

If the project uses `tailwind.config.ts` for custom animations, add there instead:

```typescript
// In theme.extend.animation:
'pulse-once': 'pulse-once 1.2s ease-in-out 0.5s 2',
// In theme.extend.keyframes:
'pulse-once': {
  '0%, 100%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.03)' },
},
```

- [ ] **Step 3: Build check**

Run: `cd frontend && npm run build`
Expected: Exit 0.

- [ ] **Step 4: Visual verify**

Start the app, complete Phase 0 welcome, confirm the button:
- Has an arrow icon
- Has a "Toca para continuar" / "Tap to continue" label above it
- Is larger and more button-like than before

- [ ] **Step 5: Commit**

```bash
git add frontend/components/chat/ChatWindow.tsx frontend/app/globals.css
git commit -m "fix: make phase 0 CTA visually obvious as a tappable button"
```

---

## Task 4: Add coaching off-ramp (Phase 9 skip + ChatOverlay close)

**Context:** Two separate off-ramp needs:
1. During Phase 9 (coaching demo), users get absorbed and don't know the offer is coming. Add a "Skip to offer" button.
2. The ChatOverlay's ChevronDown close button is subtle. Improve it to clearly read as "close."

**Files:**
- Modify: `frontend/components/chat/ChatWindow.tsx`
- Modify: `frontend/components/chat/ChatOverlay.tsx`
- Modify: `frontend/contexts/FlowContext.tsx` (add SKIP_TO_OFFER action)

- [ ] **Step 1: Add SKIP_TO_OFFER to FlowContext**

In `frontend/contexts/FlowContext.tsx`, add `SKIP_TO_OFFER` to the `FlowAction` union and handle it in `flowReducer`. This marks onboarding complete so the offer/terms route doesn't bounce back:

```typescript
// In FlowAction union (after line 36):
| { type: 'SKIP_TO_OFFER' }
```

```typescript
// In flowReducer switch (after ONBOARDING_COMPLETE case, around line 53):
case 'SKIP_TO_OFFER':
  return { ...state, onboardingComplete: true }
```

- [ ] **Step 2: Add "Skip to offer" button in ChatWindow**

In `frontend/components/chat/ChatWindow.tsx`, add the skip condition after the existing `showDisbursementButton` declaration (around line 72):

```typescript
const showSkipToOffer =
  state.mode === 'onboarding' &&
  phase === '9' &&
  !state.isComplete &&
  !isTyping
```

Add the router import at the top if not present: `import { useRouter } from 'next/navigation'`

Add `const router = useRouter()` inside the component function.

Add the `flowDispatch` import: `const { dispatch: flowDispatch } = useFlow()` (already imported via `useFlow` on line 26).

Add the button JSX right after the `showDisbursementButton` block (before the `showStarterGrid` block, around line 163):

```tsx
{showSkipToOffer && (
  <div className="flex justify-center pt-1 pb-2 animate-fade-in">
    <button
      onClick={() => {
        flowDispatch({ type: 'SKIP_TO_OFFER' })
        router.push('/offer')
      }}
      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border-2 border-[#1a989e] text-[#1a989e] bg-white touch-active active:bg-[#d2f2f4]"
    >
      {isEs ? 'Ir directo a mi oferta' : 'Skip to my offer'}
      <ChevronRight size={13} />
    </button>
  </div>
)}
```

- [ ] **Step 3: Improve ChatOverlay close button**

In `frontend/components/chat/ChatOverlay.tsx`, replace the close button (lines 77-82) with a more obvious version:

```tsx
// Before (lines 77-82):
<button
  onClick={closeOverlay}
  className="w-8 h-8 rounded-full bg-[#f5f6f0] flex items-center justify-center touch-active"
>
  <ChevronDown size={18} className="text-[#676d65]" />
</button>

// After:
<button
  onClick={closeOverlay}
  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f5f6f0] text-[#676d65] text-xs font-medium touch-active active:bg-[#e5e5e5]"
>
  {locale === 'es-MX' ? 'Cerrar' : 'Close'}
  <ChevronDown size={14} />
</button>
```

Also update the import in `ChatOverlay.tsx` — `ChevronDown` is already imported on line 2, so no change needed.

- [ ] **Step 4: Build check**

Run: `cd frontend && npm run build`
Expected: Exit 0, no TypeScript errors on the new `SKIP_TO_OFFER` action.

- [ ] **Step 5: Visual verify**

Reach Phase 9 in the onboarding flow. Confirm:
- A "Ir directo a mi oferta" / "Skip to offer" button appears
- Clicking it navigates to `/offer`

Open the coaching overlay from the home screen. Confirm the close button reads "Cerrar / Close" instead of an ambiguous down-arrow.

- [ ] **Step 6: Commit**

```bash
git add frontend/contexts/FlowContext.tsx frontend/components/chat/ChatWindow.tsx frontend/components/chat/ChatOverlay.tsx
git commit -m "feat: add Phase 9 skip-to-offer button and clearer coaching overlay close"
```

---

## Task 5: Session persistence — restore chat on reconnect

**Context:** ChatContext state is in-memory only. If a user disconnects mid-onboarding, all messages are lost. FlowContext already persists to localStorage — follow the same pattern for chat messages and phase.

**Files:**
- Modify: `frontend/contexts/ChatContext.tsx`
- Modify: `frontend/services/chat-service-api.ts`
- Modify: `frontend/app/(app)/onboarding/page.tsx`

- [ ] **Step 1: Persist session_id to localStorage**

In `frontend/services/chat-service-api.ts`, change `sessionStorage` to `localStorage` throughout (3 occurrences):

```typescript
// Lines 11-12: change sessionStorage → localStorage
_sessionId = localStorage.getItem('thalia_session_id')
if (!_sessionId) {
  _sessionId = makeSessionId()
  localStorage.setItem('thalia_session_id', _sessionId)
}
```

```typescript
// Line 47: change sessionStorage → localStorage
try { localStorage.removeItem('thalia_session_id') } catch { /* ignore */ }
```

- [ ] **Step 2: Restore ChatState from localStorage on mount**

In `frontend/contexts/ChatContext.tsx`, replace the `useReducer` call (line 168) with one that hydrates from localStorage on first load, following the FlowContext pattern:

```typescript
const [state, dispatch] = useReducer(chatReducer, INITIAL_STATE, (init) => {
  if (typeof window === 'undefined') return init
  try {
    const saved = localStorage.getItem('tala_chat_state')
    if (!saved) return init
    const parsed = JSON.parse(saved)
    return {
      ...init,
      messages: (parsed.messages ?? []).map((m: ChatMessage) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
      phase: parsed.phase ?? init.phase,
      mode: parsed.mode ?? init.mode,
      businessProfile: parsed.businessProfile ?? init.businessProfile,
      testerFirstName: parsed.testerFirstName ?? init.testerFirstName,
      approvedAmount: parsed.approvedAmount ?? init.approvedAmount,
      maxAmount: parsed.maxAmount ?? init.maxAmount,
      ceilingAmount: parsed.ceilingAmount ?? init.ceilingAmount,
    }
  } catch {
    return init
  }
})
```

- [ ] **Step 3: Persist on state changes**

In `frontend/contexts/ChatContext.tsx`, add a `useEffect` inside `ChatProvider` after the `useReducer` call (after the new line 168 block, before `startingRef`):

```typescript
// Persist chat state to localStorage on relevant state changes
useEffect(() => {
  const toSave = {
    messages: state.messages,
    phase: state.phase,
    mode: state.mode,
    businessProfile: state.businessProfile,
    testerFirstName: state.testerFirstName,
    approvedAmount: state.approvedAmount,
    maxAmount: state.maxAmount,
    ceilingAmount: state.ceilingAmount,
  }
  localStorage.setItem('tala_chat_state', JSON.stringify(toSave))
}, [state.messages, state.phase, state.mode, state.businessProfile,
    state.testerFirstName, state.approvedAmount, state.maxAmount, state.ceilingAmount])
```

Add `useEffect` to the existing React import at the top of the file if not already there (it's not currently imported — check line 1-9 and add `useEffect` to the import).

- [ ] **Step 4: Clear on reset**

In `frontend/contexts/ChatContext.tsx`, update the `resetChat` callback (around line 354) to also clear localStorage:

```typescript
const resetChat = useCallback(() => {
  localStorage.removeItem('thalia_session_id')
  localStorage.removeItem('tala_chat_state')
  apiChatService.resetSession()
  startingRef.current = false
  dispatch({ type: 'RESET' })
}, [])
```

Note: the old code called `sessionStorage.removeItem('thalia_session_id')` — replace that with the `localStorage` version above. `apiChatService.resetSession()` also handles clearing `_sessionId` in-memory.

- [ ] **Step 5: Skip reset+start in onboarding page if messages exist**

In `frontend/app/(app)/onboarding/page.tsx`, update the `useEffect` (lines 27-42) to skip the reset and start if the chat already has messages (restored from storage):

```typescript
useEffect(() => {
  if (!displayName || startedRef.current) return
  startedRef.current = true

  // If messages exist (restored from localStorage), skip reset+start
  if (state.messages.length > 0) return

  resetChat()
  const testerCtx = tester?.loanNumber
    ? `Loyal Tala customer since ${tester.signUpDate} — on their ${tester.loanNumber}th loan.`
    : undefined
  setTimeout(() => startOnboarding(
    displayName,
    tester?.approvedAmount,
    tester?.maxAmount,
    flow.surveyBusinessType ?? tester?.businessType,
    flow.surveyLoanPurpose,
    testerCtx,
  ), 0)
}, [displayName]) // eslint-disable-line react-hooks/exhaustive-deps
```

You'll need to add `state` to the destructuring on line 16:
```typescript
const { startOnboarding, resetChat, state } = useChat()
```

- [ ] **Step 6: Build check**

Run: `cd frontend && npm run build`
Expected: Exit 0. Check for any TypeScript errors around the `useEffect` import.

- [ ] **Step 7: Manual verify**

Start an onboarding session, get through a few messages, then close the tab. Reopen the app. Confirm:
- Messages are restored
- Chat continues from where it left off
- If "Restart Demo" is clicked, localStorage is cleared and onboarding restarts fresh

- [ ] **Step 8: Commit**

```bash
git add frontend/contexts/ChatContext.tsx frontend/services/chat-service-api.ts frontend/app/(app)/onboarding/page.tsx
git commit -m "feat: persist chat messages to localStorage for session continuity"
```

---

## Task 6: Agent communication improvements (prompts)

**Context:** Three issues from the research team:
1. **Too many bubbles** — agents occasionally sends 3+ message bubbles, forcing scrolling
2. **Too technical** — language sometimes uses business-speak the customer doesn't use
3. **Examples read as options** — when the agent gives examples (e.g., "like electronics, food, or clothing"), customers think those are the only options

All three fixes are changes to `backend/prompts.py`.

**Files:**
- Modify: `backend/prompts.py`

- [ ] **Step 1: Write the failing test**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All existing tests pass (baseline).

- [ ] **Step 2: Add hard 2-bubble cap to ABSOLUTE_RULES**

In `backend/prompts.py`, find the `_absolute_rules` function (line 267). Rule 6 currently reads:

```python
"6. Each message in the messages array: 40 words max. Use a single bubble when possible.\n"
"   Only split into multiple bubbles when the content genuinely requires it.\n"
```

Replace it with:

```python
"6. Each message in the messages array: 40 words max. Use a single bubble when possible.\n"
"   HARD LIMIT: NEVER return more than 2 messages in the messages array — ever.\n"
"   If content feels like it needs 3 bubbles, compress it into 2. One is better.\n"
```

- [ ] **Step 3: Add plain-language rule to CONVERSATION_RULES**

In `backend/prompts.py`, find the `_conversation_rules` function (line 160). After rule 8 ("VARY YOUR ACKNOWLEDGMENTS"), add a new rule 9 (and shift the existing 9 and 10 to 10 and 11):

```python
"""
9. PLAIN LANGUAGE: Use the words your customer uses, not business school vocabulary.
   Say 'money coming in' not 'revenue.' Say 'roughly how much do you make' not 'approximate
   revenue figures.' Say 'things slow down' not 'business activity declines.' If a phrase
   sounds like it belongs in a report, rewrite it as how you'd say it to a friend.

10. NO SEASONAL ECHO CHAMBER: ...  (existing rule, renumbered)

11. ACCEPT "I DON'T KNOW": ...  (existing rule, renumbered)
```

- [ ] **Step 4: Add examples-framing rule to CONVERSATION_RULES**

In `backend/prompts.py`, in `_conversation_rules`, add a new rule after "PLAIN LANGUAGE" (the rule just added):

```python
"""
10. EXAMPLES ARE NOT A MENU: When you include examples to illustrate a question,
    always signal they're open-ended — not a complete list. Use framing like:
    'like X or Y — anything similar works' or 'for example X, but whatever fits
    your situation.' Never present examples as the only valid options. The customer
    should always feel free to describe their actual situation in their own words.
```

Update subsequent rule numbers accordingly.

- [ ] **Step 5: Run backend tests**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All tests pass. Exit 0.

- [ ] **Step 6: Full flow smoke test**

Run the app locally (`cd backend && uvicorn main:app --reload --port 8000` + `cd frontend && npm run dev`). Walk through the onboarding from Phase 0 to Phase 3. Verify:
- No response has more than 2 bubbles
- Language feels conversational ("How long have you been running it?" not "Please provide the duration of your business operations")
- When agent gives an example (e.g., in Phase 1), the example is framed as illustrative

- [ ] **Step 7: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: cap agent responses at 2 bubbles; add plain-language and example-framing rules"
```

---

## Task 7: Fix Phase 11 test stall — agent never sends offer-advance signal

**Context:** `test_onboarding_no_loops` fails because the agent enters Phase 11 (offer) and keeps responding to filler messages without ever setting `advance_phase=true`. The test runner runs out of messages before the phase advances. Root cause is in `backend/prompts.py` — Phase 11's instructions don't clearly tell the agent when to set `advance_phase=true` after the offer has been presented and accepted via the UI (a synthetic message is sent).

**Files:**
- Modify: `backend/prompts.py` (Phase 11 prompt block)
- Test: `backend/tests/test_agent_loops.py`

- [ ] **Step 1: Reproduce the failure**

Run: `cd backend && python -m pytest tests/test_agent_loops.py::test_onboarding_no_loops -v`
Expected: FAIL. Note the phase and message content where it stalls.

- [ ] **Step 2: Read the Phase 11 prompt**

In `backend/prompts.py`, find the `elif phase == "11":` block (search for `"PHASE 11"`). Read the full instructions to understand when `advance_phase` is supposed to be set.

- [ ] **Step 3: Add explicit advance trigger to Phase 11 instructions**

The agent needs to know that when the user sends the synthetic acceptance message (e.g. `"Acepté el crédito de $8,000 MXN con 1 pago."` or `"I've accepted the loan of $8,000 MXN with 1 payment."`), it should set `advance_phase=true` to trigger the Phase 12 closing.

Find the Phase 11 instructions block in `build_system_prompt` and add — after the existing offer presentation instructions:

```python
"ADVANCE TRIGGER: When the customer sends a message confirming they accepted the loan\n"
"(e.g. 'Acepté el crédito' / 'I've accepted the loan' or any variant), set advance_phase=true.\n"
"This triggers the closing sequence. Do NOT wait for additional confirmation.\n"
```

- [ ] **Step 4: Run the test**

Run: `cd backend && python -m pytest tests/test_agent_loops.py::test_onboarding_no_loops -v`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: Both tests pass. Exit 1 from pytest means failures — fix before committing.

- [ ] **Step 6: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: Phase 11 advance trigger so test_onboarding_no_loops passes"
```

---

## Task 8: Single-question rule — never bundle multiple questions

**Context:** The meeting debrief called out the "three-question message structure" as causing high mental load. Task 6 caps bubbles at 2 but doesn't prevent the agent from cramming multiple questions into a single bubble. This needs an explicit rule.

**Files:**
- Modify: `backend/prompts.py` — `_absolute_rules()`

- [ ] **Step 1: Add rule to ABSOLUTE_RULES**

In `backend/prompts.py`, find `_absolute_rules()`. Add after the existing rule 6 (bubble cap):

```python
"11. ONE QUESTION PER MESSAGE: Never ask more than one question in a single bubble.\n"
"    If you need to ask about two things, ask the more important one and let the customer's\n"
"    answer guide you to the next. Compound questions ('And also...', 'But first...') are\n"
"    forbidden.\n"
```

Renumber any subsequent rules if needed.

- [ ] **Step 2: Run backend tests**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All tests pass.

- [ ] **Step 3: Smoke test**

Start a local session and go through Phases 1-4. Confirm every agent message contains at most one question.

- [ ] **Step 4: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: add single-question-per-message rule to ABSOLUTE_RULES"
```

---

## Task 9: Phase 9 documentation — accept informal docs + fix truncated list

**Context:** Two issues in Phase 9:
1. The meeting debrief flagged that some participants don't have formal docs at all — only informal records like ledgers or notebooks. The current prompt only mentions formal documents.
2. Arize traces show the second bullet in the document list is always empty/truncated in every session — a formatting bug in how the list is constructed in the prompt.

**Files:**
- Modify: `backend/prompts.py` — Phase 9 prompt block + `LOCALE_CONFIG` `p9_*` strings

- [ ] **Step 1: Read the current Phase 9 prompt**

In `backend/prompts.py`, search for `"PHASE 9"` and read the full block. Also read the `p9_*` keys in `LOCALE_CONFIG` for both `"en"` and `"es-MX"`.

- [ ] **Step 2: Fix the truncated list**

The truncated second bullet happens because the list is too long for the 40-word bubble limit. Rewrite Phase 9 to present docs conversationally rather than as a markdown list. In `LOCALE_CONFIG`, update `p9_list_header`, `p9_item_bank`, `p9_item_receipt`, `p9_item_sales`, `p9_item_photo`, and `p9_list_footer` for both locales to collapse into a single conversational sentence:

```python
# en
"p9_doc_examples": (
    "Anything works — a bank statement, a supplier receipt, a sales screenshot, "
    "a photo of your stall, even a handwritten ledger or notebook where you track your sales."
),
"p9_list_footer": "We only use it to help you — never for anything else.",

# es-MX
"p9_doc_examples": (
    "Cualquier cosa funciona — un estado de cuenta, un recibo de proveedor, una captura de ventas, "
    "una foto de tu puesto, o incluso una libreta donde apuntes tus ventas."
),
"p9_list_footer": "Solo lo usamos para ayudarte — nunca para otra cosa.",
```

Update the Phase 9 prompt block to use `t('p9_doc_examples')` instead of building a bullet list.

- [ ] **Step 3: Update Phase 9 prompt to accept informal docs**

In the Phase 9 prompt instructions, add:

```python
"DOCUMENT FLEXIBILITY: Many customers run informal businesses and may only have a\n"
"handwritten ledger, a notebook, or a photo. These are all valid — accept them warmly.\n"
"Never make the customer feel their documentation is insufficient.\n"
```

- [ ] **Step 4: Run backend tests**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All tests pass.

- [ ] **Step 5: Manual verify**

Reach Phase 9 in a local session. Confirm:
- No truncated bullet points
- Handwritten ledger / notebook mentioned as valid option
- Message fits in a single bubble under 40 words

- [ ] **Step 6: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: Phase 9 — accept informal docs and fix truncated bullet list"
```

---

## Task 10: Phase 10 coaching — deliver a memorable preview that earns post-loan engagement

**Context:** Traces show Phase 10 (the coaching demo before the offer) already runs 3–4 real user turns, which is within the system prompt's target. The problem is not length — it's the rhythm of value delivery. In failing sessions (Miriam), the agent spent 3 consecutive turns asking diagnostic questions without giving anything back — pure extraction that felt like an interrogation. Miriam bailed at turn 4 saying "Quiero pasar al préstamo" having received zero insight. In successful sessions (Cristal, Norma, Will), the agent gave a micro-insight at every turn — a reframe, a validation with substance, a connection to their numbers — building toward a recommendation that landed by turn 3. The goal of Phase 10 is for the customer to experience what coaching with Thalia feels like and walk away with one piece of demonstrable value — not to solve their business, but to give them a reason to come back once they have their loan.

**Key design principle:** Every agent turn must give something back — an observation, a reframe, a connection to their numbers. The recommendation is the beginning of a deeper conversation, not the conclusion of a diagnostic phase. Extensions happen when the customer wants to explore the recommendation further, not when the agent needs more turns to figure out what to recommend.

**Files:**
- Modify: `backend/prompts.py` — Phase 10 prompt block

- [ ] **Step 1: Rewrite the Phase 10 coaching instructions in `backend/prompts.py`**

Find the Phase 10 prompt block (search for `phase == "10"` or `"phase_10"`). Replace the coaching instructions with the following logic:

```python
"""
PHASE 10 — COACHING PREVIEW

Goal: Give the customer one concrete, memorable business insight tailored to their
situation. This is a preview of what ongoing coaching with Thalia will feel like —
not a full session. You already know their business type, loan purpose, weekly
revenue, main expenses, and cash cycle. Use that context to go straight to
something specific and useful.

CORE RULE: Every agent turn must give something back — a reframe, an observation
grounded in their numbers, or a useful connection. Never send two consecutive
questions without an insight between them. "Interesting, tell me more" is not
giving value. "With $5K/week revenue and flour as your biggest cost, a 10% price
spike eats $500/month from your margin" — that is.

STRUCTURE:

Turn 1 — Lead with what you already know, then ask. Use profiling data (loan
  purpose, business type, revenue, expenses, cash cycle) to open with an
  observation or connection, not a blank question. Not "what do you want to
  improve?" but "Your cash cycle is same-week and barbacoa is your biggest cost —
  that puts you in a good position to buy in bulk when prices dip. What does your
  restocking routine look like right now?"

Turn 2 — Give a meaningful reframe of their answer + one follow-up. Connect what
  they said to something actionable. Not "interesting" but "Buying three days'
  worth at a time means you're exposed to price swings more often — have you
  tried locking in a weekly rate with your supplier?"

Turn 3 — Deliver the recommendation. Do not wait longer. The first concrete,
  actionable version of your recommendation should land by turn 3. It can be
  refined in later turns if the customer engages, but the core value must arrive
  here. Make it specific to their numbers and context.

Turns 4–6 (ONLY if the customer engages with the recommendation) — If the
  customer reacts with a question, a "how would I do that?", or wants to explore
  further, go deeper: specific numbers, steps, timing, what to watch for. Stay
  on the same recommendation thread. Do NOT use these turns to start new
  diagnostic questions or open new topics. If the customer gives a closing signal
  ("ok", "sounds good", "got it") or asks to move on, advance immediately.

WHEN TO ADVANCE (set advance_phase = true):
  (a) You've delivered the recommendation and the customer gives a closing signal
      or doesn't ask a follow-up, OR
  (b) The customer asks to move on or see their offer at any point, OR
  (c) You've reached 6 real customer turns — wrap up regardless.

BRIDGE TO POST-LOAN COACHING (required before advancing):
  After your recommendation, end with a natural bridge that references the
  specific topic you discussed:
  "Once your credit is active, I can help you go deeper on [restate topic in
  3–5 words]. Ready to see your offer?"
  The bridge should feel like a continuation of the conversation, not a canned
  line. Vary the phrasing based on context.

EARLY EXIT: If the customer asks to move on BEFORE you've delivered a
  recommendation, give them ONE sentence of concrete value derived from what
  they've already shared — the single most useful insight from profiling data
  and whatever they've said so far:
  "One thing worth trying: [specific insight]. Ready to see your offer?"
  Then set advance_phase = true.

NEVER:
- Ask abstract open-ended questions ("what do you most want to improve?")
- Send two consecutive turns that are only questions with no insight
- Open a second coaching topic after the first one
- Advance phase without delivering at least one concrete insight
- Use turns 4–6 for more diagnostic questions — only for deepening a
  recommendation the customer is actively exploring
"""
```

- [ ] **Step 2: Run backend tests**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All tests pass.

- [ ] **Step 3: Manually verify with four scenarios**

Open the app and test:
1. **Short path**: Go through profiling for a food business. In Phase 10, give short answers (1–3 words each). Confirm the agent delivers a recommendation by turn 3 and advances naturally with the post-loan bridge.
2. **Engaged path**: In Phase 10, give detailed answers and after the recommendation lands, ask a follow-up like "how would I actually do that?" Confirm the agent goes deeper on the recommendation (specific steps, numbers) rather than asking new diagnostic questions. It should advance after the customer gives a closing signal.
3. **Early exit**: In Phase 10, immediately say "skip" or "show me the offer". Confirm the agent gives one brief concrete insight before the offer — it should not jump to the offer with no coaching value at all.
4. **Value rhythm check**: In Phase 10, give a vague answer to the opening question (e.g., "not sure"). Confirm the agent still gives a meaningful reframe or observation in its response — not just another question. Every agent turn should contain substance.

- [ ] **Step 4: Commit**

```bash
git add backend/prompts.py
git commit -m "improve: Phase 10 coaching delivers value every turn with recommendation by turn 3 and post-loan hook"
```

---

## Task 11: Guard welcome message against mid-session restart (High)

**Context:** Arize traces show 4 sessions where the agent re-delivers the Phase 0 welcome mid-session after receiving an empty user message. The app auto-sends a blank message at certain transition points, which triggers a fresh session start on the backend even though profiling data already exists. Norma repeated the entire profiling phase twice (15 turns wasted).

**Root cause:** In `backend/agent.py`, when `message` is `None`/empty AND the session exists with collected data, the backend builds the Phase 0 prompt and sends the welcome again.

**Files:**
- Modify: `backend/agent.py`

- [ ] **Step 1: Add guard before Phase 0 prompt**

In `backend/agent.py`, in `_run_agent_inner`, after the session is retrieved/created (around the "Get or create session" block), add a guard that skips processing entirely if the message is empty AND the session already has collected data or prior messages:

```python
# Guard: ignore empty messages mid-session to prevent welcome restart
if not message and not image_data:
    if session.messages or session.collected:
        # Session already has context — silently ignore the empty ping
        return {
            "messages": [],
            "phase": session.phase,
            "collected": session.collected,
            "offer_amount": session.current_offer if session.phase in ("11", "12") else 0,
            "is_offer": False,
            "is_complete": session.phase == "complete",
        }
```

Place this block AFTER the session is fetched from `sessions` dict but BEFORE the message is appended to history.

- [ ] **Step 2: Handle empty message response in frontend**

In `frontend/services/chat-service-api.ts`, `parseResponse()` already handles empty `messages` arrays (returns `[]`). Verify `frontend/contexts/ChatContext.tsx`'s `addBubblesWithDelay` handles a zero-length messages array gracefully (it iterates with `for let i = 0`, so an empty array is safe — no change needed).

- [ ] **Step 3: Run backend tests**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/agent.py
git commit -m "fix: ignore empty mid-session messages to prevent welcome restart"
```

---

## Task 12: Validate user-stated loan amount at acceptance (High)

**Context:** Arize trace `will_s4` shows the agent confirming "$10,000 MXN with 2 payments" when the user said "$9,500 MXN with 1 payment" — both amount and installments wrong. The agent used stale values from a prior session. This is a financial discrepancy in a loan confirmation.

**Root cause:** Phase 12 closing prompt uses `offer_fmt` (the stored offer amount) regardless of what the user stated in their acceptance message.

**Files:**
- Modify: `backend/prompts.py` — Phase 12 prompt block

- [ ] **Step 1: Add validation instruction to Phase 12**

In `backend/prompts.py`, find the Phase 12 prompt block (`"PHASE 12 — CLOSING"`). Add before the congratulations step:

```python
"AMOUNT VALIDATION: The customer's acceptance message contains the amount and installments\n"
"they confirmed (e.g. 'I've accepted $9,500 MXN with 1 payment'). Use EXACTLY what the\n"
"customer stated — not the offered amount. If the stated amount differs from the offer\n"
f"({offer_fmt} MXN) by more than $500, add one sentence flagging the difference:\n"
"'I see you mentioned [stated amount] — just to confirm, your approved amount is [offer amount].'\n"
"Never silently substitute the offer amount for what the customer said.\n"
```

- [ ] **Step 2: Run backend tests**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: Phase 12 must echo user-stated amount, flag discrepancies"
```

---

## Task 13: Fix repeated-question pattern after extraction (Medium)

**Context:** Arize traces show the agent acknowledging an answer and then immediately re-asking the same question in the same bubble (Ramona turn 5, Norma turn 22, Joe turn 3). ABSOLUTE_RULE 7 exists ("do not re-ask") but isn't strong enough — the agent re-asks when `advance_phase=false` and it tries to "confirm" the extraction.

**Files:**
- Modify: `backend/prompts.py` — `_absolute_rules()`

- [ ] **Step 1: Strengthen ABSOLUTE_RULE 7**

In `backend/prompts.py`, find ABSOLUTE_RULE 7 in `_absolute_rules()`. Replace with a stronger version:

```python
"7. NEVER RE-ASK AN EXTRACTED FIELD. If the customer's message answered the current\n"
"   phase's question — even indirectly or informally — extract it and acknowledge.\n"
"   Do NOT append the question again to your acknowledgment bubble. Do NOT ask for\n"
"   confirmation of what you extracted. If you extracted it, you have it. Move on.\n"
"   BAD: '¡4 años — buen tiempo! ¿Cuánto tiempo llevas con tu negocio?'\n"
"   GOOD: '¡4 años — ya traes buen callo!'\n"
```

- [ ] **Step 2: Run backend tests**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: strengthen no-re-ask rule with concrete bad/good examples"
```

---

## Task 14: Currency mismatch detection (Medium)

**Context:** Arize trace for John shows all financial figures provided in KES (Kenyan Shillings) — the agent accepted them without comment and issued a $10,000 MXN offer. The system prompt says "Market: Mexico — MXN" but the agent didn't enforce it.

**Files:**
- Modify: `backend/prompts.py` — `_absolute_rules()`

- [ ] **Step 1: Add currency guard to ABSOLUTE_RULES**

In `backend/prompts.py`, add to `_absolute_rules()`:

```python
"12. CURRENCY GUARD: All financial figures must be in MXN. If the customer provides\n"
"    amounts in another currency (USD, KES, EUR, etc.), do NOT extract or use the value.\n"
"    Instead ask: 'Just to make sure I have this right — could you give me that amount\n"
"    in Mexican pesos (MXN)?' Extract only after they confirm in MXN.\n"
```

- [ ] **Step 2: Run backend tests**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: add currency guard — reject non-MXN figures and ask for conversion"
```

---

## Task 15: Business-type vocabulary substitution (Low)

**Context:** Arize trace for John (garage) shows the agent asking about "ingredients, rent, transport" — food-business vocabulary. For non-food businesses, the cost-question examples should reflect the actual business type.

**Files:**
- Modify: `backend/prompts.py` — Phase 7 (main expenses) prompt block

- [ ] **Step 1: Read Phase 7 prompt**

In `backend/prompts.py`, find the `elif phase == "7":` block. Read the current question wording.

- [ ] **Step 2: Make cost examples business-type-aware**

Replace the hardcoded "ingredients, rent, transport" example with a dynamic lookup based on `business_type`. Add a helper dict near the top of `build_system_prompt` (inside the function, after `business_type` is set):

```python
COST_EXAMPLES = {
    "food": "ingredients, packaging, transport",
    "bakery": "flour, packaging, gas or electricity",
    "garage": "parts, tools, supplies",
    "clothing": "fabric, stock, rent",
    "salon": "products, rent, supplies",
    "default": "inventory or supplies, rent, transport",
}
bt_lower = (business_type or "").lower()
cost_example = next(
    (v for k, v in COST_EXAMPLES.items() if k in bt_lower),
    COST_EXAMPLES["default"]
)
```

Then in the Phase 7 prompt, replace the static example with `{cost_example}`.

- [ ] **Step 3: Run backend tests**

Run: `cd backend && python -m pytest tests/test_agent_loops.py -v`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: Phase 7 cost examples adapt to business type (garage vs bakery vs food)"
```

---

## Self-Review

### Spec coverage check

| Feedback item | Task |
|--------------|------|
| Default to Spanish | Task 1 ✓ |
| Inconsistent numbers (loan screen vs home screen) | Task 2 ✓ |
| Confusing CTA (users type "continue") | Task 3 ✓ |
| Off-ramp from coaching to loan flow | Task 4 ✓ |
| Session persistence / reconnect | Task 5 ✓ |
| Agent wording too technical | Task 6 ✓ |
| Too many message bubbles (3+) | Task 6 ✓ |
| Examples misread as restricted options | Task 6 ✓ |
| Phase 11 stall / test_onboarding_no_loops failing | Task 7 ✓ |
| Multi-part questions (meeting debrief) | Task 8 ✓ |
| Phase 9 informal doc acceptance + truncated list | Task 9 ✓ |
| Coaching session runs 45+ minutes | Task 10 ✓ |
| Session restart on empty message (Arize #1) | Task 11 ✓ |
| Wrong amount echoed at offer confirmation (Arize #2) | Task 12 ✓ |
| Agent re-asks extracted field (Arize #3) | Task 13 ✓ |
| Foreign currency accepted silently (Arize #4) | Task 14 ✓ |
| Business-type vocabulary mismatch (Arize #6) | Task 15 ✓ |

### Known edge cases

- **Session persistence + hard reset:** The `clearTester()` in `TesterContext.tsx` clears `tala_flow_state` but does NOT clear `tala_chat_state`. After adding Task 5, you should also clear `tala_chat_state` in `clearTester`. Add `localStorage.removeItem('tala_chat_state')` and `localStorage.removeItem('thalia_session_id')` to `clearTester()` in `frontend/contexts/TesterContext.tsx:57-62`.

- **TermsModal default date:** `getSmartDueDates()` can return an empty array if today happens to fall such that no 1st/16th falls in the 15-45 day window (extremely rare edge case). The `?? dueDateOptions[0]?.date` fallback in Task 2 handles this, but if `dueDateOptions` is empty, `defaultDueDate` will be `undefined` and `calculateLoan` falls back to 30-day default — acceptable.

- **Phase 9 skip and agent state:** When the user clicks "Skip to offer" (Task 4), they navigate to `/offer` with `FlowContext.onboardingComplete = true`. The backend session still has phase `'9'` in memory. If the user goes back to onboarding after visiting the offer page, the backend will continue from Phase 9. For this prototype, this is acceptable — the flow is designed to be one-way.
