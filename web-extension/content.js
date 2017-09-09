'use strict';

var browser = browser || chrome;

var inputEventNames = ['click', 'focus', 'keypress', 'keydown', 'keyup', 'input', 'blur', 'change'],
    loginInputIds = ['username', 'user_name', 'userid', 'user_id', 'login', 'email', 'login_field'],
    loginInputTypesString = 'input[type=email], input[type=text]',
    loginInputIdString = loginInputIds.map(function (string) {
        return 'input[id=' + string + ']';
    }).join(',');

function selectVisibleElements(selector) {
    var visibleElements = [];

    document.querySelectorAll(selector).forEach(function (element) {
        var elementStyle = window.getComputedStyle(element);
        if (element.offsetWidth < 50) {
            return;
        }
        if (element.offsetHeight < 10) {
            return;
        }
        if (elementStyle.visibility === 'hidden') {
            return;
        }
        visibleElements.push(element);
    });
    return visibleElements;
}

function selectFirstVisibleElement(selector) {
    var visibleElements = selectVisibleElements(selector);
    if (visibleElements.length) {
        return visibleElements[0];
    }
    return null;
}

function selectFirstVisibleFormElement(form, selector) {
    var element = selectFirstVisibleElement(selector);

    if (element && form === element.form) {
        return element;
    }
}

function updateElement(element, newValue) {
    if (!newValue.length) {
        return false;
    }
    element.setAttribute('value', newValue);
    element.value = newValue;

    inputEventNames.forEach(function (name) {
        element.dispatchEvent(new Event(name, { 'bubbles': true }));
    });
    return true;
}

function getInputFields() {
    var passwordInput = selectFirstVisibleElement('input[type=password]');
    if (!passwordInput || !passwordInput.form) {
        return false;
    }

    var loginInput = selectFirstVisibleFormElement(passwordInput.form, loginInputIdString);
    if (!loginInput) {
        loginInput = selectFirstVisibleFormElement(passwordInput.form, loginInputTypesString);
    }
    if (!loginInput) {
        return false;
    }
    return {
        login: loginInput,
        password: passwordInput
    };
}

function markElement(element) {
    element.style.border = '3px solid blue';
}

function markLoginFields() {
    var inputs = getInputFields();
    if (inputs) {
        markElement(inputs.login);
        markElement(inputs.password);
    }
}

function updateInputFields(login, password) {
    var inputs = getInputFields();
    if (inputs) {
        updateElement(inputs.login, login);
        updateElement(inputs.password, password);
    }
}

function tryLogIn() {
    var passwortInputs = selectVisibleElements('input[type=password]');
    if (passwortInputs.length > 1) {
        passwortInputs[1].select();
    } else {
        window.requestAnimationFrame(function () {
            selectFirstVisibleElement('[type=submit]').click();
        });
    }
}

function processMessage(message) {
    switch (message.type) {
        case 'MARK_LOGIN_FIELDS':
            markLoginFields();
            break;
        case 'FILL_LOGIN_FIELDS':
            updateInputFields(message.login, message.password);
            break;
        case 'TRY_LOGIN':
            tryLogIn();
            break;
    }
}

browser.runtime.onMessage.addListener(processMessage);

console.log('Content script for gopassbridge initialized');
