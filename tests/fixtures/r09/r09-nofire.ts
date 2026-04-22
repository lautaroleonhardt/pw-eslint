import { test } from '@playwright/test';

test('valid URLs', async ({ page }) => {
  await page.goto('/dashboard');
  await page.goto('./path');
  await page.goto('../relative');
  const url = `https://example.com`;
  await page.goto(url);
  const baseUrl = process.env.BASE_URL || 'https://default.com';
  await page.goto(baseUrl);
});
