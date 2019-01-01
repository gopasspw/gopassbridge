'use strict';

function onEntryData(element, message) {
    let alreadyShown = false;
    Array.from(document.getElementsByClassName('detail-view')).forEach(oldDetailView => {
        if (oldDetailView.previousSibling === element) {
            alreadyShown = true;
        }
        oldDetailView.remove();
    });
    return browser.storage.local.remove(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentPageUrl)).then(() => {
        if (alreadyShown) return;

        const newDetailView = _detailViewFromMessage(message);
        newDetailView.classList.add('detail-view');
        _insertAfter(newDetailView, element);
        setLocalStorageKey(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentPageUrl), element.innerText);
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

function _createNestedValueElement(value) {
    const valueElement = document.createElement('div');
    valueElement.classList.add('detail-nested');
    Object.keys(value).forEach(key => _appendEntry(valueElement, key, value[key]));
    return valueElement;
}

function _createURLValueElement(value) {
    const valueElement = document.createElement('a');
    valueElement.href = value.match(re_weburl)[0];
    valueElement.target = '_blank';
    valueElement.innerText = value.match(re_weburl)[0];
    valueElement.addEventListener('click', openURL);
    return valueElement;
}

function _createSimpleValueElement(value) {
    const valueElement = document.createElement('span');
    valueElement.innerText = value;
    valueElement.addEventListener('click', _copyElementToClipboard);
    return valueElement;
}

function _isNested(value) {
    return value !== null && typeof value === 'object';
}

function _isURL(value) {
    return typeof value === 'string' && value.match(re_weburl);
}

function _createFlatValueElement(value) {
    const valueElement = _isURL(value) ? _createURLValueElement(value) : _createSimpleValueElement(value);
    valueElement.classList.add('detail-clickable-value');
    return valueElement;
}

function _appendEntry(container, key, value) {
    let keyElement, valueElement;
    const entryElement = document.createElement('li');

    keyElement = document.createElement('span');
    keyElement.innerText = `${key}:`;
    keyElement.classList.add('detail-key');
    valueElement = _isNested(value) ? _createNestedValueElement(value) : _createFlatValueElement(value);

    entryElement.appendChild(keyElement);
    entryElement.appendChild(valueElement);
    container.appendChild(entryElement);
}

function _copyElementToClipboard(event) {
    const element = event.target;
    copyToClipboard(element.innerText);
}

function restoreDetailView() {
    let element;
    return getLocalStorageKey(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentPageUrl)).then(value => {
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
