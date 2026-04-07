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
