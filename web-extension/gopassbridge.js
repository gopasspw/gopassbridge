"use strict";

var browser = browser || chrome;
var app = "gopassbridge";

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
        browser.tabs.sendMessage(currentTab.id, { type: 'MARK_LOGIN_FIELDS' });
        searchTerm = urlDomain(currentTab.url);
        search(searchTerm);
    }
}

function onInputEvent(event) {
    if (event.inputType && input.value.length) {
        searchTerm = input.value;
        search(searchTerm);
    } else {
        searchTerm = urlDomain(currentTab.url);
        search(searchTerm);
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
    console.log('Searching for ' + query);
    searching = true;
    searchedUrl = currentTab.url;
    var message = { "type": "query", "query": query };
    sendNativeMessage(app, message, onSearchResults, onSearchError);
}

function sendNativeMessage(app, message, onResult, onError) {
    function onChromeResults(response) {
        if (response) {
            return onResult(response);
        }
        onError(browser.runtime.lastError);
    }

    if (chrome) {
        browser.runtime.sendNativeMessage(app, message, onChromeResults);
    } else {
        var sending = browser.runtime.sendNativeMessage(app, message);
        sending.then(onResult, onError);
    }
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
        setStatusText('no results for <b>' + searchTerm + '</b>');
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
    browser.tabs.sendMessage(currentTab.id, { type: 'TRY_LOGIN' });
    window.close();
}

function onLoginCredentialError(error) {
    alert(error.message);
    window.close();
}

