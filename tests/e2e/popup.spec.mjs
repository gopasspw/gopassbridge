import { execSync } from 'node:child_process';
import { expect, test } from './setup/fixtures.mjs';

test.beforeEach(async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/gopassbridge.html`);
});

test('popup loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle('gopass bridge');
});

test('create a new secret', async ({ page }) => {
    const secretName = 'test-new-secret';
    const userName = 'test-user';
    const password = 'test-password';

    const searchInput = page.locator('#search_input');
    await expect(searchInput).toBeVisible();

    // Search for non-existent secret
    await searchInput.fill(secretName);
    await expect(page.getByText(`no results for ${secretName}`)).toBeVisible();

    // Fill form
    await page.getByRole('button', { name: 'create new login entry' }).click();
    await page.getByLabel('Name:', { exact: true }).fill(secretName);
    await page.getByLabel('Login / Username:').fill(userName);

    // Uncheck Auto generate and fill password
    await page.getByLabel('Auto generate').uncheck();
    await page.getByLabel('Password:').fill(password);

    // Click Create
    await page.getByRole('button', { name: 'Create' }).click();

    // Verify return to search page and no error message
    await expect(searchInput).toBeVisible();
    await expect(page.getByText('failed to store secret')).not.toBeVisible();

    // Verify via shell
    const output = execSync(`gopass show -o ${secretName}`, { encoding: 'utf-8' });
    expect(output).toBe(password);

    // Search for the new secret
    await searchInput.fill(secretName);

    // Verify result appears
    const entry = page.locator('.entry').filter({ hasText: secretName });
    await expect(entry).toBeVisible();
    await expect(page.getByText(userName)).not.toBeVisible();

    // Verify content matches input exactly
    await entry.hover();
    await entry.getByTitle('Show details').click();

    const detailView = entry.locator('.detail-view');
    await expect(detailView).toBeVisible();

    await expect(detailView.locator('.detail-key').first()).toBeVisible();
    await expect(page.getByText('failed to get secret')).not.toBeVisible();
    await expect(page.getByText(userName)).toBeVisible();

    // Verify copy password
    await entry.hover();
    await entry.getByTitle('Copy').click();
    await expect(page.getByText('copied to clipboard')).toBeVisible();
});
