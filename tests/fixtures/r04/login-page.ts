import type { Page } from '@playwright/test';

export class LoginPage {
  // PropertyDeclaration — never referenced in any spec
  readonly zombieBtn = this.page.locator('#zombie');

  // PropertyDeclaration — referenced in spec
  readonly submitBtn = this.page.locator('#submit');

  constructor(private readonly page: Page) {
    // this.X assignment — never referenced in any spec
    this.deadLocator = page.locator('.dead');
    // this.X assignment — referenced in spec
    this.activeLocator = page.locator('.active');
  }

  async login(user: string, pass: string): Promise<void> {
    await this.submitBtn.click();
  }
}
