import os
from dataclasses import dataclass, field

from openai import AsyncOpenAI
from opentelemetry import trace

from state import AgentDecision
from prompts import build_system_prompt

tracer = trace.get_tracer(__name__)

# Phase 0: Welcome
# Phase 1-3: Business profile (selling channel, tenure, team size)
# Phase 4-8: Business health (weekly revenue, outlook, cash-cycle, main expenses, working capital need)
# Phase 9: Optional evidence
# Phase 10: Coaching demo (multi-turn)
# Phase 11: Offer presentation + negotiation
# Phase 12: Closing
PHASE_ORDER = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "complete"]

# Field required for each profile/health phase to advance
PHASE_FIELD = {
    "1": "sellingChannel",
    "2": "tenure",
    "3": "teamSize",
    "4": "weeklyRevenue",
    "5": "nearTermOutlook",
    "6": "cashCycleSpeed",
    "7": "mainExpenses",
    "8": "workingCapitalNeed",
}


@dataclass
class Session:
    messages: list[dict] = field(default_factory=list)
    phase: str = "0"
    mode: str = "onboarding"
    tester_name: str = "there"
    approved_amount: int = 10000
    max_amount: int = 11000
    collected: dict = field(default_factory=dict)
    is_first_visit: bool = True
    # Survey-provided context (not asked in chat)
    business_type: str | None = None
    loan_purpose: str | None = None
    # Coaching demo turn counter
    coaching_turns: int = 0
    message_count: int = 0
    # Offer negotiation state
    offer_stage: str = "initial"  # initial | negotiating | accepted
    # Current offer amount — starts at approved_amount, unlocks to max_amount after negotiation
    current_offer: int = 0
    # Interest rate for offer display
    interest_rate_daily: float = 0.0083  # 0.83% per day — matches frontend configurator
    # Locale for language switching
    locale: str = "en"
    # Extra context about the tester (e.g. "Loyal customer since June 2023 — on their 28th loan.")
    tester_context: str | None = None
    gender: str | None = None  # "male", "female", or "neutral" — for gendered Spanish


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
    approved_amount: int = 10000,
    max_amount: int = 11000,
    mode: str = "onboarding",
    collected: dict | None = None,
    business_type: str | None = None,
    loan_purpose: str | None = None,
    is_first_visit: bool = True,
    image_data: str | None = None,
    customer_id: str | None = None,
    customer_name: str | None = None,
    locale: str = "en",
    tester_context: str | None = None,
    gender: str | None = None,
) -> dict:
    with tracer.start_as_current_span("run_agent") as span:
        return await _run_agent_inner(
            span=span,
            session_id=session_id,
            message=message,
            tester_name=tester_name,
            approved_amount=approved_amount,
            max_amount=max_amount,
            mode=mode,
            collected=collected,
            business_type=business_type,
            loan_purpose=loan_purpose,
            is_first_visit=is_first_visit,
            image_data=image_data,
            customer_id=customer_id,
            customer_name=customer_name,
            locale=locale,
            tester_context=tester_context,
            gender=gender,
        )


async def _run_agent_inner(
    span: trace.Span,
    session_id: str,
    message: str | None = None,
    *,
    tester_name: str | None = None,
    approved_amount: int = 10000,
    max_amount: int = 11000,
    mode: str = "onboarding",
    collected: dict | None = None,
    business_type: str | None = None,
    loan_purpose: str | None = None,
    is_first_visit: bool = True,
    image_data: str | None = None,
    customer_id: str | None = None,
    customer_name: str | None = None,
    locale: str = "en",
    tester_context: str | None = None,
    gender: str | None = None,
) -> dict:
    # ── Set Arize trace attributes ─────────────────────────────────────
    span.set_attribute("session.id", session_id)          # OpenInference standard
    span.set_attribute("session_id", session_id)           # legacy / backward compat
    span.set_attribute("customer.id", customer_id or "unknown")
    span.set_attribute("customer.name", customer_name or "unknown")
    span.set_attribute("agent.mode", mode)

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
            locale=locale,
            tester_context=tester_context,
            gender=gender,
        )

    session = sessions[session_id]

    # ── Per-session message cap ─────────────────────────────────────────
    MAX_MESSAGES_PER_SESSION = 50
    session.message_count += 1
    if session.message_count > MAX_MESSAGES_PER_SESSION:
        return {
            "messages": ["You've reached the message limit for this session. Please start a new session to continue."],
            "phase": session.phase,
            "collected": session.collected,
            "offer_amount": 0,
            "is_complete": True,
        }

    # Initialize current_offer on first use
    if session.current_offer == 0:
        session.current_offer = session.approved_amount

    # ── Inject survey context into collected ─────────────────────────
    if session.business_type:
        session.collected["businessType"] = session.business_type
    if session.loan_purpose:
        session.collected["loanPurpose"] = session.loan_purpose

    # Guard: ignore empty messages mid-session to prevent welcome restart
    if not message and not image_data:
        if session.messages:
            # Session already has context — silently ignore the empty ping
            return {
                "messages": [],
                "phase": session.phase,
                "collected": session.collected,
                "offer_amount": session.current_offer if session.phase in ("11", "12") else 0,
                "is_offer": False,
                "is_complete": session.phase == "complete",
            }

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

    # ── Calculate offer amounts for Phase 11 ──────────────────────────
    offer_amount = 0
    if session.phase in ("11", "12"):
        offer_amount = session.current_offer

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
        locale=session.locale,
        tester_context=session.tester_context,
        gender=session.gender,
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

        # ── Skip-to-offer: jump directly to Phase 11 from any earlier phase ──
        if result.skip_to_offer and phase not in ("11", "12", "complete"):
            session.phase = "11"
            result.is_offer = True

        elif phase == "0":
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

        elif phase == "9":
            if result.advance_phase:
                session.phase = _next_phase(phase)

        elif phase == "10":
            session.coaching_turns += 1
            if result.advance_phase and session.coaching_turns >= 3:
                session.phase = _next_phase(phase)

        elif phase == "11":
            # Agent presents offer, then UI handles config + terms acceptance.
            # When user accepts via UI, frontend sends a synthetic message which
            # triggers Phase 12 closing.
            if result.offer_negotiated:
                session.current_offer = session.max_amount
            # is_offer and advance_phase are mutually exclusive: if the LLM
            # accidentally sets advance_phase=True while showing the configure
            # button (is_offer=True), prioritize is_offer and stay in phase 11.
            # Only advance when the customer has actually accepted via the app.
            if result.advance_phase and not result.is_offer:
                session.offer_stage = "accepted"
                session.phase = _next_phase(phase)

        elif phase == "12":
            session.phase = "complete"

        else:
            if result.advance_phase:
                session.phase = _next_phase(phase)

    # ── Auto-advance: if we advanced past a question phase, immediately ─
    # ── generate the next phase's question so the user doesn't hit a    ─
    # ── dead end and have to say "ok" to trigger the next question.     ─
    AUTO_ADVANCE_FROM = {"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"}
    if (
        session.mode == "onboarding"
        and phase in AUTO_ADVANCE_FROM
        and result.advance_phase
        and session.phase != phase  # phase actually changed
    ):
        # Save the acknowledgment messages from the first call.
        # Guard: if the last ack bubble is purely a question (agent re-asked
        # despite advancing), drop it — the auto-advance will generate the
        # correct next question and we don't want back-to-back questions.
        ack_messages = list(result.messages)
        if len(ack_messages) > 1 and ack_messages[-1].strip().endswith("?"):
            ack_messages = ack_messages[:-1]

        # Append the ack to conversation history so the next prompt sees it.
        # Include a marker so the next call knows not to re-acknowledge.
        ack_combined = "\n\n".join(ack_messages)
        session.messages.append({"role": "assistant", "content": ack_combined})
        session.messages.append({
            "role": "user",
            "content": "(System note: the previous response above was already sent to the customer. "
                       "Do NOT repeat or rephrase it. Proceed immediately to your next required action.)",
        })

        # Build system prompt for the NEW phase
        new_offer_amount = session.current_offer if session.phase in ("11", "12") else 0
        new_system_prompt = build_system_prompt(
            phase=session.phase,
            mode=session.mode,
            tester_name=session.tester_name,
            collected=session.collected,
            approved_amount=session.approved_amount,
            max_amount=session.max_amount,
            offer_amount=new_offer_amount,
            offer_stage=session.offer_stage,
            is_first_visit=session.is_first_visit,
            coaching_turns=session.coaching_turns,
            interest_rate_daily=session.interest_rate_daily,
            locale=session.locale,
            tester_context=session.tester_context,
            gender=session.gender,
        )

        # Second API call — generate the next phase's question
        new_api_messages = [{"role": "system", "content": new_system_prompt}] + session.messages
        new_completion = await _client.beta.chat.completions.parse(
            model="gpt-5.2",
            temperature=0.3,
            messages=new_api_messages,
            response_format=AgentDecision,
        )
        new_result = new_completion.choices[0].message.parsed

        preview2 = new_result.messages[0][:80] if new_result.messages else "(empty)"
        print(f"[DEBUG] auto-advance → phase={session.phase} | msgs={len(new_result.messages)} | first={preview2}...")

        # Merge any additional extracted fields from the auto-advance call
        new_extracted = new_result.extracted.to_dict()
        for key, value in new_extracted.items():
            session.collected[key] = value

        # Combine: acknowledgment bubbles + next question bubbles
        combined_msgs = ack_messages + list(new_result.messages)
        # Deduplicate consecutive identical bubbles (guards against LLM repeating the ack)
        deduped = [combined_msgs[0]] if combined_msgs else []
        for msg in combined_msgs[1:]:
            if msg != deduped[-1]:
                deduped.append(msg)

        # Merge short ack + question into a single bubble when they fit naturally.
        # This avoids the mechanical 2-bubble pattern on every auto-advance.
        if len(deduped) == 2:
            total_words = len(deduped[0].split()) + len(deduped[1].split())
            if total_words <= 40:
                deduped = [deduped[0] + " " + deduped[1]]

        result.messages = deduped

        # Remove the synthetic user note and ack we appended —
        # they'll be re-appended below as the combined response
        session.messages.pop()  # remove synthetic user note
        session.messages.pop()  # remove ack

    # ── If auto-advance landed on phase 12, finalize to complete ───────
    # (Phase 12 runs as the auto-advance second call; its advance_phase isn't
    # re-processed, so we apply the phase-12 rule here explicitly.)
    if session.phase == "12":
        session.phase = "complete"

    # ── Filter out garbage bubbles (e.g. LLM leaking field names like "messages") ──
    result.messages = [m for m in result.messages if m.strip() and m.strip().lower() != "messages"]

    # ── Append assistant messages to history ───────────────────────────
    combined = "\n\n".join(result.messages)
    session.messages.append({"role": "assistant", "content": combined})

    # ── Return response ────────────────────────────────────────────────
    # Recalculate offer_amount in case auto-advance landed on phase 11
    if session.phase == "11":
        offer_amount = session.current_offer
    span.set_attribute("agent.phase_end", session.phase)
    return {
        "messages": result.messages,
        "phase": session.phase,
        "collected": session.collected,
        "offer_amount": offer_amount,
        "is_offer": result.is_offer if session.phase == "11" else False,
        "is_complete": session.phase == "complete",
    }
