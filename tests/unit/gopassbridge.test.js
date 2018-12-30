'use strict';

jest.useFakeTimers();

global.browser.tabs.query.mockResolvedValue([
    { url: 'http://some.url', id: 'someid', favIconUrl: 'http://some.fav/icon' },
]);
global.browser.tabs.onActivated = {
    addListener: jest.fn(),
};

global.browser.tabs.sendMessage = jest.fn();

global.executeOnSetting = jest.fn((_, cb) => cb());
global.getLocalStorageKey = jest.fn();
global.getLocalStorageKey.mockResolvedValue('previoussearch');

global.urlDomain = jest.fn(() => 'some.url');
global.getPopupUrl = jest.fn(() => 'popup.url');

global.LAST_DOMAIN_SEARCH_PREFIX = 'last_search_';

global.search = jest.fn();
global.search.mockResolvedValue();

global.searchHost = jest.fn();
global.searchHost.mockResolvedValue();

global.restoreDetailView = jest.fn();

require('gopassbridge.js');

const gopassbridge = window.tests.gopassbridge;

describe('on startup', () => {
    test('switch tab is registered as listener', () => {
        expect(global.browser.tabs.onActivated.addListener.mock.calls).toEqual([[gopassbridge.switchTab]]);
    });

    test('global state is set to current tab', () => {
        expect(gopassbridge.getCurrentTab()).toEqual({
            currentTabId: 'someid',
            currentTabFavIconUrl: 'http://some.fav/icon',
            currentPageUrl: 'http://some.url',
        });
    });
});

describe('switchTab', () => {
    beforeEach(() => {
        global.browser.tabs.sendMessage.mockReset();
        global.search.mockReset();
        global.searchHost.mockReset();
        global.search.mockResolvedValue();
        global.searchHost.mockResolvedValue();
    });

    afterEach(() => {
        jest.runAllTimers();
        global.getLocalStorageKey.mockResolvedValue('previoussearch');
    });

    test('does nothing if tab has no url', () => {
        const previousTab = gopassbridge.getCurrentTab();
        gopassbridge.switchTab({ id: 'holla' });
        expect(gopassbridge.getCurrentTab()).toEqual(previousTab);
    });

    test('does nothing if tab has no id', () => {
        const previousTab = gopassbridge.getCurrentTab();
        gopassbridge.switchTab({ url: 'holla' });
        expect(gopassbridge.getCurrentTab()).toEqual(previousTab);
    });

    test('sends message to mark fields if setting is true', () => {
        gopassbridge.switchTab({ url: 'http://some.url', id: 'someid' });
        expect(global.browser.tabs.sendMessage.mock.calls).toEqual([['someid', { type: 'MARK_LOGIN_FIELDS' }]]);
    });

    test('does not send a message to mark fields if setting is false', () => {
        global.executeOnSetting = jest.fn((_, cb) => {});
        global.browser.tabs.sendMessage.mockReset();
        gopassbridge.switchTab({ url: 'http://some.url', id: 'someid' });
        expect(global.browser.tabs.sendMessage.mock.calls).toEqual([]);
        global.executeOnSetting = jest.fn((_, cb) => cb());
    });

    test('if no search term could be derived, clear results', () => {
        const start = `
            <div id="results">
                <div></div>
            </div>`;
        document.body.innerHTML = start;
        global.urlDomain = jest.fn(() => {
            return null;
        });
        gopassbridge.switchTab({ url: 'http://some.url', id: 'someid' });
        expect(document.body.innerHTML).not.toEqual(start);
        global.urlDomain = jest.fn(() => {
            return 'some.url';
        });
    });

    test('if search term could be derived, do not clear results', () => {
        const start = `
            <div id="results">
                <div></div>
            </div>`;
        document.body.innerHTML = start;
        gopassbridge.switchTab({ url: 'http://some.url', id: 'someid' });
        expect(document.body.innerHTML).toEqual(start);
    });

    test('if search term in local storage, call search', () => {
        expect.assertions(2);
        global.getLocalStorageKey.mockResolvedValue('previoussearch');
        return gopassbridge.switchTab({ url: 'http://some.url', id: 'someid' }).then(() => {
            expect(global.search.mock.calls).toEqual([['previoussearch']]);
            expect(global.searchHost.mock.calls).toEqual([]);
        });
    });

    test('if no search term in local storage, call searchHost', () => {
        expect.assertions(2);
        global.getLocalStorageKey.mockResolvedValue(undefined);
        return gopassbridge.switchTab({ url: 'http://some.url', id: 'someid' }).then(() => {
            expect(global.search.mock.calls).toEqual([]);
            expect(global.searchHost.mock.calls).toEqual([['some.url']]);
        });
    });
});
