import { beforeEach, describe, expect, test, vi } from 'vitest';

let showNotificationOnSettingMock;
let sendNativeAppMessageMock;
let urlDomainMock;

let executeOnSettingMock;
let isChromeMock;
let openURLMock;
let makeAbsoluteMock;
let getPopupUrlMock;
let background;

describe('background', () => {
    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        showNotificationOnSettingMock = vi.fn();
        vi.stubGlobal('showNotificationOnSetting', showNotificationOnSettingMock);

        sendNativeAppMessageMock = vi.fn();
        vi.stubGlobal('sendNativeAppMessage', sendNativeAppMessageMock);

        browser.extension.getViews = vi.fn(() => ({ length: 0 }));

        urlDomainMock = vi.fn(() => 'url.test');
        vi.stubGlobal('urlDomain', urlDomainMock);

        executeOnSettingMock = vi.fn();
        vi.stubGlobal('executeOnSetting', executeOnSettingMock);

        isChromeMock = vi.fn();
        vi.stubGlobal('isChrome', isChromeMock);

        openURLMock = vi.fn();
        vi.stubGlobal('openURL', openURLMock);

        makeAbsoluteMock = vi.fn((string) => string);
        vi.stubGlobal('makeAbsolute', makeAbsoluteMock);

        getPopupUrlMock = vi.fn(() => 'http://localhost.test/');
        vi.stubGlobal('getPopupUrl', getPopupUrlMock);

        await import('gopassbridge/web-extension/background.js');
        background = window.tests.background;

        vi.spyOn(global.console, 'warn');
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
                expect(showNotificationOnSettingMock.mock.calls).toEqual([[msg]]);
                expect(error.message).toBe(msg);
            });
        });

        test('raises on unknown message types', () => {
            expect.assertions(2);
            const msg = `Background script received unexpected message {"type":"UNKNOWN"} from extension`;
            return background.processMessageAndCatch({ type: 'UNKNOWN' }, {}).catch((error) => {
                expect(showNotificationOnSettingMock.mock.calls).toEqual([[msg]]);
                expect(error.message).toBe(msg);
            });
        });

        test('do not show notification if popup is shown', () => {
            expect.assertions(1);
            browser.extension.getViews.mockReturnValueOnce({ length: 1 });
            return background.processMessageAndCatch({ type: 'UNKNOWN' }, {}).catch(() => {
                expect(showNotificationOnSettingMock.mock.calls.length).toEqual(0);
            });
        });

        describe('message OPEN_TAB', () => {
            function openTabMessage() {
                return background.processMessageAndCatch({ type: 'OPEN_TAB', entry: 'some/entry' }, {});
            }

            beforeEach(() => {
                openURLMock.mockResolvedValue();
                sendNativeAppMessageMock.mockResolvedValue({
                    url: 'https://www.host.test',
                    username: 'username',
                    password: 'somepass',
                });
                browser.tabs.sendMessage.mockResolvedValue();
                browser.tabs.onUpdated = {
                    addListener: vi.fn((callback) => callback(42, { status: 'complete' })),
                    removeListener: vi.fn(),
                };
            });

            test('opens tab and immediately loads credentials if tab is loaded', () => {
                expect.assertions(1);
                openURLMock.mockResolvedValue({
                    id: 42,
                    status: 'complete',
                    url: 'http://www.host.test',
                });
                return openTabMessage().then(() => {
                    expect(browser.tabs.sendMessage.mock.calls).toEqual([
                        [42, { login: 'username', password: 'somepass', type: 'FILL_LOGIN_FIELDS' }],
                    ]);
                });
            });

            test('raises error if no url in entry', () => {
                sendNativeAppMessageMock.mockResolvedValue({});
                expect.assertions(1);
                openURLMock.mockResolvedValue({ id: 42, status: 'complete' });
                return openTabMessage().catch((error) => {
                    expect(error.message).toBe('__translated_noURLInEntry__');
                });
            });

            test('opens tab and loads credentials when tab is ready', () => {
                expect.assertions(1);
                openURLMock.mockResolvedValue({ id: 42, status: 'loading' });

                const promise = openTabMessage().then(() => {
                    expect(browser.tabs.sendMessage.mock.calls).toEqual([
                        [42, { login: 'username', password: 'somepass', type: 'FILL_LOGIN_FIELDS' }],
                    ]);
                });

                vi.advanceTimersByTime(1000);

                return promise;
            });

            test('raises error on timeout when waiting for new tab to be ready', () => {
                sendNativeAppMessageMock.mockResolvedValue({ url: 'url.test' });
                expect.assertions(2);
                openURLMock.mockResolvedValue({ id: 42, status: 'loading' });

                const promise = openTabMessage().catch((error) => {
                    expect(browser.tabs.onUpdated.removeListener.mock.calls.length).toBe(1);
                    expect(error).toBe('Loading timed out');
                });

                browser.tabs.onUpdated.addListener = vi.fn(() => {
                    vi.advanceTimersByTime(11000);
                });

                return promise;
            });
        });

        describe('message LOGIN_TAB', () => {
            beforeEach(() => {
                sendNativeAppMessageMock.mockResolvedValue({ login: 'holla', password: 'waldfee' });
                browser.extension.getViews.mockReturnValueOnce({ length: 1 });
                browser.tabs.sendMessage.mockResolvedValue();
            });

            function loginTabMessage() {
                return background.processMessageAndCatch(
                    { type: 'LOGIN_TAB', entry: 'some/entry', tab: { id: 42, url: 'https://url.test' } },
                    {}
                );
            }

            test('raises if native app message response contains error', () => {
                sendNativeAppMessageMock.mockResolvedValue({ error: 'some native app error' });
                expect.assertions(1);
                return loginTabMessage().catch((error) => {
                    expect(error.message).toBe('some native app error');
                });
            });

            test('raises if username is equal to the domain message response contains error', () => {
                sendNativeAppMessageMock.mockResolvedValue({ username: 'url.test', password: 'waldfee' });
                expect.assertions(1);
                return loginTabMessage().catch((error) => {
                    expect(error.message).toBe('__translated_couldNotDetermineUsernameMessage__');
                });
            });

            test('sends browser tab fill login field message', () => {
                expect.assertions(1);
                return loginTabMessage().then(() => {
                    expect(browser.tabs.sendMessage.mock.calls).toEqual([
                        [42, { login: undefined, password: 'waldfee', type: 'FILL_LOGIN_FIELDS' }],
                    ]);
                });
            });

            test('sends browser tab submit after fill message if setting is on', () => {
                expect.assertions(5);
                return loginTabMessage().then(() => {
                    expect(browser.tabs.sendMessage.mock.calls.length).toEqual(1);
                    expect(executeOnSettingMock.mock.calls.length).toEqual(1);
                    expect(executeOnSettingMock.mock.calls[0][0]).toEqual('submitafterfill');
                    return executeOnSettingMock.mock.calls[0][1]().then(() => {
                        expect(browser.tabs.sendMessage.mock.calls.length).toEqual(2);
                        expect(browser.tabs.sendMessage.mock.calls[1]).toEqual([42, { type: 'TRY_LOGIN' }]);
                    });
                });
            });
        });
    });

    describe('onAuthRequired', () => {
        const authUrl = 'https://example.test';
        const validAuthPopupUrl = `http://localhost.test/?authUrl=${encodeURIComponent(authUrl)}`;
        const invalidAuthPopupUrl = `http://evil.invalid/?authUrl=${encodeURIComponent(authUrl)}`;

        let onAuthRequiredCallback, windowCreatePromise;

        beforeEach(() => {
            browser.extension.getViews.mockReturnValue({ length: 0 });
            getPopupUrlMock.mockImplementation(() => 'http://localhost.test/');
            executeOnSettingMock.mockImplementation((_, enabled) => enabled());
            windowCreatePromise = Promise.resolve({ id: 42 });
            browser.windows = {
                create: vi.fn(() => windowCreatePromise),
                onRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
            };
            onAuthRequiredCallback = browser.webRequest.onAuthRequired.addListener.mock.calls[0][0];
            sendNativeAppMessageMock.mockResolvedValue({ username: 'url.test', password: 'waldfee' });
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
                    expect(sendNativeAppMessageMock.mock.calls).toEqual([[{ type: 'getLogin', entry: 'some/entry' }]]);
                    expect(showNotificationOnSettingMock.mock.calls.length).toEqual(0);
                    expect(authRequiredResult).toEqual({
                        authCredentials: { username: 'url.test', password: 'waldfee' },
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
                    expect(sendNativeAppMessageMock.mock.calls.length).toBe(0);
                    expect(showNotificationOnSettingMock.mock.calls.length).toEqual(0);
                    expect(authRequiredResult).toEqual({ cancel: false });
                });
            });
        });

        test('opens auth popup but does not resolve auth request after native app error', () => {
            expect.assertions(6);

            sendNativeAppMessageMock.mockResolvedValueOnce({ error: 'native app broken' });

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
                    expect(sendNativeAppMessageMock.mock.calls).toEqual([[{ type: 'getLogin', entry: 'some/entry' }]]);
                    expect(showNotificationOnSettingMock.mock.calls.length).toEqual(0);
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
                        expect(sendNativeAppMessageMock.mock.calls.length).toBe(1);
                        expect(showNotificationOnSettingMock.mock.calls.length).toEqual(0);
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

            executeOnSettingMock.mockImplementation((_, __, disabled) => disabled());

            return onAuthRequiredCallback({ url: authUrl }).then((authRequiredResult) => {
                expect(browser.windows.create.mock.calls.length).toBe(0);
                expect(browser.windows.onRemoved.addListener.mock.calls.length).toBe(0);
                expect(browser.windows.onRemoved.removeListener.mock.calls.length).toBe(0);
                expect(sendNativeAppMessageMock.mock.calls.length).toBe(0);
                expect(authRequiredResult).toEqual({});
                expect(showNotificationOnSettingMock.mock.calls.length).toEqual(0);
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
                        expect(sendNativeAppMessageMock.mock.calls).toEqual([
                            [{ type: 'getLogin', entry: 'some/entry' }],
                        ]);
                        expect(firstAuthRequiredResult).toEqual({
                            authCredentials: { username: 'url.test', password: 'waldfee' },
                        });
                        expect(secondAuthRequiredResult).toEqual({});
                        expect(showNotificationOnSettingMock.mock.calls).toEqual([
                            ['__translated_cannotHandleMultipleAuthRequests__'],
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
                expect(sendNativeAppMessageMock.mock.calls).toEqual([[{ type: 'getLogin', entry: 'some/entry' }]]);
                expect(showNotificationOnSettingMock.mock.calls.length).toEqual(0);
                expect(global.console.warn.mock.calls).toEqual([
                    ['Tried to resolve auth request, but no auth request is currently pending.', url],
                ]);
            });
        });
    });
});
