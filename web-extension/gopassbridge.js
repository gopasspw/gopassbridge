'use strict';

let currentPageUrl;
let currentTabId;
let currentTabFavIconUrl;

browser.tabs.query({ currentWindow: true, active: true }).then(tabs => switchTab(tabs[0]));

browser.tabs.onActivated.addListener(switchTab);

function switchTab(tab) {
    console.log('Switching to tab', tab);

    const isContentTab = tab && tab.url && tab.id;

    if (isContentTab) {
        currentTabId = tab.id;
        currentTabFavIconUrl = tab.favIconUrl;
    }

    const authUrl = _parseAuthUrl();
    if (authUrl) {
        document.getElementById('auth_login').style.display = 'block';
        document.getElementById('auth_login_url').textContent = authUrl;
        return _handleUrlSearch(authUrl);
    }

    if (isContentTab) {
        executeOnSetting('markfields', () => {
            browser.tabs.sendMessage(currentTabId, { type: 'MARK_LOGIN_FIELDS' });
        });
        return _handleUrlSearch(tab.url);
    }

    return Promise.resolve();
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
}

window.tests = {
    gopassbridge: {
        switchTab,
        getCurrentTab: () => ({ currentPageUrl, currentTabId, currentTabFavIconUrl }),
    },
};
