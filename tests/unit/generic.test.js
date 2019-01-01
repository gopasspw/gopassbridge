'use strict';

require('generic.js');

const generic = window.tests.generic;
let mockOnTrue, mockOnFalse, mockOnResult, mockOnError;

describe('executeOnSetting', () => {
    beforeEach(() => {
        mockOnTrue = jest.fn();
        mockOnFalse = jest.fn();
    });

    test('executes success callback when setting turned on', () => {
        expect.assertions(2);
        global.browser.storage.sync.get.mockResolvedValue({ mysetting: true });
        return generic.executeOnSetting('mysetting', mockOnTrue, mockOnFalse).then(() => {
            expect(mockOnTrue.mock.calls.length).toEqual(1);
            expect(mockOnFalse.mock.calls.length).toEqual(0);
        });
    });

    test('no error if no success callback', () => {
        expect.assertions(1);
        global.browser.storage.sync.get.mockResolvedValue({ mysetting: true });
        return generic.executeOnSetting('mysetting', null, mockOnFalse).then(() => {
            expect(true).toEqual(true);
        });
    });

    test('does execute error callback when setting turned off', () => {
        expect.assertions(2);
        global.browser.storage.sync.get.mockResolvedValue({ mysetting: false });
        return generic.executeOnSetting('mysetting', mockOnTrue, mockOnFalse).then(() => {
            expect(mockOnTrue.mock.calls.length).toEqual(0);
            expect(mockOnFalse.mock.calls.length).toEqual(1);
        });
    });

    test('no error if no error callback', () => {
        expect.assertions(1);
        global.browser.storage.sync.get.mockResolvedValue({ mysetting: false });
        return generic.executeOnSetting('mysetting', mockOnTrue, false).then(() => {
            expect(true).toEqual(true);
        });
    });

    test('does not execute callback when setting does not exist', () => {
        expect.assertions(2);
        global.browser.storage.sync.get.mockResolvedValue({ mysetting: false });
        return generic.executeOnSetting('nonexistent', mockOnTrue, mockOnFalse).then(() => {
            expect(mockOnTrue.mock.calls.length).toEqual(0);
            expect(mockOnFalse.mock.calls.length).toEqual(1);
        });
    });

    test('resolves no callback when error occurs on getting value', () => {
        expect.assertions(3);
        global.browser.storage.sync.get.mockRejectedValue('some error');
        global.console.log = jest.fn();
        return generic.executeOnSetting('nonexistent', mockOnTrue, mockOnFalse).then(() => {
            expect(mockOnTrue.mock.calls.length).toEqual(0);
            expect(mockOnFalse.mock.calls.length).toEqual(0);
            expect(global.console.log.mock.calls).toEqual([['some error']]);
        });
    });
});

describe('sendNativeMessage', () => {
    beforeEach(() => {
        mockOnResult = jest.fn();
        mockOnError = jest.fn();
        global.browser.runtime.sendNativeMessage = jest.fn();
    });

    test('sends message with response on success', () => {
        expect.assertions(2);
        global.browser.runtime.sendNativeMessage.mockResolvedValue({ maeh: '123' });
        return generic
            .sendNativeAppMessage({ payload: 'muh' })
            .then(mockOnResult, mockOnError)
            .then(() => {
                expect(mockOnResult.mock.calls[0]).toEqual([{ maeh: '123' }]);
                expect(mockOnError.mock.calls.length).toEqual(0);
            });
    });

    test('calls error handler on failure', () => {
        expect.assertions(2);
        global.browser.runtime.sendNativeMessage.mockRejectedValue('An error');
        return generic
            .sendNativeAppMessage({ payload: 'muh' })
            .then(mockOnResult, mockOnError)
            .then(() => {
                expect(mockOnResult.mock.calls[0]).toEqual(undefined);
                expect(mockOnError.mock.calls.length).toEqual(1);
            });
    });
});

describe('urlDomain', () => {
    test('extracts hostname', () => {
        expect(generic.urlDomain('http://www.muh.maeh.de:80/some/path?maeh')).toEqual('www.muh.maeh.de');
    });
});

describe('localStorage wrappers', () => {
    test('set key', () => {
        expect.assertions(1);
        return generic.setLocalStorageKey('muh', 123).then(() => {
            expect(global.browser.storage.local.set.mock.calls).toEqual([[{ muh: 123 }]]);
        });
    });

    test('get key', () => {
        expect.assertions(1);
        return generic.setLocalStorageKey('muh', 123).then(() => {
            return generic.getLocalStorageKey('muh').then(value => {
                expect(value).toBe(123);
            });
        });
    });
});

describe('createButtonWithCallback', () => {
    test('callback works for button with style', () => {
        const buttonCbMock = jest.fn();
        const button = generic.createButtonWithCallback('myclass', 'the text', 'border: 5px red;', buttonCbMock);
        expect(buttonCbMock.mock.calls.length).toBe(0);
        button.click();
        expect(buttonCbMock.mock.calls.length).toBe(1);
        expect(button.style._values.border).toEqual('5px red');
    });

    test('callback works for button without style', () => {
        const buttonCbMock = jest.fn();
        const button = generic.createButtonWithCallback('myclass', 'the text', null, buttonCbMock);
        expect(buttonCbMock.mock.calls.length).toBe(0);
        button.click();
        expect(buttonCbMock.mock.calls.length).toBe(1);
    });
});

describe('showNotificationOnSetting', () => {
    beforeEach(() => {
        global.browser.runtime.getURL = jest.fn(() => 'some-URL');
        global.browser.notifications.create.mockReset();
    });

    test('creates notification', () => {
        expect.assertions(1);
        global.browser.storage.sync.get.mockResolvedValue({ sendnotifications: true });
        return generic.showNotificationOnSetting('this is just a test!').then(() => {
            expect(global.browser.notifications.create.mock.calls).toEqual([
                [
                    {
                        type: 'basic',
                        iconUrl: 'some-URL',
                        title: 'gopassbridge',
                        message: 'this is just a test!',
                    },
                ],
            ]);
        });
    });

    test('respects user setting', () => {
        expect.assertions(1);
        global.browser.storage.sync.get.mockResolvedValue({ sendnotifications: false });
        return generic.showNotificationOnSetting('this is just a test!').then(() => {
            expect(global.browser.notifications.create.mock.calls.length).toEqual(0);
        });
    });
});

describe('getPopupUrl', () => {
    beforeEach(() => {
        global.browser.runtime.getURL = jest.fn(() => 'some-popup');
    });

    test('returns URL', () => {
        expect(generic.getPopupUrl()).toBe('some-popup');
    });
});

describe('isChrome', () => {
    test('for Chrome', () => {
        global.browser.runtime.getURL = jest.fn(() => 'chrome-extension://kkhfnlkhiapbiehimabddjbimfaijdhk/');
        expect(generic.isChrome()).toBe(true);
    });

    test('for Firefox', () => {
        global.browser.runtime.getURL = jest.fn(() => 'moz-extension://eec37db0-22ad-4bf1-9068-5ae08df8c7e9/');
        expect(generic.isChrome()).toBe(false);
    });
});

describe('openURL', () => {
    test('opens URL', () => {
        const event = { target: { href: 'https://someurl/' }, preventDefault: jest.fn() };
        generic.openURL(event);
        expect(browser.tabs.create.mock.calls).toEqual([[{ url: 'https://someurl/' }]]);
        expect(event.preventDefault.mock.calls.length).toBe(1);
    });
});
