'use strict';

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
    loginInputTypesString = loginInputTypes.map((string) => `input[type=${string}]`).join(',') + ',input:not([type])',
    // Substring hints matched against id/name/placeholder/aria-label/autocomplete after
    // lowercasing and stripping separators, so 'one-time code', 'one_time_code' etc. all match.
    OTP_HINTS = [
        'otp',
        'totp',
        '2fa',
        'mfa',
        'onetime',
        'twofactor',
        'twostep',
        'verificationcode',
        'securitycode',
        'authcode',
        'authenticationcode',
        'authenticatorcode',
        'smscode',
        'emailcode',
        'pincode',
    ],
    OTP_INPUT_TYPES = ['text', 'tel', 'number', 'password'];

function exactMatch(property, string) {
    const idstr = `[${property}=${string}]`;
    return loginInputTypes.map((string) => `input[type=${string}]${idstr}`).join(',') + `,input:not([type])${idstr}`;
}

function partialMatch(property, string) {
    const idstr = `[${property}*=${string}]`;
    return (
        loginInputTypes
            .map(function (string) {
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
    partialLoginInputNameString = loginInputIds.map(partialMatch.bind(null, 'name')).join(','),
    allLoginInputStrings = [
        exactLoginInputIdString,
        partialLoginInputIdString,
        exactLoginInputNameString,
        partialLoginInputNameString,
        loginInputTypesString,
    ],
    allLoginInputStringsJoined = allLoginInputStrings.join(',');

function isVisible(element) {
    const elementStyle = window.getComputedStyle(element);
    if (element.offsetWidth < 30) {
        return false;
    }
    if (element.offsetHeight < 10) {
        return false;
    }
    return elementStyle.visibility !== 'hidden';
}

function selectFocusedElement(parent) {
    parent = parent || document;
    if (
        parent.body === parent.activeElement ||
        parent.activeElement.tagName === 'IFRAME' ||
        parent.activeElement.tagName === 'FRAME'
    ) {
        let focusedElement = null;
        parent.querySelectorAll('iframe,frame').forEach((iframe) => {
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

    document.querySelectorAll(selector).forEach((element) => {
        if (isVisible(element)) {
            visibleElements.push(element);
        }
    });

    document.querySelectorAll('iframe,frame').forEach((iframe) => {
        if (iframe.src.startsWith(window.location.origin)) {
            iframe.contentWindow.document.body.querySelectorAll(selector).forEach((element) => {
                if (isVisible(element)) {
                    visibleElements.push(element);
                }
            });
        }
    });

    return visibleElements;
}

function selectFirstVisiblePasswordElement(selector) {
    for (let element of selectVisibleElements(selector)) {
        if (
            ignorePasswordIds.every((ignore) => {
                return element.id !== ignore;
            })
        ) {
            return element;
        }
    }

    return null;
}

function selectFirstVisibleFormElement(form, selector, afterTabInd) {
    for (let element of selectVisibleElements(selector)) {
        if (element && form === element.form && (afterTabInd === undefined || element.tabIndex > afterTabInd)) {
            return element;
        }
    }

    return null;
}

function _setInputValue(element, newValue) {
    element.setAttribute('value', newValue);
    // Use the native value setter, so frameworks with their own value tracking (React etc.)
    // do not swallow the change when the 'input' event is dispatched afterwards.
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (descriptor && descriptor.set) {
        descriptor.set.call(element, newValue);
    } else {
        element.value = newValue;
    }
}

function updateElement(element, newValue) {
    if (!newValue || !newValue.length) {
        return false;
    }
    _setInputValue(element, newValue);

    inputEventNames.forEach((name) => {
        element.dispatchEvent(new Event(name, { bubbles: true }));
        // Some sites clear the fields on certain events, refill to make sure that values are in the field are set
        _setInputValue(element, newValue);
    });
    return true;
}

function getLoginInputFromPasswordInputForm(passwordInputForm) {
    for (let loginInput of allLoginInputStrings) {
        const element = selectFirstVisibleFormElement(passwordInputForm, loginInput);
        if (element) return element;
    }
}

function _normalizeFieldHint(value) {
    return (value || '').toLowerCase().replace(/[\s_-]/g, '');
}

function isOtpInput(input) {
    if (!input || input.tagName !== 'INPUT') {
        return false;
    }
    if (OTP_INPUT_TYPES.indexOf((input.getAttribute('type') || 'text').toLowerCase()) === -1) {
        return false;
    }
    const autocomplete = (input.getAttribute('autocomplete') || '').toLowerCase();
    if (autocomplete === 'one-time-code') {
        // The standardized way to mark OTP fields
        return true;
    }
    const haystack = _normalizeFieldHint(
        [input.id, input.name, input.getAttribute('placeholder'), input.getAttribute('aria-label'), autocomplete].join(
            ' '
        )
    );
    return OTP_HINTS.some((hint) => haystack.indexOf(hint) !== -1);
}

function selectOtpInput() {
    for (let element of selectVisibleElements('input')) {
        if (isOtpInput(element)) {
            return element;
        }
    }
    return null;
}

function selectSplitOtpInputs() {
    // Detect the common "one box per digit" pattern: a run of sibling single-character inputs
    const candidates = selectVisibleElements('input[maxlength="1"]').filter(
        (input) => OTP_INPUT_TYPES.indexOf((input.getAttribute('type') || 'text').toLowerCase()) !== -1
    );
    const groups = new Map();
    candidates.forEach((input) => {
        const parent = input.parentElement && input.parentElement.closest('form, fieldset, div, span');
        const key = parent || document.body;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(input);
    });
    for (let group of groups.values()) {
        if (group.length >= 4 && group.length <= 8) {
            return group;
        }
    }
    return null;
}

function _determineFieldsFromFocusedInput(focusedInput) {
    let passwordInput, loginInput, otp;
    if (isOtpInput(focusedInput)) {
        otp = focusedInput;
    } else if (focusedInput.type === 'password') {
        passwordInput = focusedInput;
    } else if (focusedInput.matches(allLoginInputStringsJoined)) {
        passwordInput =
            selectFirstVisibleFormElement(focusedInput.form, 'input[type=password]', focusedInput.tabIndex) ||
            selectFirstVisibleFormElement(focusedInput.form, 'input[type=password]');
        if (passwordInput) {
            loginInput = focusedInput;
        }
    }
    return { passwordInput, loginInput, otp };
}

function getInputFieldsFromFocus() {
    let focusedInput = selectFocusedElement(document);
    if (focusedInput && focusedInput.tagName === 'INPUT') {
        return _determineFieldsFromFocusedInput(focusedInput);
    }
    return {
        loginInput: undefined,
        passwordInput: undefined,
        otp: undefined,
    };
}

function _getInputFieldsFromPasswordInput(passwordInput, otpInput) {
    const loginInput = getLoginInputFromPasswordInputForm(passwordInput.form);
    if (loginInput && loginInput.tabIndex > passwordInput.tabIndex) {
        const matchingPasswordInput = selectFirstVisibleFormElement(
            loginInput.form,
            'input[type=password]',
            loginInput.tabIndex
        );
        passwordInput = matchingPasswordInput || passwordInput;
    }
    return { login: loginInput, password: passwordInput, otp: otpInput };
}

function _selectOtpFallback(loginInput, passwordInput) {
    // Only consider inputs that were not already picked as login/password
    const otpInput = selectOtpInput();
    if (otpInput && otpInput !== loginInput && otpInput !== passwordInput) {
        return otpInput;
    }
    return null;
}

function getInputFields() {
    const focusedInputs = getInputFieldsFromFocus();
    let loginInput = focusedInputs.loginInput;
    let passwordInput = focusedInputs.passwordInput || selectFirstVisiblePasswordElement('input[type=password]');
    let otpInput = focusedInputs.otp;

    if (otpInput) {
        return { login: undefined, password: undefined, otp: otpInput };
    }

    if (passwordInput && passwordInput.form && !focusedInputs.loginInput) {
        const inputs = _getInputFieldsFromPasswordInput(passwordInput);
        inputs.otp = _selectOtpFallback(inputs.login, inputs.password);
        return inputs;
    }

    return {
        login: loginInput,
        password: passwordInput,
        otp: _selectOtpFallback(loginInput, passwordInput),
    };
}

function markElement(element) {
    element.style.border = '3px solid blue';
}

function markLoginFields() {
    const inputs = getInputFields();
    if (inputs.login) {
        markElement(inputs.login);
    }
    if (inputs.password) {
        markElement(inputs.password);
    }
    if (inputs.otp) {
        markElement(inputs.otp);
    }
}

function _fillOtp(otpInput, otp) {
    if (otpInput) {
        updateElement(otpInput, otp);
        return;
    }
    const splitInputs = selectSplitOtpInputs();
    if (splitInputs && splitInputs.length === otp.length) {
        splitInputs.forEach((input, index) => updateElement(input, otp.charAt(index)));
    }
}

function updateInputFields(login, password, otp) {
    const inputs = getInputFields();
    if (inputs.login) {
        updateElement(inputs.login, login);
    }
    if (inputs.password) {
        updateElement(inputs.password, password);
    }
    if (otp && otp.length) {
        _fillOtp(inputs.otp, otp);
    }
}

function tryLogIn() {
    const passwortInputs = selectVisibleElements('input[type=password]');
    if (passwortInputs.length > 1) {
        passwortInputs[1].select();
    } else {
        window.requestAnimationFrame(() => {
            if (passwortInputs.length === 1 && passwortInputs[0].form) {
                const submitButton = selectFirstVisibleFormElement(passwortInputs[0].form, '[type=submit]');
                if (submitButton) {
                    submitButton.click();
                }
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
            updateInputFields(message.login, message.password, message.otp);
            break;
        case 'TRY_LOGIN':
            tryLogIn();
            break;
    }

    return Promise.resolve(true);
}

browser.runtime.onMessage.addListener(processMessage);

console.log('Content script for gopassbridge initialized');

window.tests = {
    content: {
        processMessage,
    },
};
