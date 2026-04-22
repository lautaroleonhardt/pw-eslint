import { test } from '@playwright/test';

test('test without console calls', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button');
  const value = await page.inputValue('input');
});

// No console calls in this file
function helper() {
  // helper function
}
