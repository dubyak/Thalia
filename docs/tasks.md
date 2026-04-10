# Thalia — Common Task Recipes

## Adding a new onboarding phase
Update `PHASE_ORDER` in `agent.py`, add phase instructions in `prompts.py`, add `ExtractedFields` entry in `state.py` if it collects data, add advancement logic in `agent.py`'s `run_agent`, update `PHASE_FIELD` map if applicable, and update the `OnboardingPhase` type in `frontend/lib/types.ts`.

## Adding a new tester
Add an entry to `DEFAULT_TESTERS` in `frontend/lib/constants.ts`.

## Changing agent behavior / conversation quality
Edit `CONVERSATION_RULES`, `ABSOLUTE_RULES`, or the phase-specific prompt blocks in `prompts.py`. The `AgentDecision` model in `state.py` controls what structured fields the LLM can return.

## Tuning prompt rules
Be careful with conflicting rules (e.g. "be brief" vs "be warm"). Test the full onboarding flow end-to-end after any prompt change — small wording changes have outsized effects on conversation quality.

## Adding customer data to agent personalization
Customer firstName + lastName are available in the `/chat` request body as `customer_id` and `customer_name`. To personalize agent responses, access these in `agent.py`'s `run_agent()` function and thread them into `build_system_prompt()`. The data flows from landing page → CustomerContext → ChatContext.sendMessage() → chat-service-api.ts → backend.

## Modifying reset behavior
Edit `ResetMenu.tsx` in `frontend/components/app-shell/`. `handleRestartDemo()` controls soft reset (dispatches `RESET` to FlowContext only); `handleNewCustomer()` controls hard reset (dispatches `CLEAR_NAME` + `RESET`, returns to landing page). To add a third option, duplicate one of these handlers and customize.

## Wiring Supabase integration
The `/api/customer/create` Route Handler has the pattern — check env vars, validate input, attempt insert, return gracefully on failure. To add more customer-related endpoints, follow the same pattern in `frontend/app/api/customer/` with corresponding backend updates to accept customer data in `/chat` requests.

## Adding a new translatable string
Add the key to both `frontend/lib/i18n/en.json` and `frontend/lib/i18n/es-MX.json`, then use `t('section.key')` in the component.
