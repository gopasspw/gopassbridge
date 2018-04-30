'use strict';

let searching, searchedUrl, searchTerm;

const input = document.getElementById('search_input');

input.addEventListener('input', onInputEvent);
input.focus();

function faviconUrl() {
    if (currentTab && currentTab.favIconUrl && currentTab.favIconUrl.indexOf(urlDomain(currentTab.url)) > -1) {
        return currentTab.favIconUrl;
    }

    return 'icons/si-glyph-key-2.svg';
}

function onInputEvent() {
    const input = document.getElementById('search_input');
    const currentHost = urlDomain(currentTab.url);
    if (input.value.length) {
        search(input.value);
    } else {
        searchHost(currentHost);
    }
}

function search(query) {
    if (searching) {
        console.log('Search still in progress, skipping query ' + query);
        return;
    }
    searchTerm = query;
    input.value = query;
    if (!query) {
        console.log('Will not search for empty string');
        return;
    }
    console.log('Searching for string ' + query);
    searching = true;
    searchedUrl = currentTab.url;
    sendNativeMessage({ type: 'query', query: query }, onSearchResults, onSearchError);
}

function searchHost(term) {
    if (searching) {
        console.log('Search still in progress, skipping query ' + term);
        return;
    }
    removeLocalStorage(LAST_DOMAIN_SEARCH_PREFIX + term);
    searchTerm = term;
    input.value = '';
    console.log('Searching for host ' + term);
    searching = true;
    searchedUrl = currentTab.url;
    sendNativeMessage({ type: 'queryHost', host: term }, onSearchResults, onSearchError);
}

function onSearchResults(response) {
    const results = document.getElementById('results');

    if (response.error) {
        setStatusText(response.error);
        return;
    }
    if (currentTab.url !== searchedUrl) {
        console.log('Result is not from the same URL as we were searching for, ignoring');
    }
    if (response.length) {
        setLocalStorageKey(LAST_DOMAIN_SEARCH_PREFIX + urlDomain(currentTab.url), input.value);
        results.innerHTML = '';
        response.forEach(result => {
            results.appendChild(
                createButtonWithCallback(
                    'login',
                    result,
                    "background-image: url('" + faviconUrl() + "')",
                    resultSelected
                )
            );
        });
    } else {
        removeLocalStorage(LAST_DOMAIN_SEARCH_PREFIX + urlDomain(currentTab.url));
        setStatusText(i18n.getMessage('noResultsForMessage') + ' ' + searchTerm);
        results.appendChild(
            createButtonWithCallback('login', i18n.getMessage('createNewEntryButtonText'), null, createNewDialog)
        );
    }
    searching = false;
}

function setStatusText(text) {
    const results = document.getElementById('results');
    const element = document.createElement('div');
    element.textContent = text;
    element.className = 'status-text';
    results.innerHTML = '';
    results.appendChild(element);
}

function onSearchError(error) {
    setStatusText(error.message);
}

function resultSelected(event) {
    const value = event.target.innerText;
    const message = { type: 'getLogin', entry: value };
    if (event.shiftKey) {
        sendNativeMessage(message, onLoginCredentialsDoCopyClipboard, onLoginCredentialError);
    } else {
        sendNativeMessage(message, onLoginCredentialsDoLogin, onLoginCredentialError);
    }
}

function onLoginCredentialsDoCopyClipboard(response) {
    const content = document.getElementById('content');

    if (response.error) {
        setStatusText(response.error);
        return;
    }
    const hiddenpass = document.createElement('span');
    hiddenpass.textContent = response.password;
    content.appendChild(hiddenpass);
    const tempinput = document.createElement('input');
    tempinput.value = response.password;
    content.appendChild(tempinput);
    tempinput.select();
    document.execCommand('copy');
    content.innerHTML = `<div class="copied">${i18n.getMessage('copiedToClipboardMessage')}</div>`;
    setTimeout(window.close, 1000);
}

function onLoginCredentialsDoLogin(response) {
    if (response.error) {
        setStatusText(response.error);
        return;
    }

    if (response.username === urlDomain(currentTab.url)) {
        setStatusText(i18n.getMessage('couldNotDetermineUsernameMessage'));
        return;
    }

    browser.tabs.sendMessage(currentTab.id, {
        type: 'FILL_LOGIN_FIELDS',
        login: response.username,
        password: response.password,
    });

    executeOnSetting(
        'submitafterfill',
        function() {
            browser.tabs.sendMessage(currentTab.id, { type: 'TRY_LOGIN' });
            window.close();
        },
        function() {
            window.close();
        }
    );
}

function onLoginCredentialError(error) {
    alert(error.message);
    window.close();
}
