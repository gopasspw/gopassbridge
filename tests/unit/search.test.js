'use strict';

const fs = require('fs');

jest.useFakeTimers();

const originalUA = global.navigator.userAgent;
let UA = null;

Object.defineProperty(global.navigator, 'userAgent', {
    get() {
        return UA || originalUA;
    },
});

function clear() {
    UA = '';
}

function mockUA(agent) {
    UA = agent;
}

const documentHtml = fs.readFileSync(`${__dirname}/../../web-extension/gopassbridge.html`);

global.LAST_DOMAIN_SEARCH_PREFIX = 'PREFIX_';
global.armSpinnerTimeout = jest.fn();
global.logAndDisplayError = jest.fn();
global.setStatusText = jest.fn();
global.onEntryData = jest.fn();
global.copyToClipboard = jest.fn();
global.i18n = {
    getMessage: jest.fn(messagekey => `__KEY_${messagekey}__`),
};
global.spinnerTimeout = 24;
global.urlDomain = jest.fn(url => 'some.host');
global.createButtonWithCallback = jest.fn(() => document.createElement('div'));
global.switchToCreateNewDialog = jest.fn();
global.setLocalStorageKey = jest.fn();
global.setLocalStorageKey.mockResolvedValue({});
global.browser.tabs.sendMessage = jest.fn();
global.browser.tabs.sendMessage.mockResolvedValue({});
global.sendNativeAppMessage = jest.fn();
global.sendNativeAppMessage.mockResolvedValue([]);
global.window.close = jest.fn();

resetSearchState();

require('search.js');

const search = window.tests.search;

function resetSearchState() {
    document.body.innerHTML = documentHtml;
    jest.clearAllMocks();
    global.currentTabId = 42;
    global.currentPageUrl = 'http://some.host';
    global.currentTabFavIconUrl = null;
}

describe('search method', () => {
    beforeEach(resetSearchState);

    describe('initSearch', () => {
        test('focuses input', () => {
            const input = document.getElementById('search_input');
            spyOn(input, 'focus');
            search.initSearch();
            expect(input.focus).toHaveBeenCalledTimes(0);
            jest.runAllTimers();
            expect(input.focus).toHaveBeenCalledTimes(1);
        });

        test(`registers eventhandlers for input`, () => {
            const input = document.getElementById('search_input');
            spyOn(input, 'addEventListener');
            search.initSearch();
            expect(input.addEventListener.calls.allArgs()).toEqual([
                ['input', search._onSearchInputEvent],
                ['keypress', search._onSearchKeypressEvent],
            ]);
            jest.runAllTimers();
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
                expect(global.armSpinnerTimeout.mock.calls.length).toBe(1);
            });
        });

        test('sends search message for term', () => {
            expect.assertions(1);
            return search.search('muh').then(() => {
                expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ query: 'muh', type: 'query' }]]);
            });
        });

        test('does not send search message for empty term', () => {
            expect.assertions(1);
            return search.search('').then(() => {
                expect(global.sendNativeAppMessage.mock.calls.length).toBe(0);
            });
        });

        test('sends search queries sequentially', () => {
            expect.assertions(1);
            return search
                .search('a')
                .then(() => search.search('b'))
                .then(() => {
                    expect(global.sendNativeAppMessage.mock.calls).toEqual([
                        [{ query: 'a', type: 'query' }],
                        [{ query: 'b', type: 'query' }],
                    ]);
                });
        });

        test('queues search queries', () => {
            expect.assertions(1);
            return Promise.all([search.search('a'), search.search('b'), search.search('c')]).then(() => {
                expect(global.sendNativeAppMessage.mock.calls).toEqual([
                    [{ query: 'a', type: 'query' }],
                    [{ query: 'c', type: 'query' }],
                ]);
            });
        });

        test('queues search queries mixed with host queries', () => {
            expect.assertions(1);
            return Promise.all([search.searchHost('a'), search.search('b'), search.search('c')]).then(() => {
                expect(global.sendNativeAppMessage.mock.calls).toEqual([
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
            return search.searchHost('some.host').then(() => {
                expect(document.getElementById('search_input').value).toEqual('');
            });
        });

        test('clears storage before and after search if result empty', () => {
            expect.assertions(1);
            return search.searchHost('some.host').then(() => {
                expect(browser.storage.local.remove.mock.calls).toEqual([['PREFIX_some.host'], ['PREFIX_some.host']]);
            });
        });

        test('clears storage before only once if results not empty', () => {
            expect.assertions(1);
            global.sendNativeAppMessage.mockResolvedValueOnce(['some/entry', 'other/entry']);

            return search.searchHost('some.host').then(() => {
                expect(browser.storage.local.remove.mock.calls).toEqual([['PREFIX_some.host']]);
            });
        });

        test('sends search message for host', () => {
            expect.assertions(1);
            return search.searchHost('muh.com').then(() => {
                expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ host: 'muh.com', type: 'queryHost' }]]);
            });
        });

        test('does not send search message for empty term', () => {
            expect.assertions(1);
            return search.searchHost('').then(() => {
                expect(global.sendNativeAppMessage.mock.calls.length).toBe(0);
            });
        });

        test('sends search queries sequentially', () => {
            expect.assertions(1);
            return search
                .searchHost('a')
                .then(() => search.searchHost('b'))
                .then(() => {
                    expect(global.sendNativeAppMessage.mock.calls).toEqual([
                        [{ host: 'a', type: 'queryHost' }],
                        [{ host: 'b', type: 'queryHost' }],
                    ]);
                });
        });

        test('queues search queries', () => {
            expect.assertions(1);
            return Promise.all([search.searchHost('a'), search.searchHost('b'), search.searchHost('c')]).then(() => {
                expect(global.sendNativeAppMessage.mock.calls).toEqual([
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
                expect(global.setStatusText.mock.calls).toEqual([['__KEY_noResultsForMessage__ mih']]);
                expect(global.createButtonWithCallback.mock.calls).toEqual([
                    ['login', '__KEY_createNewEntryButtonText__', null, global.switchToCreateNewDialog],
                ]);
            });
        });

        test('creates entry with three additional buttons for non empty response', () => {
            expect.assertions(3);
            global.sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
            return search.searchHost('mih').then(() => {
                expect(global.createButtonWithCallback.mock.calls).toEqual([
                    ['login', 'some/entry', "background-image: url('icons/si-glyph-key-2.svg')", search._onEntryAction],
                    ['open', 'some/entry', null, expect.any(Function)],
                    ['copy', 'some/entry', null, expect.any(Function)],
                    ['details', 'some/entry', null, expect.any(Function)],
                ]);

                expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ host: 'mih', type: 'queryHost' }]]);
                global.sendNativeAppMessage.mockClear();
                global.createButtonWithCallback.mock.calls[3][3]({
                    target: { innerText: 'text' },
                });
                expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ entry: 'text', type: 'getData' }]]);
            });
        });

        test('sets status on error', () => {
            expect.assertions(1);
            global.sendNativeAppMessage.mockResolvedValueOnce({ error: 'something went wrong' });
            return search.searchHost('mih').then(() => {
                expect(global.setStatusText.mock.calls).toEqual([['something went wrong']]);
            });
        });

        test('break if tab has changed', () => {
            global.currentPageUrl = 'http://evil.host';
            global.searchedUrl = 'muh';
            search._onSearchResults([], false);
            expect(global.createButtonWithCallback.mock.calls.length).toBe(0);
        });

        describe('modification', () => {
            afterEach(() => {
                clear();
            });

            test('is not applied on non windows browsers', () => {
                mockUA('some browser');
                expect.assertions(1);
                global.sendNativeAppMessage.mockResolvedValueOnce(['some\\entry']);
                return search.searchHost('entry').then(() => {
                    expect(global.createButtonWithCallback.mock.calls[0]).toEqual([
                        'login',
                        'some\\entry',
                        "background-image: url('icons/si-glyph-key-2.svg')",
                        search._onEntryAction,
                    ]);
                });
            });

            test('is applied on windows browsers', () => {
                mockUA('windows browser');
                global.window.userAgent = 'windows browser';
                expect.assertions(1);
                global.sendNativeAppMessage.mockResolvedValueOnce(['some\\entry']);
                return search.searchHost('entry').then(() => {
                    expect(global.createButtonWithCallback.mock.calls[0]).toEqual([
                        'login',
                        'some/entry',
                        "background-image: url('icons/si-glyph-key-2.svg')",
                        search._onEntryAction,
                    ]);
                });
            });
        });

        describe('favicon', () => {
            beforeEach(() => {
                global.currentTabFavIconUrl = 'http://some.host/fav.ico';
            });

            test('sets favicon if matching', () => {
                expect.assertions(1);
                global.sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                return search.searchHost('mih').then(() => {
                    expect(global.createButtonWithCallback.mock.calls[0]).toEqual([
                        'login',
                        'some/entry',
                        "background-image: url('http://some.host/fav.ico')",
                        search._onEntryAction,
                    ]);
                });
            });

            test('does not set favicon if matching for normal query', () => {
                expect.assertions(1);
                global.sendNativeAppMessage.mockResolvedValueOnce(['some/entry']);
                return search.search('mih').then(() => {
                    expect(global.createButtonWithCallback.mock.calls[0]).toEqual([
                        'login',
                        'some/entry',
                        "background-image: url('icons/si-glyph-key-2.svg')",
                        search._onEntryAction,
                    ]);
                });
            });
        });
    });
});

describe('search input', () => {
    let input;

    beforeEach(() => {
        resetSearchState();
        search.initSearch();
        input = document.getElementById('search_input');
        input.value = '';
    });

    describe('keypress event', () => {
        function simulateKeyPress(options) {
            const event = new KeyboardEvent('keypress', options);
            event.preventDefault = jest.fn();
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
            expect(global.browser.tabs.sendMessage.mock.calls.length).toBe(0);
            expect(event.preventDefault.mock.calls.length).toBe(1);
        });

        test('on keypress ENTER with multiple results does nothing', () => {
            addDummySearchResult();
            addDummySearchResult();
            const event = simulateKeyPress({ keyCode: 13 });
            expect(global.browser.tabs.sendMessage.mock.calls.length).toBe(0);
            expect(event.preventDefault.mock.calls.length).toBe(1);
        });

        test('on keypress ENTER with one result triggers login', () => {
            expect.assertions(3);
            const sendPromise = Promise.resolve({});
            global.browser.runtime.sendMessage = jest.fn(() => sendPromise);

            addDummySearchResult();
            const event = simulateKeyPress({ keyCode: 13 });
            expect(global.browser.runtime.sendMessage.mock.calls).toEqual([
                [{ entry: 'some text', tab: { id: 42, url: 'http://some.host' }, type: 'LOGIN_TAB' }],
            ]);
            expect(event.preventDefault.mock.calls.length).toBe(1);
            return sendPromise.then(() => {
                expect(global.window.close.mock.calls.length).toBe(1);
            });
        });

        test('on keypress ENTER with error shows status', () => {
            expect.assertions(4);
            const sendPromise = Promise.resolve({ error: 'Broken!' });
            global.browser.runtime.sendMessage = jest.fn(() => sendPromise);

            addDummySearchResult();
            const event = simulateKeyPress({ keyCode: 13 });
            expect(global.browser.runtime.sendMessage.mock.calls).toEqual([
                [{ entry: 'some text', tab: { id: 42, url: 'http://some.host' }, type: 'LOGIN_TAB' }],
            ]);
            expect(event.preventDefault.mock.calls.length).toBe(1);
            return sendPromise.then(() => {
                expect(global.setStatusText.mock.calls).toEqual([['Broken!']]);
                expect(global.window.close.mock.calls.length).toBe(0);
            });
        });

        test('on keypress ALT-ENTER with one result triggers details view', () => {
            addDummySearchResult();
            const event = simulateKeyPress({ keyCode: 13, altKey: true });
            expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ entry: 'some text', type: 'getData' }]]);
            expect(event.preventDefault.mock.calls.length).toBe(1);
        });

        test('on keypress CTRL-ENTER with one result triggers login in new tab', () => {
            addDummySearchResult();
            const event = simulateKeyPress({ keyCode: 13, ctrlKey: true });
            expect(global.browser.runtime.sendMessage.mock.calls).toEqual([[{ entry: 'some text', type: 'OPEN_TAB' }]]);
            expect(event.preventDefault.mock.calls.length).toBe(1);
        });

        test('on keypress SHIFT-ENTER with one result triggers copy to clipboard', () => {
            expect.assertions(4);
            const messagePromise = Promise.resolve({ password: '1234' });
            global.sendNativeAppMessage = jest.fn(() => messagePromise);

            addDummySearchResult();
            const event = simulateKeyPress({ keyCode: 13, shiftKey: true });
            expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ entry: 'some text', type: 'getLogin' }]]);
            expect(event.preventDefault.mock.calls.length).toBe(1);

            return messagePromise.then(() => {
                expect(global.copyToClipboard.mock.calls).toEqual([['1234']]);
                jest.runAllTimers();
                expect(global.window.close.mock.calls.length).toBe(1);
            });
        });

        test('on keypress SHIFT-ENTER with error shows status', () => {
            expect.assertions(4);
            const messagePromise = Promise.resolve({ error: 'Broken!' });
            global.sendNativeAppMessage = jest.fn(() => messagePromise);

            addDummySearchResult();
            const event = simulateKeyPress({ keyCode: 13, shiftKey: true });
            expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ entry: 'some text', type: 'getLogin' }]]);
            expect(event.preventDefault.mock.calls.length).toBe(1);

            return messagePromise.then(() => {
                expect(global.setStatusText.mock.calls).toEqual([['Broken!']]);
                jest.runAllTimers();
                expect(global.window.close.mock.calls.length).toBe(0);
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
            expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ query: 'search text', type: 'query' }]]);
        });

        test('searches host for empty value', () => {
            simulateInput('');
            expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ host: 'some.host', type: 'queryHost' }]]);
        });
    });
});
