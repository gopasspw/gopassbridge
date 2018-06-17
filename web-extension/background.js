'use strict';

function _processLoginTabMessage(entry, tab) {
    return sendNativeAppMessage({ type: 'getLogin', entry: entry }).then(response => {
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
        const timeout = setTimeout(() => reject('Loading timed out'), 10000);
        const waitForCreated = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === 'complete') {
                browser.tabs.onUpdated.removeListener(waitForCreated);
                resolve(tab);
                clearTimeout(timeout);
            }
        };
        if (tab.status === 'complete') {
            clearTimeout(timeout);
            resolve(tab);
        } else {
            browser.tabs.onUpdated.addListener(waitForCreated);
        }
    });
}

function _openEntry(entry) {
    return sendNativeAppMessage({ type: 'getData', entry })
        .then(message => {
            if (!message.url) {
                throw new Error(i18n.getMessage('noURLInEntry'));
            }
            return browser.tabs.create({ url: message.url });
        })
        .then(_waitForTabLoaded)
        .then(tab => {
            return _processLoginTabMessage(entry, tab);
        });
}

function _processMessage(message, sender, _) {
    if (sender.tab) {
        throw new Error(
            `Background script received unexpected message ${JSON.stringify(message)} from content script.`
        );
    }

    const { entry, tab } = message;
    switch (message.type) {
        case 'LOGIN_TAB':
            return _processLoginTabMessage(entry, tab);

        // Does not work on first invocation in firefox due to bug https://bugzilla.mozilla.org/show_bug.cgi?id=1466092
        case 'OPEN_TAB':
            return _openEntry(entry);

        default:
            throw new Error(`Background script received unexpected message ${JSON.stringify(message)} from extension`);
    }
}

function _showNotificationIfNoPopup(message) {
    const popups = browser.extension.getViews({ type: 'popup' });
    if (popups.length === 0) {
        showNotificationOnSetting(message);
    }
}

function processMessageAndCatch(message, sender, sendResponse) {
    try {
        return _processMessage(message, sender, sendResponse).catch(error => {
            _showNotificationIfNoPopup(error.message);
            throw error;
        });
    } catch (e) {
        _showNotificationIfNoPopup(e.message);
        return Promise.reject(e);
    }
}

function initBackground() {
    browser.runtime.onMessage.addListener(processMessageAndCatch);
}

initBackground();

window.tests = {
    background: {
        initBackground,
        processMessageAndCatch,
    },
};
