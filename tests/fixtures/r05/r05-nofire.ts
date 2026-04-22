// R05 fixtures: should produce no findings

await expect(loc).toBeVisible();
await expect(loc).not.toBeVisible();
await expect(loc).toBeEnabled();
await expect(loc).toBeChecked();

// Non-state-check methods — not in scope
expect(await page.title()).toBe('Home');
expect(await loc.textContent()).toBe('hello');

// Awaited assertion without state check
expect(someValue).toBe(true);
