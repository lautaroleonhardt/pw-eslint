import { test } from '@playwright/test';

test('test with console calls', async ({ page }) => {
  await page.goto('https://example.com');
  console.log('debug'); // line 5 — finding
  await page.click('button');
  console.warn('warning'); // line 7 — finding
  console.error('error'); // line 8 — finding
  console.debug('debug'); // line 9 — finding
  console.info('info'); // line 10 — finding
});
