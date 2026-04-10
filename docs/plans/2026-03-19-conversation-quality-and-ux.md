# Conversation Quality & UX Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address a broad set of conversation quality, prompt, and UI/UX issues across the Thalia onboarding flow, coaching mode, and disbursement flow.

**Architecture:** Changes split across backend prompt engineering (`backend/prompts.py`) and frontend components. Backend changes affect agent conversation quality; frontend changes fix UI bugs, interaction patterns, and flow logic.

**Tech Stack:** Python FastAPI + OpenAI structured output (backend), Next.js 16 + Tailwind (frontend), Web Speech API (microphone)

---

## Overview of changes

**Backend (prompts.py):**
- Formatting rules: structured lists for multiple items; bold sparingly
- Product language: reduce "personal credit" over-indexing; communicate loan constraints (1–2 installments, 30–60 days)
- Phase 0: richer welcome message mentioning business type
- Phase 4: rephrase weekly revenue question to be clearer
- Phase 5: rephrase sales outlook question; remove Semana Santa
- Phase 6: rephrase cash-cycle question to be simpler
- Phase 7: clarify whether expenses = categories or amounts
- Phase 8: redesign working capital question to be more concrete
- Phase 9: static 4-type evidence list + privacy reassurance
- Phase 10: coaching more conversational; reference loan purpose; fix context citation
- Phase 11: announce amount + rate + term upfront; explicit disbursement CTA
- Coaching mode: opening feels like continuation; add quick-reply nudge instead of menu

**Frontend:**
- Progress bar: fix step mapping (phase 0 = "5 steps left", no jump)
- Welcome button text: "Continue my application"
- Microphone: better recording UX + iOS Chrome graceful fallback
- Camera button: allow PDF + document uploads, not just images
- Date format: sync locale from tester profile on login
- Offer slider: lock to approvedAmount until negotiation unlocks maxAmount
- Offer screen: remove "personal credit" label text
- Animation: fix slide-up sheets (translateX + translateY conflict)
- Post-acceptance: explicit disbursement button instead of auto-navigate
- Cashout confirm: use customer name + pre-fill account number
- Floating chat button: fix double-tap on mobile
- Coaching quick-reply: 3 pill buttons instead of 6-item grid

---

## Task 1: Fix progress bar step mapping

**Files:**
- Modify: `frontend/components/chat/OnboardingProgress.tsx`

**Context:**
Currently PHASE_TO_STEP has an off-by-one error (phase 8 is working capital, not evidence) and the welcome (phase 0) counts as a separate step, causing a jarring "6 → 5 steps left" jump immediately when the welcome message renders. Fix: map phases to 6 meaningful steps with phase 0 = step 1 (same as phases 1–3), so user always sees "5 steps left" until they actively complete a section.

**Step 1: Update PHASE_TO_STEP and TOTAL_STEPS**

In `OnboardingProgress.tsx`, replace the `PHASE_TO_STEP`, `STEP_LABEL_KEYS`, and `TOTAL_STEPS` constants:

```tsx
// Old mapping had 7 steps with off-by-one on evidence/coaching phases.
// New: 6 steps, phase 0 = step 1 (same as phases 1–3) to avoid welcome jump.
const PHASE_TO_STEP: Record<string, number> = {
  '0': 1,   // Welcome — same step as "About Business" so counter doesn't jump
  '1': 1,
  '2': 1,
  '3': 1,
  '4': 2,   // Business Health (phases 4–8)
  '5': 2,
  '6': 2,
  '7': 2,
  '8': 2,
  '9': 3,   // Evidence (phase 9 is evidence, not phase 8)
  '10': 4,  // Coaching Preview
  '11': 5,  // Your Offer
  '12': 6,  // Closing
  'complete': 6,
}

const STEP_LABEL_KEYS: Record<number, string> = {
  1: 'progress.aboutBusiness',
  2: 'progress.businessHealth',
  3: 'progress.evidence',
  4: 'progress.coachingPreview',
  5: 'progress.yourOffer',
  6: 'progress.done',
}

const TOTAL_STEPS = 6
```

**Step 2: Verify the math**

- Phase 0: step=1, remaining=5 → "5 steps left" ✓
- Phase 1: step=1, remaining=5 → "5 steps left" (no jump from phase 0) ✓
- Phase 4: step=2, remaining=4 → "4 steps left" ✓
- Phase 9: step=3, remaining=3 → "3 steps left" ✓ (was broken before)
- Phase 11: step=5, remaining=1 → "1 step left" ✓
- Phase 12/complete: step=6, remaining=0 → "Done" ✓

**Step 3: Run dev server and verify manually**

```bash
cd frontend && npm run dev
```

Navigate to onboarding. Confirm: (1) initial render shows "5 steps left", (2) welcome message appears with no counter change, (3) first user message advances to "4 steps left" after phase 4.

**Step 4: Commit**

```bash
git add frontend/components/chat/OnboardingProgress.tsx
git commit -m "fix: progress bar step mapping — no jump at welcome, correct phase alignment"
```

---

## Task 2: Welcome button text

**Files:**
- Modify: `frontend/components/chat/ChatWindow.tsx:117-126`

**Step 1: Change button label and message**

In `ChatWindow.tsx`, find the `showReadyButton` block and update both the button text and the `sendMessage` call:

```tsx
{showReadyButton && (
  <div className="flex justify-center pt-2 pb-1 animate-fade-in">
    <button
      onClick={() => sendMessage("Continue my application")}
      className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 touch-active"
      style={{
        background: '#00A69C',
        color: '#FFFFFF',
        boxShadow: '0 2px 8px rgba(0,166,156,0.25)',
      }}
    >
      Continue my application
    </button>
  </div>
)}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/ChatWindow.tsx
git commit -m "fix: welcome button text — 'Continue my application'"
```

---

## Task 3: Fix slide-up sheet animation (translateX + translateY conflict)

**Files:**
- Modify: `frontend/tailwind.config.ts:60-62`
- Modify: `frontend/components/chat/ChatOverlay.tsx:47-55`
- Modify: `frontend/components/chat/LoanConfigModal.tsx:52-61`
- Modify: `frontend/components/chat/TermsModal.tsx:72-80`

**Context:**
The `slide-up` keyframe only animates `translateY`. The sheets also have `left: '50%' + transform: translateX(-50%)'` via inline style. Because CSS `transform` is a single property, the animation's `translateY` overwrites `translateX(-50%)` during the animation, causing the sheet to start from the right side and then snap to center on completion. Fix: remove the `translateX` from inline styles and use margin-based centering instead.

**Step 1: Update all three sheet components to use margin centering**

In each of `ChatOverlay.tsx`, `LoanConfigModal.tsx`, and `TermsModal.tsx`, replace the `style` on the sheet div:

```tsx
// BEFORE
style={{
  bottom: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: '100%',
  maxWidth: 'var(--app-max-width)',
  height: '85dvh'  // (or 88dvh)
}}

// AFTER — use left/right offset to center within app container; no translateX needed
style={{
  bottom: 0,
  left: 'max(0px, calc((100vw - var(--app-max-width)) / 2))',
  right: 'max(0px, calc((100vw - var(--app-max-width)) / 2))',
  width: 'min(100vw, var(--app-max-width))',
  height: '85dvh'  // keep each sheet's original height value
}}
```

Apply to all three files. Keep each file's existing `height` value (`85dvh` for ChatOverlay and TermsModal, `88dvh` for LoanConfigModal).

**Step 2: Verify animation visually**

Run dev server. Open LoanConfigModal, TermsModal, and ChatOverlay — confirm all animate straight up from the bottom without rightward drift.

**Step 3: Commit**

```bash
git add frontend/components/chat/ChatOverlay.tsx frontend/components/chat/LoanConfigModal.tsx frontend/components/chat/TermsModal.tsx
git commit -m "fix: slide-up sheet animation — replace translateX centering with margin-based to prevent drift"
```

---

## Task 4: Fix date format — sync locale from tester profile on login

**Files:**
- Modify: `frontend/app/(auth)/login/page.tsx`

**Context:**
Dates in LoanConfigModal and TermsModal show Spanish format ("16 de abril de 2026") even in the English flow. The `formatDate` / `calculateLoan` functions respect locale, but `LocaleContext` is only set from localStorage. If a tester previously used an es-MX session, the localStorage value persists. Fix: sync `LocaleContext.locale` from the tester profile's locale when the tester logs in.

**Step 1: Read the login page first**

Read `frontend/app/(auth)/login/page.tsx` before editing.

**Step 2: Import and call setLocale after successful login**

In the login page, after the tester is set (success case), call `setLocale(tester.locale)`. The login page uses `useTester()` to set the tester. Find where `setTester(profile)` or equivalent is called and add `setLocale(profile.locale ?? 'es-MX')` immediately after.

The import pattern:
```tsx
import { useLocale } from '@/contexts/LocaleContext'
// ...
const { setLocale } = useLocale()
// in the login success handler:
setLocale(tester.locale === 'en' ? 'en' : 'es-MX')
```

**Step 3: Test date display**

Log in as DEMOEN tester → proceed to offer → open LoanConfigModal → confirm dates show in English ("April 16, 2026").
Log in as DEMO tester → confirm dates show in Spanish ("16 de abril de 2026").

**Step 4: Commit**

```bash
git add frontend/app/(auth)/login/page.tsx
git commit -m "fix: sync locale to tester profile on login — fixes Spanish dates in English flow"
```

---

## Task 5: Offer slider — lock to approvedAmount until negotiation

**Files:**
- Modify: `frontend/contexts/ChatContext.tsx`
- Modify: `frontend/components/chat/ChatWindow.tsx`

**Context:**
The slider in LoanConfigModal always shows the full range up to `maxAmount` ($11,000) even when the customer never negotiated. `state.maxAmount` is initialized to `tester.maxAmount` (11,000). Fix: separate the "API ceiling" from the "slider display max." Initialize `state.maxAmount = approvedAmount` (10,000). Store the actual ceiling in a new `ceilingAmount` field. API calls use `ceilingAmount`; the slider uses `maxAmount`. When the agent negotiates up, `UPDATE_MAX` fires to match the ceiling.

**Step 1: Update ChatState and reducer in ChatContext.tsx**

Add `ceilingAmount` to `ChatState`:
```tsx
interface ChatState {
  // ... existing fields ...
  approvedAmount: number
  maxAmount: number      // slider display max; starts = approvedAmount, unlocks to ceilingAmount on negotiation
  ceilingAmount: number  // API ceiling; always = tester's max (e.g. 11000)
}
```

Update `INITIAL_STATE`:
```tsx
const INITIAL_STATE: ChatState = {
  // ... existing fields ...
  approvedAmount: 10000,
  maxAmount: 10000,       // starts at approvedAmount
  ceilingAmount: 11000,
}
```

Update `START_ONBOARDING` case in reducer:
```tsx
case 'START_ONBOARDING':
  return {
    ...INITIAL_STATE,
    mode: 'onboarding',
    testerFirstName: action.name,
    approvedAmount: action.approvedAmount,
    maxAmount: action.approvedAmount,          // slider starts at approved
    ceilingAmount: action.maxAmount,           // ceiling for API
    businessType: action.businessType ?? null,
    loanPurpose: action.loanPurpose ?? null,
  }
```

Update `UPDATE_MAX` case (it should update `maxAmount`, not ceilingAmount):
```tsx
case 'UPDATE_MAX':
  return { ...state, maxAmount: action.maxAmount }
```

Update `startOnboarding` function signature and dispatch to pass both amounts:
```tsx
// START_ONBOARDING action type needs a maxAmount field:
| { type: 'START_ONBOARDING'; name: string; approvedAmount: number; maxAmount: number; businessType?: string; loanPurpose?: string }
```
(This already exists — just ensure `maxAmount` in the action is the ceiling, which it already is from `tester?.maxAmount`.)

**Step 2: Update sendMessage in ChatContext.tsx to use ceilingAmount for API calls**

In `sendMessage`, change the `s.maxAmount` argument to `s.ceilingAmount`:
```tsx
const response = await apiChatService.sendMessage(
  content,
  s.phase,
  s.mode,
  s.testerFirstName ?? undefined,
  s.approvedAmount,
  s.ceilingAmount,   // ← was s.maxAmount; pass the ceiling to backend
  // ... rest unchanged
)
```

Apply the same change in `sendImage`.

Also update `startOnboarding` in the context to pass `maxAmount` (ceiling) to the opening message API:
```tsx
const response = await apiChatService.getOpeningMessage(
  firstName, approvedAmount, maxAmount,  // maxAmount here IS the ceiling passed to startOnboarding
  businessType, loanPurpose, localeRef.current
)
```
(No change needed here since the param name matches.)

**Step 3: Verify in ChatWindow.tsx (no change needed)**

LoanConfigModal already receives `approvedAmount={state.approvedAmount}` and `maxAmount={state.maxAmount}`. After this fix, `state.maxAmount` starts at 10,000 and only updates to 11,000 after negotiation. The modal's slider will correctly cap at 10,000 until negotiation.

**Step 4: Test offer flow**

1. Complete onboarding → offer phase → "Configure my loan" → confirm slider max is $10,000
2. In offer phase, ask "Can I get more?" → agent responds with $11,000 offer → click "Configure my loan" → confirm slider now goes up to $11,000

**Step 5: Commit**

```bash
git add frontend/contexts/ChatContext.tsx
git commit -m "fix: offer slider locked to approvedAmount until negotiation unlocks maxAmount"
```

---

## Task 6: Remove "personal credit" label from offer modal

**Files:**
- Modify: `frontend/components/chat/LoanConfigModal.tsx`

**Step 1: Find and remove the label**

Search for "personal credit" text in LoanConfigModal. If there's a header or descriptor label that says "Personal Credit," remove or replace it with just "Your loan" or leave it unlabeled. The modal title is "Customize your plan" — that's fine to keep.

Run:
```bash
grep -n "personal credit\|Personal Credit\|personal_credit" frontend/components/chat/LoanConfigModal.tsx
```

If found, delete that line or replace with a neutral label.

**Step 2: Commit**

```bash
git add frontend/components/chat/LoanConfigModal.tsx
git commit -m "fix: remove 'personal credit' label from offer configuration modal"
```

---

## Task 7: Camera button — allow PDFs and documents

**Files:**
- Modify: `frontend/components/chat/ChatInput.tsx:135-141`

**Context:**
The hidden file input uses `accept="image/*" capture="environment"` which restricts to images and immediately opens the camera on mobile. Change to allow images AND PDFs/documents, and remove `capture` so the OS shows a file picker (which still offers "take photo" on mobile).

**Step 1: Update the hidden file input**

```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/*,.pdf,.doc,.docx,application/pdf"
  className="hidden"
  onChange={handleFileChange}
/>
```

Note: Remove `capture="environment"` — this was forcing camera-only mode. Without it, mobile shows a picker with options including camera and file system.

**Step 2: Update handleFileChange to handle non-image files**

Currently `handleFileChange` reads the file as a dataURL and calls `onImageSend`. For PDFs, we still send as a dataURL (base64) — the backend can handle it as a file attachment. The function logic doesn't need to change since `readAsDataURL` works for any file type.

If the backend needs to know the MIME type, we can embed it in the dataURL (which `readAsDataURL` does automatically — the result starts with `data:application/pdf;base64,...`).

No changes needed to `handleFileChange` logic.

**Step 3: Commit**

```bash
git add frontend/components/chat/ChatInput.tsx
git commit -m "fix: camera button — allow PDF and document uploads, not just images"
```

---

## Task 8: Microphone UX — better visual feedback + iOS Chrome fallback

**Files:**
- Modify: `frontend/components/chat/ChatInput.tsx`

**Context:**
Current issues:
1. User doesn't understand they need to press to start AND press to stop — the button just pulses blue with no text
2. Chrome on iOS doesn't support Web Speech API in WKWebView — the button shows but silently fails

**Standard patterns for voice input:**
- WhatsApp/Telegram: press-and-hold
- Google: tap to start, live transcript shown, tap stop — user sees text appearing in real time
- Best for this app: tap to start → show "Listening..." label in the input area with live interim results → auto-stop on silence OR tap to stop

**Step 1: Enable interimResults and show live transcript in the input**

Update the `recognition` setup in `toggleListening`:
```tsx
recognition.continuous = false
recognition.interimResults = true  // ← was false; enables live preview
recognition.lang = 'en-US'

recognition.onresult = (event: any) => {
  let transcript = ''
  for (let i = 0; i < event.results.length; i++) {
    transcript += event.results[i][0].transcript
  }
  // Show interim results live in the input
  setValue(prefixRef.current ? prefixRef.current + ' ' + transcript : transcript)
}
```

**Step 2: Add a "Listening..." label and clear instruction**

When `isListening` is true, show a small label above the input row or overlay the textarea placeholder:

Replace the existing microphone button section:
```tsx
{hasSpeech && (
  <>
    {isListening && (
      <div className="absolute bottom-full left-0 right-0 flex items-center justify-center pb-1 animate-fade-in pointer-events-none">
        <span className="text-xs text-[#1a989e] font-semibold bg-white px-3 py-1 rounded-full shadow-sm border border-[#d2f2f4]">
          Listening... tap mic to stop
        </span>
      </div>
    )}
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center flex-shrink-0 transition-all touch-active',
        isListening && 'animate-pulse'
      )}
      style={{
        width: 36,
        height: 36,
        borderRadius: 15,
        background: isListening ? '#1a989e' : '#D2F2F4',
      }}
    >
      <Mic size={18} className={isListening ? 'text-white' : 'text-[#1a989e]'} />
    </button>
  </>
)}
```

Note: The outer `div` wrapping `ChatInput` needs `position: relative` for the absolute label to work. Change `className` on the outer `div` from `"flex items-center gap-2 px-3 py-3 bg-white border-t border-[#F1F5F9]"` to add `relative`:
```tsx
<div className="relative flex items-center gap-2 px-3 py-3 bg-white border-t border-[#F1F5F9]">
```

**Step 3: Graceful iOS Chrome fallback**

iOS Chrome uses WKWebView which blocks Web Speech API despite `window.SpeechRecognition` existing. The `recognition.onerror` fires with `not-allowed` or `service-not-allowed`. Update the error handler to surface a user-visible message:

```tsx
const [speechError, setSpeechError] = useState<string | null>(null)

recognition.onerror = (e: any) => {
  console.warn('Speech recognition error:', e.error)
  if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
    setSpeechError('Voice not available — try Safari on iOS')
    setTimeout(() => setSpeechError(null), 3000)
  }
  setIsListening(false)
  recognitionRef.current = null
}
```

Show the error near the mic button:
```tsx
{speechError && (
  <div className="absolute bottom-full left-0 right-0 flex items-center justify-center pb-1 animate-fade-in pointer-events-none">
    <span className="text-xs text-[#f06f14] font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-[#fbe9dd]">
      {speechError}
    </span>
  </div>
)}
```

**Step 4: Commit**

```bash
git add frontend/components/chat/ChatInput.tsx
git commit -m "fix: microphone UX — live transcript preview, listening label, iOS Chrome error message"
```

---

## Task 9: Post-acceptance disbursement button flow

**Files:**
- Modify: `frontend/components/chat/ChatWindow.tsx`
- Modify: `backend/prompts.py` (Phase 12 closing instructions)

**Context:**
Currently after terms acceptance: synthetic message fires → agent closes Phase 11 → auto-navigates to `/cashout` after 2.5s. User wants: terms accepted → back in chat → agent gives loan summary + "Disburse my loan" button appears in chat → clicking it navigates to cashout.

**Step 1: Update Phase 12 prompt in prompts.py**

In `prompts.py`, find the `elif phase == "12":` block and update the instructions:

```python
elif phase == "12":
    instructions = (
        "PHASE 12 — CLOSING (after terms accepted)\n"
        f"{already_collected}\n\n"
        f"The customer has configured and accepted their loan through the app.\n"
        f"Write a warm closing for {tester_name} in ONE bubble:\n"
        "  1. Congratulate them warmly — their loan is approved.\n"
        "  2. Give a brief summary: amount, number of payments, and first payment date.\n"
        f"     Use the collected context (offer_amount={amount_fmt} MXN) if available.\n"
        "  3. Tell them the next step is to set up their disbursement — \n"
        "     they'll confirm where to receive their funds.\n"
        "  4. End with: 'When you're ready, tap the button below to receive your loan.'\n"
        "     (A 'Disburse my loan' button will appear automatically — do NOT invent other UI.)\n"
        "Set advance_phase=true.\n"
    )
```

**Step 2: Update ChatWindow.tsx — remove auto-navigate, add disbursement button**

In `ChatWindow.tsx`, update `handleTermsAccept`:

```tsx
const handleTermsAccept = async (loanConfig: LoanConfig) => {
  setTermsOpen(false)
  setOfferHandled(true)

  flowDispatch({ type: 'OFFER_ACCEPTED', config: loanConfig })
  flowDispatch({ type: 'TERMS_ACCEPTED' })

  // Synthetic message triggers Phase 12 closing from the agent.
  await sendMessage(
    `I've accepted the loan of $${loanConfig.amount.toLocaleString()} MXN with ${loanConfig.installments} payment${loanConfig.installments > 1 ? 's' : ''}.`
  )

  // Do NOT auto-navigate — wait for user to click the disbursement button
}
```

Add a new `showDisbursementButton` derived variable (after `showConfigureButton`):
```tsx
const showDisbursementButton =
  offerHandled &&
  state.isComplete &&
  !isTyping
```

Add the button to the messages area (after the `showConfigureButton` block):
```tsx
{showDisbursementButton && (
  <div className="flex justify-center pt-2 pb-1 animate-fade-in">
    <button
      onClick={() => onComplete?.()}
      className="px-6 py-3 rounded-full text-sm font-semibold transition-all active:scale-95 touch-active"
      style={{
        background: '#F06B22',
        color: '#FFFFFF',
        boxShadow: '0 2px 8px rgba(240,107,34,0.3)',
      }}
    >
      Disburse my loan
    </button>
  </div>
)}
```

**Step 3: Verify flow**

Complete onboarding → accept offer in LoanConfigModal → accept terms in TermsModal → agent gives closing summary in chat → "Disburse my loan" button appears → clicking it navigates to `/cashout`.

**Step 4: Commit**

```bash
git add frontend/components/chat/ChatWindow.tsx backend/prompts.py
git commit -m "feat: explicit disbursement button — agent gives loan summary then user taps to disburse"
```

---

## Task 10: Cashout confirm page — customer name + pre-filled account number

**Files:**
- Modify: `frontend/app/(app)/cashout/confirm/page.tsx`

**Context:**
Account Holder Name currently uses `tester?.name ?? 'Isabel Torres'`. Should use the customer name entered on the landing page. Also the CLABE input requires manual entry — pre-fill with a static demo value so testers don't have to type it.

**Step 1: Import CustomerContext and use customer name**

```tsx
import { useCustomer } from '@/contexts/CustomerContext'
// ...
const { customer } = useCustomer()
const name = customer.firstName && customer.lastName
  ? `${customer.firstName} ${customer.lastName}`
  : customer.firstName ?? tester?.name ?? 'Demo Customer'
```

Remove the import of `useTester` if it's only used for `name` (check if it's used for anything else first).

**Step 2: Pre-fill CLABE with static demo value**

Change `const [clabe, setClabe] = useState('')` to:
```tsx
const [clabe, setClabe] = useState('012345678901234567')
```

This satisfies the `clabe.length >= 16` check in `handleConfirm` so the "Receive my loan" button is enabled immediately without requiring the tester to type.

Keep the input editable (for realism) but it starts pre-filled.

**Step 3: Commit**

```bash
git add frontend/app/(app)/cashout/confirm/page.tsx
git commit -m "fix: cashout confirm — use customer name from context, pre-fill account number"
```

---

## Task 11: Fix floating chat button double-tap on mobile

**Files:**
- Modify: `frontend/components/chat/FloatingChatButton.tsx`

**Context:**
On mobile, the first tap focuses the button (triggering a hover/focus state); the second tap fires `onClick`. This is the iOS "ghost click" / double-tap-to-zoom behavior. Fix: use `onPointerDown` or `onTouchEnd` to respond on the first interaction, and prevent default.

**Step 1: Add touch handling to bypass the focus-then-click pattern**

```tsx
export function FloatingChatButton() {
  const { openOverlay } = useChat()

  const handleInteraction = (e: React.SyntheticEvent) => {
    e.preventDefault()
    openOverlay()
  }

  return (
    <button
      onClick={handleInteraction}
      onTouchEnd={handleInteraction}
      className="fixed z-50 touch-active active:scale-95 transition-transform"
      style={{
        bottom: 'calc(var(--bottom-nav-height) + 16px)',
        right: 'calc(max(0px, (100vw - var(--app-max-width)) / 2) + 16px)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      aria-label="Chat with Thalia"
    >
      <img
        src="/thalia/SupportAgentWidget.svg"
        alt="Chat with Thalia"
        draggable={false}
        style={{ width: 72, height: 72, display: 'block', pointerEvents: 'none' }}
      />
    </button>
  )
}
```

Note: `onTouchEnd` + `e.preventDefault()` prevents the subsequent `onClick` from firing twice. The `onClick` handler remains for desktop.

**Step 2: Commit**

```bash
git add frontend/components/chat/FloatingChatButton.tsx
git commit -m "fix: floating chat button — single tap on mobile using onTouchEnd + preventDefault"
```

---

## Task 12: Coaching quick-reply buttons + opening feels like continuation

**Files:**
- Modify: `frontend/components/chat/CoachingStarterGrid.tsx`
- Modify: `frontend/components/chat/ChatWindow.tsx`
- Modify: `backend/prompts.py` (coaching mode opening)

**Context:**
Current coaching opening: "Hi Demo — nice to meet you. I see you run a bakery..." — feels like first meeting. Should feel like a continuation of the onboarding conversation. Also the CoachingStarterGrid shows 6 topic buttons; replace with 3 quick-reply pills: "Talk about my loan", "Business coaching", "Quick help".

**Step 1: Update CoachingStarterGrid.tsx — replace 6 topics with 3 quick-reply pills**

Rewrite `CoachingStarterGrid.tsx`:

```tsx
'use client'

import { useState } from 'react'

interface QuickReply {
  label: string
  prompt: string
}

const QUICK_REPLIES: QuickReply[] = [
  {
    label: 'Talk about my loan',
    prompt: 'I have a question about my loan',
  },
  {
    label: 'Business coaching',
    prompt: 'I want help with my business',
  },
  {
    label: 'Quick help',
    prompt: 'I need quick help with something',
  },
]

interface CoachingStarterGridProps {
  onSelect: (prompt: string) => void
}

export function CoachingStarterGrid({ onSelect }: CoachingStarterGridProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (reply: QuickReply) => {
    if (selected !== null) return
    setSelected(reply.prompt)
    onSelect(reply.prompt)
  }

  return (
    <div className="px-4 pb-2">
      <div className="flex gap-2 flex-wrap justify-center">
        {QUICK_REPLIES.map((reply) => {
          const isSelected = selected === reply.prompt
          const isDisabled = selected !== null && !isSelected
          return (
            <button
              key={reply.label}
              onClick={() => handleSelect(reply)}
              disabled={isDisabled}
              className={[
                'px-4 py-2 rounded-full border text-sm font-medium transition-all touch-active',
                isSelected
                  ? 'border-[#20bec6] bg-[#e8fafa] text-[#083032]'
                  : isDisabled
                    ? 'border-[#e5e5e5] bg-[#f8f8f8] text-[#aaa] cursor-not-allowed opacity-50'
                    : 'border-[#e5e5e5] bg-white text-[#1f1c2f] hover:border-[#20bec6] hover:bg-[#f0fdfd] active:scale-95',
              ].join(' ')}
            >
              {reply.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Update coaching mode opening prompt in prompts.py**

In `prompts.py`, find the `if is_first_visit:` block in coaching mode and update:

```python
if is_first_visit:
    opening = (
        "OPENING (first visit — use EXACTLY ONE bubble):\n"
        f"  1. Greet {tester_name} warmly — feel like you're continuing the conversation from onboarding,\n"
        f"     NOT meeting them for the first time. You already know them.\n"
        f"  2. Reference something concrete from the onboarding (their {business_type}, their loan situation).\n"
        f"     Example tone: 'Welcome to the other side, [name]! You're all set with your credit — now let's\n"
        f"     make it work hard for your {business_type}. What's on your mind?'\n"
        "  3. Do NOT say 'nice to meet you' or introduce yourself as if new — you spoke during onboarding.\n"
        "  4. Do NOT offer a menu — the customer will see quick-reply buttons below the chat.\n"
        "  5. End with an open question inviting them to share what they need.\n"
        "  IMPORTANT: ONE bubble only. Warm and brief. 30 words max.\n"
    )
```

**Step 3: Commit**

```bash
git add frontend/components/chat/CoachingStarterGrid.tsx backend/prompts.py
git commit -m "feat: coaching quick-reply buttons + opening feels like continuation of onboarding"
```

---

## Task 13: Backend prompt — formatting rules (lists + bold)

**Files:**
- Modify: `backend/prompts.py:161-184` (`_formatting_rules` function)
- Modify: `backend/prompts.py:188-209` (`_absolute_rules` function)

**Context:**
Agent over-uses bold text (bolding nearly every noun/phrase). Should use bold only for key data (amounts, dates) and critical terms. Also when agent lists 3+ items, they should use markdown bullet points, not comma-separated inline text.

**Step 1: Update `_formatting_rules` in prompts.py**

Replace the `base` variable in `_formatting_rules`:

```python
def _formatting_rules(mode: str) -> str:
    """Formatting guidance for rich-text chat bubbles."""
    base = (
        "MESSAGE FORMATTING — mobile-first, scannable:\n"
        "- **Bold** ONLY for key data: amounts (**$5,000 MXN**), dates (**May 1st**), and"
        " critical terms the customer needs to act on. Do NOT bold regular nouns, adjectives,"
        " or phrases just for emphasis — overuse makes bold meaningless.\n"
        "- Use markdown bullet lists (- item) for ANY 3+ options, steps, or items."
        " Do NOT list them inline with commas. Each bullet on its own line.\n"
        "- One emoji per message MAX. Never stack emojis.\n"
    )
```

**Step 2: Verify in absolute rules that bold guidance is not contradicted**

Check `_absolute_rules` for any bold instructions — none currently, but ensure consistency.

**Step 3: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: formatting rules — bold only for key data, use bullet lists for 3+ items"
```

---

## Task 14: Backend prompt — product language + loan constraints

**Files:**
- Modify: `backend/prompts.py` (LOCALE_CONFIG + `_absolute_rules`)

**Context:**
The agent over-says "personal credit" in every message. The distinction: Tala's product is technically a personal credit (not formally a "business loan") but customers use it for their business — the agent should understand this nuance but not repeat it constantly. Also the agent should know the actual product constraints (1 or 2 installments, 30 or 60 days) so it doesn't promise flexible weekly cadences.

**Step 1: Update product_never_say in LOCALE_CONFIG for both locales**

In `LOCALE_CONFIG["en"]`:
```python
"product_never_say": (
    'Never say "business loan." The product is a personal credit used for business purposes.\n'
    '   Use "credit" or "loan" naturally — do NOT repeat "personal credit" in every message.\n'
    '   The customer understands it\'s for their business. No need to qualify it repeatedly.\n'
    '   LOAN CONSTRAINTS: The loan has exactly 1 or 2 installments. Term is ~30 days (1 payment)\n'
    '   or ~60 days (2 payments). Do NOT suggest weekly payments, monthly plans, or other cadences.\n'
    '   When discussing repayment flexibility, stay within these actual options.'
),
```

In `LOCALE_CONFIG["es-MX"]`, apply the equivalent Spanish update.

**Step 2: Remove Semana Santa from market_context**

In `LOCALE_CONFIG["en"]["market_context"]`:
```python
"market_context": (
    "Market: Mexico — customers are small business owners (MSMEs). Use MXN for currency."
    " Reference local context where relevant: Day of the Dead, Christmas season;"
    " OXXO and SPEI for payments; WhatsApp for sales and customer communication;"
    " tianguis and local markets; and common Mexican MSME challenges like ingredient inflation and fuel costs.\n"
),
```
(Remove "Semana Santa (not just 'Easter')" from the list.)

Apply equivalent change to `es-MX`.

**Step 3: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: product language — reduce personal credit over-indexing, add loan constraints (1-2 installments, 30-60 days), remove Semana Santa"
```

---

## Task 15: Backend prompt — phase question rewrites

**Files:**
- Modify: `backend/prompts.py` (phases 0, 4, 5, 6, 7, 8)

**Context:**
Several questions are confusing or unclear to the target audience. Each rewrite below replaces the current question text in the phase instruction block.

**Step 1: Phase 0 — welcome message with business type intro**

In `build_system_prompt`, phase `"0"` block:

```python
if phase == "0":
    business_intro = (
        f"your {business_type}" if business_type and business_type != "your business"
        else "your business"
    )
    instructions = (
        "PHASE 0 — WELCOME\n\n"
        "Send 2 messages (bubbles):\n\n"
        f"Bubble 1: Introduce yourself as Thalia from Tala. Be warm and specific:\n"
        f"  'I'm Thalia from Tala — I'm here to support {business_intro} with "
        f"credit and 24/7 business coaching.'\n"
        f"  Keep it to 1-2 sentences. Do NOT say 'nice to meet you' — be direct and confident.\n\n"
        "Bubble 2: Briefly explain the two parts:\n"
        f"  {t('p0_part1')}\n"
        f"  {t('p0_part2')}\n"
        f"  End with: '{t('p0_cta')}'\n\n"
        "Do NOT add a third bubble. Do NOT ask a question.\n"
        "Set advance_phase=true.\n"
    )
```

**Step 2: Phase 4 — weekly revenue (clarify it's gross, estimate is ok)**

Replace the `"PHASE 4"` question instruction:

```python
"Ask: 'To help size the right offer — roughly how much do you take in during a"
" typical week? A ballpark is fine — total sales before expenses.'\n"
"Set advance_phase=false.\n\n"
```

This replaces "roughly what do you bring in" with clearer language: "take in," "total sales before expenses," and "ballpark is fine."

**Step 3: Phase 5 — sales outlook (clearer framing)**

Replace the outlook question:

```python
"Ask: 'Looking at the next 2–3 weeks — do you expect sales to be about normal,"
" busier than usual, or slower? And why?'\n"
"Do NOT add a context clause — the framing already signals why you're asking.\n"
```

This replaces "what's your sales outlook for the next couple of weeks" with a concrete choice + reason that makes it easy to answer.

**Step 4: Phase 6 — cash cycle (simpler framing)**

Replace the cash cycle question:

```python
"Ask: 'When you spend money to restock — how long does it usually take before"
" that money comes back to you through sales? For example: same week, 1–2 weeks, a month?'\n"
```

This replaces "how quickly do you typically get cash back after spending on stock or supplies" with a clearer framing + examples.

**Step 5: Phase 7 — main expenses (clarify categories + amounts)**

Replace the expenses question:

```python
"Ask: 'What are your biggest costs each week? For example: restocking inventory,"
" rent, transport, packaging. I'm looking for the main categories and roughly how"
" much each one is — but if you just know the categories, that works too.'\n"
```

**Step 6: Phase 8 — working capital (concrete, tangible reframe)**

Replace the working capital question and context:

```python
elif phase == "8":
    instructions = (
        "PHASE 8 — WORKING CAPITAL NEED (Business Health, Q5 — last profile question)\n"
        f"{already_collected}\n\n"
        + (_already_have_field("workingCapitalNeed", collected, "how much money they need to restock") or
        "Signal this is the last profile question (e.g. 'Almost there —' or 'Last one —').\n"
        "Ask: 'Think about your next restocking trip or big supply run —\n"
        "  roughly how much money do you need all at once to keep things running?\n"
        "  Could be what you spend on inventory, ingredients, or materials in one go.'\n"
        "Set advance_phase=false.\n\n"
        "WHEN CUSTOMER ANSWERS:\n"
        "  1. ALWAYS extract into extracted['workingCapitalNeed'] — accept ranges or rough estimates.\n"
        "     A short answer is still valid — extract and move on.\n"
        "  2. Acknowledge and transition: 'That really helps me put the right offer together.'\n"
        "  3. Set advance_phase=true.\n")
    )
```

**Step 7: Run tests**

```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

**Step 8: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: phase question rewrites — revenue, outlook, cash-cycle, expenses, working capital all clearer"
```

---

## Task 16: Backend prompt — evidence phase redesign

**Files:**
- Modify: `backend/prompts.py` (phase `"9"`)
- Modify: `backend/prompts.py` (LOCALE_CONFIG p9_intro + p9_skip_cta for both locales)

**Context:**
Currently the evidence prompt asks for a "personalized recommendation" based on selling channel — dynamic and unpredictable. User wants a static list of 4 document types offered to every customer, with a privacy reassurance, and no pressure to share.

**Step 1: Update p9_intro and p9_skip_cta in LOCALE_CONFIG**

```python
# English
"p9_intro": (
    "Your offer is ready — but there's one way to potentially increase it. "
    "Sharing a document helps us see your business more clearly and could unlock a higher limit."
),
"p9_skip_cta": (
    "No pressure though — skipping won't affect the offer we've already put together for you. "
    "Want to share something, or shall we move on?"
),
```

**Step 2: Update Phase 9 instructions**

Replace the phase `"9"` block:

```python
elif phase == "9":
    instructions = (
        "PHASE 9 — OPTIONAL BUSINESS EVIDENCE\n"
        f"{already_collected}\n\n"
        "OPENING TURN (customer just arrived at this phase):\n"
        "  Use 2 bubbles:\n"
        f"  Bubble 1: '{t('p9_intro')}'\n"
        "  Bubble 2: Present exactly these 4 options as a bullet list, then the skip CTA:\n"
        "    - A bank statement or account summary\n"
        "    - A receipt from a supplier or wholesale purchase\n"
        "    - A sales summary from a platform (Uber Eats, MercadoLibre, etc.)\n"
        "    - A photo of your stall, shop, or inventory\n"
        "    Add: 'If none of these fit, feel free to share anything that shows your business activity.'\n"
        "    Add the privacy note: 'We only use what you share to help you — never for anything else.'\n"
        f"    End with: '{t('p9_skip_cta')}'\n"
        "  Each bubble 40 words max. Set advance_phase=false.\n\n"
        "WHEN CUSTOMER RESPONDS:\n"
        "  - If they share something (photo, text, or say they uploaded): Warmly confirm "
        "receipt with ONE specific observation. Set advance_phase=true.\n"
        "  - If they AGREE to share (e.g. 'sure', 'yes') but haven't sent yet:\n"
        "    Say: 'Great — go ahead and send it when you're ready.' Set advance_phase=false.\n"
        "  - If they SKIP: ONE brief ack only (e.g. 'No problem!'). Set advance_phase=true.\n"
    )
```

**Step 3: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: evidence phase — static 4-type list, privacy reassurance, updated copy"
```

---

## Task 17: Backend prompt — coaching phase redesign

**Files:**
- Modify: `backend/prompts.py` (phase `"10"`)

**Context:**
Three issues:
1. Phase 10 coaching is too abrupt — agent jumps to action plan without asking enough questions
2. Agent recites customer profile data verbatim ("For your market-stall bakery doing about $5,000 MXN/week with 2 helpers") which feels robotic
3. The coaching doesn't connect to how the customer plans to use their loan

**Step 1: Update Phase 10 instructions**

Replace the `elif phase == "10":` block:

```python
elif phase == "10":
    loan_purpose_line = f"Loan purpose (from survey): {collected.get('loanPurpose', 'not specified')}"
    instructions = (
        "PHASE 10 — COACHING VALUE DEMO (3-4 turn exchange)\n"
        f"{already_collected}\n"
        f"{loan_purpose_line}\n"
        f"Coaching turn: {coaching_turns} of 3-4\n\n"

        "TURN 0 (opening — coaching_turns=0):\n"
        "  Make this feel like a NATURAL continuation of the conversation — not a mode switch.\n"
        "  Reference the loan purpose if available, otherwise open broadly.\n"
        "  Example: 'Thanks for all of that — while I finalize your offer, I'd love to help\n"
        "  you think through how to put the credit to work. What's the biggest thing on your\n"
        "  mind for your business right now?'\n"
        "  Do NOT announce 'coaching,' recite their profile data, or use business-context preambles.\n"
        "  Set advance_phase=false.\n\n"

        "TURN 1 (customer picked a topic — coaching_turns=1):\n"
        "  Ask ONE Socratic follow-up question to understand their situation better.\n"
        "  The question should be directed and specific — but derived naturally from what they said,\n"
        "  NOT from reciting their profile stats back at them.\n"
        "  BAD: 'For your market-stall bakery doing $5,000/week with 2 helpers...'\n"
        "  GOOD: 'What's the tightest bottleneck right now — supply, time, or demand?'\n"
        "  You may ask ONE optional follow-up: 'Would it help to share a quick photo of your\n"
        "  setup? I can give more specific ideas — but we can work from what you've told me too.'\n"
        "  Set advance_phase=false.\n\n"

        "TURN 2 (customer responds — coaching_turns=2):\n"
        "  Don't jump to an action plan yet. Show you heard them. Ask ONE more targeted question\n"
        "  that digs into the 'why' or helps them think concretely. Example: 'And what do you\n"
        "  think is the main thing holding that back right now?'\n"
        "  Set advance_phase=false.\n\n"

        "TURN 3+ (coaching_turns >= 3):\n"
        "  Wrap up in 2 bubbles:\n"
        "  Bubble 1: ONE concrete action tied directly to what they shared. Name their context\n"
        "    (use what they told you, not profile data). Generic advice is not acceptable.\n"
        "  Bubble 2: Transition warmly to the offer — e.g. 'We can keep exploring this anytime\n"
        "    from your home screen. For now — great news, your offer is finalized!'\n"
        "  Do NOT ask another question. Set advance_phase=true.\n"
    )
```

**Step 2: Run tests**

```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

**Step 3: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: coaching phase — more conversational turns, no profile data recitation, connects to loan purpose"
```

---

## Task 18: Backend prompt — offer presentation redesign

**Files:**
- Modify: `backend/prompts.py` (phase `"11"`)
- Modify: `backend/prompts.py` (LOCALE_CONFIG p11_ready_cta)

**Context:**
User wants: agent announces approval with amount + rate + max term upfront ("I'm happy to share you've been approved for $10,000 MXN at 1% daily, for up to 60 days"). Then customer confirms → configure button appears. If customer asks for more → agent offers max amount, asks for confirmation → configure button appears.

**Step 1: Update p11_ready_cta in LOCALE_CONFIG**

```python
"p11_ready_cta": "Ready to set it up? I'll open the configurator now so you can pick your exact amount and payment plan.",
```

**Step 2: Update Phase 11 instructions**

Replace the `elif phase == "11":` block:

```python
elif phase == "11":
    # Format the daily rate as a percentage for display
    rate_pct = f"{interest_rate_daily * 100:.1f}%"
    instructions = (
        "PHASE 11 — OFFER PRESENTATION\n"
        f"{already_collected}\n\n"
        "STEP 1 — PRESENT THE OFFER (advance_phase=false):\n"
        "  Use ONE bubble. Lead with a warm congratulations, then state the key terms:\n"
        f"  '✨ Great news — you're approved for up to **{amount_fmt} MXN** at **{rate_pct} daily interest**,\n"
        f"  for a maximum of **60 days** (1 or 2 payments). Does that work for you?'\n"
        "  Keep it natural and warm — not like a legal disclosure.\n"
        "  Do NOT mention processing fees, IVA, or total repayment — the configurator shows that.\n"
        "  Set advance_phase=false.\n\n"
        "STEP 2 — WHEN CUSTOMER SAYS YES / IS READY:\n"
        f"  Say (one short bubble): '{t('p11_ready_cta')}'\n"
        "  Set advance_phase=false. The system will open the configurator automatically.\n\n"
        "STEP 3 — OFFER NEGOTIATION (only if customer explicitly asks for more):\n"
        f"  You MAY increase — but ONLY up to {max_fmt} MXN (absolute ceiling).\n"
        f"  Respond warmly: 'I can stretch it to **{max_fmt} MXN** for you — that's my best offer.\n"
        "  Does that work?'\n"
        "  Set offer_negotiated=true when increasing. Set advance_phase=false.\n"
        "  Do NOT volunteer the higher amount unprompted.\n\n"
        "STEP 4 — WHEN THE SYSTEM CONFIRMS LOAN ACCEPTED:\n"
        "  If the customer's message says they've accepted (e.g. 'I've accepted the loan of...'):\n"
        "  Write ONE warm congratulations bubble. Set advance_phase=true.\n"
    )
```

**Step 3: Run tests**

```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

**Step 4: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: offer presentation — announce amount + rate + term upfront, explicit CTA, cleaner negotiation"
```

---

## Task 19: Run full test suite and end-to-end check

**Files:** No changes — verification only

**Step 1: Backend tests**

```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

Expected: all tests pass. If any fail, investigate before pushing.

**Step 2: Frontend build check**

```bash
cd frontend && npm run build
```

Expected: no TypeScript errors or build failures.

**Step 3: Manual end-to-end test**

Walk through the complete onboarding flow:
1. Landing page → enter name
2. Login with DEMOEN
3. Survey page
4. Onboarding: welcome (check button text, progress bar shows 5 steps)
5. Complete all phases — check question clarity at phases 4, 5, 6, 7, 8
6. Evidence phase — check 4-type list
7. Coaching demo — check 3+ turns, no profile recitation
8. Offer phase — check amount + rate + term announcement
9. Configure loan — check slider max is $10,000 (not $11,000)
10. Accept terms → agent gives summary → "Disburse my loan" button → cashout confirm (check name + pre-filled CLABE)
11. Home page → floating chat button (single tap) → coaching overlay (check continuation feeling, 3 quick-reply buttons)

**Step 4: Push to dubyak**

```bash
git push dubyak main
```

---

## Design decisions and rationale

### Progress bar
Changed TOTAL_STEPS from 7 → 6. Phase 0 (welcome) maps to step 1 alongside phases 1–3 (About Business) so the counter shows "5 steps left" from the moment onboarding loads and never jumps. The step labels now correctly align with actual phases (evidence = phase 9, not phase 8).

### Microphone on iOS Chrome
Web Speech API is blocked in WKWebView (Chrome for iOS). `SpeechRecognition` may appear defined but throws `service-not-allowed` on `recognition.start()`. The fix surfaces a user-facing error message ("try Safari") rather than silently failing. Real-time transcription via `interimResults: true` helps users understand that voice input is working.

### Offer slider max
Separation of "API ceiling" (what backend enforces) from "slider display max" (what user sees in configurator). The backend always needs the true ceiling to negotiate correctly. The frontend slider should only show the higher amount after the customer explicitly asks for and receives a higher offer. This is done by storing both `maxAmount` (slider) and `ceilingAmount` (API) in ChatState.

### Loan constraints in prompt
The agent was suggesting flexible payment cadences (weekly plans) that the actual product doesn't support. Adding explicit constraint language ("1 or 2 installments, 30–60 days") prevents customer expectation mismatch when they reach the configurator and only see 1–2 payment options.

### Animation fix
CSS `transform` is a single property. `slide-up` keyframes override `translateX(-50%)` from inline styles during animation, causing rightward drift. Switching to `left/right` offset centering (using CSS `calc` with `--app-max-width`) eliminates the conflict entirely.

### Post-acceptance disbursement button
Auto-navigating after 2.5s felt abrupt and mechanical. An explicit "Disburse my loan" button makes the transition intentional and lets testers see the closing message before proceeding.
