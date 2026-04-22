import someLib from 'some-lib';
import type { Locator } from '@playwright/test';

export class HelperPage {
  async check(locator: Locator): Promise<void> {
    await someLib.expect(locator).toBeOk();
  }
}
