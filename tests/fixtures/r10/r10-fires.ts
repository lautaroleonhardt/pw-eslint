import { test, expect } from '@playwright/test';

test('hardcoded timeouts', async ({ page }) => {
  await page.click('#btn', { timeout: 5000 }); // line 4 — finding
  await page.fill('input', 'text', { timeout: 3000 }); // line 5 — finding
  await page.waitForSelector('#modal', { timeout: 10000 }); // line 6 — finding
  await expect(page.locator('button')).toBeVisible({ timeout: 8000 }); // line 7 — finding
});
