'use strict';
var browser = browser || chrome;

var checkboxes = document.querySelectorAll("input[type=checkbox]");

var syncstorage = browser.storage.sync;

var DEFAULT_SETTINGS = {
    markfields: true,
    submitafterfill: true
};

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

function sendNativeMessage(app, message, onResult, onError) {
    function onChromeResults(response) {
        if (response) {
            return onResult(response);
        }
        onError(browser.runtime.lastError);
    }

    if (chrome) {
        browser.runtime.sendNativeMessage(app, message, onChromeResults);
    } else {
        var sending = browser.runtime.sendNativeMessage(app, message);
        sending.then(onResult, onError);
    }
}
