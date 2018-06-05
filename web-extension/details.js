'use strict';

function onEntryData(element, message) {
    let alreadyShown = false;
    Array.from(document.getElementsByClassName('detail-view')).forEach(oldDetailView => {
        if (oldDetailView.previousSibling === element) {
            alreadyShown = true;
        }
        oldDetailView.remove();
    });
    return browser.storage.local.remove(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentTab.url)).then(() => {
        if (alreadyShown) return;

        const newDetailView = _detailViewFromMessage(message);
        newDetailView.classList.add('detail-view');
        _insertAfter(newDetailView, element);
        setLocalStorageKey(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentTab.url), element.innerText);
    });
}

function _insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function _detailViewFromMessage(message) {
    const container = document.createElement('div');
    Object.keys(message).forEach(key => _appendEntry(container, key, message[key]));
    return container;
}

function _appendEntry(container, key, value) {
    let keyElement, valueElement;
    const entryElement = document.createElement('li');

    keyElement = document.createElement('span');
    keyElement.innerText = `${key}:`;
    keyElement.classList.add('detail-key');
    if (value !== null && typeof value === 'object') {
        valueElement = document.createElement('div');
        valueElement.classList.add('detail-nested');
        Object.keys(value).forEach(key => _appendEntry(valueElement, key, value[key]));
    } else {
        if (typeof value === 'string' && value.match(re_weburl)) {
            valueElement = document.createElement('a');
            valueElement.href = value.match(re_weburl)[0];
            valueElement.target = '_blank';
            valueElement.innerText = value.match(re_weburl)[0];
            valueElement.addEventListener('click', _openURL);
        } else {
            valueElement = document.createElement('span');
            valueElement.innerText = value;
            valueElement.addEventListener('click', _copyElementToClipboard);
        }
        valueElement.classList.add('detail-clickable-value');
    }
    entryElement.appendChild(keyElement);
    entryElement.appendChild(valueElement);
    container.appendChild(entryElement);
}

function _copyElementToClipboard(event) {
    const element = event.target;
    copyToClipboard(element.innerText);
}

function _openURL(event) {
    event.preventDefault();
    browser.tabs.create({ url: event.target.href });
}

function restoreDetailView() {
    let element;
    return getLocalStorageKey(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentTab.url)).then(value => {
        if (!value) return Promise.resolve();

        Array.from(document.getElementsByClassName('login')).forEach(loginElement => {
            if (loginElement.innerText === value) {
                element = loginElement;
            }
        });
        if (element) {
            return sendNativeAppMessage({ type: 'getData', entry: value }).then(
                message => onEntryData(element, message),
                logAndDisplayError
            );
        }
        return Promise.resolve();
    });
}

window.tests = {
    details: {
        onEntryData,
        restoreDetailView,
    },
};
