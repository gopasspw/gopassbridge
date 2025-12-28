import fs from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('search method', () => {
    let search;

    beforeEach(async () => {
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

        search = await import('gopassbridge/web-extension/search.js');
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
        test('sets search input', async () => {
            document.getElementById('search_input').value = '';
            expect(document.getElementById('search_input').value).toEqual('');
            await search.search('muh');
            expect(document.getElementById('search_input').value).toEqual('muh');
        });

        test('arms spinner timeout', async () => {
            await search.search('muh');
            expect(armSpinnerTimeout.mock.calls.length).toBe(1);
        });

        test('sends search message for term', async () => {
            await search.search('muh');
            expect(sendNativeAppMessage.mock.calls).toEqual([[{ query: 'muh', type: 'query' }]]);
        });

        test('does not send search message for empty term', async () => {
            await search.search('');
            expect(sendNativeAppMessage.mock.calls.length).toBe(0);
        });

        test('sends search queries sequentially', async () => {
            await search.search('a');
            await search.search('b');
            expect(sendNativeAppMessage.mock.calls).toEqual([
                [{ query: 'a', type: 'query' }],
                [{ query: 'b', type: 'query' }],
            ]);
        });

        test('queues search queries', async () => {
            await Promise.all([search.search('a'), search.search('b'), search.search('c')]);
            expect(sendNativeAppMessage.mock.calls).toEqual([
                [{ query: 'a', type: 'query' }],
                [{ query: 'c', type: 'query' }],
            ]);
        });

        test('queues search queries mixed with host queries', async () => {
            await Promise.all([search.searchHost('a'), search.search('b'), search.search('c')]);
            expect(sendNativeAppMessage.mock.calls).toEqual([
                [{ host: 'a', type: 'queryHost' }],
                [{ query: 'c', type: 'query' }],
            ]);
        });
    });

    describe('search for host', () => {
        test('resets search input', async () => {
            document.getElementById('search_input').value = 'muh';
            expect(document.getElementById('search_input').value).toEqual('muh');
            await search.searchHost('host.test');
            expect(document.getElementById('search_input').value).toEqual('');
        });

        test('clears storage before and after search if result empty', async () => {
            await search.searchHost('host.test');
            expect(browser.storage.local.remove.mock.calls).toEqual([['PREFIX_host.test'], ['PREFIX_host.test']]);
        });

        test('clears storage before only once if results not empty', async () => {
            sendNativeAppMessage.mockResolvedValueOnce(['some/entry', 'other/entry']);

            await search.searchHost('host.test');
            expect(browser.storage.local.remove.mock.calls).toEqual([['PREFIX_host.test']]);
        });

        test('sends search message for host', async () => {
            await search.searchHost('something.test');
            expect(sendNativeAppMessage.mock.calls).toEqual([[{ host: 'something.test', type: 'queryHost' }]]);
        });

        test('does not send search message for empty term', async () => {
            await search.searchHost('');
            expect(sendNativeAppMessage.mock.calls.length).toBe(0);
        });

        test('sends search queries sequentially', async () => {
            await search.searchHost('a');
            await search.searchHost('b');
            expect(sendNativeAppMessage.mock.calls).toEqual([
                [{ host: 'a', type: 'queryHost' }],
                [{ host: 'b', type: 'queryHost' }],
            ]);
        });

        test('queues search queries', async () => {
            await Promise.all([search.searchHost('a'), search.searchHost('b'), search.searchHost('c')]);
            expect(sendNativeAppMessage.mock.calls).toEqual([
                [{ host: 'a', type: 'queryHost' }],
                [{ host: 'c', type: 'queryHost' }],
            ]);
        });
    });

    describe('search results', () => {
        test('shows message and create for empty response', async () => {
            await search.searchHost('mih');
            expect(setStatusText.mock.calls).toEqual([['__translated_noResultsForMessage__ mih']]);
            expect(createButtonWithCallback.mock.calls).toEqual([
                [
                    { className: 'login', textContent: '__translated_createNewEntryButtonText__' },
                    switchToCreateNewDialog,
                ],
            ]);
        });

        describe('additional search result buttons', () => {
            test('are created for non empty response', async () => {
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                await search.searchHost('mih');
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

            test("'Open' tries to open in a new tab", async () => {
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                await search.searchHost('mih');
                createButtonWithCallback.mock.calls[1][1]({
                    target: { innerText: 'text' },
                });
                expect(browser.runtime.sendMessage.mock.calls).toEqual([[{ entry: 'text', type: 'OPEN_TAB' }]]);
            });

            test("'Copy' tries to copy to clipboard", async () => {
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                await search.searchHost('mih');
                sendNativeAppMessage.mockClear();
                const messagePromise = Promise.resolve({ status: 'ok' });
                sendNativeAppMessage.mockImplementation(() => messagePromise);

                createButtonWithCallback.mock.calls[2][1]({
                    target: { innerText: 'text' },
                });

                expect(sendNativeAppMessage.mock.calls).toEqual([[{ type: 'copyToClipboard', entry: 'text' }]]);

                await messagePromise;
                vi.runAllTimers();
                expect(window.close.mock.calls.length).toBe(1);
            });

            test("'Details' tries to show details", async () => {
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                await search.searchHost('mih');
                sendNativeAppMessage.mockClear();
                createButtonWithCallback.mock.calls[3][1]({
                    target: { innerText: 'text' },
                });
                expect(sendNativeAppMessage.mock.calls).toEqual([[{ entry: 'text', type: 'getData' }]]);
            });
        });

        test('sets status on error', async () => {
            sendNativeAppMessage.mockResolvedValueOnce({ error: 'something went wrong' });
            await search.searchHost('mih');
            expect(setStatusText.mock.calls).toEqual([['something went wrong']]);
        });

        test('break if tab has changed', () => {
            vi.stubGlobal('currentPageUrl', 'http://evil.invalid');
            vi.stubGlobal('searchedUrl', 'muh');
            search._onSearchResults([], false);
            expect(createButtonWithCallback.mock.calls.length).toBe(0);
        });

        describe('modification', () => {
            test('is not applied on non windows browsers', async () => {
                vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('some browser');
                sendNativeAppMessage.mockResolvedValueOnce(['some\\entry']);
                await search.searchHost('entry');
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

            test('is applied on windows browsers', async () => {
                vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('windows browser');
                sendNativeAppMessage.mockResolvedValueOnce(['some\\entry']);
                await search.searchHost('entry');
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

        describe('favicon', () => {
            beforeEach(() => {
                vi.stubGlobal('currentTabFavIconUrl', 'http://host.test/fav.ico');
            });

            test('sets favicon if matching', async () => {
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                await search.searchHost('mih');
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

            test('does not set favicon if matching for normal query', async () => {
                sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                await search.search('mih');
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

            test('on keypress ENTER with one result triggers login', async () => {
                const sendPromise = Promise.resolve({});
                browser.runtime.sendMessage.mockReturnValue(sendPromise);

                addDummySearchResult();
                const event = simulateKeyPress({ keyCode: 13 });
                expect(browser.runtime.sendMessage.mock.calls).toEqual([
                    [{ entry: 'some text', tab: { id: 42, url: 'http://host.test' }, type: 'LOGIN_TAB' }],
                ]);
                expect(event.preventDefault.mock.calls.length).toBe(1);
                await sendPromise;
                expect(window.close.mock.calls.length).toBe(1);
            });

            test('on keypress ENTER with error shows status', async () => {
                const sendPromise = Promise.resolve({ error: 'Broken!' });
                browser.runtime.sendMessage.mockReturnValue(sendPromise);

                addDummySearchResult();
                const event = simulateKeyPress({ keyCode: 13 });
                expect(browser.runtime.sendMessage.mock.calls).toEqual([
                    [{ entry: 'some text', tab: { id: 42, url: 'http://host.test' }, type: 'LOGIN_TAB' }],
                ]);
                expect(event.preventDefault.mock.calls.length).toBe(1);
                await sendPromise;
                expect(setStatusText.mock.calls).toEqual([['Broken!']]);
                expect(window.close.mock.calls.length).toBe(0);
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

            test('on keypress SHIFT-ENTER with one result triggers copy to clipboard', async () => {
                const messagePromise = Promise.resolve({ status: 'ok' });
                sendNativeAppMessage.mockReturnValue(messagePromise);

                addDummySearchResult();
                const event = simulateKeyPress({ keyCode: 13, shiftKey: true });
                expect(sendNativeAppMessage.mock.calls).toEqual([[{ entry: 'some text', type: 'copyToClipboard' }]]);
                expect(event.preventDefault.mock.calls.length).toBe(1);

                await messagePromise;
                vi.runAllTimers();
                expect(window.close.mock.calls.length).toBe(1);
            });

            test('on keypress SHIFT-ENTER with error shows status', async () => {
                const messagePromise = Promise.resolve({ error: 'Broken!' });
                sendNativeAppMessage.mockReturnValue(messagePromise);

                addDummySearchResult();
                const event = simulateKeyPress({ keyCode: 13, shiftKey: true });
                expect(sendNativeAppMessage.mock.calls).toEqual([[{ entry: 'some text', type: 'copyToClipboard' }]]);
                expect(event.preventDefault.mock.calls.length).toBe(1);

                await messagePromise;
                expect(setStatusText.mock.calls).toEqual([['Broken!']]);
                vi.runAllTimers();
                expect(window.close.mock.calls.length).toBe(0);
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

    describe('_onEntryAction', () => {
        test('falls back to event.target if element is null', () => {
            const event = { target: { innerText: 'value' }, altKey: false, shiftKey: false, ctrlKey: false };
            search._onEntryAction(event, null);
            expect(browser.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({ entry: 'value', type: 'LOGIN_TAB' })
            );
        });

        test.each([
            {
                comment: 'Alt key',
                altKey: true,
                shiftKey: false,
                ctrlKey: false,
                expectedTriggerType: 'native-message',
                expectedMessage: { type: 'getData', entry: 'value' },
            },
            {
                comment: 'Shift key (Copy)',
                altKey: false,
                shiftKey: true,
                ctrlKey: false,
                expectedTriggerType: 'native-message',
                expectedMessage: { type: 'copyToClipboard', entry: 'value' },
            },
            {
                comment: 'Ctrl key (Open)',
                altKey: false,
                shiftKey: false,
                ctrlKey: true,
                expectedTriggerType: 'browser-message',
                expectedMessage: { type: 'OPEN_TAB', entry: 'value' },
            },
        ])('handles modifiers for $comment', ({ altKey, shiftKey, ctrlKey, expectedTriggerType, expectedMessage }) => {
            const event = { target: { innerText: 'value' }, altKey, shiftKey, ctrlKey };
            search._onEntryAction(event, null);
            switch (expectedTriggerType) {
                case 'native-message':
                    expect(sendNativeAppMessage).toHaveBeenCalledWith(expectedMessage);
                    break;
                case 'browser-message':
                    expect(browser.runtime.sendMessage).toHaveBeenCalledWith(expectedMessage);
                    break;
                default:
                    throw new Error('Unknown trigger type');
            }
        });
    });
});
