// R01 fixtures: should produce no findings
await page.waitForSelector('.modal');
await expect(locator).toBeVisible();
await page.waitForURL('/dashboard');
await page.waitForLoadState('networkidle');
