// R02 fixtures: should produce no findings (maxDepth 3)

// 1 combinator — no fire
page.locator('div > span');

// 2 combinators — no fire
page.locator('div > ul > li');

// 3 combinators — exactly maxDepth, no fire
page.locator('div > ul > li > a');

// getByRole — excluded from scanning
page.getByRole('button', { name: 'Submit' });

// pseudo-classes don't count
page.locator('ul > li:nth-child(2) > a');

// attribute selectors don't count
page.locator('form > input[type="text"]');
