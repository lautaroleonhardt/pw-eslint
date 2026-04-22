import { test, describe } from '@playwright/test';

test.skip('skipped test', async ({ page }) => { // line 3 — finding
  await page.goto('https://example.com');
});

describe.skip('skipped suite', () => { // line 7 — finding
  test('nested test in skipped suite', async ({ page }) => {
    await page.fill('input', 'text');
  });
});

test('normal test', async ({ page }) => {
  await page.click('button');
});

test.skip('skipped with reason', async () => { // line 16 — finding
  // This test is temporarily disabled for maintenance
});

it.skip('another skipped test', async ({ page }) => { // line 19 — finding
  await page.click('button');
});
