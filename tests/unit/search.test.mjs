import fs from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('search method', () => {
    let search;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        document.body.innerHTML = fs.readFileSync(
            path.join(import.meta.dirname, '../../web-extension/gopassbridge.html'),
            'utf8'
        );

        vi.stubGlobal('LAST_DOMAIN_SEARCH_PREFIX', 'PREFIX_');
        vi.stubGlobal('armSpinnerTimeout', vi.fn());
        vi.stubGlobal('logAndDisplayError', vi.fn());
        vi.stubGlobal('setStatusText', vi.fn());
        vi.stubGlobal('onEntryData', vi.fn());
        vi.stubGlobal('copyToClipboard', vi.fn());
        vi.stubGlobal('spinnerTimeout', 24);
        vi.stubGlobal(
            'urlDomain',
            vi.fn(() => 'host.test')
        );
        vi.stubGlobal(
            'createButtonWithCallback',
            vi.fn(() => document.createElement('div'))
        );
        vi.stubGlobal('switchToCreateNewDialog', vi.fn());
        vi.stubGlobal('setLocalStorageKey', vi.fn().mockResolvedValue({}));
        vi.stubGlobal('sendNativeAppMessage', vi.fn().mockResolvedValue([]));

        window.close = vi.fn();

        vi.stubGlobal('currentTabId', 42);
        vi.stubGlobal('currentPageUrl', 'http://host.test');
        vi.stubGlobal('currentTabFavIconUrl', null);
        vi.stubGlobal('searchedUrl', null);

        await import('gopassbridge/web-extension/search.js');
        search = window.tests.search;
        vi.clearAllTimers();
    });

    describe('initSearch', () => {
        test('focuses input', () => {
            const input = document.getElementById('search_input');
            vi.spyOn(input, 'focus');
            search.initSearch();
            expect(input.focus).toHaveBeenCalledTimes(0);
            vi.runAllTimers();
            expect(input.focus).toHaveBeenCalledTimes(1);
        });

        test(`registers eventhandlers for input`, () => {
            const input = document.getElementById('search_input');
            vi.spyOn(input, 'addEventListener');
            search.initSearch();
            expect(input.addEventListener.mock.calls).toEqual([
                ['input', search._onSearchInputEvent],
                ['keypress', search._onSearchKeypressEvent],
            ]);
            vi.runAllTimers();
        });
    });

    describe('search for term', () => {
        test('sets search input', () => {
            expect.assertions(2);
            document.getElementById('search_input').value = '';
            expect(document.getElementById('search_input').value).toEqual('');
            return search.search('muh').then(() => {
                expect(document.getElementById('search_input').value).toEqual('muh');
            });
        });

        test('arms spinner timeout', () => {
            expect.assertions(1);
            return search.search('muh').then(() => {
                expect(armSpinnerTimeout.mock.calls.length).toBe(1);
            });
        });

        test('sends search message for term', () => {
            expect.assertions(1);
            return search.search('muh').then(() => {
                expect(sendNativeAppMessage.mock.calls).toEqual([[{ query: 'muh', type: 'query' }]]);
            });
        });

        test('does not send search message for empty term', () => {
            expect.assertions(1);
            return search.search('').then(() => {
                expect(sendNativeAppMessage.mock.calls.length).toBe(0);
            });
        });

        test('sends search queries sequentially', () => {
            expect.assertions(1);
            return search
                .search('a')
                .then(() => search.search('b'))
                .then(() => {
                    expect(sendNativeAppMessage.mock.calls).toEqual([
                        [{ query: 'a', type: 'query' }],
                        [{ query: 'b', type: 'query' }],
                    ]);
                });
        });

        test('queues search queries', () => {
            expect.assertions(1);
            return Promise.all([search.search('a'), search.search('b'), search.search('c')]).then(() => {
                expect(sendNativeAppMessage.mock.calls).toEqual([
                    [{ query: 'a', type: 'query' }],
                    [{ query: 'c', type: 'query' }],
                ]);
            });
        });

        test('queues search queries mixed with host queries', () => {
            expect.assertions(1);
            return Promise.all([search.searchHost('a'), search.search('b'), search.search('c')]).then(() => {
                expect(sendNativeAppMessage.mock.calls).toEqual([
                    [{ host: 'a', type: 'queryHost' }],
                    [{ query: 'c', type: 'query' }],
                ]);
            });
        });
    });

    describe('search for host', () => {
        test('resets search input', () => {
            expect.assertions(2);
            document.getElementById('search_input').value = 'muh';
            expect(document.getElementById('search_input').value).toEqual('muh');
            return search.searchHost('host.test').then(() => {
                expect(document.getElementById('search_input').value).toEqual('');
            });
        });

        test('clears storage before and after search if result empty', () => {
            expect.assertions(1);
            return search.searchHost('host.test').then(() => {
                expect(browser.storage.local.remove.mock.calls).toEqual([['PREFIX_host.test'], ['PREFIX_host.test']]);
            });
        });

        test('clears storage before only once if results not empty', () => {
            expect.assertions(1);
            sendNativeAppMessage.mockResolvedValueOnce(['some/entry', 'other/entry']);

            return search.searchHost('host.test').then(() => {
                expect(browser.storage.local.remove.mock.calls).toEqual([['PREFIX_host.test']]);
            });
        });

        test('sends search message for host', () => {
            expect.assertions(1);
            return search.searchHost('something.test').then(() => {
                expect(sendNativeAppMessage.mock.calls).toEqual([[{ host: 'something.test', type: 'queryHost' }]]);
            });
        });

        test('does not send search message for empty term', () => {
            expect.assertions(1);
            return search.searchHost('').then(() => {
                expect(sendNativeAppMessage.mock.calls.length).toBe(0);
            });
        });

        test('sends search queries sequentially', () => {
            expect.assertions(1);
            return search
                .searchHost('a')
                .then(() => search.searchHost('b'))
                .then(() => {
                    expect(sendNativeAppMessage.mock.calls).toEqual([
                        [{ host: 'a', type: 'queryHost' }],
                        [{ host: 'b', type: 'queryHost' }],
                    ]);
                });
        });

        test('queues search queries', () => {
            expect.assertions(1);
            return Promise.all([search.searchHost('a'), search.searchHost('b'), search.searchHost('c')]).then(() => {
                expect(sendNativeAppMessage.mock.calls).toEqual([
                    [{ host: 'a', type: 'queryHost' }],
                    [{ host: 'c', type: 'queryHost' }],
                ]);
            });
        });
    });

    describe('search results', () => {
        test('shows message and create for empty response', () => {
            expect.assertions(2);
            return search.searchHost('mih').then(() => {
                expect(setStatusText.mock.calls).toEqual([['__translated_noResultsForMessage__ mih']]);
                expect(createButtonWithCallback.mock.calls).toEqual([
                    [
                        { className: 'login', textContent: '__translated_createNewEntryButtonText__' },
                        switchToCreateNewDialog,
                    ],
                ]);
            });
        });

        describe('additional search result buttons', () => {
            test('are created for non empty response', () => {
                expect.assertions(2);
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                return search.searchHost('mih').then(() => {
                    expect(createButtonWithCallback.mock.calls).toEqual([
                        [
                            {
                                className: 'login',
                                textContent: 'some/entry',
                                style: "background-image: url('icons/si-glyph-key-2.svg')",
                                title: '__translated_searchResultLoginTooltip__',
                            },
                            search._onEntryAction,
                        ],
                        [
                            {
                                className: 'open',
                                textContent: 'some/entry',
                                title: '__translated_searchResultOpenTooltip__',
                            },
                            expect.any(Function),
                        ],
                        [
                            {
                                className: 'copy',
                                textContent: 'some/entry',
                                title: '__translated_searchResultCopyTooltip__',
                            },
                            expect.any(Function),
                        ],
                        [
                            {
                                className: 'details',
                                textContent: 'some/entry',
                                title: '__translated_searchResultDetailsTooltip__',
                            },
                            expect.any(Function),
                        ],
                        [
                            {
                                className: 'login createlogin',
                                textContent: '__translated_createAnotherEntryButtonText__',
                            },
                            expect.any(Function),
                        ],
                    ]);

                    expect(sendNativeAppMessage.mock.calls).toEqual([[{ host: 'mih', type: 'queryHost' }]]);
                });
            });

            test("'Open' tries to open in a new tab", () => {
                expect.assertions(1);
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                return search.searchHost('mih').then(() => {
                    createButtonWithCallback.mock.calls[1][1]({
                        target: { innerText: 'text' },
                    });
                    expect(browser.runtime.sendMessage.mock.calls).toEqual([[{ entry: 'text', type: 'OPEN_TAB' }]]);
                });
            });

            test("'Copy' tries to copy to clipboard", () => {
                expect.assertions(2);
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                return search.searchHost('mih').then(() => {
                    sendNativeAppMessage.mockClear();
                    const messagePromise = Promise.resolve({ status: 'ok' });
                    sendNativeAppMessage.mockImplementation(() => messagePromise);

                    createButtonWithCallback.mock.calls[2][1]({
                        target: { innerText: 'text' },
                    });

                    expect(sendNativeAppMessage.mock.calls).toEqual([[{ type: 'copyToClipboard', entry: 'text' }]]);

                    return messagePromise.then(() => {
                        vi.runAllTimers();
                        expect(window.close.mock.calls.length).toBe(1);
                    });
                });
            });

            test("'Details' tries to show details", () => {
                expect.assertions(1);
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                return search.searchHost('mih').then(() => {
                    sendNativeAppMessage.mockClear();
                    createButtonWithCallback.mock.calls[3][1]({
                        target: { innerText: 'text' },
                    });
                    expect(sendNativeAppMessage.mock.calls).toEqual([[{ entry: 'text', type: 'getData' }]]);
                });
            });
        });

        test('sets status on error', () => {
            expect.assertions(1);
            sendNativeAppMessage.mockResolvedValueOnce({ error: 'something went wrong' });
            return search.searchHost('mih').then(() => {
                expect(setStatusText.mock.calls).toEqual([['something went wrong']]);
            });
        });

        test('break if tab has changed', () => {
            vi.stubGlobal('currentPageUrl', 'http://evil.invalid');
            vi.stubGlobal('searchedUrl', 'muh');
            search._onSearchResults([], false);
            expect(createButtonWithCallback.mock.calls.length).toBe(0);
        });

        describe('modification', () => {
            test('is not applied on non windows browsers', () => {
                vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('some browser');
                expect.assertions(1);
                sendNativeAppMessage.mockResolvedValueOnce(['some\\entry']);
                return search.searchHost('entry').then(() => {
                    expect(createButtonWithCallback.mock.calls[0]).toEqual([
                        {
                            className: 'login',
                            textContent: 'some\\entry',
                            style: "background-image: url('icons/si-glyph-key-2.svg')",
                            title: '__translated_searchResultLoginTooltip__',
                        },
                        search._onEntryAction,
                    ]);
                });
            });

            test('is applied on windows browsers', () => {
                vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('windows browser');
                expect.assertions(1);
                sendNativeAppMessage.mockResolvedValueOnce(['some\\entry']);
                return search.searchHost('entry').then(() => {
                    expect(createButtonWithCallback.mock.calls[0]).toEqual([
                        {
                            className: 'login',
                            textContent: 'some/entry',
                            style: "background-image: url('icons/si-glyph-key-2.svg')",
                            title: '__translated_searchResultLoginTooltip__',
                        },
                        search._onEntryAction,
                    ]);
                });
            });
        });

        describe('favicon', () => {
            beforeEach(() => {
                vi.stubGlobal('currentTabFavIconUrl', 'http://host.test/fav.ico');
            });

            test('sets favicon if matching', () => {
                expect.assertions(1);
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                return search.searchHost('mih').then(() => {
                    expect(createButtonWithCallback.mock.calls[0]).toEqual([
                        {
                            className: 'login',
                            textContent: 'some/entry',
                            style: "background-image: url('http://host.test/fav.ico')",
                            title: '__translated_searchResultLoginTooltip__',
                        },
                        search._onEntryAction,
                    ]);
                });
            });

            test('does not set favicon if matching for normal query', () => {
                expect.assertions(1);
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                return search.search('mih').then(() => {
                    expect(createButtonWithCallback.mock.calls[0]).toEqual([
                        {
                            className: 'login',
                            textContent: 'some/entry',
                            style: "background-image: url('icons/si-glyph-key-2.svg')",
                            title: '__translated_searchResultLoginTooltip__',
                        },
                        search._onEntryAction,
                    ]);
                });
            });
        });
    });

    describe('search input', () => {
        let input;

        beforeEach(() => {
            search.initSearch();
            input = document.getElementById('search_input');
            input.value = '';
        });

        describe('keypress event', () => {
            function simulateKeyPress(options) {
                const event = new KeyboardEvent('keypress', options);
                vi.spyOn(event, 'preventDefault');
                input.dispatchEvent(event);
                return event;
            }

            function addDummySearchResult() {
                const result = document.createElement('div');
                result.innerText = 'some text';
                result.classList.add('login');
                document.getElementById('results').appendChild(result);
            }

            test('on keypress non-ENTER is ignored', () => {
                const event = simulateKeyPress({ keyCode: 32 });
                expect(event.preventDefault.mock.calls.length).toBe(0);
            });

            test('on keypress ENTER without result does nothing', () => {
                const event = simulateKeyPress({ keyCode: 13 });
                expect(browser.tabs.sendMessage.mock.calls.length).toBe(0);
                expect(event.preventDefault.mock.calls.length).toBe(1);
            });

            test('on keypress ENTER with multiple results does nothing', () => {
                addDummySearchResult();
                addDummySearchResult();
                const event = simulateKeyPress({ keyCode: 13 });
                expect(browser.runtime.sendMessage.mock.calls.length).toBe(0);
                expect(event.preventDefault.mock.calls.length).toBe(1);
            });

            test('on keypress ENTER with one result triggers login', () => {
                expect.assertions(3);
                const sendPromise = Promise.resolve({});
                browser.runtime.sendMessage.mockReturnValue(sendPromise);

                addDummySearchResult();
                const event = simulateKeyPress({ keyCode: 13 });
                expect(browser.runtime.sendMessage.mock.calls).toEqual([
                    [{ entry: 'some text', tab: { id: 42, url: 'http://host.test' }, type: 'LOGIN_TAB' }],
                ]);
                expect(event.preventDefault.mock.calls.length).toBe(1);
                return sendPromise.then(() => {
                    expect(window.close.mock.calls.length).toBe(1);
                });
            });

            test('on keypress ENTER with error shows status', () => {
                expect.assertions(4);
                const sendPromise = Promise.resolve({ error: 'Broken!' });
                browser.runtime.sendMessage.mockReturnValue(sendPromise);

                addDummySearchResult();
                const event = simulateKeyPress({ keyCode: 13 });
                expect(browser.runtime.sendMessage.mock.calls).toEqual([
                    [{ entry: 'some text', tab: { id: 42, url: 'http://host.test' }, type: 'LOGIN_TAB' }],
                ]);
                expect(event.preventDefault.mock.calls.length).toBe(1);
                return sendPromise.then(() => {
                    expect(setStatusText.mock.calls).toEqual([['Broken!']]);
                    expect(window.close.mock.calls.length).toBe(0);
                });
            });

            test('on keypress ALT-ENTER with one result triggers details view', () => {
                addDummySearchResult();
                const event = simulateKeyPress({ keyCode: 13, altKey: true });
                expect(sendNativeAppMessage.mock.calls).toEqual([[{ entry: 'some text', type: 'getData' }]]);
                expect(event.preventDefault.mock.calls.length).toBe(1);
            });

            test('on keypress CTRL-ENTER with one result triggers login in new tab', () => {
                addDummySearchResult();
                const event = simulateKeyPress({ keyCode: 13, ctrlKey: true });
                expect(browser.runtime.sendMessage.mock.calls).toEqual([[{ entry: 'some text', type: 'OPEN_TAB' }]]);
                expect(event.preventDefault.mock.calls.length).toBe(1);
            });

            test('on keypress SHIFT-ENTER with one result triggers copy to clipboard', () => {
                expect.assertions(3);
                const messagePromise = Promise.resolve({ status: 'ok' });
                sendNativeAppMessage.mockReturnValue(messagePromise);

                addDummySearchResult();
                const event = simulateKeyPress({ keyCode: 13, shiftKey: true });
                expect(sendNativeAppMessage.mock.calls).toEqual([[{ entry: 'some text', type: 'copyToClipboard' }]]);
                expect(event.preventDefault.mock.calls.length).toBe(1);

                return messagePromise.then(() => {
                    vi.runAllTimers();
                    expect(window.close.mock.calls.length).toBe(1);
                });
            });

            test('on keypress SHIFT-ENTER with error shows status', () => {
                expect.assertions(4);
                const messagePromise = Promise.resolve({ error: 'Broken!' });
                sendNativeAppMessage.mockReturnValue(messagePromise);

                addDummySearchResult();
                const event = simulateKeyPress({ keyCode: 13, shiftKey: true });
                expect(sendNativeAppMessage.mock.calls).toEqual([[{ entry: 'some text', type: 'copyToClipboard' }]]);
                expect(event.preventDefault.mock.calls.length).toBe(1);

                return messagePromise.then(() => {
                    expect(setStatusText.mock.calls).toEqual([['Broken!']]);
                    vi.runAllTimers();
                    expect(window.close.mock.calls.length).toBe(0);
                });
            });
        });

        describe('input event', () => {
            function simulateInput(value) {
                const event = new Event('input');
                input.value = value;
                input.dispatchEvent(event);
                return event;
            }

            test('searches non-empty value', () => {
                simulateInput('search text');
                expect(sendNativeAppMessage.mock.calls).toEqual([[{ query: 'search text', type: 'query' }]]);
            });

            test('searches host for empty value', () => {
                simulateInput('');
                expect(sendNativeAppMessage.mock.calls).toEqual([[{ host: 'host.test', type: 'queryHost' }]]);
            });
        });
    });
});
