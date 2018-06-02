'use strict';

function onLoginCredentialsDoCopyClipboard(message, response) {
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

function onLoginCredentialsDoLogin(response, tabId, url) {
    if (response.error) {
        setStatusText(response.error);
        return;
    }

    if (response.username === urlDomain(url)) {
        setStatusText(i18n.getMessage('couldNotDetermineUsernameMessage'));
        return;
    }

    browser.tabs.sendMessage(tabId, {
        type: 'FILL_LOGIN_FIELDS',
        login: response.username,
        password: response.password,
    });

    executeOnSetting(
        'submitafterfill',
        () => {
            browser.tabs.sendMessage(tabId, { type: 'TRY_LOGIN' });
            for (const popup of browser.extension.getViews({ type: 'popup' })) popup.close();
        },
        () => {
            for (const popup of browser.extension.getViews({ type: 'popup' })) popup.close();
        }
    );
}

function logAndDisplayError2(error) {
    console.log(error); //FIXME: display error somehow?
}

function processMessage(message, sender, sendResponse) {
    const { entry, tabId, url, copyOnly } = message;

    function handler(response) {
        if (copyOnly) onLoginCredentialsDoCopyClipboard(response);
        else onLoginCredentialsDoLogin(response, tabId, url);
    }

    sendNativeAppMessage({ type: 'getLogin', entry: entry }).then(handler, logAndDisplayError2);
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
