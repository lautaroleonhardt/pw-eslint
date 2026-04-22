import { test } from '@playwright/test';

test('hardcoded URLs', async ({ page }) => {
  await page.goto('https://example.com'); // line 4 — finding
  await page.goto('http://localhost:3000'); // line 5 — finding
  await page.goto('HTTPS://MY-APP.COM'); // line 6 — finding
});
