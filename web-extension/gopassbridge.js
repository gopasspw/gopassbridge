'use strict';

let currentPageUrl;
let currentTabId;
let currentTabUrl;
let currentTabFavIconUrl;

browser.tabs.query({ currentWindow: true, active: true }).then(tabs => {
    browser.tabs.executeScript(tabs[0].id, { file: '/vendor/browser-polyfill.js' }).then(() => {
        browser.tabs.executeScript(tabs[0].id, { file: '/generic.js' }).then(() => {
            browser.tabs.executeScript(tabs[0].id, { file: '/content.js' }).then(() => {
                switchTab(tabs[0]);
            });
        });
    });
});

function switchTab(tab) {
    console.log('Switching to tab', tab);

    const isContentTab = tab && tab.url && tab.id && tab.url.startsWith('http');

    if (isContentTab) {
        currentTabUrl = tab.url;
        currentTabId = tab.id;
        currentTabFavIconUrl = tab.favIconUrl;
    }
    console.log('Starting version check');
    return checkVersion().then(() => {
        console.log('Version is safe - continuing tab switching');
        const authUrl = _parseAuthUrl();
        if (authUrl) {
            document.getElementById('auth_login').style.display = 'block';
            document.getElementById('auth_login_url').textContent = authUrl;
            return _handleUrlSearch(authUrl).catch(logAndDisplayError);
        }

        if (isContentTab) {
            executeOnSetting('markfields', () => {
                browser.tabs.sendMessage(currentTabId, { type: 'MARK_LOGIN_FIELDS' });
            });
            return _handleUrlSearch(currentTabUrl).catch(logAndDisplayError);
        }

        // clear spinner
        document.getElementById('results').innerHTML = '';
        return Promise.resolve();
    }, logAndDisplayError);
}

function _parseAuthUrl() {
    if (window && window.location.origin + window.location.pathname === getPopupUrl()) {
        const authUrlEncoded = new URLSearchParams(window.location.search).get('authUrl');
        if (authUrlEncoded) {
            return decodeURIComponent(authUrlEncoded);
        }
    }
    return null;
}

function _handleUrlSearch(url) {
    currentPageUrl = url;

    const searchUrl = urlDomain(url);
    if (searchUrl) {
        return getLocalStorageKey(LAST_DOMAIN_SEARCH_PREFIX + searchUrl).then(value => {
            if (value) {
                return search(value).then(restoreDetailView);
            } else {
                return searchHost(searchUrl).then(restoreDetailView);
            }
        });
    } else {
        document.getElementById('results').innerHTML = '';
    }
    return Promise.resolve();
}

window.tests = {
    gopassbridge: {
        switchTab,
        getCurrentTab: () => ({ currentPageUrl, currentTabId, currentTabFavIconUrl }),
    },
};
