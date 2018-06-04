'use strict';

function onEntryData(element, message) {
    let alreadyShown = false;
    Array.from(document.getElementsByClassName('detail-view')).forEach(oldDetailView => {
        if (oldDetailView.previousSibling === element) {
            alreadyShown = true;
        }
        oldDetailView.remove();
    });
    browser.storage.local.remove(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentTab.url)).then(() => {
        if (alreadyShown) return;

        const newDetailView = _detailViewFromMessage(message);
        newDetailView.classList.add('detail-view');
        element.insertAdjacentElement('afterend', newDetailView);
        setLocalStorageKey(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentTab.url), element.innerText);
    });
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
    if (value !== null && typeof value === 'object') {
        valueElement = document.createElement('div');
        valueElement.classList.add('detail-nested');
        Object.keys(value).forEach(key => _appendEntry(valueElement, key, value[key]));
    } else {
        keyElement.innerText = `${key}:`;
        if (typeof value === 'string' && value.match(re_weburl)) {
            valueElement = document.createElement('a');
            valueElement.href = value.match(re_weburl)[0];
            valueElement.target = '_blank';
            valueElement.innerText = value.match(re_weburl)[0];
            valueElement.addEventListener('click', _openAndLoginURL);
        } else {
            valueElement = document.createElement('span');
            valueElement.innerText = value;
            valueElement.addEventListener('click', _copyElementToClipboard);
        }
        valueElement.classList.add('detail-clickable-value');
    }
    keyElement.classList.add('detail-key');
    entryElement.appendChild(keyElement);
    entryElement.appendChild(valueElement);
    container.appendChild(entryElement);
}

function _copyElementToClipboard(event) {
    const element = event.target;
    copyToClipboard(element.innerText);
}

function _openAndLoginURL(event) {
    event.preventDefault();
    browser.tabs.create({ url: event.target.href, active: false }).then(tab => {
        currentTab = tab;
        if (tab.status !== 'complete') {
            const clickOnComplete = (tabId, changes) => {
                if (tabId === currentTab.id && changes.status === 'complete') {
                    setTimeout(() => _getDetailView(event.target).previousElementSibling.click(), 100);
                    setTimeout(() => browser.tabs.update(tab.id, { active: true }), 250);
                }
            };
            browser.tabs.onUpdated.addListener(clickOnComplete);
        }
        setTimeout(() => {
            browser.tabs.update(tab.id, { active: true });
            browser.tabs.onUpdated.removeListener(clickOnComplete);
        }, 1000);
    });
}

function _getDetailView(element) {
    if (element.parentNode) {
        if (element.parentNode.classList.contains('detail-view')) {
            return element.parentNode;
        } else {
            return _getDetailView(element.parentNode);
        }
    }
    return null;
}

function restoreDetailView() {
    let element;
    getLocalStorageKey(LAST_DETAIL_VIEW_PREFIX + urlDomain(currentTab.url)).then(value => {
        if (!value) return;

        Array.from(document.getElementsByClassName('login')).forEach(loginElement => {
            if (loginElement.innerText === value) {
                element = loginElement;
            }
        });
        if (element) {
            sendNativeAppMessage({ type: 'getData', entry: value }).then(
                message => onEntryData(element, message),
                logAndDisplayError
            );
        }
    });
}

window.tests = {
    details: {
        onEntryData,
        restoreDetailView,
    },
};
