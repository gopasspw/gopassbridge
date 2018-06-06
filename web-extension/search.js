'use strict';

let searching, searchedUrl, searchTerm;

function initSearch() {
    const input = document.getElementById('search_input');

    input.addEventListener('input', _onSearchInputEvent);
    input.addEventListener('keypress', _onSearchKeypressEvent);

    setTimeout(() => {
        input.focus();
    }, 200);
}

function _onSearchKeypressEvent(event) {
    if (event.keyCode === 13) {
        const elements = document.getElementsByClassName('login');
        if (elements.length === 1) {
            _onResultSelected(event, elements[0]);
        }
        event.preventDefault();
    }
}

function _onSearchInputEvent() {
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
    armSpinnerTimeout();
    searchTerm = query;
    document.getElementById('search_input').value = query;
    if (!query) {
        console.log('Will not search for empty string');
        return;
    }
    console.log('Searching for string ' + query);
    searching = true;
    searchedUrl = currentTab.url;
    return sendNativeAppMessage({ type: 'query', query: query }).then(
        result => _onSearchResults(result, false),
        logAndDisplayError
    );
}

function searchHost(term) {
    if (searching) {
        console.log('Search still in progress, skipping query ' + term);
        return;
    }
    armSpinnerTimeout();
    browser.storage.local.remove(LAST_DOMAIN_SEARCH_PREFIX + term);
    searchTerm = term;
    document.getElementById('search_input').value = '';
    console.log('Searching for host ' + term);
    searching = true;
    searchedUrl = currentTab.url;
    return sendNativeAppMessage({ type: 'queryHost', host: term }).then(
        result => _onSearchResults(result, true),
        logAndDisplayError
    );
}

function _faviconUrl() {
    if (currentTab && currentTab.favIconUrl && currentTab.favIconUrl.indexOf(urlDomain(currentTab.url)) > -1) {
        return currentTab.favIconUrl;
    }

    return 'icons/si-glyph-key-2.svg';
}

function _onSearchResults(response, isHostQuery) {
    const results = document.getElementById('results');
    clearTimeout(spinnerTimeout);
    if (response.error) {
        setStatusText(response.error);
        return;
    }
    if (currentTab.url !== searchedUrl) {
        console.log('Result is not from the same URL as we were searching for, ignoring');
    }
    if (response.length) {
        setLocalStorageKey(
            LAST_DOMAIN_SEARCH_PREFIX + urlDomain(currentTab.url),
            document.getElementById('search_input').value
        );
        results.innerHTML = '';
        response.forEach(result => {
            results.appendChild(
                createButtonWithCallback(
                    'login',
                    result,
                    `background-image: url('${isHostQuery ? _faviconUrl() : 'icons/si-glyph-key-2.svg'}')`,
                    _onResultSelected
                )
            );
        });
    } else {
        browser.storage.local.remove(LAST_DOMAIN_SEARCH_PREFIX + urlDomain(currentTab.url));
        setStatusText(i18n.getMessage('noResultsForMessage') + ' ' + searchTerm);
        results.appendChild(
            createButtonWithCallback(
                'login',
                i18n.getMessage('createNewEntryButtonText'),
                null,
                switchToCreateNewDialog
            )
        );
    }
    searching = false;
}

function _onResultSelected(event, element) {
    element = element || event.target;
    const value = element.innerText;
    if (event.altKey) {
        sendNativeAppMessage({ type: 'getData', entry: value }).then(
            message => onEntryData(element, message),
            logAndDisplayError
        );
    } else if (event.shiftKey) {
        sendNativeAppMessage({ type: 'getLogin', entry: value }).then(
            _onLoginCredentialsDoCopyClipboard,
            logAndDisplayError
        );
    } else {
        browser.runtime
            .sendMessage({ type: 'LOGIN_TAB', entry: value, tab: { id: currentTab.id, url: currentTab.url } })
            .then(_onLoginCredentialsDidLogin, logAndDisplayError);
    }
}

function _onLoginCredentialsDoCopyClipboard(response) {
    if (response.error) {
        setStatusText(response.error);
        return;
    }

    copyToClipboard(response.password);

    const content = document.getElementById('content');
    content.innerHTML = `<div class="copied">${i18n.getMessage('copiedToClipboardMessage')}</div>`;
    setTimeout(window.close, 1000);
}

function _onLoginCredentialsDidLogin(response) {
    if (response && response.error) {
        setStatusText(response.error);
        return;
    }
    window.close();
}

initSearch();

window.tests = {
    search: {
        initSearch,
        _onSearchInputEvent,
        _onSearchKeypressEvent,
    },
};
