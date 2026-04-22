// R02 fixtures: should produce findings (maxDepth 3 → fires when > 3 combinators)

// 4 combinators (child) — fires
page.locator('div > ul > li > span > a');

// 4 descendant combinators — fires
page.waitForSelector('form div span input label');

// dynamic selector — fires (warn: cannot be statically analyzed)
const id = 'foo';
page.locator(`[data-testid="${id}"]`);

// XPath with depth > 3 — fires
page.locator('//html/body/div/section/article');
