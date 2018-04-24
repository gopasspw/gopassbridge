'use strict';

var browser = browser || chrome;

var syncstorage = browser.storage.sync;
var localstorage = browser.storage.local;

var DEFAULT_SETTINGS = {
    markfields: true,
    submitafterfill: true,
    defaultfolder: 'Account',
};

var LAST_DOMAIN_SEARCH_PREFIX = 'LAST_DOMAIN_SEARCH_';

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
        syncstorage.get(undefined, onChromeResults);
    } else {
        var get = syncstorage.get();
        get.then(assignDefaults).then(onResult, onError);
    }
}

function sendNativeMessage(message, onResult, onError) {
    var app = 'com.justwatch.gopass';

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
        var sending = browser.runtime.sendNativeMessage(app, message);
        sending.then(onResult, onError);
    }
}

function executeOnSetting(setting, trueCallback, falseCallback) {
    function onError(error) {
        console.log(error);
    }
    getSyncStorage(function(result) {
        if (result[setting]) {
            if (trueCallback) trueCallback();
        } else {
            if (falseCallback) falseCallback();
        }
    }, onError);
}

function createButtonWithCallback(className, text, style, callback) {
    var element = document.createElement('button');
    element.className = className;
    element.textContent = text;
    if (style) {
        element.style = style;
    }
    element.addEventListener('click', callback);
    return element;
}

function urlDomain(urlString) {
    var a = document.createElement('a');
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
    var update = {};
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
