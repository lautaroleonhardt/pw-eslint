import { test, expect } from '@playwright/test';
import { LoginPage } from './login-page.js';

test('login flow', async ({ page }) => {
  const loginPage = new LoginPage(page);
  // Only references submitBtn and activeLocator
  await loginPage.submitBtn.click();
  await expect(loginPage.activeLocator).toBeVisible();
});
