// R01 fixtures: should produce findings

// page receiver (line 5)
await page.waitForTimeout(5000);

// this.page receiver (line 8)
await this.page.waitForTimeout(100);

// bare call (line 11)
waitForTimeout(200);
