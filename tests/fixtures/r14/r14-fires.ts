import { test } from '@playwright/test';

declare const it: typeof test;

test('navigate without assertion', async ({ page }) => {
  await page.goto('/home');
});

test('empty body', async () => {});

it('it alias without assertion', async ({ page }) => {
  await page.goto('/about');
});
