import { test } from '@playwright/test';

test('example test with debug pause', async ({ page }) => {
  await page.goto('https://example.com');
  page.pause(); // line 5 — finding
  await page.click('button');
  this.page.pause(); // line 7 — finding
  const value = await page.inputValue('input');
  page.pause(); // line 9 — finding
});
