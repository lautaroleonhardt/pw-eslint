// R03 fixtures: should produce no findings

await page.click('#submit');
await page.locator('#btn').fill('hello');
const visible = await page.isVisible('.modal');
await page.goto('/dashboard');

// Promise.all suppression
await Promise.all([page.click('#a'), page.fill('#b', 'x')]);
await Promise.allSettled([page.click('#c'), page.goto('/login')]);
