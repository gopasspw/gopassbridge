'use strict';

const fs = require('fs');

let heightMockReturn = 10;
let widthMockReturn = 50;

global.getSyncStorage = () => null;

function mockElementSize(htmlElementClass) {
    Object.defineProperties(htmlElementClass.prototype, {
        offsetHeight: {
            get: () => {
                return heightMockReturn;
            },
        },
        offsetWidth: {
            get: () => {
                return widthMockReturn;
            },
        },
    });
}

mockElementSize(global.HTMLElement);

require('content.js');

const content = window.tests.content;

function expectClassHasBorder(cls, not, base) {
    const doc = base || document;
    const element = doc.getElementsByClassName(cls)[0];
    if (not) {
        expect(element.style._values.border).not.toEqual('3px solid blue');
    } else {
        expect(element.style._values.border).toEqual('3px solid blue');
    }
}

function expectClassHasValue(cls, value) {
    const element = document.getElementsByClassName(cls)[0];
    expect(element.value).toEqual(value);
}

function expectLoginAndPassword(login, password, base) {
    expectClassHasBorder(login || 'test-login', false, base);
    expectClassHasBorder(password || 'test-password', false, base);
}

function expectNotLoginAndPassword(login, password, base) {
    expectClassHasBorder(login || 'test-login', true, base);
    expectClassHasBorder(password || 'test-password', true, base);
}

function expectPasswordOnly() {
    expectClassHasBorder('test-login', true);
    expectClassHasBorder('test-password');
}

function expectLoginAndPasswordHaveValues(login, password) {
    expectClassHasValue('test-login', login);
    expectClassHasValue('test-password', password);
}

describe('on sample login form', () => {
    beforeEach(() => {
        heightMockReturn = 10;
        widthMockReturn = 50;
        document.body.innerHTML = `
            <html><body><form id='form' action='/session' method='post'>
                <input id='login' type='text' class='test-login'>
                <input type='password' class='test-password'>
                <input id='submit' type='submit'>
            </form></body></html>`;
    });

    test('detects login and password', () => {
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword();
    });

    test('does not detect login if no form', () => {
        document.body.innerHTML = `
            <html><body>
                <input id='login' type='text' class='test-login'>
                <input type='password' class='test-password'>
                <input id='submit' type='submit'>
            </body></html>`;
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectPasswordOnly();
    });

    test('does not detect login if outside form', () => {
        document.body.innerHTML = `
            <html><body>
                <input id='login' type='text' class='test-login'>
            <form id='form' action='/session' method='post'>
                <input type='password' class='test-password'>
                <input id='submit' type='submit'>
            </form></body></html>`;
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectPasswordOnly();
    });

    test('does not detect fields not high enough', () => {
        heightMockReturn = 9;
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectNotLoginAndPassword();
    });

    test('does not detect fields not wide enough', () => {
        widthMockReturn = 9;
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectNotLoginAndPassword();
    });

    test('does not detect fields with style visibility hidden', () => {
        const login = document.getElementsByClassName('test-login')[0];
        login.style.visibility = 'hidden';
        const password = document.getElementsByClassName('test-password')[0];
        password.style.visibility = 'hidden';
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectNotLoginAndPassword();
    });

    test('does insert data to password and login fields', () => {
        content.processMessage({ type: 'FILL_LOGIN_FIELDS', login: 'someuser', password: 'mypassword' });
        expectLoginAndPasswordHaveValues('someuser', 'mypassword');
    });

    test('does not overwrite data in password and login fields if new value is empty', () => {
        content.processMessage({ type: 'FILL_LOGIN_FIELDS', login: 'someuser', password: 'mypassword' });
        content.processMessage({ type: 'FILL_LOGIN_FIELDS', login: '', password: 'mypassword' });
        expectLoginAndPasswordHaveValues('someuser', 'mypassword');
    });

    describe('event dispatch', () => {
        function setupFocusListener() {
            function onClick(e) {
                e.target.value = '';
            }
            const element = document.getElementById('login');
            element.addEventListener('focus', onClick);
        }

        test('is filled even if field clears on focus event', () => {
            setupFocusListener();
            content.processMessage({ type: 'FILL_LOGIN_FIELDS', login: 'someuser', password: 'mypassword' });
            expectLoginAndPasswordHaveValues('someuser', 'mypassword');
        });
    });

    describe('submit', () => {
        function setupSubmitListener() {
            const onClick = jest.fn();
            const element = document.getElementById('submit');
            element.addEventListener('click', onClick);
            return onClick;
        }

        beforeEach(() => {
            global.window.requestAnimationFrame = (fn) => {
                fn();
            };
            const form = document.getElementById('form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
            });
        });

        test('is clicked when only one password field is present', () => {
            const clickCallback = setupSubmitListener();
            content.processMessage({ type: 'TRY_LOGIN' });
            expect(clickCallback.mock.calls.length).toBe(1);
        });

        test('is not clicked when more than one password field is present', () => {
            document.body.innerHTML = `
                <html><body><form id='form' action='/session' method='post'>
                    <input id='login' type='text' class='test-login'>
                    <input type='password' class='test-password'>
                    <input type='password' class='another-password'>
                    <input id='submit' type='submit'>
                </form></body></html>`;
            const clickCallback = setupSubmitListener();
            content.processMessage({ type: 'TRY_LOGIN' });
            expect(clickCallback.mock.calls.length).toBe(0);
        });

        test('is not clicked when password input is outside form, but submit in other form is present', () => {
            document.body.innerHTML = `
                <html><body>
                    <input id='login' type='text' class='test-login'>
                    <input type='password' class='test-password'>
                <form id='form' action='/unrelated' method='post'>                    
                    <input id='submit' type='submit'>
                </form></body></html>`;
            const clickCallback = setupSubmitListener();
            content.processMessage({ type: 'TRY_LOGIN' });
            expect(clickCallback.mock.calls.length).toBe(0);
        });
    });
});

describe('on sample login form with multiple inputs', () => {
    beforeEach(() => {
        heightMockReturn = 10;
        widthMockReturn = 50;
        document.body.innerHTML = `
            <html><body><form id='form' action='/session' method='post'>
                <input id='login' type='text' class='test-login-first'>
                <input id='login' type='text' class='test-login-second'>
                <input type='password' class='test-password-first'>
                <input type='password' class='test-password-second'>
                <input id='submit' type='submit'>
            </form></body></html>`;
    });

    test('selects first textfield and first password without focus', () => {
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('test-login-first', 'test-password-first');
    });

    test('selects second textfield if focused', () => {
        const second = document.getElementsByClassName('test-login-second')[0];
        second.focus();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('test-login-second', 'test-password-first');
    });

    test('selects second password if focused', () => {
        const second = document.getElementsByClassName('test-password-second')[0];
        second.focus();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('test-login-first', 'test-password-second');
    });
});

describe('on sample login form with inputs in iframe', () => {
    beforeEach(() => {
        heightMockReturn = 10;
        widthMockReturn = 50;
        document.body.innerHTML =
            "<html><body><iframe src='https://www.somedomain.test/iframe.html'></iframe></body></html>";
        const iframe = document.querySelectorAll('iframe')[0];
        iframe.contentDocument.write(`
            <form id='form' action='/session' method='post'>
                <input id='login' type='text' class='test-login'>
                <input id='login2' type='text' class='another-test-login'>
                <input type='password' class='test-password'>
                <input id='submit' type='submit'>
            </form>
        `);

        mockElementSize(iframe.contentWindow.HTMLElement);
    });

    test('selects login and password', () => {
        jsdom.reconfigure({
            url: 'https://www.somedomain.test/',
        });
        const iframe = document.querySelectorAll('iframe')[0];
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword(null, null, iframe.contentWindow.document);
    });

    test('does not select login and password if iframe starts with different url', () => {
        jsdom.reconfigure({
            url: 'https://www.someotherdomain.test/',
        });
        const iframe = document.querySelectorAll('iframe')[0];
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectNotLoginAndPassword(null, null, iframe.contentWindow.document);
    });

    test('selects second textfield if focused', () => {
        jsdom.reconfigure({
            url: 'https://www.somedomain.test/',
        });
        const iframe = document.querySelectorAll('iframe')[0];
        const second = iframe.contentWindow.document.getElementsByClassName('another-test-login')[0];
        second.focus();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('another-test-login', 'test-password', iframe.contentWindow.document);
    });
});

describe('on sample login form with decoy password inputs with different tabIndex', () => {
    beforeEach(() => {
        heightMockReturn = 10;
        widthMockReturn = 50;
    });

    test('selects first input and password with larger tabindex if focused', () => {
        document.body.innerHTML = `
            <html><body><form id='form' action='/session' method='post'>
                <input type='password' class='' tabindex='-1'>
                <input id='login' type='text' class='test-login' tabindex='0'>
                <input type='password' class='test-password' tabindex='1'>
                <input id='submit' type='submit'>
            </form></body></html>`;
        const login = document.getElementsByClassName('test-login')[0];
        login.focus();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('test-login', 'test-password');
    });

    test('selects matching textfield and password with largert tabindex without focus', () => {
        document.body.innerHTML = `
            <html><body><form id='form' action='/session' method='post'>
                <input type='password' class='' tabindex='-1'>
                <input id='login' type='text' class='test-login' tabindex='0'>
                <input type='password' class='test-password' tabindex='1'>
                <input id='submit' type='submit'>
            </form></body></html>`;
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('test-login', 'test-password');
    });
});

const pages = {
    github: {
        toClickSubmit: true,
    },
    'aws-console': {
        toClickSubmit: false,
    },
    'ing-nl': {
        toClickSubmit: false,
    },
    'rote-liste-iframe': {
        toClickSubmit: true,
    },
};

for (const page in pages) {
    const expected = pages[page];

    describe(`on ${page}`, () => {
        let clickCallback;

        function setupClickListener() {
            const onClick = jest.fn((event) => {
                event.preventDefault();
            });
            document.addEventListener('click', onClick);
            return onClick;
        }

        beforeEach(() => {
            heightMockReturn = 10;
            widthMockReturn = 50;
            document.body.innerHTML = fs.readFileSync(`${__dirname}/login_pages/${page}.html`);
            clickCallback = setupClickListener();
        });

        test('detects login and password', () => {
            content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
            expectLoginAndPassword();
        });

        describe('on login', () => {
            beforeEach(() => {
                content.processMessage({ type: 'TRY_LOGIN' });
            });

            if (expected.toClickSubmit) {
                test('clicks submit button', () => {
                    expect(clickCallback.mock.calls.length).toBe(1);
                    const element = clickCallback.mock.calls[0][0].target;
                    expect(element.tagName).toBe('INPUT');
                    expect(element.type).toBe('submit');
                });
            } else {
                test('does not click submit button', () => {
                    expect(clickCallback.mock.calls.length).toBe(0);
                });
            }
        });
    });
}
