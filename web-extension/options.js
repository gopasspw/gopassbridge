'use strict';

checkboxes.forEach(function (checkbox) {
    checkbox.addEventListener("change", onCheckboxChange);
    getSyncStorage(setCheckboxes, onGetError);
});

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

