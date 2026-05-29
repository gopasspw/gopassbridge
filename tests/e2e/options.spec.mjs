import { expect, test } from './setup/fixtures.mjs';

test.beforeEach(async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
});

test('options page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle('gopass bridge settings');
});

test('can set custom options', async ({ page }) => {
    const passwordLengthInput = page.locator('#defaultpasswordlength');
    const defaultFolderInput = page.locator('#defaultfolder');

    await passwordLengthInput.fill('100');
    await defaultFolderInput.fill('TestFolder');

    const savingIndicator = page.locator('#savingindicator');
    await expect(savingIndicator).toHaveClass(/saved/);
    await expect(savingIndicator).not.toHaveClass(/saved/);

    await page.reload();

    await expect(passwordLengthInput).toHaveValue('100');
    await expect(defaultFolderInput).toHaveValue('TestFolder');
});
