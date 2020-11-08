'use strict';

let currentAuthRequest = null;

function _processLoginTabMessage(entry, tab) {
    return sendNativeAppMessage({ type: 'getLogin', entry: entry }).then((response) => {
        if (response.error) {
            throw new Error(response.error);
        }

        if (response.username === urlDomain(tab.url)) {
            throw new Error(i18n.getMessage('couldNotDetermineUsernameMessage'));
        }

        return browser.tabs
            .sendMessage(tab.id, {
                type: 'FILL_LOGIN_FIELDS',
                login: response.username,
                password: response.password,
            })
            .then(() => {
                return executeOnSetting('submitafterfill', () => {
                    return browser.tabs.sendMessage(tab.id, { type: 'TRY_LOGIN' });
                });
            });
    });
}

function _waitForTabLoaded(tab) {
    return new Promise((resolve, reject) => {
        let timeout;
        const waitForCreated = (tabId, changeInfo) => {
            console.log('Tab ' + tab.id + ' changed ' + changeInfo);
            if (tabId === tab.id && changeInfo.status === 'complete') {
                browser.tabs.onUpdated.removeListener(waitForCreated);
                resolve(tab);
                clearTimeout(timeout);
            }
        };
        console.log('Status on initial tab load ' + tab.status + ' ' + tab.url);
        if (tab.status === 'complete' && tab.url && tab.url !== 'about:blank') {
            resolve(tab);
        } else {
            timeout = setTimeout(() => {
                browser.tabs.onUpdated.removeListener(waitForCreated);
                reject('Loading timed out');
            }, 10000);
            browser.tabs.onUpdated.addListener(waitForCreated);
        }
    });
}

function _openEntry(entry) {
    return sendNativeAppMessage({ type: 'getData', entry })
        .then((message) => {
            if (!message.url) {
                throw new Error(i18n.getMessage('noURLInEntry'));
            }
            return openURL(message.url);
        })
        .then(_waitForTabLoaded)
        .then((tab) => _processLoginTabMessage(entry, tab));
}

function _processMessage(message, sender, _) {
    console.log('Processing message', message.type, sender);

    if (sender.tab) {
        return _processTabMessage(message, sender.url);
    } else {
        return _processExtensionMessage(message);
    }
}

function _processTabMessage(message, senderUrl) {
    const { entry } = message;

    switch (message.type) {
        case 'LOGIN_TAB':
            return _tryToResolveCurrentAuthRequest(entry, senderUrl);
        default:
            throw new Error(
                `Background script received unexpected message ${JSON.stringify(
                    message
                )} from content script or popup window.`
            );
    }
}

function _processExtensionMessage(message) {
    const { entry, tab } = message;
    switch (message.type) {
        case 'LOGIN_TAB':
            return _processLoginTabMessage(entry, tab);

        case 'OPEN_TAB':
            return _openEntry(entry);

        default:
            throw new Error(`Background script received unexpected message ${JSON.stringify(message)} from extension`);
    }
}

function _showNotificationIfNoPopup(message) {
    const popups = browser.extension.getViews({ type: 'popup' });
    if (popups.length === 0 && !currentAuthRequest) {
        showNotificationOnSetting(message);
    }
}

function processMessageAndCatch(message, sender, sendResponse) {
    try {
        return _processMessage(message, sender, sendResponse).catch((error) => {
            _showNotificationIfNoPopup(error.message);
            throw error;
        });
    } catch (e) {
        _showNotificationIfNoPopup(e.message);
        return Promise.reject(e);
    }
}

/**
 * @param details
 * @param chromeOnlyAsyncCallback is necessary, because the polyfill does not handle this incompatibility:
 *              - https://github.com/mozilla/webextension-polyfill/issues/91
 *              - https://developer.chrome.com/extensions/webRequest#event-onAuthRequired
 * @returns {Promise} ignored by Chrome
 */
function _onAuthRequired(details, chromeOnlyAsyncCallback) {
    console.log('Received request with pending authentication', details);
    const popupUrl = getPopupUrl() + '?authUrl=' + encodeURIComponent(details.url);

    return new Promise((resolvePromise, _) => {
        const resolve = chromeOnlyAsyncCallback || resolvePromise;
        executeOnSetting(
            'handleauthrequests',
            () => {
                if (currentAuthRequest) {
                    showNotificationOnSetting(i18n.getMessage('cannotHandleMultipleAuthRequests'));
                    console.warn('Another authentication request is already in progress.');
                    resolve({});
                } else {
                    _openAuthRequestPopup(popupUrl, resolve);
                }
            },
            () => {
                console.log('Ignoring auth request because of disabled user setting');
                currentAuthRequest = null;
                resolve({});
            }
        );
    });
}

function _openAuthRequestPopup(popupUrl, resolutionCallback) {
    browser.windows
        .create({
            url: popupUrl,
            width: 450,
            left: 450,
            height: 280,
            top: 280,
            type: 'popup',
        })
        .then((popupWindow) => {
            console.log('Opened popup for auth request', popupWindow);

            function onPopupClose(windowId) {
                if (popupWindow.id === windowId) {
                    console.log('Fall back to native browser dialog after popup close.');
                    _resolveCurrentAuthRequest({ cancel: false }, popupUrl);
                }
            }

            currentAuthRequest = { resolve: resolutionCallback, popupUrl, onPopupClose };
            browser.windows.onRemoved.addListener(onPopupClose);
        });
}

function _tryToResolveCurrentAuthRequest(entry, senderUrl) {
    return sendNativeAppMessage({ type: 'getLogin', entry: entry }).then((response) => {
        if (response.error) {
            throw new Error(response.error);
        }

        _resolveCurrentAuthRequest(
            {
                authCredentials: {
                    username: response.username,
                    password: response.password,
                },
            },
            senderUrl
        );
    });
}

function _resolveCurrentAuthRequest(result, senderUrl) {
    if (currentAuthRequest) {
        // Ensure that the popup matches the expected URL, so we don't accidentally send credentials to the wrong domain
        if (new URL(currentAuthRequest.popupUrl).href === new URL(senderUrl).href) {
            console.log('Resolving current auth request', senderUrl);
            currentAuthRequest.resolve(result);
            browser.windows.onRemoved.removeListener(currentAuthRequest.onPopupClose);
            currentAuthRequest = null;
        } else {
            console.warn('Could not resolve auth request due to URL mismatch', currentAuthRequest.popupUrl, senderUrl);
        }
    } else {
        console.warn('Tried to resolve auth request, but no auth request is currently pending.', senderUrl);
    }
}

function initBackground() {
    browser.runtime.onMessage.addListener(processMessageAndCatch);

    browser.webRequest.onAuthRequired.addListener(
        _onAuthRequired,
        { urls: ['<all_urls>'] },
        isChrome() ? ['asyncBlocking'] : ['blocking']
    );
}

initBackground();

window.tests = {
    background: {
        initBackground,
        processMessageAndCatch,
    },
};
