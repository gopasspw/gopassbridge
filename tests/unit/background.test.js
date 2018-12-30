'use strict';

jest.useFakeTimers();

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
global.browser.webRequest = { onAuthRequired: { addListener: jest.fn() } };
global.executeOnSetting = jest.fn();
global.isChrome = jest.fn();

require('background.js');

const background = window.tests.background;

describe('background', () => {
    beforeEach(() => {
        global.sendNativeAppMessage.mockReset();
        global.showNotificationOnSetting.mockClear();
        global.browser.extension.getViews.mockClear();
        global.i18n.getMessage.mockClear();
        global.browser.tabs.sendMessage.mockClear();
        global.executeOnSetting.mockClear();
    });

    test('registers message processors on init', () => {
        browser.runtime.onMessage.addListener.mockClear();
        browser.webRequest.onAuthRequired.addListener.mockClear();
        background.initBackground();
        expect(browser.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
        expect(browser.webRequest.onAuthRequired.addListener).toHaveBeenCalledTimes(1);
    });

    describe('processMessageAndCatch', () => {
        test('raises on content script messages', () => {
            expect.assertions(2);
            const msg = 'Background script received unexpected message {} from content script or popup window.';
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

        describe('message OPEN_TAB', () => {
            function openTabMessage() {
                return background.processMessageAndCatch({ type: 'OPEN_TAB', entry: 'some/entry' }, {});
            }

            beforeEach(() => {
                global.browser.tabs.create.mockResolvedValue();
                global.sendNativeAppMessage.mockResolvedValue({
                    url: 'https://www.some.host',
                    username: 'username',
                    password: 'somepass',
                });
                global.browser.tabs.sendMessage.mockResolvedValue();
                global.browser.tabs.onUpdated = {
                    addListener: jest.fn(callback => callback(42, { status: 'complete' })),
                    removeListener: jest.fn(),
                };
            });

            test('opens tab and immediately loads credentials if tab is loaded', () => {
                expect.assertions(1);
                global.browser.tabs.create.mockResolvedValue({
                    id: 42,
                    status: 'complete',
                    url: 'http://www.some.host',
                });
                return openTabMessage().then(() => {
                    expect(global.browser.tabs.sendMessage.mock.calls).toEqual([
                        [42, { login: 'username', password: 'somepass', type: 'FILL_LOGIN_FIELDS' }],
                    ]);
                });
            });

            test('raises error if no url in entry', () => {
                global.sendNativeAppMessage.mockResolvedValue({});
                expect.assertions(1);
                global.browser.tabs.create.mockResolvedValue({ id: 42, status: 'complete' });
                return openTabMessage().catch(error => {
                    expect(error.message).toBe('__i18n_noURLInEntry__');
                });
            });

            test('opens tab and loads credentials when tab is ready', () => {
                expect.assertions(1);
                global.browser.tabs.create.mockResolvedValue({ id: 42, status: 'loading' });

                const promise = openTabMessage().then(() => {
                    expect(global.browser.tabs.sendMessage.mock.calls).toEqual([
                        [42, { login: 'username', password: 'somepass', type: 'FILL_LOGIN_FIELDS' }],
                    ]);
                });

                jest.advanceTimersByTime(1000);

                return promise;
            });

            test('raises error on timeout when waiting for new tab to be ready', () => {
                global.sendNativeAppMessage.mockResolvedValue({ url: 'some.url' });
                expect.assertions(2);
                global.browser.tabs.create.mockResolvedValue({ id: 42, status: 'loading' });

                const promise = openTabMessage().catch(error => {
                    expect(global.browser.tabs.onUpdated.removeListener.mock.calls.length).toBe(1);
                    expect(error).toBe('Loading timed out');
                });

                browser.tabs.onUpdated.addListener = jest.fn(() => {
                    jest.advanceTimersByTime(11000);
                });

                return promise;
            });
        });

        describe('message LOGIN_TAB', () => {
            beforeEach(() => {
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
