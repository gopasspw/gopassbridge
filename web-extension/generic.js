'use strict';

var browser = browser || chrome;

const syncstorage = browser.storage.sync;
const localstorage = browser.storage.local;

const DEFAULT_SETTINGS = {
    markfields: true,
    submitafterfill: true,
    defaultfolder: 'Account',
};

const LAST_DOMAIN_SEARCH_PREFIX = 'LAST_DOMAIN_SEARCH_';

function getSyncStorage(onResult, onError) {
    function assignDefaults(response) {
        return Object.assign(DEFAULT_SETTINGS, response);
    }

    function onChromeResults(response) {
        if (response) {
            return onResult(assignDefaults(response));
        }
        onError(browser.runtime.lastError);
    }

    if (chrome) {
        syncstorage.get(null, onChromeResults);
    } else {
        syncstorage
            .get()
            .then(assignDefaults)
            .then(onResult, onError);
    }
}

function sendNativeMessage(message, onResult, onError) {
    const app = 'com.justwatch.gopass';

    function onChromeResults(response) {
        if (response) {
            return onResult(response);
        }
        onError(browser.runtime.lastError);
    }

    console.log(JSON.stringify(message));

    if (chrome) {
        browser.runtime.sendNativeMessage(app, message, onChromeResults);
    } else {
        browser.runtime.sendNativeMessage(app, message).then(onResult, onError);
    }
}

function executeOnSetting(setting, trueCallback, falseCallback) {
    function onError(error) {
        console.log(error);
    }
    getSyncStorage(result => {
        if (result[setting]) {
            if (trueCallback) trueCallback();
        } else {
            if (falseCallback) falseCallback();
        }
    }, onError);
}

function createButtonWithCallback(className, text, style, callback) {
    const element = document.createElement('button');
    element.className = className;
    element.textContent = text;
    if (style) {
        element.style = style;
    }
    element.addEventListener('click', callback);
    return element;
}

function urlDomain(urlString) {
    const a = document.createElement('a');
    a.href = urlString;
    return a.hostname;
}

function setLocalStorage(update, onSet) {
    function onError(error) {
        console.log(error);
    }

    console.log('setting local storage', update);

    if (chrome) {
        localstorage.set(update, onSet);
    } else {
        localstorage.set(update).then(onSet, onError);
    }
}

function setLocalStorageKey(key, value, onSet) {
    const update = {};
    update[key] = value;
    setLocalStorage(update, onSet);
}

function getLocalStorage(key, onGet) {
    function onError(error) {
        console.log(error);
    }

    console.log('getting local storage', key);

    if (chrome) {
        localstorage.get(key, onGet);
    } else {
        localstorage.get(key).then(onGet, onError);
    }
}

function removeLocalStorage(key, onRemove) {
    function onError(error) {
        console.log(error);
    }

    console.log('clearing local storage key', key);

    if (chrome) {
        localstorage.remove(key, onRemove);
    } else {
        localstorage.remove(key).then(onRemove, onError);
    }
}

window.tests = {
    generic: {
        DEFAULT_SETTINGS,
        getSyncStorage,
        sendNativeMessage,
        executeOnSetting,
        urlDomain,
        setLocalStorageKey,
        getLocalStorage,
        removeLocalStorage,
        createButtonWithCallback,
    },
};
