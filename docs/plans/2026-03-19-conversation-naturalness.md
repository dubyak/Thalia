# Conversation Naturalness Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 8 unnatural patterns identified in test onboarding: bloated acknowledgments, preview transitions, emoji misuse, verbose questions, seasonal over-referencing, multiple-choice coaching opener, robotic parroting, and evidence phase rendering.

**Architecture:** All changes in `backend/prompts.py`. Three categories: (1) global rules that apply to all phases (`_conversation_rules`, `_absolute_rules`, `_formatting_rules`), (2) per-phase instruction rewrites, (3) coaching opener fix. Each task is one focused edit.

**Tech Stack:** Python (backend prompt engineering only)

---

## Task 1: Ban "Next I'll..." preview transitions in acknowledgments

**Files:**
- Modify: `backend/prompts.py:130-184` (`_conversation_rules` function)

**Context:**
The agent adds "Next I'll ask a couple quick questions about..." after every acknowledgment. This is caused by conversation rule #3 ("SMOOTH PHASE TRANSITIONS: briefly state what's next and why"). When `advance_phase=true`, the auto-advance system immediately generates the next phase's question — so the agent's preview is redundant and adds 15-20 words of bloat.

**Step 1: Replace conversation rule #3 and add a new anti-preview rule**

In `_conversation_rules`, replace rule 3:

```python
"3. NO PREVIEW TRANSITIONS: When you set advance_phase=true, do NOT preview what's\n"
"   coming next ('Next I'll ask about...', 'Now let's look at...', 'I'll use this to...').\n"
"   The system automatically delivers the next question — previewing it is redundant,\n"
"   adds bloat, and breaks the 40-word limit. Just acknowledge and advance.\n"
```

This replaces:
```python
"3. SMOOTH PHASE TRANSITIONS: When moving to a new section (profile → evidence → coaching\n"
"   → offer), briefly state what's next and why. Don't assume the customer remembers the\n"
"   flow structure.\n"
```

**Step 2: Verify prompts generate**

```bash
cd backend && python -c "from prompts import build_system_prompt; print('OK')"
```

**Step 3: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: ban preview transitions in acknowledgments — auto-advance handles next question"
```

---

## Task 2: Tighten acknowledgment word limits

**Files:**
- Modify: `backend/prompts.py:130-184` (`_conversation_rules` function)

**Context:**
Rule #1 says "briefly respond... reflect, affirm, or react in 1 sentence" but the agent routinely writes 2-3 sentences (ack + observation + transition). Need explicit word limit and a ban on multi-sentence acks.

**Step 1: Replace conversation rule #1**

```python
"1. ACKNOWLEDGE BEFORE ADVANCING: After the customer answers, react in ONE short sentence\n"
"   (15 words max). Connect to what they said — don't just say 'Got it' or 'Thanks for sharing.'\n"
"   NEVER follow an acknowledgment with a second sentence explaining why the info matters,\n"
"   what you'll do with it, or what's coming next. One sentence. That's it.\n"
```

This replaces:
```python
"1. ACKNOWLEDGE BEFORE ADVANCING: After the customer answers, briefly respond to what\n"
"   they said — reflect, affirm, or react in 1 sentence — before moving on.\n"
"   Never jump from their answer to the next question with no acknowledgment.\n"
```

**Step 2: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: tighten acknowledgments to 15 words max, one sentence only"
```

---

## Task 3: Fix emoji rules — ban ✅ and filler emojis

**Files:**
- Modify: `backend/prompts.py:187-212` (`_formatting_rules` function)

**Context:**
The agent uses ✅, 👍, 🙌 as generic acknowledgment decorators. The rules only allow ✨ (offers/milestones) and one business-relevant emoji (🍞, ☕, etc.) during onboarding. Need an explicit deny-list.

**Step 1: Add emoji deny-list to onboarding formatting rules**

In `_formatting_rules`, in the `else: # onboarding` branch, add after the existing lines:

```python
        base += (
            "- Use ✨ when presenting the credit offer or celebrating a milestone.\n"
            "- When the customer first mentions their business type, you may use ONE "
            "relevant emoji to connect (🍞 bakery, ☕ coffee, 🧶 crafts, 🌮 food, "
            "📱 online sales, etc.). Use this once — it's your secret weapon for rapport.\n"
            "- NEVER use ✅, 👍, 🙌, 👏, or other generic reaction emojis. These feel robotic.\n"
            "  If you want to affirm, use words — not a checkmark.\n"
        )
```

Replace the existing two lines in the onboarding branch with the above (adds the deny-list as the third line).

**Step 2: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: ban generic reaction emojis (✅ 👍 🙌) in onboarding — use words instead"
```

---

## Task 4: Prevent seasonal over-indexing (Easter, holidays)

**Files:**
- Modify: `backend/prompts.py:130-184` (`_conversation_rules` function)

**Context:**
Customer said "easter is coming" once, but the agent referenced Easter in 6 subsequent responses. The model latches onto seasonal context and repeats it as a crutch. Need an explicit rule to limit seasonal references.

**Step 1: Add a seasonal repetition rule to `_conversation_rules`**

Add as a new rule after rule #8 (VARY YOUR ACKNOWLEDGMENTS):

```python
"9. NO SEASONAL ECHO CHAMBER: If the customer mentions a season, holiday, or event\n"
"   (Easter, Christmas, rainy season, etc.), you may reference it ONCE in your\n"
"   acknowledgment. After that, do NOT bring it up again unless the customer does.\n"
"   Mentioning it in every response makes you sound like a broken record.\n"
```

**Step 2: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: limit seasonal references to one mention — prevent Easter echo chamber"
```

---

## Task 5: Shorten phase 7 and 8 questions

**Files:**
- Modify: `backend/prompts.py:560-592` (phases 7 and 8)

**Context:**
Phase 7 question is 40+ words with survey-like instructions ("I'm looking for the main categories and roughly how much each one is — but if you just know the categories, that works too"). Phase 8 is similarly verbose with a parenthetical. These should sound like a human asking a question, not reading a form.

**Step 1: Replace phase 7 question**

Find:
```python
"Ask: 'What are your biggest costs each week? For example: restocking inventory,"
" rent, transport, packaging. I'm looking for the main categories and roughly how"
" much each one is — but if you just know the categories, that works too.'\n"
```

Replace with:
```python
"Ask: 'What are your biggest costs each week — like ingredients, rent, transport?'\n"
```

**Step 2: Replace phase 8 question**

Find:
```python
"Ask: 'Think about your next restocking trip or big supply run —\n"
"  roughly how much money do you need all at once to keep things running?\n"
"  Could be what you spend on inventory, ingredients, or materials in one go.'\n"
```

Replace with:
```python
"Ask: 'Last one — how much do you usually spend on a restocking run?'\n"
```

Also remove the separate "Signal this is the last profile question" line since it's now built into the question:

Find:
```python
"Signal this is the last profile question (e.g. 'Almost there —' or 'Last one —').\n"
"Ask: 'Last one — how much do you usually spend on a restocking run?'\n"
```

Replace with:
```python
"Ask: 'Last one — how much do you usually spend on a restocking run?'\n"
```

**Step 3: Verify prompts generate**

```bash
cd backend && python -c "
from prompts import build_system_prompt
for p in ['7','8']:
    r = build_system_prompt(phase=p, mode='onboarding', tester_name='Test',
        collected={'businessType':'bakery'}, approved_amount=10000, locale='en')
    print(f'Phase {p}: {len(r)} chars OK')
"
```

**Step 4: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: shorten phase 7 and 8 questions — conversational, not survey-like"
```

---

## Task 6: Make coaching opener open-ended (no multiple choice)

**Files:**
- Modify: `backend/prompts.py:618-658` (phase 10, TURN 0)

**Context:**
The coaching opener gave a 3-option multiple choice: "getting enough ingredients, selling faster at the stall, or managing WhatsApp orders?" This constrains the customer's answer and feels scripted. Should be genuinely open-ended.

**Step 1: Replace TURN 0 instructions**

Find:
```python
"TURN 0 (opening — coaching_turns=0):\n"
"  Make this feel like a NATURAL continuation of the conversation — not a mode switch.\n"
"  Reference the loan purpose if available, otherwise open broadly.\n"
"  Example: 'Thanks for all of that — while I finalize your offer, I'd love to help\n"
"  you think through how to put the credit to work. What's the biggest thing on your\n"
"  mind for your business right now?'\n"
"  Do NOT announce 'coaching,' recite their profile data, or use business-context preambles.\n"
"  Set advance_phase=false.\n\n"
```

Replace with:
```python
"TURN 0 (opening — coaching_turns=0):\n"
"  Make this feel like a NATURAL continuation of the conversation — not a mode switch.\n"
"  Ask ONE genuinely open-ended question. Do NOT offer multiple-choice options or\n"
"  a menu of topics — let the customer bring up what matters to them.\n"
"  Example: 'While I finalize your offer — what's the biggest challenge or opportunity\n"
"  on your mind for your business right now?'\n"
"  Do NOT announce 'coaching,' recite their profile data, list options, or say\n"
"  'I'd love to help you with X, Y, or Z.'\n"
"  Set advance_phase=false.\n\n"
```

**Step 2: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: coaching opener is open-ended — no multiple choice options"
```

---

## Task 7: Fix evidence phase — bullet list rendering + separate bubbles

**Files:**
- Modify: `backend/prompts.py:594-616` (phase 9)

**Context:**
The evidence phase bullet list rendered inline (4th bullet ran into "If none fit..." text). The agent crammed everything into one bubble instead of two. The prompt says "Each bubble 40 words max" but the bullet list + privacy note + skip CTA exceeds that. Fix: make bubble 2 ONLY the bullet list, and move the fallback/privacy/skip CTA to bubble 3 (or trim to fit).

Actually, the better fix is: bubble 2 should contain ONLY the 4 bullets, each on its own line. The "If none fit" fallback, privacy note, and skip CTA should be part of bubble 2 but clearly after the list. The issue is the agent is concatenating the last bullet with the surrounding text.

**Step 1: Restructure phase 9 prompt for clearer bubble separation**

Find the entire `elif phase == "9":` block and replace:

```python
elif phase == "9":
    instructions = (
        "PHASE 9 — OPTIONAL BUSINESS EVIDENCE\n"
        f"{already_collected}\n\n"
        "OPENING TURN (customer just arrived at this phase):\n"
        "  Use EXACTLY 2 bubbles:\n\n"
        f"  Bubble 1 (intro): '{t('p9_intro')}'\n\n"
        "  Bubble 2 (options + skip): Present these 4 options as a markdown bullet list:\n"
        "    'Here are some things that work well:'\n"
        "    - A bank statement or account summary\n"
        "    - A receipt from a supplier or wholesale purchase\n"
        "    - A sales summary from a platform (Uber Eats, MercadoLibre, etc.)\n"
        "    - A photo of your stall, shop, or inventory\n"
        "    After the list, on a NEW line: 'Anything that shows your business activity works.'\n"
        "    Then on another NEW line: 'We only use it to help you — never for anything else.'\n"
        f"    End with: '{t('p9_skip_cta')}'\n\n"
        "  IMPORTANT: The bullet list must use markdown dashes (- item), one per line.\n"
        "  Do NOT run bullets together or concatenate them with surrounding text.\n"
        "  Set advance_phase=false.\n\n"
        "WHEN CUSTOMER RESPONDS:\n"
        "  - If they share something (photo, text, or say they uploaded): Warmly confirm\n"
        "    receipt with ONE specific observation about what you see. Set advance_phase=true.\n"
        "  - If they AGREE to share (e.g. 'sure', 'yes') but haven't sent yet:\n"
        "    Say: 'Great — go ahead and send it when you're ready.' Set advance_phase=false.\n"
        "  - If they SKIP: ONE brief ack only (e.g. 'No problem!'). Set advance_phase=true.\n"
    )
```

**Step 2: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: evidence phase — explicit bullet formatting, prevent inline concatenation"
```

---

## Task 8: Ban robotic parroting in conversation rules

**Files:**
- Modify: `backend/prompts.py:130-184` (`_conversation_rules` function)

**Context:**
Rule #7 (ACTIVE LISTENING) tells the agent to "summarize or reflect what the customer said." The agent over-applies this by robotically rephrasing: "1–2 weeks to turn restocked inventory back into sales is a healthy cash cycle." Natural acknowledgment would be "A couple weeks — that's pretty quick." Need to clarify that reflection means a natural reaction, not a formal restatement.

**Step 1: Replace conversation rule #7**

```python
"7. NATURAL REACTIONS (not robotic parroting): When acknowledging, react like a person\n"
"   would — with a quick observation, connection, or genuine reaction. Do NOT robotically\n"
"   restate what they said in formal business language.\n"
"   BAD: '1–2 weeks to turn restocked inventory back into sales is a healthy cash cycle.'\n"
"   GOOD: 'A couple weeks — that's pretty quick!'\n"
"   BAD: 'Baking supplies and packaging are usually the biggest weekly drivers.'\n"
"   GOOD: 'Yeah, flour and packaging add up fast.'\n"
```

This replaces:
```python
"7. ACTIVE LISTENING: When relevant, briefly summarize or reflect what the customer said\n"
"   to show you understood (e.g. \"So your biggest expenses are rent and supplies — that's\n"
"   helpful to know.\").\n"
```

**Step 2: Commit**

```bash
git add backend/prompts.py
git commit -m "fix: replace robotic parroting rule with natural reaction examples"
```

---

## Task 9: Verify all changes + run tests

**Files:** No changes — verification only

**Step 1: Verify all phases generate without errors**

```bash
cd backend && python -c "
from prompts import build_system_prompt
for phase in ['0','1','2','3','4','5','6','7','8','9','10','11','12']:
    p = build_system_prompt(
        phase=phase, mode='onboarding', tester_name='Test',
        collected={'businessType':'bakery','loanPurpose':'inventory'},
        approved_amount=10000, max_amount=11000,
        coaching_turns=0 if phase=='10' else 2,
        interest_rate_daily=0.01, locale='en')
    print(f'Phase {phase}: {len(p)} chars OK')
# Coaching + servicing
p = build_system_prompt(phase='0', mode='coaching', tester_name='Test',
    collected={'businessType':'bakery'}, approved_amount=10000,
    is_first_visit=True, locale='en')
print(f'Coaching: {len(p)} chars OK')
p = build_system_prompt(phase='0', mode='servicing', tester_name='Test',
    collected={'businessType':'bakery'}, approved_amount=10000, locale='en')
print(f'Servicing: {len(p)} chars OK')
"
```

**Step 2: TypeScript check (no frontend changes, but good practice)**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Run backend tests**

```bash
cd backend && python -m pytest tests/test_agent_loops.py -v
```

---

## Design decisions and rationale

### Why ban preview transitions entirely?
The auto-advance pattern (two API calls on phase advance) already delivers the next question immediately. The agent's "Next I'll ask about..." sentence is always redundant — the user sees the next question 1 second later. Worse, it inflates acknowledgments from 10 words to 40+, breaking the word limit and making the agent feel verbose.

### Why 15-word ack limit?
The test conversation showed acks ranging from 20-50 words. A 15-word cap forces the model to pick ONE reaction instead of stacking observation + transition + preview. Examples that fit: "Three years — solid experience!" (5 words), "A couple weeks — that's pretty quick!" (7 words), "Yeah, flour and packaging add up fast." (8 words).

### Why ban multiple-choice in coaching opener?
The test showed "getting enough ingredients, selling faster at the stall, or managing WhatsApp orders?" — this funnels the customer into pre-selected topics. The whole point of the coaching demo is to show the AI can respond to anything. An open-ended "What's on your mind?" invites a real answer.

### Why explicit emoji deny-list?
The model interprets "one emoji per message MAX" as permission to use any emoji once. Without a deny-list, it defaults to ✅ and 👍 as safe acknowledgment decorators — these are the most generic, least personal emojis possible and make the conversation feel like a checklist.

### Why "natural reactions" over "active listening"?
"Active listening" is a coaching term that the model interprets as formal summarization: "So what you're saying is [restate in business language]." Real acknowledgment is reactive and casual: "Oh nice!" or "That makes sense." The BAD/GOOD examples teach by contrast.
