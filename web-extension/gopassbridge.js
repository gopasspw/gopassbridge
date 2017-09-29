"use strict";

var app = "com.justwatch.gopass";

var input = document.getElementById("search_input");
var results = document.getElementById("results");
var searching, currentTab, searchedUrl, searchTerm;

input.addEventListener("input", onInputEvent);

browser.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    switchTab(tabs[0]);
});
browser.tabs.onActivated.addListener(switchTab);

function urlDomain(urlString) {
    var a = document.createElement('a');
    a.href = urlString;
    return a.hostname;
}

function executeSetting(setting, trueCallback, falseCallback) {
    function onError(error) {
        console.log(error);
    }
    getSyncStorage(function (result) {
        if (result[setting]) {
            if (trueCallback) trueCallback();
        } else {
            if (falseCallback) falseCallback();
        }
    }, onError);
}

function faviconUrl() {
    if (currentTab && currentTab.favIconUrl && currentTab.favIconUrl.indexOf(urlDomain(currentTab.url)) > -1) {
        return currentTab.favIconUrl;
    }

    return 'icons/si-glyph-key-2.svg';
}

function switchTab(tab) {
    console.log('Switching to tab ' + tab.url);
    if (tab && tab.url && tab.id) {
        currentTab = tab;
        executeSetting("markfields", function () {
            browser.tabs.sendMessage(currentTab.id, { type: 'MARK_LOGIN_FIELDS' });
        });
        searchTerm = urlDomain(currentTab.url);
        searchHost(searchTerm);
    }
}

function onInputEvent(event) {
    if (input.value.length) {
        searchTerm = input.value;
        search(searchTerm);
    } else {
        searchTerm = urlDomain(currentTab.url);
        searchHost(searchTerm);
    }
}

function search(query) {
    if (searching) {
        console.log('Search still in progress, skipping query ' + query);
        return;
    }
    if (!query) {
        console.log('Will not search for empty string');
        return;
    }
    console.log('Searching for string ' + query);
    searching = true;
    searchedUrl = currentTab.url;
    var message = { "type": "query", "query": query };
    sendNativeMessage(app, message, onSearchResults, onSearchError);
}

function searchHost(searchTerm) {
    if (searching) {
        console.log('Search still in progress, skipping query ' + searchTerm);
        return;
    }
    console.log('Searching for host ' + searchTerm);
    searching = true;
    searchedUrl = currentTab.url;
    var message = { "type": "queryHost", "host": searchTerm };
    sendNativeMessage(app, message, onSearchResults, onSearchError);
}

function onSearchResults(response) {
    if (response.error) {
        setStatusText(response.error);
        return;
    }
    if (currentTab.url !== searchedUrl) {
        console.log('Result is not from the same URL as we were searching for, ignoring');
    }
    if (response.length) {
        results.innerHTML = '';
        response.forEach(function (result) {
            var element = document.createElement('button');
            element.className = 'login';
            element.textContent = result;
            element.style = 'background-image: url(\'' + faviconUrl() + '\')';
            element.addEventListener("click", resultSelected);
            results.appendChild(element);
        });

    } else {
        setStatusText('no results for ' + searchTerm);
    }
    searching = false;
}

function setStatusText(text) {
    var element = document.createElement('div');
    element.textContent = text;
    element.className = 'status-text';
    results.innerHTML = '';
    results.appendChild(element);
}

function onSearchError(error) {
    setStatusText(error.message);
}

function resultSelected(event) {
    var value = event.target.innerText;
    var message = { "type": "getLogin", "entry": value };
    sendNativeMessage(app, message, onLoginCredentials, onLoginCredentialError);
}

function onLoginCredentials(response) {
    if (response.error) {
        setStatusText(response.error);
        return;
    }
    browser.tabs.sendMessage(currentTab.id, { type: 'FILL_LOGIN_FIELDS', login: response.username, password: response.password });
    executeSetting("submitafterfill", function () {
        browser.tabs.sendMessage(currentTab.id, { type: 'TRY_LOGIN' });
        window.close();
    }, function () {
        window.close();
    });
}

function onLoginCredentialError(error) {
    alert(error.message);
    window.close();
}

