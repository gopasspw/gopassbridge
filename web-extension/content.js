'use strict';

let options = null;

getSyncStorage(result => (options = result), () => alert('Could not read config options'));

const inputEventNames = ['click', 'focus', 'keypress', 'keydown', 'keyup', 'input', 'blur', 'change'],
    loginInputIds = [
        'username',
        'user_name',
        'userid',
        'user_id',
        'user',
        'login',
        'email',
        'login_field',
        'login-form-username',
    ],
    ignorePasswordIds = ['signup_minireg_password'],
    loginInputTypes = ['email', 'text'],
    loginInputTypesString = loginInputTypes.map(string => `input[type=${string}]`).join(',') + ',input:not([type])';

function exactMatch(property, string) {
    const idstr = `[${property}=${string}]`;
    return loginInputTypes.map(string => `input[type=${string}]${idstr}`).join(',') + `,input:not([type])${idstr}`;
}

function partialMatch(property, string) {
    const idstr = `[${property}*=${string}]`;
    return (
        loginInputTypes
            .map(function(string) {
                return `input[type=${string}]${idstr}`;
            })
            .join(',') +
        ',input:not([type])' +
        idstr
    );
}

const exactLoginInputIdString = loginInputIds.map(exactMatch.bind(null, 'id')).join(','),
    partialLoginInputIdString = loginInputIds.map(partialMatch.bind(null, 'id')).join(','),
    exactLoginInputNameString = loginInputIds.map(exactMatch.bind(null, 'name')).join(','),
    partialLoginInputNameString = loginInputIds.map(partialMatch.bind(null, 'name')).join(',');

function isVisible(element) {
    const elementStyle = window.getComputedStyle(element);
    if (element.offsetWidth < 50) {
        return false;
    }
    if (element.offsetHeight < 10) {
        return false;
    }
    return elementStyle.visibility !== 'hidden';
}

function selectFocusedElement(parent) {
    parent = parent || document;
    if (parent.body === parent.activeElement || parent.activeElement.tagName === 'IFRAME') {
        let focusedElement = null;
        parent.querySelectorAll('iframe').forEach(iframe => {
            if (iframe.src.startsWith(window.location.origin)) {
                const focused = selectFocusedElement(iframe.contentWindow.document);
                if (focused) {
                    focusedElement = focused;
                }
            }
        });
        return focusedElement;
    } else {
        return parent.activeElement;
    }
}

function selectVisibleElements(selector) {
    const visibleElements = [];

    document.querySelectorAll(selector).forEach(element => {
        if (isVisible(element)) {
            visibleElements.push(element);
        }
    });

    document.querySelectorAll('iframe').forEach(iframe => {
        if (iframe.src.startsWith(window.location.origin)) {
            iframe.contentWindow.document.body.querySelectorAll(selector).forEach(element => {
                if (isVisible(element)) {
                    visibleElements.push(element);
                }
            });
        }
    });

    return visibleElements;
}

function selectFirstVisiblePasswordElement(selector) {
    const visibleElements = selectVisibleElements(selector);
    for (let i = 0; i < visibleElements.length; i++) {
        const element = visibleElements[i];
        if (
            ignorePasswordIds.every(ignore => {
                return element.id !== ignore;
            })
        ) {
            return element;
        }
    }

    return null;
}

function selectFirstVisibleFormElement(form, selector, afterTabInd) {
    const visibleElements = selectVisibleElements(selector);

    for (let i = 0; i < visibleElements.length; i++) {
        const element = visibleElements[i];
        if (element && form === element.form) {
            if (afterTabInd === undefined) {
                return element;
            } else {
                if (element.tabIndex > afterTabInd) {
                    return element;
                }
            }
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

    inputEventNames.forEach(name => {
        element.dispatchEvent(new Event(name, { bubbles: true }));
    });
    return true;
}

function getInputFields() {
    let passwordInput;
    let loginInput;
    let focusedInput = selectFocusedElement(document);
    if (focusedInput && focusedInput.tagName === 'INPUT') {
        if (focusedInput.type === 'password') {
            passwordInput = focusedInput;
        } else if (
            focusedInput.matches(exactLoginInputIdString) ||
            focusedInput.matches(partialLoginInputIdString) ||
            focusedInput.matches(exactLoginInputNameString) ||
            focusedInput.matches(partialLoginInputNameString) ||
            focusedInput.matches(loginInputTypesString)
        ) {
            passwordInput =
                selectFirstVisibleFormElement(focusedInput.form, 'input[type=password]', focusedInput.tabIndex) ||
                selectFirstVisibleFormElement(focusedInput.form, 'input[type=password]');
            if (passwordInput) {
                loginInput = focusedInput;
            }
        }
    }
    passwordInput = passwordInput || selectFirstVisiblePasswordElement('input[type=password]');

    if (passwordInput && passwordInput.form && !loginInput) {
        loginInput =
            loginInput ||
            selectFirstVisibleFormElement(passwordInput.form, exactLoginInputIdString) ||
            selectFirstVisibleFormElement(passwordInput.form, partialLoginInputIdString) ||
            selectFirstVisibleFormElement(passwordInput.form, exactLoginInputNameString) ||
            selectFirstVisibleFormElement(passwordInput.form, partialLoginInputNameString) ||
            selectFirstVisibleFormElement(passwordInput.form, loginInputTypesString);
        if (loginInput && loginInput.tabIndex > passwordInput.tabIndex) {
            const matchingPasswordInput = selectFirstVisibleFormElement(
                loginInput.form,
                'input[type=password]',
                loginInput.tabIndex
            );
            passwordInput = matchingPasswordInput || passwordInput;
        }
    }

    if (passwordInput || loginInput) {
        return {
            login: loginInput,
            password: passwordInput,
        };
    }

    return false;
}

function markElement(element) {
    element.style.border = '3px solid blue';
}

function markLoginFields() {
    const inputs = getInputFields();
    if (inputs) {
        if (inputs.login) {
            markElement(inputs.login);
        }
        if (inputs.password) {
            markElement(inputs.password);
        }
    }
}

function updateInputFields(login, password) {
    const inputs = getInputFields();
    if (inputs) {
        if (inputs.login) {
            updateElement(inputs.login, login);
        }
        if (inputs.password) {
            updateElement(inputs.password, password);
        }
    }
}

function tryLogIn() {
    const passwortInputs = selectVisibleElements('input[type=password]');
    if (passwortInputs.length > 1) {
        passwortInputs[1].select();
    } else {
        window.requestAnimationFrame(() => {
            const submitButtons = selectVisibleElements('[type=submit]');
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

window.tests = {
    content: {
        processMessage,
    },
};
