import { beforeEach, describe, expect, test, vi } from 'vitest';

let generic;

beforeEach(async () => {
    generic = await import('gopassbridge/web-extension/generic.js');
});

describe('executeOnSetting', () => {
    let mockOnTrue, mockOnFalse;

    beforeEach(() => {
        mockOnTrue = vi.fn();
        mockOnFalse = vi.fn();
    });

    test('executes success callback when setting turned on', async () => {
        browser.storage.sync.get.mockResolvedValue({ mysetting: true });
        await generic.executeOnSetting('mysetting', mockOnTrue, mockOnFalse);
        expect(mockOnTrue.mock.calls.length).toEqual(1);
        expect(mockOnFalse.mock.calls.length).toEqual(0);
    });

    test('no error if no success callback', async () => {
        browser.storage.sync.get.mockResolvedValue({ mysetting: true });
        await generic.executeOnSetting('mysetting', null, mockOnFalse);
    });

    test('does execute error callback when setting turned off', async () => {
        browser.storage.sync.get.mockResolvedValue({ mysetting: false });
        await generic.executeOnSetting('mysetting', mockOnTrue, mockOnFalse);
        expect(mockOnTrue.mock.calls.length).toEqual(0);
        expect(mockOnFalse.mock.calls.length).toEqual(1);
    });

    test('no error if no error callback', async () => {
        browser.storage.sync.get.mockResolvedValue({ mysetting: false });
        await generic.executeOnSetting('mysetting', mockOnTrue, false);
    });

    test('does not execute callback when setting does not exist', async () => {
        browser.storage.sync.get.mockResolvedValue({ mysetting: false });
        await generic.executeOnSetting('nonexistent', mockOnTrue, mockOnFalse);
        expect(mockOnTrue.mock.calls.length).toEqual(0);
        expect(mockOnFalse.mock.calls.length).toEqual(1);
    });

    test('resolves no callback when error occurs on getting value', async () => {
        browser.storage.sync.get.mockRejectedValue('some error');
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await generic.executeOnSetting('nonexistent', mockOnTrue, mockOnFalse);
        expect(mockOnTrue.mock.calls.length).toEqual(0);
        expect(mockOnFalse.mock.calls.length).toEqual(0);
        expect(consoleSpy.mock.calls).toEqual([['some error']]);
    });
});

describe('sendNativeMessage', () => {
    test('sends message with response on success', async () => {
        browser.runtime.sendNativeMessage.mockResolvedValue({ maeh: '123' });

        const result = await generic.sendNativeAppMessage({ payload: 'muh' });

        expect(result).toEqual({ maeh: '123' });
    });

    test('calls error handler on failure', async () => {
        browser.runtime.sendNativeMessage.mockRejectedValue('An error');
        try {
            await generic.sendNativeAppMessage({ payload: 'muh' });
        } catch (e) {
            expect(e).toBe('An error');
        }
    });
});

describe('urlDomain', () => {
    test('extracts hostname', () => {
        expect(generic.urlDomain('http://www.muh.maeh.test:80/some/path?maeh')).toEqual('www.muh.maeh.test');
    });

    test('extracts default "localhost" for invalid URL', () => {
        expect(generic.urlDomain('invalid')).toEqual('localhost');
    });
});

describe('localStorage wrappers', () => {
    test('set key', async () => {
        await generic.setLocalStorageKey('muh', 123);
        expect(browser.storage.local.set.mock.calls).toEqual([[{ muh: 123 }]]);
    });

    test('get key', async () => {
        const value = await generic.getLocalStorageKey('muh');
        expect(value).toBe('_mock_muh_');
    });
});

describe('createButtonWithCallback', () => {
    test('creates button with callback and sets attributes', () => {
        const buttonCbMock = vi.fn();
        const button = generic.createButtonWithCallback({ className: 'myclass' }, buttonCbMock);
        expect(buttonCbMock.mock.calls.length).toBe(0);
        button.click();
        expect(buttonCbMock.mock.calls.length).toBe(1);
        expect(button.className).toEqual('myclass');
    });
});

describe('showNotificationOnSetting', () => {
    test('creates notification', async () => {
        browser.storage.sync.get.mockResolvedValue({ sendnotifications: true });
        await generic.showNotificationOnSetting('this is just a test!');
        expect(browser.notifications.create.mock.calls).toEqual([
            [
                {
                    type: 'basic',
                    iconUrl: 'chrome-extension://mock-id/icons/gopassbridge-96.png',
                    title: 'gopassbridge',
                    message: 'this is just a test!',
                },
            ],
        ]);
    });

    test('respects user setting', async () => {
        browser.storage.sync.get.mockResolvedValue({ sendnotifications: false });
        await generic.showNotificationOnSetting('this is just a test!');
        expect(browser.notifications.create.mock.calls.length).toEqual(0);
    });
});

describe('getPopupUrl', () => {
    test('returns URL', () => {
        expect(generic.getPopupUrl()).toBe('chrome-extension://mock-id/gopassbridge.html');
    });
});

describe('isChrome', () => {
    test('for Chrome', () => {
        browser.runtime.getURL = vi.fn(() => 'chrome-extension://kkhfnlkhiapbiehimabddjbimfaijdhk/');
        expect(generic.isChrome()).toBe(true);
    });

    test('for Firefox', () => {
        browser.runtime.getURL = vi.fn(() => 'moz-extension://eec37db0-22ad-4bf1-9068-5ae08df8c7e9/');
        expect(generic.isChrome()).toBe(false);
    });
});

describe('openURLOnEvent', () => {
    test('opens URL', () => {
        const event = { target: { href: 'https://someurl.test/' }, preventDefault: vi.fn() };
        generic.openURLOnEvent(event);
        expect(browser.tabs.create.mock.calls).toEqual([[{ url: 'https://someurl.test/' }]]);
        expect(event.preventDefault.mock.calls.length).toBe(1);
    });
});

describe('makeAbsolute', () => {
    test('does not change absolute urls', () => {
        expect(generic.makeAbsolute('https://muh.test')).toEqual('https://muh.test');
        expect(generic.makeAbsolute('http://muh.test')).toEqual('http://muh.test');
    });
    test('makes urls absolute', () => {
        expect(generic.makeAbsolute('muh.test')).toEqual('https://muh.test');
    });
});

describe('checkVersion', () => {
    test('rejects with smaller version', async () => {
        expect.assertions(1);
        browser.runtime.sendNativeMessage.mockResolvedValue({ major: 1, minor: 8, patch: 4 });
        try {
            await generic.checkVersion();
        } catch (error) {
            expect(error.message).toBe('Please update gopass to version 1.8.5 or newer.');
        }
    });

    test('resolves with minimum version', async () => {
        browser.runtime.sendNativeMessage.mockResolvedValue({ major: 1, minor: 8, patch: 5 });
        const value = await generic.checkVersion();
        expect(value).toBe(undefined);
    });

    test('resolves with larger version', async () => {
        browser.runtime.sendNativeMessage.mockResolvedValue({ major: 2, minor: 9, patch: 2 });
        const value = await generic.checkVersion();
        expect(value).toBe(undefined);
    });

    test('returns cached result on subsequent calls', async () => {
        browser.runtime.sendNativeMessage.mockResolvedValue({ major: 1, minor: 8, patch: 5 });

        await generic.checkVersion();
        expect(browser.runtime.sendNativeMessage.mock.calls.length).toBe(1);

        await generic.checkVersion();
        // Should NOT invoke sendNativeMessage again
        expect(browser.runtime.sendNativeMessage.mock.calls.length).toBe(1);
    });
});
