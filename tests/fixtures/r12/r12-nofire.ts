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

// Not test.skip — different function
const skip = (name: string, fn: () => void) => {
  // custom skip function
};
skip('custom skip', () => {});
