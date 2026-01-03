import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: '../',
    outputDir: '../test-results',
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    fullyParallel: false,
    timeout: 5 * 1000,
    globalTimeout: 10 * 1000,
    reporter: [['html', { outputFolder: '../playwright-report', open: 'never' }]],
    use: {
        trace: process.env.CI ? 'off' : 'on',
    },
    projects: [
        {
            name: 'Chrome',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
