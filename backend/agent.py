import json
import os
import re
from dataclasses import dataclass, field

from openai import AsyncOpenAI

from state import AgentDecision
from prompts import build_system_prompt

PHASE_ORDER = ["0", "1", "2", "3", "3.5", "3.75", "4", "5", "6", "complete"]


@dataclass
class Session:
    messages: list[dict] = field(default_factory=list)
    phase: str = "0"
    mode: str = "onboarding"
    tester_name: str = "there"
    approved_amount: int = 8000
    collected: dict = field(default_factory=dict)
    quick_replies: list[str] = field(default_factory=list)
    is_first_visit: bool = True
    weekly_revenue: str | None = None
    main_costs: str | None = None
    loan_purpose: str | None = None


sessions: dict[str, Session] = {}

_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def _calculate_offer(weekly_revenue_str: str | None) -> int:
    if not weekly_revenue_str:
        return 8000
    nums = re.findall(r'\d+', weekly_revenue_str.replace(',', ''))
    if not nums:
        return 8000
    w = int(nums[0])
    if w >= 15000:
        return 25000
    elif w >= 8000:
        return 15000
    elif w >= 3000:
        return 10000
    else:
        return 5000


def _next_phase(current: str) -> str:
    try:
        idx = PHASE_ORDER.index(current)
        return PHASE_ORDER[idx + 1] if idx + 1 < len(PHASE_ORDER) else "complete"
    except ValueError:
        return "complete"


async def run_agent(
    session_id: str,
    message: str | None = None,
    *,
    tester_name: str | None = None,
    approved_amount: int = 8000,
    mode: str = "onboarding",
    collected: dict | None = None,
    weekly_revenue: str | None = None,
    main_costs: str | None = None,
    loan_purpose: str | None = None,
    is_first_visit: bool = True,
) -> dict:
    # ── Get or create session ──────────────────────────────────────────
    if session_id not in sessions:
        sessions[session_id] = Session(
            phase="0" if mode == "onboarding" else mode,
            mode=mode,
            tester_name=tester_name or "there",
            approved_amount=approved_amount,
            collected=dict(collected or {}),
            is_first_visit=is_first_visit,
            weekly_revenue=weekly_revenue,
            main_costs=main_costs,
            loan_purpose=loan_purpose,
        )

    session = sessions[session_id]

    # ── Append user message ────────────────────────────────────────────
    if message:
        session.messages.append({"role": "user", "content": message})

    # ── Pull top-level fields into collected for prompt context ─────────
    if session.weekly_revenue:
        session.collected["weeklyRevenue"] = session.weekly_revenue
    if session.main_costs:
        session.collected["mainCosts"] = session.main_costs
    if session.loan_purpose:
        session.collected["loanPurpose"] = session.loan_purpose

    # ── Calculate offer for Phase 5 ───────────────────────────────────
    offer_amount = 0
    if session.phase == "5":
        offer_amount = _calculate_offer(session.collected.get("weeklyRevenue"))

    # ── Build system prompt ────────────────────────────────────────────
    system_prompt = build_system_prompt(
        phase=session.phase,
        mode=session.mode,
        tester_name=session.tester_name,
        collected=session.collected,
        approved_amount=session.approved_amount,
        offer_amount=offer_amount,
        is_first_visit=session.is_first_visit,
    )

    # ── Call OpenAI with structured output ─────────────────────────────
    api_messages = [{"role": "system", "content": system_prompt}] + session.messages

    completion = await _client.beta.chat.completions.parse(
        model="gpt-5.2",
        temperature=0.3,
        messages=api_messages,
        response_format=AgentDecision,
    )

    result = completion.choices[0].message.parsed

    # ── DEBUG: log LLM decision ────────────────────────────────────────
    print(f"[DEBUG] phase={session.phase} | advance={result.advance_phase} | extracted={result.extracted} | collected={session.collected} | response={result.response[:80]}...")

    # ── Merge extracted fields ─────────────────────────────────────────
    extracted = result.extracted.to_dict()
    if "weeklyRevenue" in extracted:
        session.collected["weeklyRevenue"] = extracted["weeklyRevenue"]
        session.weekly_revenue = extracted["weeklyRevenue"]
    if "mainCosts" in extracted:
        session.collected["mainCosts"] = extracted["mainCosts"]
        session.main_costs = extracted["mainCosts"]
    if "loanPurpose" in extracted:
        session.collected["loanPurpose"] = extracted["loanPurpose"]
        session.loan_purpose = extracted["loanPurpose"]
    if "businessType" in extracted:
        session.collected["businessType"] = extracted["businessType"]

    # ── Phase advancement ──────────────────────────────────────────────
    if session.mode == "onboarding":
        if session.phase == "1":
            if session.collected.get("businessType") and result.advance_phase:
                session.phase = "2"
        elif session.phase == "2":
            if session.collected.get("weeklyRevenue"):
                session.phase = "3"
            elif result.advance_phase:
                session.phase = "3"
        elif session.phase == "3":
            if session.collected.get("mainCosts") and result.advance_phase:
                session.phase = "3.5"
        elif session.phase == "3.5":
            if session.collected.get("loanPurpose") and result.advance_phase:
                session.phase = "3.75"
        elif session.phase == "3.75":
            if result.advance_phase:
                session.phase = "4"
        elif session.phase == "4":
            if result.advance_phase:
                session.phase = "5"
        elif session.phase == "5":
            if result.advance_phase:
                session.phase = "6"
        elif result.advance_phase:
            session.phase = _next_phase(session.phase)

    # ── Append assistant message to history ─────────────────────────────
    session.messages.append({"role": "assistant", "content": result.response})
    session.quick_replies = result.quick_replies

    # ── Return response ────────────────────────────────────────────────
    return {
        "content": result.response,
        "phase": session.phase,
        "collected": session.collected,
        "quick_replies": result.quick_replies,
        "offer_amount": offer_amount if session.phase == "5" or offer_amount > 0 else 0,
    }
