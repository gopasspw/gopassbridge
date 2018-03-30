'use strict';

var fs = require('fs');

var heightMockReturn = 10;
var widthMockReturn = 50;
var clickCallback;

global.chrome = {
    runtime: {
        onMessage: {
            addListener: function() {},
        },
    },
};

global.getSyncStorage = function() {};

Object.defineProperties(global.HTMLElement.prototype, {
    offsetHeight: {
        get: function() {
            return heightMockReturn;
        },
    },
    offsetWidth: {
        get: function() {
            return widthMockReturn;
        },
    },
});

require('content.js');
var content = window.test.content;

function expectClassHasBorder(cls, not, base) {
    var doc = base || document;
    var element = doc.getElementsByClassName(cls)[0];
    if (not) {
        expect(element.style._values.border).not.toEqual('3px solid blue');
    } else {
        expect(element.style._values.border).toEqual('3px solid blue');
    }
}

function expectClassHasValue(cls, value) {
    var element = document.getElementsByClassName(cls)[0];
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

describe('on sample login form', function() {
    beforeEach(function() {
        heightMockReturn = 10;
        widthMockReturn = 50;
        document.body.innerHTML =
            "<html><body><form id='form' action='/session' method='post'>" +
            "<input id='login' type='text' class='test-login'>" +
            "<input type='password' class='test-password'>" +
            "<input id='submit' type='submit'>" +
            '</form></body></html>';
    });
    test('detects login and password', function() {
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword();
    });

    test('does not detect login if no form', function() {
        document.body.innerHTML =
            '<html><body>' +
            "<input id='login' type='text' class='test-login'>" +
            "<input type='password' class='test-password'>" +
            "<input id='submit' type='submit'>" +
            '</body></html>';
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectPasswordOnly();
    });

    test('does not detect login if outside form', function() {
        document.body.innerHTML =
            '<html><body>' +
            "<input id='login' type='text' class='test-login'>" +
            "<form id='form' action='/session' method='post'>" +
            "<input type='password' class='test-password'>" +
            "<input id='submit' type='submit'>" +
            '</form></body></html>';
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectPasswordOnly();
    });

    test('does not detect fields not high enough', function() {
        heightMockReturn = 9;
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectNotLoginAndPassword();
    });

    test('does not detect fields not wide enough', function() {
        widthMockReturn = 9;
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectNotLoginAndPassword();
    });

    test('does not detect fields with style visibility hidden', function() {
        var login = document.getElementsByClassName('test-login')[0];
        login.style.visibility = 'hidden';
        var password = document.getElementsByClassName('test-password')[0];
        password.style.visibility = 'hidden';
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectNotLoginAndPassword();
    });

    test('does insert data to password and login fields', function() {
        content.processMessage({ type: 'FILL_LOGIN_FIELDS', login: 'someuser', password: 'mypassword' });
        expectLoginAndPasswordHaveValues('someuser', 'mypassword');
    });

    test('does not overwrite data in password and login fields if new value is empty', function() {
        content.processMessage({ type: 'FILL_LOGIN_FIELDS', login: 'someuser', password: 'mypassword' });
        content.processMessage({ type: 'FILL_LOGIN_FIELDS', login: '', password: 'mypassword' });
        expectLoginAndPasswordHaveValues('someuser', 'mypassword');
    });

    describe('submit is clicked when', function() {
        beforeEach(function() {
            global.window.requestAnimationFrame = function(fn) {
                fn();
            };
            clickCallback = jest.fn();
            var form = document.getElementById('form');
            form.addEventListener('submit', function(e) {
                e.preventDefault();
            });
            var element = document.getElementById('submit');
            element.addEventListener('click', clickCallback);
        });

        test('only one password field is present', function() {
            content.processMessage({ type: 'TRY_LOGIN' });
            expect(clickCallback.mock.calls.length).toBe(1);
        });

        test('more than one password field is present', function() {
            document.body.innerHTML =
                "<html><body><form id='form' action='/session' method='post'>" +
                "<input id='login' type='text' class='test-login'>" +
                "<input type='password' class='test-password'>" +
                "<input type='password' class='another-password'>" +
                "<input id='submit' type='submit'>" +
                '</form></body></html>';
            content.processMessage({ type: 'TRY_LOGIN' });
            expect(clickCallback.mock.calls.length).toBe(0);
        });
    });
});

describe('on sample login form with multiple inputs', function() {
    beforeEach(function() {
        heightMockReturn = 10;
        widthMockReturn = 50;
        document.body.innerHTML =
            "<html><body><form id='form' action='/session' method='post'>" +
            "<input id='login' type='text' class='test-login-first'>" +
            "<input id='login' type='text' class='test-login-second'>" +
            "<input type='password' class='test-password-first'>" +
            "<input type='password' class='test-password-second'>" +
            "<input id='submit' type='submit'>" +
            '</form></body></html>';
    });
    test('selects first textfield and first password without focus', function() {
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('test-login-first', 'test-password-first');
    });

    test('selects second textfield if focused', function() {
        var second = document.getElementsByClassName('test-login-second')[0];
        second.focus();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('test-login-second', 'test-password-first');
    });

    test('selects second password if focused', function() {
        var second = document.getElementsByClassName('test-password-second')[0];
        second.focus();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('test-login-first', 'test-password-second');
    });
});

describe('on sample login form with inputs in iframe', function() {
    beforeEach(function() {
        heightMockReturn = 10;
        widthMockReturn = 50;
        document.body.innerHTML =
            "<html><body><iframe src='https://www.somedomain.com/iframe.html'></iframe></body></html>";
        var iframe = document.querySelectorAll('iframe')[0];
        iframe.contentWindow.document.write(
            "<form id='form' action='/session' method='post'>" +
                "<input id='login' type='text' class='test-login'>" +
                "<input id='login2' type='text' class='another-test-login'>" +
                "<input type='password' class='test-password'>" +
                "<input id='submit' type='submit'>" +
                '</form>'
        );
    });

    test('selects login and password', function() {
        jsdom.reconfigure({
            url: 'https://www.somedomain.com/',
        });
        var iframe = document.querySelectorAll('iframe')[0];
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword(null, null, iframe.contentWindow.document);
    });

    test('does not select login and password if iframe starts with different url', function() {
        jsdom.reconfigure({
            url: 'https://www.someotherdomain.com/',
        });
        var iframe = document.querySelectorAll('iframe')[0];
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectNotLoginAndPassword(null, null, iframe.contentWindow.document);
    });

    test('selects second textfield if focused', function() {
        jsdom.reconfigure({
            url: 'https://www.somedomain.com/',
        });
        var iframe = document.querySelectorAll('iframe')[0];
        var second = iframe.contentWindow.document.getElementsByClassName('another-test-login')[0];
        second.focus();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('another-test-login', 'test-password', iframe.contentWindow.document);
    });
});

describe('on sample login form with decoy password inputs with different tabIndex', function() {
    beforeEach(function() {
        heightMockReturn = 10;
        widthMockReturn = 50;
    });

    test('selects first input and password with larger tabindex if focused', function() {
        document.body.innerHTML =
            "<html><body><form id='form' action='/session' method='post'>" +
            "<input type='password' class='' tabindex='-1'>" +
            "<input id='login' type='text' class='test-login' tabindex='0'>" +
            "<input type='password' class='test-password' tabindex='1'>" +
            "<input id='submit' type='submit'>" +
            '</form></body></html>';
        var login = document.getElementsByClassName('test-login')[0];
        login.focus();
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('test-login', 'test-password');
    });

    test('selects matching textfield and password with largert tabindex without focus', function() {
        document.body.innerHTML =
            "<html><body><form id='form' action='/session' method='post'>" +
            "<input type='password' class='' tabindex='-1'>" +
            "<input id='login' type='text' class='test-login' tabindex='0'>" +
            "<input type='password' class='test-password' tabindex='1'>" +
            "<input id='submit' type='submit'>" +
            '</form></body></html>';
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword('test-login', 'test-password');
    });
});

['github', 'aws-console', 'ing-nl', 'rote-liste-iframe'].forEach(function(page) {
    describe('on ' + page, function() {
        beforeEach(function() {
            heightMockReturn = 10;
            widthMockReturn = 50;
            document.body.innerHTML = fs.readFileSync(__dirname + '/login_pages/' + page + '.html');
        });
        test('detects login and password', function() {
            content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
            expectLoginAndPassword();
        });
    });
});
