import { expect, test } from './setup/fixtures.mjs';

test.beforeEach(async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
});

test('options page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle('gopass bridge settings');
});
