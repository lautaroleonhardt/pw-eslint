import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';

export class SearchPage {
  async assertVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
  }

  async assertSoftText(locator: Locator): Promise<void> {
    await expect.soft(locator).toHaveText('Search');
  }

  async assertPoll(getCount: () => Promise<number>): Promise<void> {
    await expect.poll(getCount).toBe(3);
  }
}
