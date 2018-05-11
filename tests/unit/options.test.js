'use strict';
const fs = require('fs');

global.getSyncStorage = () => {};
require('options.js');

let options = window.tests.options;

describe('Init', () => {
    beforeEach(function() {
        global.syncstorage = {
            clear: jest.fn(),
            set: jest.fn(),
        };

        document.body.innerHTML = fs.readFileSync(`${__dirname}/../../web-extension/options.html`);
        global.getSyncStorage = cb => cb({ submitafterfill: true, defaultfolder: 'Muh' });
    });

    test('Fills checkboxes from localstore', () => {
        options.init();
        expect(document.getElementById('submitafterfill').checked).toBe(true);
        expect(document.getElementById('markfields').checked).toBe(false);
    });

    test('Fills input fields from localstore', () => {
        options.init();
        let textinput = document.getElementById('defaultfolder');
        expect(textinput.value).toBe('Muh');
    });

    test('Initializes clear button listener', () => {
        options.init();
        document.getElementById('clear').click();
        expect(global.syncstorage.clear.mock.calls.length).toBe(1);
    });

    test('Initializes checkbox listener', () => {
        options.init();
        document.getElementById('markfields').click();
        expect(global.syncstorage.set.mock.calls).toEqual([[{ markfields: true }]]);
    });
});

describe('onTextInputChange', () => {
    beforeEach(() => {
        global.syncstorage = {
            set: jest.fn(),
        };
    });

    test('updates storage', () => {
        options.onTextinputChange({ target: { id: 'muh', value: 'maeh' } });
        expect(global.syncstorage.set.mock.calls).toEqual([[{ muh: 'maeh' }]]);
    });
});
