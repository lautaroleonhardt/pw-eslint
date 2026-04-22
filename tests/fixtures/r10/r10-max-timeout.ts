import { test } from '@playwright/test';

test('timeout threshold test', async ({ page }) => {
  // Small timeouts — should be suppressed when maxTimeout >= 3000
  await page.click('#submit', { timeout: 3000 }); // line 5 — conditionally fires
  await page.fill('input', 'text', { timeout: 1000 }); // line 6 — conditionally fires

  // Large timeouts — should always fire when maxTimeout < 30000
  await page.goto('https://example.com', { timeout: 30000 }); // line 9 — fires
  await page.waitForSelector('.dialog', { timeout: 60000 }); // line 10 — fires
});
