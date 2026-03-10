import os
from dataclasses import dataclass, field

from openai import AsyncOpenAI

from state import AgentDecision
from prompts import build_system_prompt

# Phase 0: Welcome
# Phase 1-3: Business profile (selling channel, tenure, typical customer)
# Phase 4-7: Business health (recent changes, outlook, cash-cycle, working capital)
# Phase 8: Optional evidence
# Phase 9: Coaching demo (multi-turn)
# Phase 10: Offer presentation + negotiation
# Phase 11: Closing
PHASE_ORDER = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "complete"]

# Field required for each profile/health phase to advance
PHASE_FIELD = {
    "1": "sellingChannel",
    "2": "tenure",
    "3": "typicalCustomer",
    "4": "recentChanges",
    "5": "nearTermOutlook",
    "6": "cashCycleSpeed",
    "7": "workingCapital",
}


@dataclass
class Session:
    messages: list[dict] = field(default_factory=list)
    phase: str = "0"
    mode: str = "onboarding"
    tester_name: str = "there"
    approved_amount: int = 8000
    max_amount: int = 12000
    collected: dict = field(default_factory=dict)
    is_first_visit: bool = True
    # Survey-provided context (not asked in chat)
    business_type: str | None = None
    loan_purpose: str | None = None
    # Coaching demo turn counter
    coaching_turns: int = 0
    # Offer negotiation state
    offer_stage: str = "initial"  # initial | negotiating | accepted
    # Interest rate for offer display
    interest_rate_daily: float = 0.01  # 1% per day default


sessions: dict[str, Session] = {}

_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def _initial_offer(max_amount: int) -> int:
    """~10% below max, rounded to nearest 500."""
    raw = max_amount * 0.9
    return round(raw / 500) * 500


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
    max_amount: int = 12000,
    mode: str = "onboarding",
    collected: dict | None = None,
    business_type: str | None = None,
    loan_purpose: str | None = None,
    is_first_visit: bool = True,
    image_data: str | None = None,
) -> dict:
    # ── Get or create session ──────────────────────────────────────────
    if session_id not in sessions:
        sessions[session_id] = Session(
            phase="0" if mode == "onboarding" else mode,
            mode=mode,
            tester_name=tester_name or "there",
            approved_amount=approved_amount,
            max_amount=max_amount,
            collected=dict(collected or {}),
            is_first_visit=is_first_visit,
            business_type=business_type,
            loan_purpose=loan_purpose,
        )

    session = sessions[session_id]

    # ── Inject survey context into collected ─────────────────────────
    if session.business_type:
        session.collected["businessType"] = session.business_type
    if session.loan_purpose:
        session.collected["loanPurpose"] = session.loan_purpose

    # ── Append user message ────────────────────────────────────────────
    if message or image_data:
        if image_data and not message:
            session.messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": "(Customer shared a photo)"},
                    {"type": "image_url", "image_url": {"url": image_data}},
                ],
            })
        elif image_data and message:
            session.messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": message},
                    {"type": "image_url", "image_url": {"url": image_data}},
                ],
            })
        else:
            session.messages.append({"role": "user", "content": message})

    # ── Calculate offer amounts for Phase 10 ──────────────────────────
    offer_amount = 0
    if session.phase == "10":
        offer_amount = session.max_amount

    # ── Build system prompt ────────────────────────────────────────────
    system_prompt = build_system_prompt(
        phase=session.phase,
        mode=session.mode,
        tester_name=session.tester_name,
        collected=session.collected,
        approved_amount=session.approved_amount,
        max_amount=session.max_amount,
        offer_amount=offer_amount,
        offer_stage=session.offer_stage,
        is_first_visit=session.is_first_visit,
        coaching_turns=session.coaching_turns,
        interest_rate_daily=session.interest_rate_daily,
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
    preview = result.messages[0][:80] if result.messages else "(empty)"
    print(f"[DEBUG] phase={session.phase} | advance={result.advance_phase} | extracted={result.extracted} | collected={session.collected} | msgs={len(result.messages)} | first={preview}...")

    # ── Merge extracted fields ─────────────────────────────────────────
    extracted = result.extracted.to_dict()
    for key, value in extracted.items():
        session.collected[key] = value

    # ── Phase advancement ──────────────────────────────────────────────
    if session.mode == "onboarding":
        phase = session.phase

        if phase == "0":
            if result.advance_phase:
                session.phase = _next_phase(phase)

        elif phase in PHASE_FIELD:
            if result.advance_phase:
                # Trust the agent's advance signal. Skip ahead past any
                # later phases whose fields were already volunteered.
                next_p = _next_phase(phase)
                while next_p in PHASE_FIELD:
                    if session.collected.get(PHASE_FIELD[next_p]):
                        next_p = _next_phase(next_p)
                    else:
                        break
                session.phase = next_p
            # Phase 5: need outlookReason follow-up if outlook is negative
            if phase == "5" and result.advance_phase:
                outlook = session.collected.get("nearTermOutlook", "").lower()
                negative_words = ["slow", "bad", "down", "worse", "difficult", "tough", "negative", "not great"]
                if any(w in outlook for w in negative_words) and not session.collected.get("outlookReason"):
                    session.phase = "5"  # Stay for follow-up

        elif phase == "8":
            if result.advance_phase:
                session.phase = _next_phase(phase)

        elif phase == "9":
            session.coaching_turns += 1
            if result.advance_phase and session.coaching_turns >= 3:
                session.phase = _next_phase(phase)

        elif phase == "10":
            # Agent presents offer, then UI handles config + terms acceptance.
            # When user accepts via UI, frontend sends a synthetic message which
            # triggers Phase 11 closing.
            if result.advance_phase:
                session.offer_stage = "accepted"
                session.phase = _next_phase(phase)

        elif phase == "11":
            if result.advance_phase:
                session.phase = "complete"

        else:
            if result.advance_phase:
                session.phase = _next_phase(phase)

    # ── Append assistant messages to history ───────────────────────────
    combined = "\n\n".join(result.messages)
    session.messages.append({"role": "assistant", "content": combined})

    # ── Return response ────────────────────────────────────────────────
    return {
        "messages": result.messages,
        "phase": session.phase,
        "collected": session.collected,
        "offer_amount": offer_amount,
    }
