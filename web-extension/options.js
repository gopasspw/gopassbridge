'use strict';

function resetSettings() {
    browser.storage.sync
        .clear()
        .then(getSettings)
        .then(resetViewState, logError);
}

function init() {
    const clearButton = document.getElementById('clear');
    if (clearButton) {
        clearButton.addEventListener('click', resetSettings);
    }

    return getSettings().then(settings => {
        const checkboxes = document.querySelectorAll('input[type=checkbox]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', _onCheckboxChange);
        });

        const textinputs = document.querySelectorAll('input[type=text]');
        textinputs.forEach(textinput => {
            textinput.addEventListener('change', _onTextinputChange);
        });

        resetViewState(settings);
        console.log('Options initialized');
    }, logError);
}

function resetViewState(settings) {
    _setCheckboxes(settings);
    _setTextinputs(settings);
    console.log('Options view set to settings.');
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

window.addEventListener('load', init);

window.tests = {
    options: {
        init,
        _onTextinputChange,
    },
};
