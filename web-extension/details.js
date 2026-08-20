'use strict';

function onEntryData(element, message) {
    let alreadyShown = false;
    Array.from(document.getElementsByClassName('detail-view')).forEach((oldDetailView) => {
        if (oldDetailView.previousSibling === element) {
            alreadyShown = true;
        }
        oldDetailView.remove();
    });
    return browser.storage.local.remove(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentPageUrl)).then(
        getSettings().then((settings) => {
            if (alreadyShown) {
                return;
            }

            const newDetailView = _detailViewFromMessage(message, settings);
            newDetailView.classList.add('detail-view');
            _insertAfter(newDetailView, element);
            _prependPasswordEntry(newDetailView, element.innerText);
            setLocalStorageKey(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentPageUrl), element.innerText);
        })
    );
}

function _prependPasswordEntry(detailView, entry) {
    // The password is deliberately not part of getData responses; fetch it separately
    // so it can be dragged into password fields (masked, never rendered as text).
    return Promise.resolve(sendNativeAppMessage({ type: 'getLogin', entry: entry })).then((response) => {
        if (!response || response.error || !response.password) {
            return;
        }
        const entryElement = _createEntryElement('password', response.password, '••••••••••');
        detailView.insertBefore(entryElement, detailView.firstChild);
    }, logError);
}

function _insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function _excludeKey(key, settings) {
    const _canonicalize = (k) => k.trim().toLowerCase();
    const omit = settings.omitkeys.split(',');
    omit.push('password'); // Always exclude default "password/Password" key from detail view, user can use copy button
    return omit.some((value) => _canonicalize(value) === _canonicalize(key));
}

function _detailViewFromMessage(message, settings) {
    const container = document.createElement('ul');
    Object.keys(message)
        .filter((key) => message[key] !== null && message[key] !== undefined && message[key] !== '')
        .filter((key) => !_excludeKey(key, settings))
        .forEach((key) => {
            _appendEntry(container, key, message[key]);
        });
    return container;
}

function _createNestedValueElement(value) {
    const valueElement = document.createElement('ul');
    valueElement.classList.add('detail-nested');
    if (Array.isArray(value)) {
        value.forEach((item) => {
            _appendEntry(valueElement, null, item);
        });
    } else {
        Object.keys(value).forEach((key) => {
            _appendEntry(valueElement, key, value[key]);
        });
    }
    return valueElement;
}

function _createURLValueElement(value) {
    const valueElement = document.createElement('a');
    valueElement.href = value.match(re_weburl)[0];
    valueElement.target = '_blank';
    valueElement.innerText = value.match(re_weburl)[0];
    valueElement.addEventListener('click', openURLOnEvent);
    return valueElement;
}

function _createSimpleValueElement(value, displayText) {
    const valueElement = document.createElement('span');
    const gripper = document.createElement('span');
    gripper.classList.add('gripper');
    valueElement.appendChild(gripper);
    // textContent, never innerHTML: secret values must not be parsed as markup
    valueElement.appendChild(document.createTextNode(displayText === undefined ? value : displayText));
    valueElement.addEventListener('click', () => copyToClipboard(value));
    valueElement.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', value);
    });
    return valueElement;
}

function _isNested(value) {
    return value !== null && typeof value === 'object';
}

function _isURL(value) {
    return typeof value === 'string' && value.match(re_weburl);
}

function _createFlatValueElement(value, displayText) {
    const valueElement =
        _isURL(value) && displayText === undefined
            ? _createURLValueElement(value)
            : _createSimpleValueElement(value, displayText);
    valueElement.classList.add('detail-clickable-value');
    valueElement.setAttribute('draggable', 'true');
    return valueElement;
}

function _createEntryElement(key, value, displayText) {
    const entryElement = document.createElement('li');
    const hasKey = key !== undefined && key !== null;

    if (hasKey) {
        const keyElement = document.createElement('span');
        keyElement.innerText = `${key}:`;
        keyElement.classList.add('detail-key');
        entryElement.appendChild(keyElement);
    }

    const valueElement = _isNested(value)
        ? _createNestedValueElement(value)
        : _createFlatValueElement(value, displayText);

    entryElement.appendChild(valueElement);
    return entryElement;
}

function _appendEntry(container, key, value) {
    container.appendChild(_createEntryElement(key, value));
}

function restoreDetailView() {
    let element;
    return getLocalStorageKey(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentPageUrl)).then((value) => {
        if (!value) {
            return Promise.resolve();
        }

        Array.from(document.getElementsByClassName('login')).forEach((loginElement) => {
            if (loginElement.innerText === value) {
                element = loginElement;
            }
        });
        if (element) {
            return sendNativeAppMessage({ type: 'getData', entry: value }).then(
                (message) => onEntryData(element, message),
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
