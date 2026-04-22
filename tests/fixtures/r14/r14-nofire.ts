import { test, expect } from '@playwright/test';

test('with bare expect', async ({ page }) => {
  expect(page).toBeDefined();
});

test('with expect.soft', async ({ page }) => {
  await expect.soft(page.locator('#el')).toBeVisible();
});

test.todo('future test');

test.skip('skipped', async ({ page }) => {
  await page.goto('/');
});

test.fixme('fixme test', async ({ page }) => {
  await page.goto('/');
});

test('expect in nested helper', async ({ page }) => {
  const check = async () => { expect(await page.title()).toBe('Home'); };
  await check();
});
