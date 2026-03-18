# Name Landing Page + Reset Design

**Date:** March 12, 2026
**Status:** Approved

## Overview

Add a name collection landing page and dual-reset functionality to support:
1. **Customer usability testing** — capture customer name for session tracing (Supabase + Arize)
2. **Internal development testing** — fast iteration with restart/new customer options
3. **Agent personalization** — agent addresses customer by name during onboarding

## Current Flow

```
Root (redirect) → /login → /survey → /onboarding → /offer → /home
```

## New Flow

```
/ (landing) → /login → /survey → /onboarding → /offer → /home
```

## Route Structure

| Route | Purpose | Change |
|-------|---------|--------|
| `/` | Name collection | **NEW** — first/last name, "Start Demo" button |
| `/login` | Tester code entry | Unchanged |
| `/survey` | Business type + loan purpose | Unchanged |
| `/onboarding` | Chat-based onboarding | Add reset menu (two options) |
| `/offer` | Offer review | Unchanged |
| `/home` | Post-disbursement | Add reset menu (two options) |

## State Management

### CustomerContext (NEW)
- Stores: `customerName` (first + last)
- Persists to `localStorage`
- Survives `FlowContext` reset
- Passed to `/chat` requests for agent personalization

### FlowContext (Enhanced)
- Existing `RESET` action clears flow state only
- Name stays in `CustomerContext`
- Add new flow action to clear `CustomerContext` (hard reset)

## Reset Behavior

**Option 1: "Restart Demo"**
- Clears: `FlowContext` state only
- Preserves: Customer name in `CustomerContext`
- Navigation: → `/survey` (skip landing page)
- Use case: Internal testers cycling through variants with same tester identity

**Option 2: "New Customer"**
- Clears: `FlowContext` state + `CustomerContext` name
- Navigation: → `/` (landing page)
- Use case: Testing with next customer, full hard reset, development restart

## Landing Page Design

**File:** `frontend/app/page.tsx` (replaces redirect to `/login`)

```
Header: Tala logo + "Welcome"
Body:
  - Prompt: "Let's get started. What's your name?"
  - Input 1: First name (required)
  - Input 2: Last name (required)
  - Button: "Start Demo" (disabled until both filled)
  - On submit:
    1. Create Supabase customer record (name + timestamp)
    2. Store name in CustomerContext
    3. Redirect to `/login`
```

## Supabase Integration

**New Table: `customers`**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  session_id UUID,  -- Links to chat sessions
  notes TEXT        -- Tester notes (for internal use)
)
```

**Backend Changes:**
- On landing page submit (frontend): Insert customer record, get `customer_id`
- Pass `customer_id` to `/chat` requests
- Store in session alongside other context

## Arize Tracing

**Session Identity:**
- `customer_id` (from Supabase) — top-level trace attribute
- `session_id` (unique per chat flow) — links multiple attempts to same customer
- `reset_count` — tracks how many times customer reset (0, 1, 2...)

**Trace Payload:**
```json
{
  "customer_id": "uuid",
  "customer_name": "First Last",
  "session_id": "uuid",
  "reset_option": "restart_demo" | "new_customer",
  ...existing fields
}
```

## UI Changes Summary

| Page | Change |
|------|--------|
| `/` | New landing page (name input + button) |
| `/onboarding` header | Add reset menu next to back button |
| `/home` header | Add reset menu next to existing reset button |

## Testing Checklist

- [ ] Landing page form validates (both name fields required)
- [ ] Name persists across login → survey → onboarding → home
- [ ] "Restart Demo" clears flow, keeps name, redirects to `/survey`
- [ ] "New Customer" clears everything, redirects to `/`
- [ ] Supabase customer records created on landing submit
- [ ] Customer name passed to `/chat` requests
- [ ] Arize traces include customer_id and customer_name
- [ ] Full flow works end-to-end with name persistence
