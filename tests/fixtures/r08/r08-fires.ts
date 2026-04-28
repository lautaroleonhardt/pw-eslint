import { test, describe } from '@playwright/test';

test.only('focused test', async ({ page }) => {
  // line 3 — finding
  await page.goto('https://example.com');
});

it.only('another focused test', async ({ page }) => {
  // line 7 — finding
  await page.click('button');
});

describe.only('focused suite', () => {
  // line 10 — finding
  test('nested test in focused suite', async ({ page }) => {
    await page.fill('input', 'text');
  });
});
