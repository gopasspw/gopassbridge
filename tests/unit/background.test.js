'use strict';

jest.useFakeTimers();

global.showNotificationOnSetting = jest.fn();
global.sendNativeAppMessage = jest.fn();
global.browser.extension = {
    getViews: jest.fn(() => ({ length: 0 })),
};
global.urlDomain = jest.fn(() => 'some.url');
global.i18n = {
    getMessage: jest.fn((key) => `__i18n_${key}__`),
};
global.browser.tabs.sendMessage = jest.fn();
global.browser.webRequest = { onAuthRequired: { addListener: jest.fn() } };
global.executeOnSetting = jest.fn();
global.isChrome = jest.fn();
global.openURL = jest.fn();
global.makeAbsolute = jest.fn((string) => string);

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

        jest.spyOn(global.console, 'warn');
    });

    afterEach(() => {
        global.console.warn.mockReset();
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
            return background.processMessageAndCatch({}, { tab: 42 }).catch((error) => {
                expect(global.showNotificationOnSetting.mock.calls).toEqual([[msg]]);
                expect(error.message).toBe(msg);
            });
        });

        test('raises on unknown message types', () => {
            expect.assertions(2);
            const msg = `Background script received unexpected message {"type":"UNKNOWN"} from extension`;
            return background.processMessageAndCatch({ type: 'UNKNOWN' }, {}).catch((error) => {
                expect(global.showNotificationOnSetting.mock.calls).toEqual([[msg]]);
                expect(error.message).toBe(msg);
            });
        });

        test('do not show notification if popup is shown', () => {
            expect.assertions(1);
            global.browser.extension.getViews.mockReturnValueOnce({ length: 1 });
            return background.processMessageAndCatch({ type: 'UNKNOWN' }, {}).catch((error) => {
                expect(global.showNotificationOnSetting.mock.calls.length).toEqual(0);
            });
        });

        describe('message OPEN_TAB', () => {
            function openTabMessage() {
                return background.processMessageAndCatch({ type: 'OPEN_TAB', entry: 'some/entry' }, {});
            }

            beforeEach(() => {
                global.openURL.mockResolvedValue();
                global.sendNativeAppMessage.mockResolvedValue({
                    url: 'https://www.some.host',
                    username: 'username',
                    password: 'somepass',
                });
                global.browser.tabs.sendMessage.mockResolvedValue();
                global.browser.tabs.onUpdated = {
                    addListener: jest.fn((callback) => callback(42, { status: 'complete' })),
                    removeListener: jest.fn(),
                };
            });

            test('opens tab and immediately loads credentials if tab is loaded', () => {
                expect.assertions(1);
                global.openURL.mockResolvedValue({
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
                global.openURL.mockResolvedValue({ id: 42, status: 'complete' });
                return openTabMessage().catch((error) => {
                    expect(error.message).toBe('__i18n_noURLInEntry__');
                });
            });

            test('opens tab and loads credentials when tab is ready', () => {
                expect.assertions(1);
                global.openURL.mockResolvedValue({ id: 42, status: 'loading' });

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
                global.openURL.mockResolvedValue({ id: 42, status: 'loading' });

                const promise = openTabMessage().catch((error) => {
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
                return loginTabMessage().catch((error) => {
                    expect(error.message).toBe('some native app error');
                });
            });

            test('raises if username is equal to the domain message response contains error', () => {
                global.sendNativeAppMessage.mockResolvedValue({ username: 'some.url', password: 'waldfee' });
                expect.assertions(1);
                return loginTabMessage().catch((error) => {
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

    describe('onAuthRequired', () => {
        const authUrl = 'https://example.com';
        const validAuthPopupUrl = `http://localhost/?authUrl=${encodeURIComponent(authUrl)}`;
        const invalidAuthPopupUrl = `http://localhost.evil/?authUrl=${encodeURIComponent(authUrl)}`;

        let onAuthRequiredCallback, windowCreatePromise;

        beforeEach(() => {
            global.browser.extension.getViews.mockReset();
            global.browser.extension.getViews.mockReturnValue({ length: 0 });
            global.getPopupUrl = jest.fn(() => 'http://localhost/');
            global.executeOnSetting = jest.fn((_, enabled, disabled) => enabled());
            windowCreatePromise = Promise.resolve({ id: 42 });
            global.browser.windows = {
                create: jest.fn(() => windowCreatePromise),
                onRemoved: { addListener: jest.fn(), removeListener: jest.fn() },
            };
            onAuthRequiredCallback = browser.webRequest.onAuthRequired.addListener.mock.calls[0][0];
            global.sendNativeAppMessage.mockResolvedValue({ username: 'some.url', password: 'waldfee' });
        });

        test('opens auth popup and resolves auth request successfully with login credentials', () => {
            expect.assertions(5);

            const authRequiredPromise = onAuthRequiredCallback({ url: authUrl });

            return windowCreatePromise.then(() => {
                const processMessagePromise = background.processMessageAndCatch(
                    { type: 'LOGIN_TAB', entry: 'some/entry' },
                    { tab: {}, url: validAuthPopupUrl }
                );

                return Promise.all([authRequiredPromise, processMessagePromise]).then(([authRequiredResult, _]) => {
                    expect(browser.windows.create.mock.calls.length).toBe(1);
                    expect(browser.windows.onRemoved.addListener.mock.calls).toEqual(
                        browser.windows.onRemoved.removeListener.mock.calls
                    );
                    expect(global.sendNativeAppMessage.mock.calls).toEqual([
                        [{ type: 'getLogin', entry: 'some/entry' }],
                    ]);
                    expect(global.showNotificationOnSetting.mock.calls.length).toEqual(0);
                    expect(authRequiredResult).toEqual({
                        authCredentials: { username: 'some.url', password: 'waldfee' },
                    });
                });
            });
        });

        test('opens auth popup but when popup is closed falls back to browser auth dialog', () => {
            expect.assertions(5);

            const authRequiredPromise = onAuthRequiredCallback({ url: authUrl });

            return windowCreatePromise.then(() => {
                browser.windows.onRemoved.addListener.mock.calls[0][0](42);

                return authRequiredPromise.then((authRequiredResult) => {
                    expect(browser.windows.create.mock.calls.length).toBe(1);
                    expect(browser.windows.onRemoved.addListener.mock.calls).toEqual(
                        browser.windows.onRemoved.removeListener.mock.calls
                    );
                    expect(global.sendNativeAppMessage.mock.calls.length).toBe(0);
                    expect(global.showNotificationOnSetting.mock.calls.length).toEqual(0);
                    expect(authRequiredResult).toEqual({ cancel: false });
                });
            });
        });

        test('opens auth popup but does not resolve auth request after native app error', () => {
            expect.assertions(6);

            global.sendNativeAppMessage.mockResolvedValueOnce({ error: 'native app broken' });

            const authRequiredPromise = onAuthRequiredCallback({ url: authUrl });

            return windowCreatePromise.then(() => {
                const processMessagePromise = background.processMessageAndCatch(
                    { type: 'LOGIN_TAB', entry: 'some/entry' },
                    { tab: {}, url: validAuthPopupUrl }
                );

                return Promise.all([authRequiredPromise, processMessagePromise]).then(null, (processMessageError) => {
                    expect(browser.windows.create.mock.calls.length).toBe(1);
                    expect(browser.windows.onRemoved.addListener.mock.calls.length).toBe(1);
                    expect(browser.windows.onRemoved.removeListener.mock.calls.length).toBe(0); // popup still open
                    expect(global.sendNativeAppMessage.mock.calls).toEqual([
                        [{ type: 'getLogin', entry: 'some/entry' }],
                    ]);
                    expect(global.showNotificationOnSetting.mock.calls.length).toEqual(0);
                    expect(processMessageError.message).toEqual('native app broken');

                    return background.processMessageAndCatch(
                        // Cleanup remaining popup
                        { type: 'LOGIN_TAB', entry: 'some/entry' },
                        { tab: {}, url: validAuthPopupUrl }
                    );
                });
            });
        });

        test('opens auth popup but does not resolve auth request after URL mismatch', () => {
            expect.assertions(6);

            const authRequiredPromise = onAuthRequiredCallback({ url: authUrl });

            return windowCreatePromise.then(() => {
                return background
                    .processMessageAndCatch(
                        { type: 'LOGIN_TAB', entry: 'some/entry' },
                        { tab: {}, url: invalidAuthPopupUrl }
                    )
                    .then(() => {
                        expect(browser.windows.create.mock.calls.length).toBe(1);
                        expect(browser.windows.onRemoved.addListener.mock.calls.length).toBe(1);
                        expect(browser.windows.onRemoved.removeListener.mock.calls.length).toBe(0); // popup still open
                        expect(global.sendNativeAppMessage.mock.calls.length).toBe(1);
                        expect(global.showNotificationOnSetting.mock.calls.length).toEqual(0);
                        expect(global.console.warn.mock.calls).toEqual([
                            [
                                'Could not resolve auth request due to URL mismatch',
                                validAuthPopupUrl,
                                invalidAuthPopupUrl,
                            ],
                        ]);

                        const cleanupPopupPromise = background.processMessageAndCatch(
                            { type: 'LOGIN_TAB', entry: 'some/entry' },
                            { tab: {}, url: validAuthPopupUrl }
                        );
                        return Promise.all([authRequiredPromise, cleanupPopupPromise]);
                    });
            });
        });

        test('does not open auth popup when setting is disabled', () => {
            expect.assertions(6);

            global.executeOnSetting = jest.fn((_, enabled, disabled) => disabled());

            return onAuthRequiredCallback({ url: authUrl }).then((authRequiredResult) => {
                expect(browser.windows.create.mock.calls.length).toBe(0);
                expect(browser.windows.onRemoved.addListener.mock.calls.length).toBe(0);
                expect(browser.windows.onRemoved.removeListener.mock.calls.length).toBe(0);
                expect(global.sendNativeAppMessage.mock.calls.length).toBe(0);
                expect(authRequiredResult).toEqual({});
                expect(global.showNotificationOnSetting.mock.calls.length).toEqual(0);
            });
        });

        test('does not open multiple auth popups at the same time', () => {
            expect.assertions(6);

            const firstAuthRequiredPromise = onAuthRequiredCallback({ url: authUrl });
            return windowCreatePromise.then(() => {
                const secondAuthRequiredPromise = onAuthRequiredCallback({ url: authUrl });
                const processMessagePromise = background.processMessageAndCatch(
                    { type: 'LOGIN_TAB', entry: 'some/entry' },
                    { tab: {}, url: validAuthPopupUrl }
                );

                return Promise.all([firstAuthRequiredPromise, secondAuthRequiredPromise, processMessagePromise]).then(
                    ([firstAuthRequiredResult, secondAuthRequiredResult, _]) => {
                        expect(browser.windows.create.mock.calls.length).toBe(1);
                        expect(browser.windows.onRemoved.addListener.mock.calls).toEqual(
                            browser.windows.onRemoved.removeListener.mock.calls
                        );
                        expect(global.sendNativeAppMessage.mock.calls).toEqual([
                            [{ type: 'getLogin', entry: 'some/entry' }],
                        ]);
                        expect(firstAuthRequiredResult).toEqual({
                            authCredentials: { username: 'some.url', password: 'waldfee' },
                        });
                        expect(secondAuthRequiredResult).toEqual({});
                        expect(global.showNotificationOnSetting.mock.calls).toEqual([
                            ['__i18n_cannotHandleMultipleAuthRequests__'],
                        ]);
                    }
                );
            });
        });

        test('does not resolve auth request when no request is pending', () => {
            expect.assertions(6);

            const url = validAuthPopupUrl;
            const processMessagePromise = background.processMessageAndCatch(
                { type: 'LOGIN_TAB', entry: 'some/entry' },
                { tab: {}, url }
            );

            return processMessagePromise.then(() => {
                expect(browser.windows.create.mock.calls.length).toBe(0);
                expect(browser.windows.onRemoved.addListener.mock.calls.length).toBe(0);
                expect(browser.windows.onRemoved.removeListener.mock.calls.length).toBe(0);
                expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ type: 'getLogin', entry: 'some/entry' }]]);
                expect(global.showNotificationOnSetting.mock.calls.length).toEqual(0);
                expect(global.console.warn.mock.calls).toEqual([
                    ['Tried to resolve auth request, but no auth request is currently pending.', url],
                ]);
            });
        });
    });
});
