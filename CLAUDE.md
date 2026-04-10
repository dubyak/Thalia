# Thalia — Claude Code Instructions

## Read AGENTS.md when needed

Read `AGENTS.md` at the start of any session involving architecture, agent behavior, conversation flow, phases, or conventions. Skip for isolated, clearly-scoped tasks (single UI string, style fix, single-file change with no cross-cutting concerns).

## Keep AGENTS.md up to date

After completing any task that changes agent behavior, conversation flow, phase structure, or architectural patterns, update `AGENTS.md`:
- Add new patterns or conventions to the relevant section
- Add bug root causes and fix patterns to "Lessons learned" — especially if the bug took more than one attempt to diagnose
- Remove or correct any information that is now outdated
- Do not add session-specific details or speculative ideas

## Deployment

- **Primary remote**: `dubyak` (https://github.com/dubyak/Thalia.git) — always push here
- **Secondary remote**: `origin` (https://github.com/kendall-will/Thalia_Prototype.git) — do NOT push here by default
- **Deploy via**: `./deploy-aws.sh` — builds Docker image (`linux/amd64`), pushes to ECR, AWS App Runner auto-deploys
- Do NOT reference Railway — deployment is Docker → ECR → App Runner

## Access codes

Tester access codes and loan amounts live in `shared/access-codes.json`. To update a tester's offer:
1. Edit `initialOffer` and `maxOffer` (initialOffer = current loan × 1.25, maxOffer = current loan × 1.5)
2. Push to `dubyak` — App Runner auto-deploys with new values, no code changes needed

## Rules

- All UI text and agent responses must be in **English**
- The product is a **personal credit** — never say "business loan" or "business credit"
- Always test the full onboarding flow end-to-end after prompt changes — small wording changes have outsized effects on conversation quality
- Run `cd backend && python -m pytest tests/test_agent_loops.py -v` before pushing prompt or agent changes

## AgentDecision schema changes

Adding or modifying ANY field in `AgentDecision` (`backend/state.py`) changes LLM behavior across **all phases and all modes** — the schema is included in every API call. After adding a field:
1. Run the full test suite immediately, before committing anything else
2. Watch for unexpected behavior in phases that don't use the new field
3. Check that field descriptions don't bleed into adjacent fields (e.g. "offer" language in one field can make the LLM set `is_offer=True` in the wrong step)

## When to skip the writing-plans skill

Use `superpowers:writing-plans` when the task involves architectural decisions, multiple subsystems, or >4 files. For focused changes (single feature, ≤4 files, clear implementation path), skip the plan and implement directly — the plan adds 15+ minutes of overhead that isn't justified.

## Debugging LLM output failures

When a test fails due to unexpected LLM output (wrong flags, wrong phase), **add field-level debug logging first** before re-running. The debug print in `agent.py` already logs `phase` and `advance_phase` — extend it to include any field you're investigating. Running the test suite blind costs ~100 seconds per attempt.
