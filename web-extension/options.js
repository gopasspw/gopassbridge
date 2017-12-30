'use strict';

document.getElementById("clear").addEventListener("click", resetStorage);

function resetStorage() {
    syncstorage.clear();
    init();
}

function init() {
    checkboxes.forEach(function (checkbox) {
        checkbox.addEventListener("change", onCheckboxChange);
        getSyncStorage(setCheckboxes, onGetError);
    });

    textinputs.forEach(function (textinput) {
        textinput.addEventListener("change", onTextinputChange);
        getSyncStorage(setTextinputs, onGetError);
    });
}

function onGetError(error) {
    console.log(error);
}

function setCheckboxes(result) {
    Object.keys(result).forEach(function (key) {
        var checkbox = document.getElementById(key);
        if (checkbox) {
            checkbox.checked = !!result[key];
        }
    });
}

function onCheckboxChange(event) {
    var update = {};
    update[event.target.id] = event.target.checked;
    syncstorage.set(update);
}



function setTextinputs(result) {
    Object.keys(result).forEach(function (key) {
        var textinput = document.getElementById(key);
        if (textinput) {
            textinput.value = result[key];
        }
    });
}

function onTextinputChange(event) {
    var update = {};
    update[event.target.id] = event.target.value;
    syncstorage.set(update);
}

init();
