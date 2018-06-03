'use strict';

function onLoginCredentialsDoCopyClipboard(response, tabId) {
    browser.tabs.sendMessage(tabId, {
        type: 'COPY_PASSWORD',
        password: response.password,
    });
}

function onLoginCredentialsDoLogin(response, tabId, url) {
    if (response.username === urlDomain(url)) {
        logAndDisplayError(i18n.getMessage('couldNotDetermineUsernameMessage'), tabId);
        return;
    }

    browser.tabs.sendMessage(tabId, {
        type: 'FILL_LOGIN_FIELDS',
        login: response.username,
        password: response.password,
    });

    executeOnSetting('submitafterfill', () => {
        browser.tabs.sendMessage(tabId, { type: 'TRY_LOGIN' });
    });
}

function logAndDisplayError(error, tabId) {
    console.log(error);
    browser.tabs.sendMessage(tabId, {
        type: 'SHOW_ERROR',
        error: error,
    });
}

function processMessage(message, sender, sendResponse) {
    const { entry, tabId, url, copyOnly } = message;

    sendNativeAppMessage({ type: 'getLogin', entry: entry }).then(
        response => {
            if (copyOnly) onLoginCredentialsDoCopyClipboard(response, tabId);
            else onLoginCredentialsDoLogin(response, tabId, url);
        },
        error => {
            logAndDisplayError(error, tabId);
        }
    );
}

function initBackground() {
    browser.runtime.onMessage.addListener(processMessage);
}

initBackground();

window.tests = {
    background: {
        initBackground,
    },
};
