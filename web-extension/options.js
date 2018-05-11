'use strict';

function resetStorage() {
    syncstorage.clear();
    init();
}

function init() {
    const clearButton = document.getElementById('clear');
    if (clearButton) {
        clearButton.addEventListener('click', resetStorage);
    }

    const checkboxes = document.querySelectorAll('input[type=checkbox]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', onCheckboxChange);
        getSyncStorage(setCheckboxes, onGetError);
    });

    const textinputs = document.querySelectorAll('input[type=text]');
    textinputs.forEach(textinput => {
        textinput.addEventListener('change', onTextinputChange);
        getSyncStorage(setTextinputs, onGetError);
    });
}

function onGetError(error) {
    console.log(error);
}

function setCheckboxes(result) {
    Object.keys(result).forEach(key => {
        const checkbox = document.getElementById(key);
        if (checkbox) {
            checkbox.checked = !!result[key];
        }
    });
}

function onCheckboxChange(event) {
    const update = {};
    update[event.target.id] = event.target.checked;
    syncstorage.set(update);
}

function setTextinputs(result) {
    Object.keys(result).forEach(key => {
        const textinput = document.getElementById(key);
        if (textinput) {
            textinput.value = result[key];
        }
    });
}

function onTextinputChange(event) {
    const update = {};
    update[event.target.id] = event.target.value;
    syncstorage.set(update);
}

init();

window.tests = {
    options: {
        init,
        onTextinputChange,
    },
};
