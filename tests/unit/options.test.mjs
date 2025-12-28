import fs from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, test, vi } from 'vitest';

let logErrorMock;
let options;

beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    document.body.innerHTML = fs.readFileSync(
        path.join(import.meta.dirname, '../../web-extension/options.html'),
        'utf8'
    );

    vi.stubGlobal(
        'getSettings',
        vi.fn(() => Promise.resolve({ submitafterfill: true, defaultfolder: 'Muh' }))
    );
    logErrorMock = vi.fn();
    vi.stubGlobal('logError', logErrorMock);

    options = await import('gopassbridge/web-extension/options.js');
});

describe('Init', () => {
    test('Fills checkboxes from localstore', () => {
        expect.assertions(2);
        return options.init().then(() => {
            expect(document.getElementById('submitafterfill').checked).toBe(true);
            expect(document.getElementById('markfields').checked).toBe(false);
        });
    });

    test('Fills input fields from localstore', () => {
        expect.assertions(1);
        return options.init().then(() => {
            const textinput = document.getElementById('defaultfolder');
            expect(textinput.value).toBe('Muh');
        });
    });

    test('Initializes clear button listener', () => {
        expect.assertions(1);
        return options.init().then(() => {
            document.getElementById('clear').click();
            expect(browser.storage.sync.clear.mock.calls.length).toBe(1);
        });
    });

    test('Initializes checkbox listener', () => {
        expect.assertions(1);
        return options.init().then(() => {
            document.getElementById('markfields').click();
            expect(browser.storage.sync.set.mock.calls).toEqual([[{ markfields: true }]]);
        });
    });

    test('Handles missing clear button safely', () => {
        document.getElementById('clear').remove();
        return options.init().catch((e) => expect(e).toBeUndefined());
    });

    test('Ignores settings keys without matching elements', () => {
        global.getSettings.mockResolvedValue({ nonExistentId: 'value', defaultfolder: 'Folder' });
        return options.init().then(() => {
            expect(document.getElementById('defaultfolder').value).toBe('Folder');
        });
    });
});

describe('onTextInputChange', () => {
    test('updates storage', () => {
        options.init();
        options._onTextinputChange({ target: { id: 'muh', value: 'maeh' } });
        expect(browser.storage.sync.set.mock.calls).toEqual([[{ muh: 'maeh' }]]);
    });

    test('shows saving indicator', () => {
        expect.assertions(1);
        options.init();
        options._onTextinputChange({ target: { id: 'muh', value: 'maeh' } });
        return Promise.resolve().then(() => {
            expect(document.getElementById('savingindicator').classList.contains('saved')).toBe(true);
        });
    });
});

describe('savingindicator', () => {
    test('is shown and hidden', () => {
        expect.assertions(2);
        options._showSavingIndicator();
        // Call it a second time to trigger the clearTimeout logic
        options._showSavingIndicator();
        expect(document.getElementById('savingindicator').classList.contains('saved')).toBe(true);
        vi.advanceTimersByTime(1000);
        expect(document.getElementById('savingindicator').classList.contains('saved')).toBe(false);
    });
});
