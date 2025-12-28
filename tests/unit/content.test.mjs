import fs from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, test, vi } from 'vitest';

const HIGHLIGHT_BORDER = '3px solid blue';

function expectClassHasBorder(cls, base = document) {
    const element = base.getElementsByClassName(cls)[0];
    expect(element.style.border).toEqual(HIGHLIGHT_BORDER);
}

function expectClassHasNoBorder(cls, base = document) {
    const element = base.getElementsByClassName(cls)[0];
    expect(element.style.border).not.toEqual(HIGHLIGHT_BORDER);
}

function expectLoginAndPassword(login, password, base) {
    expectClassHasBorder(login || 'test-login', base);
    expectClassHasBorder(password || 'test-password', base);
}

function expectNotLoginAndPassword(login, password, base) {
    expectClassHasNoBorder(login || 'test-login', base);
    expectClassHasNoBorder(password || 'test-password', base);
}

function expectPasswordOnly() {
    expectClassHasNoBorder('test-login');
    expectClassHasBorder('test-password');
}

function expectClassHasValue(cls, value) {
    const element = document.getElementsByClassName(cls)[0];
    expect(element.value).toEqual(value);
}

function expectLoginAndPasswordHaveValues(login, password) {
    expectClassHasValue('test-login', login);
    expectClassHasValue('test-password', password);
}

describe('content', () => {
    let content;
    let offsetHeightSpy;
    let offsetWidthSpy;

    beforeEach(async () => {
        vi.stubGlobal('getSyncStorage', () => null);

        offsetHeightSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(10);
        offsetWidthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(50);

        content = await import('gopassbridge/web-extension/content.js');
    });

    describe('on sample login form', () => {
        beforeEach(() => {
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
            offsetHeightSpy.mockReturnValue(9);
            content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
            expectNotLoginAndPassword();
        });

        test('does not detect fields not wide enough', () => {
            offsetWidthSpy.mockReturnValue(9);
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
            content.processMessage({
                type: 'FILL_LOGIN_FIELDS',
                login: 'someuser',
                password: 'mypassword',
            });
            expectLoginAndPasswordHaveValues('someuser', 'mypassword');
        });

        test('does not overwrite data in password and login fields if new value is empty', () => {
            content.processMessage({
                type: 'FILL_LOGIN_FIELDS',
                login: 'someuser',
                password: 'mypassword',
            });
            content.processMessage({
                type: 'FILL_LOGIN_FIELDS',
                login: '',
                password: 'mypassword',
            });
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
                content.processMessage({
                    type: 'FILL_LOGIN_FIELDS',
                    login: 'someuser',
                    password: 'mypassword',
                });
                expectLoginAndPasswordHaveValues('someuser', 'mypassword');
            });
        });

        describe('submit', () => {
            function setupSubmitListener() {
                const onClick = vi.fn();
                const element = document.getElementById('submit');
                element.addEventListener('click', onClick);
                return onClick;
            }

            beforeEach(() => {
                vi.stubGlobal('requestAnimationFrame', (fn) => {
                    fn();
                });
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

            vi.spyOn(iframe.contentWindow.HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(10);
            vi.spyOn(iframe.contentWindow.HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(50);
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
                </form></body></html>
            `;
            content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
            expectLoginAndPassword('test-login', 'test-password');
        });
    });

    test('ignores password fields with specific ignored IDs', () => {
        document.body.innerHTML = `
            <html><body><form>
                <input type='password' class="ignored_input" id='signup_minireg_password'>
                <input type='password' class="valid_input" id='valid_password'>
            </form></body></html>
        `;

        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });

        expectClassHasBorder('valid_input');
        expectClassHasNoBorder('ignored_input');
    });

    test('updateInputFields does not update standalone login field (requires password field)', () => {
        document.body.innerHTML = `
             <html><body><form>
                 <input id='login' type='text'>
             </form></body></html>
        `;

        content.processMessage({ type: 'FILL_LOGIN_FIELDS', login: 'user', password: 'pw' });

        expect(document.getElementById('login').value).toEqual('');
    });

    test('updateInputFields does nothing if no fields detected', () => {
        const login = 'user';
        const password = 'pw';

        document.body.innerHTML = `<html><body><div>nothing here</div></body></html>`;

        content.processMessage({ type: 'FILL_LOGIN_FIELDS', login, password });

        expect(document.body.innerHTML).not.toContain(login);
        expect(document.body.innerHTML).not.toContain(password);
    });

    test('ignores focused inputs that do not match login criteria', () => {
        document.body.innerHTML = `
             <html><body><form>
                 <input  type='checkbox' class='not_matching'>
                 <input type='password' class='pw'>
             </form></body></html>
        `;

        document.getElementsByClassName('not_matching')[0].focus();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectClassHasNoBorder('not_matching');
    });

    test('with focused username, handles missing password field', () => {
        document.body.innerHTML = `
             <html><body><form>
                 <input id='username' class="not_matching" type='text'>
             </form></body></html>`;

        document.getElementById('username').focus();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectClassHasNoBorder('not_matching');
    });

    test('with focused username, falls back to any visible password if no tabindex match', () => {
        document.body.innerHTML = `
             <html><body><form>
                 <input type='password' class='pw1' tabindex='1'>
                 <input id='username' type='text' tabindex='5'>
             </form></body></html>
        `;

        document.getElementById('username').focus();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectClassHasBorder('pw1');
    });

    test('falls back to original password if no better match', () => {
        document.body.innerHTML = `
             <html><body><form>
                 <input type='password' class='pw1' tabindex='1'>
                 <input id='username' type='text' tabindex='5'>
             </form></body></html>
        `;

        document.activeElement.blur();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectClassHasBorder('pw1');
    });

    test('iframe recursion checks elements visibility', () => {
        document.body.innerHTML = `
            <html><body>
                <iframe src='https://localhost.test/iframe.html'></iframe>
            </body></html>
        `;
        const iframe = document.querySelectorAll('iframe')[0];
        iframe.contentDocument.write(`
            <form>
                <input type='password' id='visible'>
                <input type='password' id='hidden' style='visibility: hidden'>
            </form>
        `);

        const visible = iframe.contentDocument.getElementById('visible');
        vi.spyOn(visible, 'offsetWidth', 'get').mockReturnValue(50);
        vi.spyOn(visible, 'offsetHeight', 'get').mockReturnValue(10);

        const hidden = iframe.contentDocument.getElementById('hidden');
        vi.spyOn(hidden, 'offsetWidth', 'get').mockReturnValue(50);
        vi.spyOn(hidden, 'offsetHeight', 'get').mockReturnValue(10);

        jsdom.reconfigure({ url: 'https://localhost.test/' });

        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });

        expect(visible.style.border).toEqual(HIGHLIGHT_BORDER);
        expect(hidden.style.border).not.toEqual(HIGHLIGHT_BORDER);
    });

    describe.each([
        [{ page: 'github', toClickSubmit: true }],
        [{ page: 'aws-console', toClickSubmit: false }],
        [{ page: 'ing-nl', toClickSubmit: false }],
        [{ page: 'rote-liste-iframe', toClickSubmit: true }],
    ])('on $page', ({ page, toClickSubmit }) => {
        let clickCallback;

        beforeEach(() => {
            vi.stubGlobal('requestAnimationFrame', (fn) => {
                fn();
            });
            document.body.innerHTML = fs.readFileSync(
                path.join(import.meta.dirname, 'login_pages', `${page}.html`),
                'utf8'
            );
            clickCallback = vi.fn();
            document.addEventListener('click', clickCallback);
        });

        test('detects login and password', () => {
            content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
            expectLoginAndPassword();
        });

        describe('on login', () => {
            beforeEach(() => {
                content.processMessage({ type: 'TRY_LOGIN' });
            });

            if (toClickSubmit) {
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
});
