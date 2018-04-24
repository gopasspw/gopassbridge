'use strict';

var currentTab;

var options = null;

var input = document.getElementById('search_input');

getSyncStorage(
    function(result) {
        options = result;
    },
    function() {
        alert('Could not read config options');
    }
);

browser.tabs.query({ currentWindow: true, active: true }, function(tabs) {
    switchTab(tabs[0]);
});

browser.tabs.onActivated.addListener(switchTab);

function switchTab(tab) {
    console.log('Switching to tab ' + tab.url);
    if (tab && tab.url && tab.id) {
        currentTab = tab;
        executeOnSetting('markfields', function() {
            browser.tabs.sendMessage(currentTab.id, { type: 'MARK_LOGIN_FIELDS' });
        });
        var term = urlDomain(currentTab.url);
        if (term) {
            getLocalStorage(LAST_DOMAIN_SEARCH_PREFIX + term, function(values) {
                var value = values[LAST_DOMAIN_SEARCH_PREFIX + term];
                if (value) {
                    search(value);
                } else {
                    searchHost(term);
                }
            });
        }
    }
}
