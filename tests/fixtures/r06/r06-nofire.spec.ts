// R06 fixtures: should produce no findings
import { test } from '@playwright/test';
import { HomePage } from '../../pages/home-page.js';

test('via page object', async ({ page }) => {
  const homePage = new HomePage(page); // passing page to PO — allowed
  await homePage.navigate();
  await homePage.clickSubmit();
});

test('page declaration only', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage(); // declaration — allowed
  const homePage = new HomePage(page);
  await homePage.navigate();
});
