'use strict';

const i18n = i18n || chrome.i18n;

function internationalize(text) {
    return text.replace(/__MSG_([^_]+)__/g, (match, key) => i18n.getMessage(key));
}

document.getElementsByTagName('body')[0].innerHTML = internationalize(
    document.getElementsByTagName('body')[0].innerHTML
);
