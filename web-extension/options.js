'use strict';

function resetStorage() {
    browser.storage.sync.clear();
    init();
}

function init() {
    const clearButton = document.getElementById('clear');
    if (clearButton) {
        clearButton.addEventListener('click', resetStorage);
    }

    return getSettings().then(settings => {
        const checkboxes = document.querySelectorAll('input[type=checkbox]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', _onCheckboxChange);
        });
        _setCheckboxes(settings);

        const textinputs = document.querySelectorAll('input[type=text]');
        textinputs.forEach(textinput => {
            textinput.addEventListener('change', _onTextinputChange);
        });
        _setTextinputs(settings);
        console.log('Options initialized');
    }, logError);
}

function _setCheckboxes(result) {
    Object.keys(result).forEach(key => {
        const checkbox = document.getElementById(key);
        if (checkbox) {
            checkbox.checked = !!result[key];
        }
    });
}

function _onCheckboxChange(event) {
    const update = {};
    update[event.target.id] = event.target.checked;
    browser.storage.sync.set(update);
}

function _setTextinputs(result) {
    Object.keys(result).forEach(key => {
        const textinput = document.getElementById(key);
        if (textinput) {
            textinput.value = result[key];
        }
    });
}

function _onTextinputChange(event) {
    const update = {};
    update[event.target.id] = event.target.value;
    browser.storage.sync.set(update);
}

init();

window.tests = {
    options: {
        init,
        _onTextinputChange,
    },
};
