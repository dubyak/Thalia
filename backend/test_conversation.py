"""Simulate onboarding + coaching flows against the Thalia backend API."""

import argparse
import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"

# Short, realistic answers to minimize token usage
ONBOARDING_ANSWERS = [
    # Phase 0: welcome (null message triggers opening)
    None,
    # Phase 0→1: user taps "ready"
    "I'm ready",
    # Phase 1: selling channel
    "market stall and online",
    # Phase 2: tenure
    "3 years",
    # Phase 3: typical customer
    "local families and market workers",
    # Phase 4: recent changes
    "no major changes, things are stable",
    # Phase 5: near-term outlook
    "looking good, expect more sales soon",
    # Phase 6: cash cycle speed
    "usually within a week",
    # Phase 7: working capital
    "about half",
    # Phase 8: evidence (skip)
    "I'll skip for now",
    # Phase 9: coaching demo — turn 0 answer
    "help with increasing sales",
    # Phase 9: coaching demo — turn 1
    "I mostly rely on foot traffic at the market",
    # Phase 9: coaching demo — turn 2
    "I haven't tried social media yet",
    # Phase 9: coaching demo — turn 3 (should wrap up)
    "that sounds like a good plan",
]

COACHING_MESSAGES = [
    None,  # opening
    "I want help managing my costs",
    "rent and supplies are my biggest expenses",
    "about 15000 pesos a month total",
    "I haven't tracked it week by week",
]


def chat(url: str, session_id: str, message: str | None, **kwargs) -> dict:
    payload = {"session_id": session_id, "message": message, **kwargs}
    resp = requests.post(f"{url}/chat", json=payload, timeout=60)
    resp.raise_for_status()
    return resp.json()


def print_exchange(turn: int, phase: str, user_msg: str | None, agent_msgs: list[str]):
    print(f"\n{'─' * 60}")
    print(f"  Turn {turn}  │  Phase: {phase}")
    print(f"{'─' * 60}")
    if user_msg:
        print(f"  User:  {user_msg}")
    for i, m in enumerate(agent_msgs):
        label = "Thalia:" if i == 0 else "       "
        print(f"  {label} {m}")


def run_onboarding(url: str):
    print("\n" + "=" * 60)
    print("  ONBOARDING FLOW SIMULATION")
    print("=" * 60)

    sid = f"test_onboard_{uuid.uuid4().hex[:8]}"
    common = {
        "tester_name": "Isabel",
        "approved_amount": 8000,
        "max_amount": 12000,
        "mode": "onboarding",
        "business_type": "Retail",
        "loan_purpose": "Restock inventory",
    }

    collected = {}
    for turn, msg in enumerate(ONBOARDING_ANSWERS):
        try:
            r = chat(url, sid, msg, collected=collected, **common)
        except Exception as e:
            print(f"\n  ERROR on turn {turn}: {e}")
            break

        phase = r.get("phase", "?")
        msgs = r.get("messages", [])
        collected = r.get("collected", collected)

        print_exchange(turn, phase, msg, msgs)

        if r.get("is_complete"):
            print("\n  >>> ONBOARDING COMPLETE <<<")
            break

    return collected


def run_coaching(url: str, collected: dict):
    print("\n" + "=" * 60)
    print("  COACHING FLOW SIMULATION (post-disbursement)")
    print("=" * 60)

    sid = f"test_coach_{uuid.uuid4().hex[:8]}"
    common = {
        "tester_name": "Isabel",
        "approved_amount": 8000,
        "max_amount": 12000,
        "mode": "coaching",
        "business_type": "Retail",
        "is_first_visit": True,
        "collected": collected,
    }

    for turn, msg in enumerate(COACHING_MESSAGES):
        try:
            r = chat(url, sid, msg, **common)
        except Exception as e:
            print(f"\n  ERROR on turn {turn}: {e}")
            break

        phase = r.get("phase", "coaching")
        msgs = r.get("messages", [])
        print_exchange(turn, phase, msg, msgs)


def main():
    parser = argparse.ArgumentParser(description="Simulate Thalia conversations")
    parser.add_argument("--url", default=BASE_URL, help="Backend URL")
    parser.add_argument("--coaching-only", action="store_true", help="Skip onboarding")
    args = parser.parse_args()

    # Health check
    try:
        r = requests.get(f"{args.url}/health", timeout=5)
        r.raise_for_status()
        print(f"Backend OK at {args.url}")
    except Exception as e:
        print(f"Cannot reach backend at {args.url}: {e}")
        sys.exit(1)

    collected = {}
    if not args.coaching_only:
        collected = run_onboarding(args.url)

    run_coaching(args.url, collected)

    print("\n" + "=" * 60)
    print("  SIMULATION COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
