'use strict';

const DEFAULT_SETTINGS = {
    markfields: true,
    sendnotifications: true,
    submitafterfill: true,
    handleauthrequests: true,
    defaultfolder: 'Account',
    omitkeys: 'otpauth,totp',
    defaultpasswordlength: 24,
    appendlogintoname: false,
};

globalThis.LAST_DOMAIN_SEARCH_PREFIX = 'LAST_DOMAIN_SEARCH_';
globalThis.LAST_DETAIL_VIEW_PREFIX = 'LAST_DETAIL_VIEW_';

const REQUIRED_GOPASS_VERSION = [1, 8, 5];

let versionOK;

function checkVersion() {
    if (versionOK) {
        return Promise.resolve();
    }

    return sendNativeAppMessage({ type: 'getVersion' }).then((response) => {
        const major = REQUIRED_GOPASS_VERSION[0];
        const minor = REQUIRED_GOPASS_VERSION[1];
        const patch = REQUIRED_GOPASS_VERSION[2];
        if (
            response.major > major ||
            (response.major === major &&
                (response.minor > minor || (response.minor === minor && response.patch >= patch)))
        ) {
            versionOK = true;
            console.log('Version is OK');
            return Promise.resolve();
        }
        console.log('Version is not OK');
        return Promise.reject(
            new Error(`Please update gopass to version ${REQUIRED_GOPASS_VERSION.join('.')} or newer.`)
        );
    });
}

const URL_PATTERN = /^https?:\/\//i;

function getSettings() {
    return browser.storage.sync.get(DEFAULT_SETTINGS);
}

function sendNativeAppMessage(message) {
    const app = 'com.justwatch.gopass';
    console.log(JSON.stringify(message));
    return browser.runtime.sendNativeMessage(app, message);
}

function logError(error) {
    console.log(error);
}

function makeAbsolute(string) {
    if (!URL_PATTERN.test(string)) {
        return `https://${string}`;
    }
    return string;
}

function openURL(url) {
    return browser.tabs.create({ url: makeAbsolute(url) });
}

function openURLOnEvent(event) {
    event.preventDefault();
    openURL(event.target.href);
}

function executeOnSetting(setting, trueCallback, falseCallback) {
    return getSettings().then((result) => {
        if (result[setting]) {
            if (trueCallback) trueCallback();
        } else {
            if (falseCallback) falseCallback();
        }
    }, logError);
}

function createButtonWithCallback(attributes, callback) {
    const element = document.createElement('button');
    Object.keys(attributes).forEach((attribute) => {
        element[attribute] = attributes[attribute];
    });
    element.addEventListener('click', callback);
    return element;
}

function urlDomain(urlString) {
    try {
        return new URL(urlString).hostname;
    } catch (_) {
        return 'localhost';
    }
}

function setLocalStorageKey(key, value) {
    const update = {};
    update[key] = value;
    console.log('setting local storage', update);
    return browser.storage.local.set(update);
}

function getLocalStorageKey(key) {
    console.log('getting local storage', key);
    return browser.storage.local.get(key).then((values) => {
        return values[key];
    }, logError);
}

function showNotificationOnSetting(message) {
    return executeOnSetting('sendnotifications', () => {
        browser.notifications.create({
            type: 'basic',
            iconUrl: browser.runtime.getURL('icons/gopassbridge-96.png'),
            title: 'gopassbridge',
            message: message,
        });
    });
}

function getPopupUrl() {
    return browser.runtime.getURL('gopassbridge.html');
}

function isChrome() {
    return browser.runtime.getURL('/').startsWith('chrome');
}

try {
    module.exports = {
        sendNativeAppMessage,
        executeOnSetting,
        urlDomain,
        setLocalStorageKey,
        getLocalStorageKey,
        createButtonWithCallback,
        showNotificationOnSetting,
        getPopupUrl,
        isChrome,
        openURLOnEvent,
        makeAbsolute,
        checkVersion,
    };
} catch (_) {}
