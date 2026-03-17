# UX Feedback Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address 5 pieces of tester feedback: consistent "For My Business" selection + Continue button, back navigation in the survey, progress bar during onboarding, page transitions, and markdown rendering for bot messages.

**Architecture:** All changes are frontend-only. Tasks 1-3 modify the survey page and flow context. Task 4 adds CSS transitions to the app layout. Task 5 adds `react-markdown` + `remark-gfm` for bot messages and updates the ChatBubble component to render markdown without the bubble wrapper for agent messages.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 3, react-markdown, remark-gfm

---

## Task 1: "For My Business" — Show Selection + Continue Button

**Problem:** Clicking "For my business" on the loan-use step auto-advances to step 2 after 400ms. Every other option shows a "Continue" button. This inconsistency confuses users.

**Fix:** Remove the auto-advance `setTimeout`. Show the Continue button for "business" just like the other options, and advance to `business-type` step on Continue click.

**Files:**
- Modify: `frontend/app/(app)/survey/page.tsx:38-43` (handleLoanUseSelect) and `:210-220` (Continue button)

**Step 1: Update `handleLoanUseSelect` to only set selection**

Replace lines 38-43:

```typescript
const handleLoanUseSelect = (id: string) => {
  setSelected(id)
}
```

Remove the `setTimeout` — selection no longer auto-advances.

**Step 2: Update the Continue button to handle both business and non-business**

Replace lines 210-220 with a single Continue button that shows whenever any option is selected:

```typescript
{selected && (
  <div className="px-4 pb-8">
    <button
      onClick={selected === 'business' ? () => setStep('business-type') : handlePersonalContinue}
      className="w-full h-14 rounded-[28px] text-white font-bold text-base touch-active active:opacity-80"
      style={{ background: '#F06B22' }}
    >
      Continue
    </button>
  </div>
)}
```

**Step 3: Verify manually**

Run: `cd frontend && npm run dev`
- Navigate to `/survey`
- Click "For my business" — should highlight teal, show Continue button, NOT auto-advance
- Click Continue — should move to business-type step
- Go back, click "Personal expenses" — should highlight teal, show Continue button
- Click Continue — should navigate to `/home`

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/survey/page.tsx
git commit -m "fix: show Continue button for 'For my business' selection"
```

---

## Task 2: Back Button in Survey Steps

**Problem:** Users can't go back within the 3-step survey (loan-use -> business-type -> loan-purpose) to correct mistakes.

**Fix:** Add a back arrow button in the header of steps 2 and 3 that returns to the previous step. Step 1 has no back button (it's the entry point).

**Files:**
- Modify: `frontend/app/(app)/survey/page.tsx`

**Step 1: Add ChevronLeft import**

`ChevronLeft` is already imported at line 5. No change needed.

**Step 2: Add a back button to the business-type step header**

In the `step === 'business-type'` block (line 72-110), add a back button inside the dark header `<div className="bg-[#083032]">` block. Insert before the `<div className="px-5 pb-6 pt-2">` on line 77:

```tsx
<div className="px-5 pt-2">
  <button
    onClick={() => setStep('loan-use')}
    className="w-8 h-8 flex items-center justify-center touch-active -ml-1"
  >
    <ChevronLeft size={22} className="text-white" />
  </button>
</div>
```

And change the existing `pt-2` on the title container to `pt-0` so spacing is correct:
```tsx
<div className="px-5 pb-6 pt-0">
```

**Step 3: Add a back button to the loan-purpose step header**

Same pattern in the `step === 'loan-purpose'` block (line 114-168). Add before the title container:

```tsx
<div className="px-5 pt-2">
  <button
    onClick={() => setStep('business-type')}
    className="w-8 h-8 flex items-center justify-center touch-active -ml-1"
  >
    <ChevronLeft size={22} className="text-white" />
  </button>
</div>
```

And change `pt-2` to `pt-0` on the title container.

**Step 4: Verify manually**

- On business-type step: back arrow appears, clicking it returns to loan-use with previous selection preserved
- On loan-purpose step: back arrow appears, clicking it returns to business-type with text preserved
- Step 1 (loan-use): no back arrow

**Step 5: Commit**

```bash
git add frontend/app/\(app\)/survey/page.tsx
git commit -m "feat: add back navigation within survey steps"
```

---

## Task 3: Progress Bar in Onboarding Chat

**Problem:** The `OnboardingProgress` component already exists at `frontend/components/chat/OnboardingProgress.tsx` and is already rendered in `ChatWindow` when `showProgress` is true. The onboarding page passes `showProgress` to ChatWindow. So the progress bar is **already implemented and active**.

**Verification:** Check that the progress bar is visible during onboarding.

**Files:**
- Review: `frontend/components/chat/OnboardingProgress.tsx` (already maps phases 0-11 to 7 steps)
- Review: `frontend/components/chat/ChatWindow.tsx:99-101` (renders OnboardingProgress when showProgress=true)
- Review: `frontend/app/(app)/onboarding/page.tsx:73` (passes showProgress to ChatWindow)

**Step 1: Verify progress bar is rendering**

Run: `cd frontend && npm run dev`
- Navigate through the full flow to `/onboarding`
- Confirm the progress bar appears at the top of the chat window
- Confirm it advances through steps as the conversation progresses

**Step 2: If the bar IS showing — no code change needed. Skip to Task 4.**

**Step 2 (alt): If the bar is NOT showing — investigate why.**

The most likely issue would be CSS overlap or z-index. Check:
- Is the `OnboardingProgress` div being rendered in the DOM?
- Is it hidden behind the header?

**Step 3: Consider UX improvement — show "X questions left" instead of "Step N of 7"**

If the feedback specifically wants "3 questions left" style messaging, update the progress label in `OnboardingProgress.tsx` line 43-45:

```typescript
<span className="text-xs font-semibold text-[#1a989e]">
  {phase === 'complete' ? 'Completed' : `${TOTAL_STEPS - step} ${TOTAL_STEPS - step === 1 ? 'step' : 'steps'} left`}
</span>
```

**Step 4: Commit (only if changes were made)**

```bash
git add frontend/components/chat/OnboardingProgress.tsx
git commit -m "feat: show 'X steps left' in onboarding progress bar"
```

---

## Task 4: Screen Transitions Between Pages

**Problem:** Pages appear abruptly with no transition animation.

**Fix:** Add a slide-in-from-right animation to the app layout that triggers on route changes. Use a lightweight approach with Next.js `usePathname` and CSS transitions — no external library needed.

**Files:**
- Create: `frontend/components/app-shell/PageTransition.tsx`
- Modify: `frontend/app/(app)/layout.tsx:17-23` (wrap children in PageTransition)

**Step 1: Create the PageTransition component**

Create `frontend/components/app-shell/PageTransition.tsx`:

```tsx
'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const prevPathRef = useRef(pathname)

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      setIsTransitioning(true)
      prevPathRef.current = pathname
      const timer = setTimeout(() => setIsTransitioning(false), 50)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  return (
    <div
      className={`h-full transition-all duration-300 ease-out ${
        isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      {children}
    </div>
  )
}
```

This briefly sets opacity-0 + slight right offset on route change, then fades/slides in. Simple, no layout thrash.

**Step 2: Wrap children in PageTransition in the app layout**

Modify `frontend/app/(app)/layout.tsx`. Import and wrap:

```tsx
import { PageTransition } from '@/components/app-shell/PageTransition'
```

Update the `<main>` tag contents in AppShell (line 18):

```tsx
<main className={hideNav ? 'flex-1' : 'flex-1 pb-[var(--bottom-nav-height)]'}>
  <PageTransition>{children}</PageTransition>
</main>
```

**Step 3: Verify manually**

- Navigate between survey steps (internal state — won't trigger since no route change)
- Navigate from survey -> intro -> onboarding: should see smooth slide-in
- Navigate from onboarding -> cashout: should see smooth slide-in

**Step 4: Commit**

```bash
git add frontend/components/app-shell/PageTransition.tsx frontend/app/\(app\)/layout.tsx
git commit -m "feat: add page transition animation between routes"
```

---

## Task 5: Markdown Rendering for Bot Messages

**Problem:** Bot messages are long plain-text in chat bubbles. Feedback requests markdown formatting (bold, headers, lists) like GPT/Gemini, and suggests removing the chat bubble wrapper for bot messages so markdown has room to breathe.

**Fix:** Install `react-markdown` + `remark-gfm`. Update `ChatBubble` to render agent messages as styled markdown without the bubble wrapper. Keep the Thalia avatar. Keep user messages as-is (plain text in bubbles).

**Files:**
- Modify: `frontend/package.json` (add dependencies)
- Modify: `frontend/components/chat/ChatBubble.tsx` (replace renderContent with react-markdown for agent messages, remove bubble wrapper)
- Modify: `frontend/app/globals.css` (add prose-like styles for agent markdown)

**Step 1: Install react-markdown and remark-gfm**

Run:
```bash
cd frontend && npm install react-markdown remark-gfm
```

**Step 2: Rewrite ChatBubble for agent messages**

Replace the full contents of `frontend/components/chat/ChatBubble.tsx`:

```tsx
import type { ChatMessage } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatBubbleProps {
  message: ChatMessage
}

export function ChatBubble({ message }: ChatBubbleProps) {
  if (!message.content && !message.imageUrl) return null
  const isAgent = message.role === 'agent'

  if (isAgent) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-start gap-2 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/thalia/SupportAgentWidget.svg"
            alt="Thalia"
            style={{ width: 28, height: 28, flexShrink: 0, marginTop: 2 }}
          />
          <div className="flex-1 min-w-0 agent-markdown text-sm text-[#314329] leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end px-4 animate-fade-in">
      <div
        className="max-w-[78%] text-[#314329] px-4 py-4 text-sm leading-snug overflow-hidden"
        style={{ background: '#F5F5F0', borderRadius: '16px 16px 0 16px' }}
      >
        {message.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={message.imageUrl}
            alt="Shared photo"
            className="rounded-lg max-h-48 w-auto mb-2"
          />
        )}
        {message.content}
      </div>
    </div>
  )
}
```

Key changes for agent messages:
- Removed the white bubble wrapper (no background, no border-radius, no box-shadow)
- Changed `items-end` to `items-start` so avatar aligns to top of longer content
- Added `agent-markdown` class for targeted CSS
- Used `flex-1 min-w-0` instead of `max-w-[78%]` for wider content area
- User messages remain unchanged (still in bubbles)

**Step 3: Add agent-markdown styles to globals.css**

Add to the end of `frontend/app/globals.css`, before the closing of the file:

```css
/* Agent markdown styles */
.agent-markdown p {
  margin-bottom: 0.5rem;
}
.agent-markdown p:last-child {
  margin-bottom: 0;
}
.agent-markdown strong {
  font-weight: 700;
  color: #1f1c2f;
}
.agent-markdown h1,
.agent-markdown h2,
.agent-markdown h3 {
  font-weight: 700;
  color: #1f1c2f;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
}
.agent-markdown h1 { font-size: 1.125rem; }
.agent-markdown h2 { font-size: 1rem; }
.agent-markdown h3 { font-size: 0.875rem; }
.agent-markdown ul,
.agent-markdown ol {
  margin-left: 1rem;
  margin-bottom: 0.5rem;
}
.agent-markdown ul { list-style-type: disc; }
.agent-markdown ol { list-style-type: decimal; }
.agent-markdown li {
  margin-bottom: 0.25rem;
}
.agent-markdown li > p {
  margin-bottom: 0;
}
.agent-markdown a {
  color: #1a989e;
  text-decoration: underline;
}
```

**Step 4: Verify build**

Run:
```bash
cd frontend && npm run build
```

Expected: Build succeeds with no errors.

**Step 5: Verify manually**

- Navigate to `/onboarding` and chat with Thalia
- Agent messages should render with markdown formatting (bold, lists if present)
- Agent messages should NOT have white bubble wrapper — text flows freely next to avatar
- User messages should still appear in the light gray bubble as before

**Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/components/chat/ChatBubble.tsx frontend/app/globals.css
git commit -m "feat: render bot messages as markdown without chat bubbles"
```

---

## Final Verification

After all 5 tasks:

1. `cd frontend && npm run build` — must pass
2. Walk through the full flow: login -> survey -> intro -> onboarding -> cashout
3. Check:
   - Survey step 1: "For my business" shows Continue button (Task 1)
   - Survey steps 2-3: back arrows work (Task 2)
   - Onboarding: progress bar visible with "X steps left" (Task 3)
   - All page transitions animate smoothly (Task 4)
   - Bot messages render as markdown without bubble wrapper (Task 5)
