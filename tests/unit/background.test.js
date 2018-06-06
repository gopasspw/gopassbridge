'use strict';

global.showNotificationOnSetting = jest.fn();
global.sendNativeAppMessage = jest.fn();
global.browser.extension = {
    getViews: jest.fn(() => {
        return { length: 0 };
    }),
};
global.urlDomain = jest.fn(() => 'some.url');
global.i18n = {
    getMessage: jest.fn(key => `__i18n_${key}__`),
};
global.browser.tabs.sendMessage = jest.fn();
global.executeOnSetting = jest.fn();

require('background.js');

const background = window.tests.background;

describe('background', function() {
    beforeEach(function() {
        global.sendNativeAppMessage.mockReset();
        global.showNotificationOnSetting.mockClear();
        global.browser.extension.getViews.mockClear();
        global.i18n.getMessage.mockClear();
        global.browser.tabs.sendMessage.mockClear();
        global.executeOnSetting.mockClear();
    });

    test('registers message processor on init', () => {
        browser.runtime.onMessage.addListener.mockClear();
        background.initBackground();
        expect(browser.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    });

    describe('processMessageAndCatch', () => {
        test('raises on content script messages', () => {
            expect.assertions(2);
            const msg = 'Background script received unexpected message {} from content script.';
            return background.processMessageAndCatch({}, { tab: 42 }).catch(error => {
                expect(global.showNotificationOnSetting.mock.calls).toEqual([[msg]]);
                expect(error.message).toBe(msg);
            });
        });

        test('raises on unknown message types', () => {
            expect.assertions(2);
            const msg = `Background script received unexpected message {"type":"UNKNOWN"} from extension`;
            return background.processMessageAndCatch({ type: 'UNKNOWN' }, {}).catch(error => {
                expect(global.showNotificationOnSetting.mock.calls).toEqual([[msg]]);
                expect(error.message).toBe(msg);
            });
        });

        test('do not show notification if popup is shown', () => {
            expect.assertions(1);
            global.browser.extension.getViews.mockReturnValueOnce({ length: 1 });
            return background.processMessageAndCatch({ type: 'UNKNOWN' }, {}).catch(error => {
                expect(global.showNotificationOnSetting.mock.calls.length).toEqual(0);
            });
        });
        describe('message LOGIN_TAB', function() {
            beforeEach(function() {
                global.sendNativeAppMessage.mockResolvedValue({ login: 'holla', password: 'waldfee' });
                global.browser.extension.getViews.mockReturnValueOnce({ length: 1 });
                global.browser.tabs.sendMessage.mockResolvedValue();
            });
            function loginTabMessage() {
                return background.processMessageAndCatch(
                    { type: 'LOGIN_TAB', entry: 'some/entry', tab: { id: 42, url: 'https://some.url' } },
                    {}
                );
            }

            test('raises if native app message response contains error', () => {
                global.sendNativeAppMessage.mockResolvedValue({ error: 'some native app error' });
                expect.assertions(1);
                return loginTabMessage().catch(error => {
                    expect(error.message).toBe('some native app error');
                });
            });

            test('raises if username is equal to the domain message response contains error', () => {
                global.sendNativeAppMessage.mockResolvedValue({ username: 'some.url', password: 'waldfee' });
                expect.assertions(1);
                return loginTabMessage().catch(error => {
                    expect(error.message).toBe('__i18n_couldNotDetermineUsernameMessage__');
                });
            });

            test('sends browser tab fill login field message', () => {
                expect.assertions(1);
                return loginTabMessage().then(() => {
                    expect(global.browser.tabs.sendMessage.mock.calls).toEqual([
                        [42, { login: undefined, password: 'waldfee', type: 'FILL_LOGIN_FIELDS' }],
                    ]);
                });
            });

            test('sends browser tab submit after fill message if setting is on', () => {
                expect.assertions(5);
                return loginTabMessage().then(() => {
                    expect(global.browser.tabs.sendMessage.mock.calls.length).toEqual(1);
                    expect(global.executeOnSetting.mock.calls.length).toEqual(1);
                    expect(global.executeOnSetting.mock.calls[0][0]).toEqual('submitafterfill');
                    return global.executeOnSetting.mock.calls[0][1]().then(() => {
                        expect(global.browser.tabs.sendMessage.mock.calls.length).toEqual(2);
                        expect(global.browser.tabs.sendMessage.mock.calls[1]).toEqual([42, { type: 'TRY_LOGIN' }]);
                    });
                });
            });
        });
    });
});
