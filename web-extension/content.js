'use strict';

var browser = browser || chrome;

var options = null;

getSyncStorage(
    function(result) {
        options = result;
    },
    function() {
        alert('Could not read config options');
    }
);

var inputEventNames = ['click', 'focus', 'keypress', 'keydown', 'keyup', 'input', 'blur', 'change'],
    loginInputIds = [
        'username',
        'user_name',
        'userid',
        'user_id',
        'login',
        'email',
        'login_field',
        'login-form-username',
    ],
    ignorePasswordIds = ['signup_minireg_password'],
    loginInputTypes = ['email', 'text'],
    loginInputTypesString =
        loginInputTypes
            .map(function(string) {
                return 'input[type=' + string + ']';
            })
            .join(',') + ',input:not([type])',
    exactLoginInputIdString = loginInputIds
        .map(function(string) {
            var idstr = '[id=' + string + ']';
            return (
                loginInputTypes
                    .map(function(string) {
                        return 'input[type=' + string + ']' + idstr;
                    })
                    .join(',') +
                ',input:not([type])' +
                idstr
            );
        })
        .join(','),
    partialLoginInputIdString = loginInputIds
        .map(function(string) {
            var idstr = '[id*=' + string + ']';
            return (
                loginInputTypes
                    .map(function(string) {
                        return 'input[type=' + string + ']' + idstr;
                    })
                    .join(',') +
                ',input:not([type])' +
                idstr
            );
        })
    .join(',');

function isVisible(element) {
    var elementStyle = window.getComputedStyle(element);
    if (element.offsetWidth < 50) {
        return false;
    }
    if (element.offsetHeight < 10) {
        return false;
    }
    if (elementStyle.visibility === 'hidden') {
        return false;
    }
    return true;
}

function selectVisibleElements(selector) {
    var visibleElements = [];

    document.querySelectorAll(selector).forEach(function(element) {
        if (isVisible(element)) {
                visibleElements.push(element);
        }
    });

    document.querySelectorAll('iframe').forEach(function(iframe) {
        if (iframe.src.startsWith(window.location.origin)) {
            iframe.contentWindow.document.body.querySelectorAll(selector).forEach(function(element) {
                var elementStyle = window.getComputedStyle(element);
                if (isVisible(element)) {
                    visibleElements.push(element);
                }
            });
        }
    });

    return visibleElements;
}

function selectFirstVisiblePasswordElement(selector) {
    var visibleElements = selectVisibleElements(selector);
    for (var i = 0; i < visibleElements.length; i++) {
        var element = visibleElements[i];
        if (
            ignorePasswordIds.every(function(ignore) {
                return element.id !== ignore;
            })
        ) {
            return element;
        }
        console.log('Ignoring password input (in ignore id list)', element);
    }

    return null;
}

function selectFirstVisibleFormElement(form, selector) {
    var visibleElements = selectVisibleElements(selector);

    for (var i = 0; i < visibleElements.length; i++) {
        var element = visibleElements[i];
        if (element && form === element.form) {
            return element;
        }
    }

    return null;
}

function updateElement(element, newValue) {
    if (!newValue.length) {
        return false;
    }
    element.setAttribute('value', newValue);
    element.value = newValue;

    inputEventNames.forEach(function(name) {
        element.dispatchEvent(new Event(name, { bubbles: true }));
    });
    return true;
}

function getInputFields() {
    var passwordInput = selectFirstVisiblePasswordElement('input[type=password]');
    console.log('Detected password input is', passwordInput);
    if (!passwordInput || !passwordInput.form) {
        return false;
    }

    var loginInput = selectFirstVisibleFormElement(passwordInput.form, exactLoginInputIdString);
    if (!loginInput) {
        loginInput = selectFirstVisibleFormElement(passwordInput.form, partialLoginInputIdString);
    }
    if (!loginInput) {
        loginInput = selectFirstVisibleFormElement(passwordInput.form, loginInputTypesString);
    }
    if (!loginInput) {
        return false;
    }
    return {
        login: loginInput,
        password: passwordInput,
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
        window.requestAnimationFrame(function() {
            var submitButtons = selectVisibleElements('[type=submit]');
            if (submitButtons.length) {
                submitButtons[0].click();
            }
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
