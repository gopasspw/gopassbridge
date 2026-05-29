import path from 'node:path';
import { test as base, chromium } from '@playwright/test';

export const test = base.extend({
    page: async ({ context }, use) => {
        const page = await context.newPage();
        page.on('console', (msg) => console.log('[CONSOLE LOG]', msg.text()));
        await use(page);
    },

    // biome-ignore lint/correctness/noEmptyPattern: Playwright requires object destructuring for dependency injection
    context: async ({}, use) => {
        // We assume 'make develop' has been run, which creates the 'chrome' directory in the root.
        const pathToExtension = path.join(import.meta.dirname, '../../../chrome');

        // Launch Chrome with the extension loaded
        const context = await chromium.launchPersistentContext('', {
            channel: 'chromium', // Required for headless extension support
            args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
        });

        await use(context);

        try {
            // Workaround to stop gpg-agent in the container
            const { execSync } = await import('node:child_process');
            execSync('gpgconf --kill gpg-agent');
        } catch (error) {
            console.log('failed to kill gpg-agent', error);
        }

        await context.close();
    },

    extensionId: async ({ context }, use) => {
        // Wait for the service worker to load to get the extension ID
        // Note: Manifest V3 extensions use service workers
        let [serviceWorker] = context.serviceWorkers();
        if (!serviceWorker) {
            serviceWorker = await context.waitForEvent('serviceworker');
        }

        const extensionId = serviceWorker.url().split('/')[2];
        await use(extensionId);
    },
});

export const expect = test.expect;
