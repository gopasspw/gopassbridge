import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('gopassbridge', () => {
    const documentHtml = fs.readFileSync(
        path.join(import.meta.dirname, '../../web-extension/gopassbridge.html'),
        'utf8'
    );

    let gopassbridge;
    let executeOnSettingMock;
    let getLocalStorageKeyMock;
    let urlDomainMock;
    let getPopupUrlMock;
    let searchMock;
    let searchHostMock;
    let logAndDisplayErrorMock;
    let restoreDetailViewMock;
    let checkVersionMock;

    beforeEach(async () => {
        browser.tabs.query.mockResolvedValue([
            { url: 'http://url.test', id: 'someid', favIconUrl: 'http://icon.test/fav' },
        ]);

        executeOnSettingMock = vi.fn((_, cb) => cb());
        vi.stubGlobal('executeOnSetting', executeOnSettingMock);

        getLocalStorageKeyMock = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('getLocalStorageKey', getLocalStorageKeyMock);

        urlDomainMock = vi.fn(() => 'url.test');
        vi.stubGlobal('urlDomain', urlDomainMock);

        getPopupUrlMock = vi.fn(() => 'popup.test');
        vi.stubGlobal('getPopupUrl', getPopupUrlMock);

        vi.stubGlobal('LAST_DOMAIN_SEARCH_PREFIX', 'last_search_');

        searchMock = vi.fn().mockResolvedValue();
        vi.stubGlobal('search', searchMock);

        searchHostMock = vi.fn().mockResolvedValue();
        vi.stubGlobal('searchHost', searchHostMock);

        logAndDisplayErrorMock = vi.fn();
        vi.stubGlobal('logAndDisplayError', logAndDisplayErrorMock);

        restoreDetailViewMock = vi.fn();
        vi.stubGlobal('restoreDetailView', restoreDetailViewMock);

        checkVersionMock = vi.fn().mockResolvedValue();
        vi.stubGlobal('checkVersion', checkVersionMock);

        gopassbridge = await import('gopassbridge/web-extension/gopassbridge.js');
    });

    describe('on startup', () => {
        test('switch tab is registered as listener', () => {
            expect(browser.tabs.onActivated.addListener.mock.calls).toEqual([[gopassbridge.switchTab]]);
        });

        test('global state is set to current tab', () => {
            expect(gopassbridge.getCurrentTab()).toEqual({
                currentTabId: 'someid',
                currentTabFavIconUrl: 'http://icon.test/fav',
                currentPageUrl: 'http://url.test',
            });
        });
    });

    describe('switchTab', () => {
        const start = `
            <div id="results">
                <div></div>
            </div>
        `;

        beforeEach(() => {
            vi.clearAllMocks();

            document.body.innerHTML = start;
        });

        test('does nothing if tab has no url', () => {
            const previousTab = gopassbridge.getCurrentTab();
            gopassbridge.switchTab({ id: 'holla' });
            expect(gopassbridge.getCurrentTab()).toEqual(previousTab);
        });

        test('does nothing if tab url does not start with http', () => {
            const previousTab = gopassbridge.getCurrentTab();
            gopassbridge.switchTab({ id: 'holla', url: 'chrome://somethingelse' });
            expect(gopassbridge.getCurrentTab()).toEqual(previousTab);
        });

        test('does nothing if tab has no id', () => {
            const previousTab = gopassbridge.getCurrentTab();
            gopassbridge.switchTab({ url: 'holla' });
            expect(gopassbridge.getCurrentTab()).toEqual(previousTab);
        });

        test('sends message to mark fields if setting is true', async () => {
            await gopassbridge.switchTab({ url: 'http://url.test', id: 'someid' });
            expect(browser.tabs.sendMessage.mock.calls).toEqual([['someid', { type: 'MARK_LOGIN_FIELDS' }]]);
        });

        test('does not send a message to mark fields if setting is false', async () => {
            executeOnSettingMock.mockImplementation(() => {});
            browser.tabs.sendMessage.mockReset();
            await gopassbridge.switchTab({ url: 'http://url.test', id: 'someid' });
            expect(browser.tabs.sendMessage.mock.calls).toEqual([]);
            executeOnSettingMock.mockImplementation((_, cb) => cb());
        });

        test('if no search term could be derived, clear results', async () => {
            urlDomainMock.mockImplementation(() => null);
            await gopassbridge.switchTab({ url: 'http://url.test', id: 'someid' });
            expect(document.body.innerHTML).not.toEqual(start);
            urlDomainMock.mockImplementation(() => 'url.test');
        });

        test('if search term could be derived, do not clear results', async () => {
            const start = `
                <div id="results">
                    <div></div>
                </div>
            `;
            document.body.innerHTML = start;

            await gopassbridge.switchTab({ url: 'http://url.test', id: 'someid' });
            expect(document.body.innerHTML).toEqual(start);
        });

        test('if search term in local storage, call search', async () => {
            getLocalStorageKeyMock.mockResolvedValue('previoussearch');
            await gopassbridge.switchTab({ url: 'http://url.test', id: 'someid' });
            expect(searchMock.mock.calls).toEqual([['previoussearch']]);
            expect(searchHostMock.mock.calls).toEqual([]);
        });

        test('if no search term in local storage, call searchHost', async () => {
            getLocalStorageKeyMock.mockResolvedValue(undefined);
            await gopassbridge.switchTab({ url: 'http://url.test', id: 'someid' });
            expect(searchMock.mock.calls).toEqual([]);
            expect(searchHostMock.mock.calls).toEqual([['url.test']]);
        });

        describe('handles authUrl query parameter', () => {
            beforeEach(() => {
                urlDomainMock.mockImplementation((url) => url);
                getPopupUrlMock.mockImplementation(() => 'http://localhost.test/');
                jsdom.reconfigure({
                    url: `http://localhost.test/?authUrl=${encodeURIComponent('https://example.test')}`,
                });

                document.body.innerHTML = documentHtml;
            });

            test('by showing auth login info and calling search', async () => {
                expect(document.getElementById('auth_login').style.display).toEqual('none');
                expect(document.getElementById('auth_login_url').textContent).toEqual('(?)');

                await gopassbridge.switchTab({ url: 'http://url.test', id: 'someid' });
                expect(document.getElementById('auth_login').style.display).toEqual('block');
                expect(document.getElementById('auth_login_url').textContent).toEqual('https://example.test');

                expect(searchMock.mock.calls).toEqual([]);
                expect(searchHostMock.mock.calls).toEqual([['https://example.test']]);
            });

            test('ignores authUrl if window location does not match the popup url of gopassbridge', async () => {
                getPopupUrlMock.mockImplementation(() => 'http://localhost.invalid/');

                await gopassbridge.switchTab({ url: 'http://url.test', id: 'someid' });
                expect(document.getElementById('auth_login').style.display).toEqual('none');
                expect(document.getElementById('auth_login_url').textContent).toEqual('(?)');

                expect(searchMock.mock.calls).toEqual([]);
                expect(searchHostMock.mock.calls).toEqual([['http://url.test']]);
            });

            test('ignores any other search parameter when authUrl is missing', async () => {
                jsdom.reconfigure({ url: 'http://localhost.test/?otherUrl=https://not.authUrl.test' });

                await gopassbridge.switchTab({ url: 'http://url.test', id: 'someid' });
                expect(document.getElementById('auth_login').style.display).toEqual('none');
                expect(document.getElementById('auth_login_url').textContent).toEqual('(?)');

                expect(global.search.mock.calls).toEqual([]);
                expect(global.searchHost.mock.calls).toEqual([['http://url.test']]);
            });
        });
    });
});
