// R06 fixtures: should produce findings (direct page access in spec file)
import { test } from '@playwright/test';

test('direct page usage', async ({ page }) => {
  await page.goto('/'); // violation
  await page.click('#submit'); // violation
  await page.fill('#name', 'Alice'); // violation
  page.locator('#modal'); // violation
});
