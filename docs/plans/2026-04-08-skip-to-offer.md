# Skip-to-Offer Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a customer send "I just want to get my loan now" at any point during onboarding and immediately receive their offer with the configure-loan button.

**Architecture:** Add a `skip_to_offer` boolean to `AgentDecision` so the LLM can signal skip intent. In `agent.py`, detect that flag and jump `session.phase` to `"11"` while forcing `result.is_offer = True`. Add a universal prompt instruction so the LLM knows when and how to set the flag. No frontend changes — the existing `isOffer` flag already triggers the configure button.

**Tech Stack:** Python/Pydantic (`backend/state.py`), FastAPI (`backend/agent.py`), prompt strings (`backend/prompts.py`), pytest (`backend/tests/test_agent_loops.py`)

---

### Task 1: Add `skip_to_offer` field to `AgentDecision`

**Files:**
- Modify: `backend/state.py:102-110`

- [ ] **Step 1: Add the field after `is_offer`**

In `backend/state.py`, insert after the `is_offer` field (after line 110):

```python
    skip_to_offer: bool = Field(
        default=False,
        description=(
            "Set to true ONLY when the customer explicitly asks to skip the remaining "
            "questions and get their loan offer immediately — e.g. 'I just want my loan now', "
            "'just show me my offer', 'skip to the loan', 'I don't need the questions'. "
            "Leave false in all other cases, including normal phase progression."
        )
    )
```

- [ ] **Step 2: Verify the class still parses correctly**

```bash
cd backend && python -c "from state import AgentDecision; d = AgentDecision(messages=['hi']); print(d.skip_to_offer)"
```

Expected output: `False`

- [ ] **Step 3: Commit**

```bash
git add backend/state.py
git commit -m "feat: add skip_to_offer field to AgentDecision"
```

---

### Task 2: Add universal skip instruction to `build_system_prompt`

**Files:**
- Modify: `backend/prompts.py:334-337` (top of `build_system_prompt`), `backend/prompts.py:816` (phase 11 rate_pct), `backend/prompts.py:881-892` (onboarding return)

- [ ] **Step 1: Move `rate_pct` to the top of `build_system_prompt`**

`rate_pct` is currently computed only inside the `elif phase == "11":` block (line 816). Move it to just after `amount_fmt` and `offer_fmt` are defined (around line 337), so it's available for the universal instruction.

Replace:
```python
    amount_fmt = f"${approved_amount:,.0f}"
    offer_fmt = f"${offer_amount:,.0f}" if offer_amount else "$0"
    max_fmt = f"${max_amount:,.0f}" if max_amount else "$0"
```

With:
```python
    amount_fmt = f"${approved_amount:,.0f}"
    offer_fmt = f"${offer_amount:,.0f}" if offer_amount else "$0"
    max_fmt = f"${max_amount:,.0f}" if max_amount else "$0"
    rate_pct = f"{interest_rate_daily * 100:.2f}%"
```

Then in the `elif phase == "11":` block, remove the now-redundant line:
```python
        rate_pct = f"{interest_rate_daily * 100:.2f}%"
```

- [ ] **Step 2: Add the `skip_instruction` variable**

Just before the `return (` at line 881 (the onboarding return — NOT the servicing return at line 389), add:

```python
    skip_instruction = (
        "SKIP TO OFFER — applies in ANY phase:\n"
        "If the customer says they want to skip the remaining questions and get their "
        "loan immediately (e.g. 'I just want my loan now', 'just show me my offer', "
        "'skip to the loan', 'I don't need all these questions'), respond with exactly "
        "2 bubbles:\n"
        f"  Bubble 1: 'Of course!'\n"
        f"  Bubble 2: 'You're approved for **{amount_fmt} MXN** at **{rate_pct} daily "
        f"interest**, for up to **60 days** (1 or 2 payments). Ready to configure it?'\n"
        "Set skip_to_offer=true and is_offer=true. "
        "Do NOT ask any remaining profile questions.\n"
    )
```

- [ ] **Step 3: Include `skip_instruction` in the onboarding return**

Modify the `return (` at line 881 to include the instruction between `_formatting_rules` and `instructions`:

```python
    return (
        f"You are Thalia, a warm AI business assistant for Tala (lending app).\n"
        f"Customer: {tester_name} | Date: {today}\n"
        f"{tester_ctx_line}"
        f"{t('market_context')}"
        f"{survey_ctx}\n"
        f"{_absolute_rules(locale)}\n"
        f"{_formatting_rules('onboarding')}\n"
        f"{skip_instruction}\n"
        f"{instructions}\n\n"
        f"{_conversation_rules(locale)}"
        f"{gender_rule}"
    )
```

- [ ] **Step 4: Verify the prompt builds without errors for a mid-flow phase**

```bash
cd backend && python -c "
from prompts import build_system_prompt
p = build_system_prompt(phase='3', mode='onboarding', tester_name='Ana', collected={}, approved_amount=10000, max_amount=12000)
assert 'SKIP TO OFFER' in p
assert '10,000' in p
print('OK')
"
```

Expected output: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/prompts.py
git commit -m "feat: add universal skip-to-offer instruction to onboarding prompt"
```

---

### Task 3: Handle `skip_to_offer` in `agent.py` phase logic

**Files:**
- Modify: `backend/agent.py:270-275`

- [ ] **Step 1: Add skip detection at the top of the phase block**

In `backend/agent.py`, find this block (lines 269-275):

```python
    # ── Phase advancement ──────────────────────────────────────────────
    if session.mode == "onboarding":
        phase = session.phase

        if phase == "0":
            if result.advance_phase:
                session.phase = _next_phase(phase)
```

Replace with:

```python
    # ── Phase advancement ──────────────────────────────────────────────
    if session.mode == "onboarding":
        phase = session.phase

        # ── Skip-to-offer: jump directly to Phase 11 from any earlier phase ──
        if result.skip_to_offer and phase not in ("11", "12", "complete"):
            session.phase = "11"
            result.is_offer = True

        elif phase == "0":
            if result.advance_phase:
                session.phase = _next_phase(phase)
```

- [ ] **Step 2: Verify the file is syntactically valid**

```bash
cd backend && python -c "import agent; print('OK')"
```

Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/agent.py
git commit -m "feat: jump to phase 11 and show configure button when skip_to_offer=true"
```

---

### Task 4: Write and run the test

**Files:**
- Modify: `backend/tests/test_agent_loops.py`

- [ ] **Step 1: Add the skip-to-offer test**

Open `backend/tests/test_agent_loops.py` and add this test at the end of the file (before any `if __name__ == "__main__":` block if present):

```python
@pytest.mark.asyncio
async def test_skip_to_offer_from_mid_flow(mock_openai):
    """Customer saying 'I just want my loan now' in phase 3 jumps to phase 11
    and returns is_offer=True so the configure button appears."""
    # Start a session already in phase 3 (team size question)
    session_id = "test-skip-offer-001"
    
    # Seed the session into phase 3 by calling chat_turn twice
    await chat_turn(
        session_id=session_id,
        message="Hola",
        tester_name="Ana",
        approved_amount=10000,
        max_amount=12000,
    )
    
    # The mock LLM will return skip_to_offer=True, is_offer=True
    mock_openai.return_value = _make_mock_response(
        messages=["Of course!", "You're approved for **$10,000 MXN** at **0.83% daily interest**, for up to **60 days**. Ready to configure it?"],
        skip_to_offer=True,
        is_offer=True,
    )
    
    result = await chat_turn(
        session_id=session_id,
        message="I just want to get my loan now",
        tester_name="Ana",
        approved_amount=10000,
        max_amount=12000,
    )
    
    assert result["phase"] == "11", f"Expected phase 11, got {result['phase']}"
    assert result["is_offer"] is True, "Expected is_offer=True so configure button shows"
    assert result["offer_amount"] == 10000
```

> **Note:** Check the existing test file for the actual mock helper names (`_make_mock_response`, `mock_openai` fixture, `chat_turn` import). Match those exact names — the test must use the same patterns the other tests use in that file.

- [ ] **Step 2: Run the test**

```bash
cd backend && python -m pytest tests/test_agent_loops.py::test_skip_to_offer_from_mid_flow -v
```

Expected: `PASSED`

- [ ] **Step 3: Run full test suite to check for regressions**

```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_agent_loops.py
git commit -m "test: add skip-to-offer phase jump test"
```

---

### Task 5: Manual end-to-end verification

- [ ] **Step 1: Start the dev server**

```bash
cd backend && uvicorn main:app --reload --port 8000
```

- [ ] **Step 2: Test in the chat UI**

Open the app, start onboarding with any access code. After the first question (e.g., "How does your business operate?"), type:

> "I just want to get my loan now"

Expected:
1. Agent responds with 2 bubbles: acknowledgment + offer details
2. The **Configure my loan** button appears below the second bubble
3. Tapping it opens the loan configurator

- [ ] **Step 3: Test skip from Phase 0 (welcome)**

After the welcome bubbles appear (before answering any question), type the skip phrase. Expected: same — agent jumps to offer, configure button shows.

- [ ] **Step 4: Verify normal flow is unaffected**

Start a fresh session and complete phases 1-3 normally (without saying the skip phrase). Verify the agent still asks profile questions as before.

- [ ] **Step 5: Push to dubyak**

```bash
git push dubyak main
```
