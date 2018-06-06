'use strict';

function _processMessage(message, sender, sendResponse) {
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
                            browser.tabs.sendMessage(tab.id, { type: 'TRY_LOGIN' });
                        });
                    });
            });

        default:
            throw new Error(`Background script received unexpected message ${JSON.stringify(message)} from extension`);
    }
}

function processMessageAndCatch(message, sender, sendResponse) {
    return _processMessage(message, sender, sendResponse).catch(error => {
        const popups = browser.extension.getViews({ type: 'popup' });
        if (popups.length === 0) showNotificationOnSetting(error.message);
        throw error;
    });
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
