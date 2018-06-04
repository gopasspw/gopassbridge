'use strict';

let currentTab;

browser.tabs.query({ currentWindow: true, active: true }).then(tabs => switchTab(tabs[0]));

browser.tabs.onActivated.addListener(switchTab);

function switchTab(tab) {
    console.log('Switching to tab ' + tab.url);
    if (tab && tab.url && tab.id) {
        currentTab = tab;
        executeOnSetting('markfields', () => {
            browser.tabs.sendMessage(currentTab.id, { type: 'MARK_LOGIN_FIELDS' });
        });
        const tabUrl = urlDomain(currentTab.url);
        if (tabUrl) {
            return getLocalStorageKey(LAST_DOMAIN_SEARCH_PREFIX + tabUrl).then(value => {
                if (value) {
                    search(value).then(restoreDetailView);
                } else {
                    searchHost(tabUrl).then(restoreDetailView);
                }
            });
        } else {
            document.getElementById('results').innerHTML = '';
        }
    }
    return Promise.resolve();
}

window.tests = {
    gopassbridge: {
        switchTab,
        getCurrentTab: () => {
            return currentTab;
        },
    },
};
