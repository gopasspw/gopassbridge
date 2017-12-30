"use strict";

var searching, searchedUrl, searchTerm;

var input = document.getElementById("search_input");

input.addEventListener("input", onInputEvent);
input.focus();

function faviconUrl() {
    if (currentTab && currentTab.favIconUrl && currentTab.favIconUrl.indexOf(urlDomain(currentTab.url)) > -1) {
        return currentTab.favIconUrl;
    }

    return 'icons/si-glyph-key-2.svg';
}

function onInputEvent(event) {
    var input = document.getElementById("search_input");

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
    sendNativeMessage(message, onSearchResults, onSearchError);
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
    sendNativeMessage(message, onSearchResults, onSearchError);
}

function onSearchResults(response) {
    var results = document.getElementById("results");

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
            results.appendChild(createButtonWithCallback(
                'login', result, 'background-image: url(\'' + faviconUrl() + '\')', resultSelected));
        });
    } else {
        setStatusText('no results for ' + searchTerm);
        results.appendChild(createButtonWithCallback('login', 'create new login entry', null, createNewDialog));
    }
    searching = false;
}

function setStatusText(text) {
    var results = document.getElementById("results");
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
    var message;
    if (event.shiftKey) {
        message = { "type": "getLogin", "entry": value };
        sendNativeMessage(message, onLoginCredentialsDoCopyClipboard, onLoginCredentialError);
    } else {
        message = { "type": "getLogin", "entry": value };
        sendNativeMessage(message, onLoginCredentialsDoLogin, onLoginCredentialError);
    }
}

function onLoginCredentialsDoCopyClipboard(response) {
    var content = document.getElementById("content");

    if (response.error) {
        setStatusText(response.error);
        return;
    }
    var hiddenpass = document.createElement('span');
    hiddenpass.textContent = response.password;
    content.appendChild(hiddenpass);
    var tempinput = document.createElement('input');
    tempinput.value = response.password;
    content.appendChild(tempinput);
    tempinput.select();
    document.execCommand("copy");
    content.innerHTML = "<div class=\"copied\">copied to clipboard</div>";
    setTimeout(window.close, 1000);
}

function onLoginCredentialsDoLogin(response) {
    if (response.error) {
        setStatusText(response.error);
        return;
    }
    browser.tabs.sendMessage(currentTab.id, { type: 'FILL_LOGIN_FIELDS', login: response.username, password: response.password });
    executeOnSetting("submitafterfill", function () {
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

