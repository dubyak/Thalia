"""Loop-detection tests for the Thalia conversational agent.

These integration tests run real conversations through the onboarding and coaching
agents and fail if the agent repeats the same question or stalls on a phase.

They hit the live OpenAI API and are meant to run before deploying to production.

Usage:
    cd backend && pytest tests/test_agent_loops.py -v
"""

import os
from difflib import SequenceMatcher

import pytest

from agent import run_agent, sessions

# Skip entire module if no API key
pytestmark = pytest.mark.skipif(
    not os.environ.get("OPENAI_API_KEY"),
    reason="OPENAI_API_KEY not set — skipping live agent tests",
)

# ── Config ──────────────────────────────────────────────────────────────

SIMILARITY_THRESHOLD = 0.7   # 70% — catches near-identical rephrases
MAX_SAME_PHASE_TURNS = 6     # generous: LLM turn count is non-deterministic
COACHING_DEMO_PHASE = "9"    # phase 9 is multi-turn by design


# ── Helpers ─────────────────────────────────────────────────────────────

def _combine(messages: list[str]) -> str:
    """Join multi-bubble messages into one string for comparison."""
    return " ".join(messages).strip()


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _assert_no_repeats(
    agent_turns: list[str],
    current: str,
    turn_index: int,
    context: str = "",
):
    """Fail if current agent message is too similar to any previous turn."""
    for j, prev in enumerate(agent_turns):
        sim = _similarity(current, prev)
        if sim > SIMILARITY_THRESHOLD:
            label = f" ({context})" if context else ""
            pytest.fail(
                f"Loop detected at turn {turn_index}{label}: "
                f"{sim:.0%} similar to turn {j}.\n"
                f"  Turn {j}:            {prev[:250]}\n"
                f"  Turn {turn_index}:   {current[:250]}"
            )


# ── Onboarding ──────────────────────────────────────────────────────────

# Canned user replies that should let the agent progress through all 12 phases.
# Each answer is realistic enough for the LLM to extract the required field and
# advance. Extra entries at the end cover offer negotiation / installment choice.
ONBOARDING_RESPONSES = [
    "I'm ready to get started",                                         # Phase 1 intro → agent asks selling channel
    "I sell from a physical storefront on the main road",               # Phase 1: sellingChannel
    "About three years now",                                            # Phase 2: tenure
    "It's just me, solo operation",                                     # Phase 3: teamSize
    "Usually around 4,000 to 5,000 pesos a week",                      # Phase 4: weeklyRevenue
    "Looking good — I expect a small bump next month",                  # Phase 5: nearTermOutlook (positive → advance)
    "Usually within a week after restocking",                           # Phase 6: cashCycleSpeed
    "My main costs are ingredients and packaging, plus transport",      # Phase 7: mainExpenses
    "Around 6,000 to 8,000 pesos to keep my stock levels comfortable", # Phase 8: workingCapitalNeed
    "I'll skip the evidence for now, let's continue",                   # Phase 9: skip evidence
    "I'd love help figuring out how to increase my sales",              # Phase 10: coaching turn 1
    "Most of my sales happen on weekends when foot traffic is higher",  # Phase 10: coaching turn 2
    "That sounds like a great plan, I'll try it this week",             # Phase 10: coaching turn 3
    "Thanks, I think I'm ready to see the loan offer now",              # Phase 10→11
    "Yes, it looks good!",                                              # Phase 11: accept initial offer → STEP 2 (is_offer=true)
    "I've accepted the loan of $8,000 MXN with 1 payment.",            # Phase 11 STEP 4 → advance trigger
    "Thanks so much, I'm excited!",                                     # Phase 12
    "Bye!",                                                             # extra
]

MAX_ONBOARDING_TURNS = 25  # safety cap so the test doesn't run forever


@pytest.mark.asyncio
async def test_onboarding_no_loops():
    """Full onboarding conversation: no repeated questions, no phase stalls."""
    sid = "test-onboarding-loops"
    sessions.pop(sid, None)

    # ── Opening (no user message) ───────────────────────────────────────
    result = await run_agent(
        sid,
        tester_name="Isabel",
        approved_amount=8000,
        max_amount=12000,
        mode="onboarding",
        business_type="food stall",
        loan_purpose="Restock inventory",
    )

    agent_turns: list[str] = [_combine(result["messages"])]
    prev_phase = result["phase"]
    same_phase_count = 0
    response_idx = 0

    # ── Conversation loop ───────────────────────────────────────────────
    for turn in range(1, MAX_ONBOARDING_TURNS + 1):
        session = sessions[sid]
        if session.phase == "complete":
            break

        if response_idx >= len(ONBOARDING_RESPONSES):
            pytest.fail(
                f"Ran out of canned responses at turn {turn}, "
                f"phase '{session.phase}'. Agent may be stuck."
            )

        user_msg = ONBOARDING_RESPONSES[response_idx]
        response_idx += 1

        result = await run_agent(sid, message=user_msg)
        combined = _combine(result["messages"])

        # Check 1: no near-duplicate messages
        _assert_no_repeats(agent_turns, combined, turn, context=f"phase {result['phase']}")
        agent_turns.append(combined)

        # Check 2: phase stall
        current_phase = result["phase"]
        if current_phase == prev_phase:
            same_phase_count += 1
            # Phase 9 (coaching demo) is intentionally multi-turn
            limit = 8 if current_phase == COACHING_DEMO_PHASE else MAX_SAME_PHASE_TURNS
            if same_phase_count >= limit:
                pytest.fail(
                    f"Phase stall: stuck on phase '{current_phase}' for "
                    f"{same_phase_count} consecutive turns (turn {turn}).\n"
                    f"Last agent message: {combined[:250]}"
                )
        else:
            same_phase_count = 0
            prev_phase = current_phase

    # ── Final assertions ────────────────────────────────────────────────
    final_phase = sessions[sid].phase
    assert final_phase in ("complete", "11"), (
        f"Onboarding didn't reach completion — ended at phase '{final_phase}'"
    )

    sessions.pop(sid, None)


# ── Coaching ────────────────────────────────────────────────────────────

COACHING_RESPONSES = [
    "Sure, show me what topics you can help with",
    "Let's do cash flow analysis",
    "My biggest expenses are inventory and rent, about 60% of my revenue",
    "I buy inventory twice a week, usually Mondays and Thursdays",
    "I haven't tried tracking daily sales — that could be useful",
    "Yes, I'd like to explore another topic from the menu",
]

MAX_COACHING_TURNS = 12


@pytest.mark.asyncio
async def test_coaching_no_loops():
    """Coaching conversation should not repeat the same question."""
    sid = "test-coaching-loops"
    sessions.pop(sid, None)

    result = await run_agent(
        sid,
        tester_name="Isabel",
        approved_amount=8000,
        max_amount=12000,
        mode="coaching",
        business_type="food stall",
        is_first_visit=True,
        collected={"businessType": "food stall", "sellingChannel": "storefront"},
    )

    agent_turns: list[str] = [_combine(result["messages"])]

    for i, user_msg in enumerate(COACHING_RESPONSES):
        turn = i + 1
        result = await run_agent(sid, message=user_msg)
        combined = _combine(result["messages"])

        _assert_no_repeats(agent_turns, combined, turn)
        agent_turns.append(combined)

    sessions.pop(sid, None)
