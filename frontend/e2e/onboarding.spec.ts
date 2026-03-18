import { test, expect } from '@playwright/test'

/**
 * E2E onboarding flow — mirrors backend/test_conversation.py but through the real UI.
 * Requires both frontend (localhost:3001) and backend (localhost:8000) running.
 */

const TESTER_CODE = 'TESTER01' // María López
const AGENT_TIMEOUT = 30_000   // max wait for an LLM response to render

// Same scripted answers as test_conversation.py
const ONBOARDING_ANSWERS = [
  // Phase 0→1: user taps "ready" button (handled separately)
  'market stall and online',
  '3 years',
  'local families and market workers',
  'no major changes, things are stable',
  'looking good, expect more sales soon',
  'usually within a week',
  'about half',
  "I'll skip for now",
  'help with increasing sales',
  'I mostly rely on foot traffic at the market',
  "I haven't tried social media yet",
  'that sounds like a good plan',
]

test.describe('Onboarding flow', () => {
  test('login → survey → chat through onboarding phases', async ({ page }) => {
    // --- Login ---
    await page.goto('/')
    await page.getByPlaceholder(/enter/i).fill(TESTER_CODE)
    await page.getByRole('button', { name: /continue/i }).click()

    // --- Survey: select "For my business" ---
    await expect(page.getByText(/what will you use/i)).toBeVisible({ timeout: 10_000 })
    await page.getByText(/for my business/i).click()
    await page.getByRole('button', { name: /continue/i }).click()

    // --- Survey: business type ---
    await expect(page.getByPlaceholder(/e\.g\./i)).toBeVisible({ timeout: 5_000 })
    await page.getByPlaceholder(/e\.g\./i).fill('Retail grocery store')
    await page.getByRole('button', { name: /continue/i }).click()

    // --- Survey: loan purpose ---
    await expect(page.getByText(/restock/i)).toBeVisible({ timeout: 5_000 })
    await page.getByText(/restock/i).click()
    await page.getByRole('button', { name: /continue/i }).click()

    // --- Onboarding chat ---
    // Wait for agent greeting to appear
    await expect(page.locator('[data-role="agent"]').first()).toBeVisible({ timeout: AGENT_TIMEOUT })

    // Phase 0: tap the "I'm ready" button if visible
    const readyButton = page.getByRole('button', { name: /ready/i })
    if (await readyButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await readyButton.click()
      await expect(page.locator('[data-role="agent"]').last()).toBeVisible({ timeout: AGENT_TIMEOUT })
    }

    // Send each scripted answer and wait for agent response
    for (const answer of ONBOARDING_ANSWERS) {
      const agentCountBefore = await page.locator('[data-role="agent"]').count()

      // Type and send
      await page.locator('input[type="text"], textarea').last().fill(answer)
      await page.locator('input[type="text"], textarea').last().press('Enter')

      // Wait for a new agent message to appear
      await expect(async () => {
        const count = await page.locator('[data-role="agent"]').count()
        expect(count).toBeGreaterThan(agentCountBefore)
      }).toPass({ timeout: AGENT_TIMEOUT })
    }

    // Verify we got through multiple phases (at least a few agent responses)
    const finalAgentCount = await page.locator('[data-role="agent"]').count()
    expect(finalAgentCount).toBeGreaterThan(5)
  })
})
