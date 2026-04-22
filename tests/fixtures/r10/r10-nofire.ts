import { test, expect } from '@playwright/test';

const TIMEOUT = 5000;
const MY_TIMEOUT = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 3000;

test('valid timeout usage', async ({ page }) => {
  await page.click('#btn', { timeout: TIMEOUT });
  await page.fill('input', 'text', { timeout: MY_TIMEOUT });
  await expect(page.locator('button')).toBeVisible();
  await page.click('#btn'); // no timeout option
  const obj = { timeout: 5000 }; // not a Playwright method call argument
});
