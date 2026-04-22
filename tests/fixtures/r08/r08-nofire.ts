import { test, describe } from '@playwright/test';

test('normal test', async ({ page }) => {
  await page.goto('https://example.com');
});

it('another normal test', async ({ page }) => {
  await page.click('button');
});

describe('normal suite', () => {
  test('nested test', async ({ page }) => {
    await page.fill('input', 'text');
  });
});

// Not a test framework — should not fire
const someLib = {
  only: () => console.log('not a test'),
};
someLib.only();
