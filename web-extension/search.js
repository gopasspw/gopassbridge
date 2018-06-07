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
            _onEntryAction(event, elements[0]);
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

function search(term) {
    if (searching) {
        console.log('Search still in progress, skipping query ' + term);
        return;
    }

    document.getElementById('search_input').value = term;
    if (!term) {
        console.log('Will not search for empty string');
        return;
    }

    console.log('Searching for string ' + term);
    return _doSearch(term);
}

function searchHost(host) {
    if (searching) {
        console.log('Search still in progress, skipping query ' + host);
        return;
    }

    browser.storage.local.remove(LAST_DOMAIN_SEARCH_PREFIX + host);
    document.getElementById('search_input').value = '';

    console.log('Searching for host ' + host);
    return _doSearch(host, true);
}

function _doSearch(term, queryHost) {
    searchTerm = term;
    armSpinnerTimeout();
    searching = true;
    searchedUrl = currentTab.url;
    return sendNativeAppMessage({ type: queryHost ? 'queryHost' : 'query', query: term }).then(
        result => _onSearchResults(result, false),
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
            const entry = document.createElement('div');
            entry.classList.add('entry');
            entry.appendChild(
                createButtonWithCallback(
                    'login',
                    result,
                    `background-image: url('${isHostQuery ? _faviconUrl() : 'icons/si-glyph-key-2.svg'}')`,
                    _onEntryAction
                )
            );
            entry.appendChild(createButtonWithCallback('copy', result, null, event => _onEntryCopy(event.target)));
            entry.appendChild(
                createButtonWithCallback('details', result, null, event => _onEntryDetails(event.target))
            );
            results.appendChild(entry);
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

function _onEntryAction(event, element) {
    if (event.altKey) {
        _onEntryDetails(element || event.target);
    } else if (event.shiftKey) {
        _onEntryCopy(element || event.target);
    } else {
        const value = (element || event.target).innerText;
        browser.runtime
            .sendMessage({ type: 'LOGIN_TAB', entry: value, tab: { id: currentTab.id, url: currentTab.url } })
            .then(_onLoginCredentialsDidLogin, logAndDisplayError);
    }
}

function _onEntryCopy(element) {
    sendNativeAppMessage({ type: 'getLogin', entry: element.innerText }).then(
        _onLoginCredentialsDoCopyClipboard,
        logAndDisplayError
    );
}

function _onEntryDetails(element) {
    sendNativeAppMessage({ type: 'getData', entry: element.innerText }).then(
        message => onEntryData(element, message),
        logAndDisplayError
    );
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
