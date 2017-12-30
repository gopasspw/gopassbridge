"use strict";

var currentTab;

var options = null;

getSyncStorage(function (result) {
    options = result;
}, function () {
    alert('Could not read config options');
});


browser.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    switchTab(tabs[0]);
});

browser.tabs.onActivated.addListener(switchTab);

function switchTab(tab) {
    console.log('Switching to tab ' + tab.url);
    if (tab && tab.url && tab.id) {
        currentTab = tab;
        executeOnSetting("markfields", function () {
            browser.tabs.sendMessage(currentTab.id, { type: 'MARK_LOGIN_FIELDS' });
        });
        searchTerm = urlDomain(currentTab.url);
        searchHost(searchTerm);
    }
}
