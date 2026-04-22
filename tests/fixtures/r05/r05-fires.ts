// R05 fixtures: should produce findings (non-web-first assertions)

expect(await this.btn.isVisible()).toBe(true);
expect(await this.btn.isVisible()).toBe(false);
expect(await this.btn.isEnabled()).toBe(true);
expect(await this.btn.isChecked()).toBe(true);
expect(await this.btn.isDisabled()).toBe(true);
expect(await this.btn.isEditable()).toBe(true);

// toEqual variants
expect(await loc.isVisible()).toEqual(true);
expect(await loc.isEnabled()).toEqual(false);

// toBeTruthy/toBeFalsy — detected but not auto-fixable
expect(await loc.isVisible()).toBeTruthy();
expect(await loc.isEnabled()).toBeFalsy();
