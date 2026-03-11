# Thalia — Claude Code Instructions

## First thing: read AGENTS.md

At the start of every session, read `AGENTS.md` in the repo root. It contains the full project context, architecture, key files, conventions, and lessons learned. Do not skip this step.

## Keep AGENTS.md up to date

After completing any task that changes agent behavior, conversation flow, phase structure, or architectural patterns, update `AGENTS.md`:
- Add new patterns or conventions to the relevant section
- Add bug root causes and fix patterns to "Lessons learned" — especially if the bug took more than one attempt to diagnose
- Remove or correct any information that is now outdated
- Do not add session-specific details or speculative ideas

## Deployment

- **Primary remote**: `dubyak` (https://github.com/dubyak/Thalia.git) — always push here
- **Secondary remote**: `origin` (https://github.com/kendall-will/Thalia_Prototype.git) — do NOT push here by default
- **Railway auto-deploy**: Every push to `dubyak` triggers an automatic Railway deployment. Be mindful that pushes are immediately deployed.

## Rules

- All UI text and agent responses must be in **English**
- The product is a **personal credit** — never say "business loan" or "business credit"
- Always test the full onboarding flow end-to-end after prompt changes — small wording changes have outsized effects on conversation quality
- Run `cd backend && python -m pytest tests/test_agent_loops.py -v` before pushing prompt or agent changes
