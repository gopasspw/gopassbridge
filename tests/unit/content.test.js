'use strict';

var fs = require('fs');
var heightMockReturn = 10;
var widthMockReturn = 50;

global.chrome = {
    runtime: {
        onMessage: {
            addListener: function () {}
        }

    }
};

global.getSyncStorage = function () {};


Object.defineProperties(global.HTMLElement.prototype, {
    offsetHeight: {
        get: function () {
            return heightMockReturn;
        }
    },
    offsetWidth: {
        get: function () {
            return widthMockReturn;
        }
    }
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

function expectLoginAndPassword() {
    expectClassHasBorder('test-login');
    expectClassHasBorder('test-password');
}

function expectNotLoginAndPassword() {
    expectClassHasBorder('test-login', true);
    expectClassHasBorder('test-password', true);
}

describe("on sample login form", function () {
    beforeEach(function () {
        heightMockReturn = 10;
        widthMockReturn = 50;
        document.body.innerHTML = "<html><body><form>" +
            "<input id='login' type='text' class='test-login'>" +
            "<input type='password' class='test-password'>" +
            "</form></body></html>";
    });
    test('detects login and password', function () {
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectLoginAndPassword();
    });

    test('does not detect fields not high enough', function () {
        heightMockReturn = 9;
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectNotLoginAndPassword();
    });

    test('does not detect fields not wide enough', function () {
        widthMockReturn = 9;
        content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
        expectNotLoginAndPassword();
    });
});


[
    'github',
    'aws-console'
].forEach(function (page) {
    describe('on ' + page, function () {
        beforeEach(function () {
            heightMockReturn = 10;
            widthMockReturn = 50;
            document.body.innerHTML = fs.readFileSync(__dirname + '/login_pages/' + page + '.html');
        });
        test('detects login and password', function () {
            content.processMessage({ type: 'MARK_LOGIN_FIELDS' });
            expectLoginAndPassword();

        });
    });
});
