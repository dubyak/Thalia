# Name Landing Page + Reset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a landing page for customer name collection, persist name across flow resets, and enable dual-reset options for testing flexibility.

**Architecture:**
- New `CustomerContext` stores customer name separately from `FlowContext` (name survives flow reset)
- Landing page (`/`) collects first/last name, inserts Supabase customer record, redirects to `/login`
- Reset menu component with two options: "Restart Demo" (clear flow only) and "New Customer" (clear all)
- Backend `/chat` accepts `customer_id` and passes to Arize for tracing
- Supabase integration is graceful (non-blocking — app works even if insert fails)

**Tech Stack:**
- Frontend: React Context, Next.js (Route Handlers for Supabase inserts)
- Backend: FastAPI, Pydantic models (add `customer_id` to request)
- Database: Supabase (customers table)
- Tracing: Arize (customer_id top-level attribute)

---

## Task 1: Create CustomerContext

**Files:**
- Create: `frontend/contexts/CustomerContext.tsx`
- Modify: `frontend/app/layout.tsx` (add provider)
- Test: Manual (will verify in later tasks)

**Step 1: Write CustomerContext with persistence**

Create `frontend/contexts/CustomerContext.tsx`:

```typescript
'use client'

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode
} from 'react'

export interface CustomerState {
  firstName: string | null
  lastName: string | null
  customerId: string | null
}

const INITIAL_STATE: CustomerState = {
  firstName: null,
  lastName: null,
  customerId: null
}

type CustomerAction =
  | { type: 'SET_NAME'; firstName: string; lastName: string; customerId?: string }
  | { type: 'CLEAR_NAME' }

function customerReducer(state: CustomerState, action: CustomerAction): CustomerState {
  switch (action.type) {
    case 'SET_NAME':
      return {
        firstName: action.firstName,
        lastName: action.lastName,
        customerId: action.customerId || null
      }
    case 'CLEAR_NAME':
      return INITIAL_STATE
    default:
      return state
  }
}

interface CustomerContextValue {
  customer: CustomerState
  dispatch: React.Dispatch<CustomerAction>
}

const CustomerContext = createContext<CustomerContextValue | null>(null)

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, dispatch] = useReducer(customerReducer, INITIAL_STATE, (init) => {
    if (typeof window === 'undefined') return init
    try {
      const saved = localStorage.getItem('tala_customer_state')
      return saved ? { ...init, ...JSON.parse(saved) } : init
    } catch {
      return init
    }
  })

  // Persist customer state to localStorage
  useEffect(() => {
    localStorage.setItem('tala_customer_state', JSON.stringify(customer))
  }, [customer])

  return (
    <CustomerContext.Provider value={{ customer, dispatch }}>
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider')
  return ctx
}
```

**Step 2: Add CustomerProvider to layout.tsx**

Modify `frontend/app/layout.tsx` — add import and wrap children:

```typescript
import { CustomerProvider } from '@/contexts/CustomerContext'

// In the RootLayout component, wrap providers:
<CustomerProvider>
  <FlowProvider>
    <TesterProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </TesterProvider>
  </FlowProvider>
</CustomerProvider>
```

**Step 3: Verify context loads**

- No automated test yet (will verify when landing page calls it)
- Check that TypeScript compiles: `cd frontend && npm run build` (should succeed)

**Step 4: Commit**

```bash
git add frontend/contexts/CustomerContext.tsx frontend/app/layout.tsx
git commit -m "feat: add CustomerContext for name persistence"
```

---

## Task 2: Create Landing Page (`/`)

**Files:**
- Create: `frontend/app/page.tsx` (replaces redirect)
- Test: Manual (will test form submission in task 3)

**Step 1: Write landing page component**

Replace `frontend/app/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/contexts/CustomerContext'
import { StatusBar } from '@/components/app-shell/StatusBar'

export default function LandingPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { dispatch: customerDispatch } = useCustomer()
  const router = useRouter()

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) return

    setLoading(true)
    setError('')

    try {
      // Call Route Handler to insert Supabase customer record
      const response = await fetch('/api/customer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Graceful fallback: proceed even if Supabase insert fails
        console.warn('Supabase insert failed:', data.error)
      }

      // Store name in context (with or without customerId)
      customerDispatch({
        type: 'SET_NAME',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        customerId: data.customerId || undefined
      })

      // Navigate to login
      router.push('/login')
    } catch (err) {
      // Graceful fallback on network error
      console.warn('Failed to create customer record:', err)
      customerDispatch({
        type: 'SET_NAME',
        firstName: firstName.trim(),
        lastName: lastName.trim()
      })
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0

  return (
    <div className="flex flex-col min-h-dvh bg-[#083032]">
      <StatusBar dark />

      {/* Logo area */}
      <div className="flex flex-col items-center pt-16 pb-10">
        <div className="w-16 h-16 rounded-2xl bg-[#1a989e] flex items-center justify-center mb-4 shadow-lg">
          <span className="text-white font-bold text-2xl tracking-tight">T</span>
        </div>
        <h1 className="text-white text-2xl font-semibold">Tala</h1>
        <p className="text-[#20bec6] text-sm mt-1 font-light">MSME Prototype · Mexico</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-[#f5f6f0] rounded-t-3xl px-6 pt-8">
        <h2 className="text-[#1f1c2f] text-xl font-semibold mb-1">Let's get started</h2>
        <p className="text-[#676d65] text-sm mb-8 font-light">
          What's your name?
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-2">
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. María"
              className="w-full h-14 rounded-xl border-2 border-[#d8d4c3] bg-white px-4 text-[#1f1c2f] font-medium text-base placeholder:text-[#c2c6c0] focus:outline-none focus:border-[#1a989e] transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-2">
              Last name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. García"
              onKeyDown={(e) => e.key === 'Enter' && isValid && handleSubmit()}
              className="w-full h-14 rounded-xl border-2 border-[#d8d4c3] bg-white px-4 text-[#1f1c2f] font-medium text-base placeholder:text-[#c2c6c0] focus:outline-none focus:border-[#1a989e] transition-colors"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-[#ff2056] text-sm font-medium">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="w-full h-14 rounded-xl bg-[#f06f14] text-white font-semibold text-base disabled:opacity-40 active:opacity-80 transition-opacity shadow-md"
          >
            {loading ? 'Starting...' : 'Start Demo'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify landing page renders**

- Start frontend: `cd frontend && npm run dev`
- Navigate to `http://localhost:3001/`
- Should see name input form with disabled button (no text yet)
- Type in first and last name — button should enable
- (Don't submit yet — Route Handler doesn't exist)

**Step 3: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat: add landing page with name input form"
```

---

## Task 3: Create Supabase Integration Route Handler

**Files:**
- Create: `frontend/app/api/customer/create/route.ts`
- Create: `frontend/lib/supabase-client.ts` (client configuration)

**Step 1: Create Supabase client utility**

Create `frontend/lib/supabase-client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not configured')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 2: Create Route Handler for customer creation**

Create `frontend/app/api/customer/create/route.ts`:

```typescript
import { supabase } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName } = await request.json()

    // Validate input
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: 'First and last name required' },
        { status: 400 }
      )
    }

    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.warn('Supabase not configured — proceeding without DB insert')
      return NextResponse.json({ customerId: null })
    }

    // Insert into Supabase customers table
    const { data, error } = await supabase
      .from('customers')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      // Graceful fallback — return success but no customerId
      return NextResponse.json({ customerId: null })
    }

    return NextResponse.json({ customerId: data.id })
  } catch (err) {
    console.error('Error in /api/customer/create:', err)
    // Graceful fallback
    return NextResponse.json({ customerId: null })
  }
}
```

**Step 3: Add Supabase env vars to .env.local**

Add to `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

(If not yet set up, Supabase will be mocked as unavailable and flow continues gracefully)

**Step 4: Test landing page form submission**

- Restart frontend
- Navigate to `/`
- Fill in first + last name
- Click "Start Demo"
- Should redirect to `/login`
- Check browser console for any errors (should see warning if Supabase not configured)

**Step 5: Commit**

```bash
git add frontend/lib/supabase-client.ts frontend/app/api/customer/create/route.ts
git commit -m "feat: add Route Handler for Supabase customer insert"
```

---

## Task 4: Update Backend /chat to Accept customer_id

**Files:**
- Modify: `backend/main.py` (ChatRequest model)
- Modify: `backend/agent.py` (pass customer_id to Arize)

**Step 1: Update ChatRequest model in main.py**

Modify `backend/main.py` — add `customer_id` field:

```python
from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    session_id: str
    message: str
    mode: str  # 'onboarding', 'coaching', 'servicing'
    businessType: Optional[str] = None
    loanPurpose: Optional[str] = None
    firstName: str  # Tester first name
    approvedAmount: Optional[int] = None
    maxAmount: Optional[int] = None
    customer_id: Optional[str] = None  # NEW: Supabase customer UUID
    customer_name: Optional[str] = None  # NEW: "First Last" for logging
    # ... existing fields
```

**Step 2: Pass customer_id to agent in run_agent call**

In `backend/main.py` `/chat` route handler, pass `customer_id`:

```python
@app.post('/chat')
async def chat(request: ChatRequest):
    # ... existing code ...

    response = await run_agent(
        session_id=request.session_id,
        message=request.message,
        mode=request.mode,
        business_type=request.businessType,
        loan_purpose=request.loanPurpose,
        first_name=request.firstName,
        approved_amount=request.approvedAmount,
        max_amount=request.maxAmount,
        customer_id=request.customer_id,  # NEW
        customer_name=request.customer_name,  # NEW
    )

    return response
```

**Step 3: Update agent.py to accept and use customer_id**

Modify `backend/agent.py` — update `run_agent` signature:

```python
async def run_agent(
    session_id: str,
    message: str,
    mode: str,
    business_type: Optional[str] = None,
    loan_purpose: Optional[str] = None,
    first_name: Optional[str] = None,
    approved_amount: Optional[int] = None,
    max_amount: Optional[int] = None,
    customer_id: Optional[str] = None,  # NEW
    customer_name: Optional[str] = None,  # NEW
) -> AgentDecision:
    # ... existing code ...

    # When calling OpenAI or logging, include customer_id in context
    # (Will be used by Arize in task 5)
```

**Step 4: Test backend accepts customer_id**

- Restart backend: `cd backend && uvicorn main:app --reload --port 8000`
- Send test request with customer_id:

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session",
    "message": "hello",
    "mode": "onboarding",
    "firstName": "Test",
    "customer_id": "uuid-here",
    "customer_name": "Test User"
  }'
```

- Should not error; response should include new fields

**Step 5: Commit**

```bash
git add backend/main.py backend/agent.py
git commit -m "feat: add customer_id to ChatRequest and agent flow"
```

---

## Task 5: Wire Up Arize Tracing with customer_id

**Files:**
- Modify: `backend/agent.py` (add customer_id to trace context)

**Step 1: Update Arize span attributes**

In `backend/agent.py`, wherever spans are created (e.g., in `run_agent`), add:

```python
# When creating the root span for /chat request:
span.attributes['customer_id'] = customer_id or 'unknown'
span.attributes['customer_name'] = customer_name or 'unknown'
span.attributes['session_id'] = session_id

# Within sub-spans (OpenAI call, extraction, etc.), inherit these attributes
```

If Arize is set up via OpenTelemetry, the attributes propagate automatically.

**Step 2: Test tracing with customer_id**

- Make a request with customer_id
- Check Arize dashboard → should see customer_id as top-level attribute
- (Requires Arize account; skip if not available)

**Step 3: Commit**

```bash
git add backend/agent.py
git commit -m "feat: add customer_id to Arize trace attributes"
```

---

## Task 6: Create ResetMenu Component

**Files:**
- Create: `frontend/components/app-shell/ResetMenu.tsx`

**Step 1: Write ResetMenu component**

Create `frontend/components/app-shell/ResetMenu.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFlow } from '@/contexts/FlowContext'
import { useChat } from '@/contexts/ChatContext'
import { useCustomer } from '@/contexts/CustomerContext'
import { RotateCcw, X } from 'lucide-react'

interface ResetMenuProps {
  variant?: 'icon' | 'compact'  // icon = button, compact = in-header
}

export function ResetMenu({ variant = 'icon' }: ResetMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()
  const { dispatch: flowDispatch } = useFlow()
  const { resetChat } = useChat()
  const { dispatch: customerDispatch } = useCustomer()

  const handleRestartDemo = () => {
    // Clear flow only, keep customer name
    resetChat()
    flowDispatch({ type: 'RESET' })
    setShowMenu(false)
    router.push('/survey')
  }

  const handleNewCustomer = () => {
    // Clear flow AND customer name
    resetChat()
    flowDispatch({ type: 'RESET' })
    customerDispatch({ type: 'CLEAR_NAME' })
    setShowMenu(false)
    router.push('/')
  }

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-8 h-8 rounded-full border border-[#fbe9dd] bg-[#fff8f4] flex items-center justify-center touch-active"
          title="Reset options"
        >
          <RotateCcw size={14} className="text-[#f06f14]" />
        </button>

        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <div className="absolute top-10 right-0 bg-white rounded-lg shadow-lg border border-[#e8e8e6] z-50 w-48">
              <button
                onClick={handleRestartDemo}
                className="w-full px-4 py-3 text-left text-sm font-medium text-[#1f1c2f] hover:bg-[#f5f6f0] border-b border-[#e8e8e6] touch-active"
              >
                Restart Demo
              </button>
              <button
                onClick={handleNewCustomer}
                className="w-full px-4 py-3 text-left text-sm font-medium text-[#1f1c2f] hover:bg-[#f5f6f0] touch-active"
              >
                New Customer
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}
```

**Step 2: Test menu renders (no submission yet)**

- Add to a page (will do in task 7)
- Verify icon renders and menu opens/closes

**Step 3: Commit**

```bash
git add frontend/components/app-shell/ResetMenu.tsx
git commit -m "feat: create ResetMenu component with restart/new customer options"
```

---

## Task 7: Integrate ResetMenu into /onboarding page

**Files:**
- Modify: `frontend/app/(app)/onboarding/page.tsx`

**Step 1: Add ResetMenu to onboarding header**

Modify the header section in `frontend/app/(app)/onboarding/page.tsx`:

```typescript
import { ResetMenu } from '@/components/app-shell/ResetMenu'
import { ChevronLeft } from 'lucide-react'

// In the header JSX:
<div className="px-4 py-3 flex items-center justify-between">
  <button
    onClick={() => router.push('/survey')}
    className="w-8 h-8 flex items-center justify-center touch-active -ml-1"
  >
    <ChevronLeft size={22} className="text-[#1f1c2f]" />
  </button>

  {/* Thalia avatar + name — unchanged */}
  <img
    src="/thalia/SupportAgentWidget.svg"
    alt="Thalia"
    style={{ width: 36, height: 36, flexShrink: 0 }}
  />
  <div className="flex-1 min-w-0">
    <p className="text-[#1f1c2f] font-semibold text-sm leading-tight">Thalia</p>
    <p className="text-[#1a989e] text-xs font-medium flex items-center gap-1 leading-tight">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1a989e]" />
      Business assistant
    </p>
  </div>

  {/* NEW: Reset menu */}
  <ResetMenu variant="icon" />
</div>
```

**Step 2: Test reset menu on onboarding page**

- Navigate to `/survey` (or log in → survey)
- Proceed to `/onboarding`
- Click reset icon
- Should see menu with two options
- Click "Restart Demo" — should return to `/survey` with chat cleared
- Run onboarding again, click "New Customer" — should go to `/` with name cleared

**Step 3: Commit**

```bash
git add frontend/app/(app)/onboarding/page.tsx
git commit -m "feat: add ResetMenu to onboarding page header"
```

---

## Task 8: Integrate ResetMenu into /home page

**Files:**
- Modify: `frontend/app/(app)/home/page.tsx`

**Step 1: Replace reset button with ResetMenu**

In `frontend/app/(app)/home/page.tsx`, replace the old reset button:

```typescript
import { ResetMenu } from '@/components/app-shell/ResetMenu'

// In the header, remove the old reset button code (lines ~51-57)
// and replace with:

<ResetMenu variant="icon" />
```

(Remove the old `handleReset` function and related button code since ResetMenu handles it)

**Step 2: Test reset menu on home page**

- Complete onboarding flow → reach `/home`
- Click reset icon
- Should see menu with two options
- Click "Restart Demo" — should return to `/survey`
- Click "New Customer" — should go to `/`

**Step 3: Commit**

```bash
git add frontend/app/(app)/home/page.tsx
git commit -m "feat: replace home reset button with ResetMenu component"
```

---

## Task 9: Update Frontend to Pass customer_name to Backend

**Files:**
- Modify: `frontend/services/chat-service-api.ts`

**Step 1: Update chat service to include customer info**

In `frontend/services/chat-service-api.ts`, modify the `sendMessage` function:

```typescript
import { useCustomer } from '@/contexts/CustomerContext'

// In the function that calls /chat:
export async function sendMessage({
  sessionId,
  message,
  mode,
  businessType,
  loanPurpose,
  firstName,
  approvedAmount,
  maxAmount,
  customerId,    // NEW
  customerName   // NEW
}: ChatMessagePayload) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      message,
      mode,
      businessType,
      loanPurpose,
      firstName,
      approvedAmount,
      maxAmount,
      customer_id: customerId,    // NEW
      customer_name: customerName // NEW
    })
  })

  return response.json()
}
```

**Step 2: Update ChatContext to pass customer info**

In `frontend/contexts/ChatContext.tsx`, when calling `sendMessage`, include customer data:

```typescript
import { useCustomer } from '@/contexts/CustomerContext'

// In sendMessage call:
const { customer } = useCustomer()

await sendMessage({
  sessionId,
  message,
  mode,
  // ... existing fields
  customerId: customer.customerId || undefined,
  customerName: customer.firstName && customer.lastName
    ? `${customer.firstName} ${customer.lastName}`
    : undefined
})
```

**Step 3: Test end-to-end flow**

- Start from landing page
- Enter name (e.g., "Maria Garcia")
- Proceed through login → survey → onboarding
- Send a message in chat
- Check backend console — should log customer_name and customer_id
- Check browser network tab — /api/chat request should include customer data

**Step 4: Commit**

```bash
git add frontend/services/chat-service-api.ts frontend/contexts/ChatContext.tsx
git commit -m "feat: pass customer_id and customer_name to backend /chat"
```

---

## Task 10: Full End-to-End Testing

**Files:**
- Test: Manual flow verification

**Step 1: Test landing page → full flow**

1. Start fresh (clear localStorage): DevTools → Application → LocalStorage → delete `tala_customer_state` and `tala_flow_state`
2. Navigate to `/`
3. Enter first name "Test" and last name "User"
4. Click "Start Demo"
5. Should land on `/login`
6. Enter code (e.g., "DEMO")
7. Continue through survey → onboarding
8. Verify name persists through chat messages (check Arize/backend logs)

**Step 2: Test "Restart Demo" reset**

1. During onboarding, click reset icon
2. Select "Restart Demo"
3. Should return to `/survey` with chat cleared
4. Name should still be "Test User" (check context in DevTools)
5. Proceed through survey again → should work seamlessly

**Step 3: Test "New Customer" reset**

1. During any stage, click reset icon
2. Select "New Customer"
3. Should return to `/` (landing page)
4. Name field should be empty
5. Enter different name and proceed
6. Old name should be gone from localStorage

**Step 4: Test mobile responsiveness**

- Use browser DevTools to test on mobile widths (375px)
- Name inputs should be readable and touch-friendly
- Menu should not overflow screen

**Step 5: Document test results**

- Create test summary in ticket/notes:
  - ✅ Landing page form submission
  - ✅ Name persists across resets
  - ✅ "Restart Demo" clears flow only
  - ✅ "New Customer" clears all
  - ✅ Supabase record created (if available)
  - ✅ Customer data passed to backend
  - ✅ Mobile responsive

**Step 6: Final commit**

```bash
git log --oneline | head -10  # Verify commits
```

---

## Architecture Notes

### State Persistence
- **CustomerContext**: Lives separately from FlowContext, persists to localStorage as `tala_customer_state`
- **FlowContext**: Continues to persist as `tala_flow_state`
- **Reset behavior**: `FlowContext` → `RESET` action clears flow; separate `customerDispatch` action clears customer name

### Supabase Graceful Fallback
- If Supabase URL/key missing → Route Handler logs warning, returns `customerId: null`
- Frontend catches errors and proceeds anyway
- App fully functional without Supabase (name just doesn't persist to DB)

### Arize Integration
- Customer data passed through `/chat` request → backend includes in span attributes
- No new Arize code needed if OpenTelemetry already configured
- Top-level trace grouping by `customer_id` enables analysis by customer

### Testing with Variants
- Internal testers can enter name → proceed through flow → use "Restart Demo" to quickly retry
- "New Customer" for testing with different personas or for hard reset between development cycles

---

## Files Modified/Created Summary

**New Files:**
- `frontend/contexts/CustomerContext.tsx`
- `frontend/app/page.tsx` (replaces redirect)
- `frontend/lib/supabase-client.ts`
- `frontend/app/api/customer/create/route.ts`
- `frontend/components/app-shell/ResetMenu.tsx`

**Modified Files:**
- `frontend/app/layout.tsx`
- `frontend/app/(app)/onboarding/page.tsx`
- `frontend/app/(app)/home/page.tsx`
- `frontend/services/chat-service-api.ts`
- `frontend/contexts/ChatContext.tsx`
- `backend/main.py`
- `backend/agent.py`

**Environment:**
- Add to `frontend/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
