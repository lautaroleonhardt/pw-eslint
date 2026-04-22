// R03 fixtures: should produce findings (unawaited async actions)

// direct call without await
page.click('#submit');

// chained call without await
page.locator('#btn').fill('hello');

// assignment without await
const v = page.isVisible('.modal');

// goto without await
page.goto('/dashboard');
