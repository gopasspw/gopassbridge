'use strict';

function _processMessage(message, sender, _) {
    if (sender.tab) {
        throw new Error(
            `Background script received unexpected message ${JSON.stringify(message)} from content script.`
        );
    }

    const { entry, tab } = message;
    switch (message.type) {
        case 'LOGIN_TAB':
            return sendNativeAppMessage({ type: 'getLogin', entry: entry }).then(response => {
                if (response.error) {
                    throw new Error(response.error);
                }

                if (response.username === urlDomain(tab.url)) {
                    const msg = i18n.getMessage('couldNotDetermineUsernameMessage');
                    throw new Error(msg);
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
