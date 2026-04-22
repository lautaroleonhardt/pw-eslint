import { test, it, describe } from '@playwright/test';

test.fixme('incomplete test', async ({ page }) => { // line 3 — finding
  await page.goto('https://example.com');
});

it.fixme('incomplete it block', async ({ page }) => { // line 7 — finding
  await page.click('button');
});

describe.fixme('incomplete describe block', () => { // line 11 — finding
  test('nested test', async ({ page }) => {
    await page.fill('input', 'text');
  });
});

test('normal test', async ({ page }) => {
  await page.click('button');
});
