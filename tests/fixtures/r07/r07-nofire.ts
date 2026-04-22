import { test } from '@playwright/test';

test('example test without pause', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button');
  const value = await page.inputValue('input');
  console.log(value);
});

function pauseExecution() {
  // Not a page.pause() call — a different pause function
}
