'use strict';

var fs = require('fs');

var heightMockReturn = 10;
var widthMockReturn = 50;

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

var content = require('content.js');

function expectClassHasBorder(cls, not) {
    var element = document.getElementsByClassName(cls)[0];
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

function expectLoginAndPassword() {
    expectClassHasBorder('test-login');
    expectClassHasBorder('test-password');
}

function expectNotLoginAndPassword() {
    expectClassHasBorder('test-login', true);
    expectClassHasBorder('test-password', true);
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

    test('does insert data to password and login fields', function() {
        content.processMessage({ type: 'FILL_LOGIN_FIELDS', login: 'someuser', password: 'mypassword' });
        expectLoginAndPasswordHaveValues('someuser', 'mypassword');
    });

    test('does click submit', function() {
        global.window.requestAnimationFrame = function(fn) {
            fn();
        };
        var clickCallback = jest.fn();
        var form = document.getElementById('form');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
        });
        var element = document.getElementById('submit');
        element.addEventListener('click', clickCallback);
        content.processMessage({ type: 'TRY_LOGIN' });
        expect(clickCallback.mock.calls.length).toBe(1);
    });
});

['github', 'aws-console'].forEach(function(page) {
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
