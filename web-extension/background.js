'use strict';

function processMessage(message, sender, sendResponse) {
    const { entry, tabId, url, copyOnly } = message;

    return sendNativeAppMessage({ type: 'getLogin', entry: entry })
        .then(response => {
            if (response.error) throw new Error(response.error);
            else if (response.username === urlDomain(url))
                throw new Error(i18n.getMessage('couldNotDetermineUsernameMessage'));

            if (copyOnly) return response;
            else
                return browser.tabs.sendMessage(tabId, {
                    type: 'FILL_LOGIN_FIELDS',
                    login: response.username,
                    password: response.password,
                });
        })
        .catch(error => {
            const popups = browser.extension.getViews({ type: 'popup' });
            if (popups.length === 0) showNotificationOnSetting(error.message);
            throw error;
        });
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
