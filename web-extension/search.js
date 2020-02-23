'use strict';

let searching, searchedUrl, searchTerm, queuedSearch;

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
    if (input.value.length) {
        search(input.value);
    } else {
        const currentHost = urlDomain(currentPageUrl);
        searchHost(currentHost);
    }
}

function _queueSearch(term, queryHost) {
    console.log('You type fast, queuing search for ' + term);
    queuedSearch = () => {
        console.log('Starting search for ' + term);
        return _doSearch(term, queryHost);
    };
    return searching.then(() => {
        if (queuedSearch) {
            console.log('Running queued search for ' + term);
            const searchToExecute = queuedSearch;
            queuedSearch = false;
            return searchToExecute();
        }
        console.log(`Queued search ${term} already started`);
    });
}

function _doSearch(term, queryHost) {
    if (!term) {
        console.log('Will not search for empty string');
        return Promise.resolve();
    }

    if (searching) {
        return _queueSearch(term, queryHost);
    }

    searchTerm = term;
    armSpinnerTimeout();
    searchedUrl = currentPageUrl;
    searching = new Promise((resolve, reject) => {
        const message = {
            type: queryHost ? 'queryHost' : 'query',
        };
        message[queryHost ? 'host' : 'query'] = term;
        return sendNativeAppMessage(message)
            .then(result => _onSearchResults(result, queryHost), logAndDisplayError)
            .then(resolve, reject);
    });
    return searching;
}

function search(term) {
    document.getElementById('search_input').value = term;

    console.log('Searching for string ' + term);
    return _doSearch(term);
}

function searchHost(host) {
    browser.storage.local.remove(LAST_DOMAIN_SEARCH_PREFIX + host);
    document.getElementById('search_input').value = '';

    console.log('Searching for host ' + host);
    return _doSearch(host, true);
}

function _faviconUrl() {
    if (currentTabFavIconUrl && currentTabFavIconUrl.indexOf(urlDomain(currentPageUrl)) > -1) {
        return currentTabFavIconUrl;
    }

    return 'icons/si-glyph-key-2.svg';
}

function _displaySearchResults(response, isHostQuery) {
    const results = document.getElementById('results');
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
        entry.appendChild(createButtonWithCallback('open', result, null, event => _onEntryOpen(event.target)));
        entry.appendChild(createButtonWithCallback('copy', result, null, event => _onEntryCopy(event.target)));
        entry.appendChild(createButtonWithCallback('details', result, null, event => _onEntryDetails(event.target)));
        results.appendChild(entry);
    });
}

function _displayNoResults() {
    const results = document.getElementById('results');
    setStatusText(i18n.getMessage('noResultsForMessage') + ' ' + searchTerm);
    results.appendChild(
        createButtonWithCallback('login', i18n.getMessage('createNewEntryButtonText'), null, switchToCreateNewDialog)
    );
}

function _onSearchResults(response, isHostQuery) {
    try {
        if (response.error) {
            setStatusText(response.error);
        } else if (currentPageUrl !== searchedUrl) {
            console.log('Result is not from the same URL as we were searching for, ignoring');
        } else if (response.length) {
            setLocalStorageKey(
                LAST_DOMAIN_SEARCH_PREFIX + urlDomain(currentPageUrl),
                document.getElementById('search_input').value
            );
            // This is a workaround for gopass issue #1166 (windows only)
            if (window.navigator.userAgent.toLocaleLowerCase().includes('windows')) {
                _displaySearchResults(
                    response.map(itm => itm.replace(/\\/g, '/')),
                    isHostQuery
                );
            } else {
                _displaySearchResults(response, isHostQuery);
            }
        } else {
            browser.storage.local.remove(LAST_DOMAIN_SEARCH_PREFIX + urlDomain(currentPageUrl));
            _displayNoResults();
        }
    } finally {
        // As long as everything in the try block happens synchronously, we can just reset the search state here.
        clearTimeout(spinnerTimeout);
        searching = false;
    }
}

function _onEntryAction(event, element) {
    if (event.altKey) {
        _onEntryDetails(element || event.target);
    } else if (event.shiftKey) {
        _onEntryCopy(element || event.target);
    } else if (event.ctrlKey) {
        _onEntryOpen(element || event.target);
    } else {
        const value = (element || event.target).innerText;
        browser.runtime
            .sendMessage({ type: 'LOGIN_TAB', entry: value, tab: { id: currentTabId, url: currentPageUrl } })
            .then(_onLoginCredentialsDidLogin, logAndDisplayError);
    }
}

function _onEntryCopy(element) {
    sendNativeAppMessage({ type: 'getLogin', entry: element.innerText }).then(
        _onLoginCredentialsDoCopyClipboard,
        logAndDisplayError
    );
}

function _onEntryOpen(element) {
    browser.runtime
        .sendMessage({ type: 'OPEN_TAB', entry: element.innerText })
        .then(_onLoginCredentialsDidLogin, logAndDisplayError);
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
        search,
        searchHost,
        _onEntryAction,
        _onSearchResults,
    },
};
