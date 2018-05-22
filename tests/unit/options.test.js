'use strict';
const fs = require('fs');

global.getSettings = () => Promise.resolve(Promise.resolve({ submitafterfill: true, defaultfolder: 'Muh' }));
global.logError = jest.fn();

require('options.js');

let options = window.tests.options;

describe('Init', () => {
    beforeEach(() => {
        document.body.innerHTML = fs.readFileSync(`${__dirname}/../../web-extension/options.html`);
    });

    afterEach(() => {
        global.browser.storage.sync.set.mockClear();
    });

    test('Fills checkboxes from localstore', () => {
        expect.assertions(2);
        options.init().then(() => {
            expect(document.getElementById('submitafterfill').checked).toBe(true);
            expect(document.getElementById('markfields').checked).toBe(false);
        });
    });

    test('Fills input fields from localstore', () => {
        expect.assertions(1);
        options.init().then(() => {
            const textinput = document.getElementById('defaultfolder');
            expect(textinput.value).toBe('Muh');
        });
    });

    test('Initializes clear button listener', () => {
        expect.assertions(1);
        options.init().then(() => {
            document.getElementById('clear').click();
            expect(global.browser.storage.sync.clear.mock.calls.length).toBe(1);
        });
    });

    test('Initializes checkbox listener', () => {
        expect.assertions(1);
        options.init().then(() => {
            document.getElementById('markfields').click();
            expect(global.browser.storage.sync.set.mock.calls).toEqual([[{ markfields: true }]]);
        });
    });
});

describe('onTextInputChange', () => {
    beforeEach(() => {
        document.body.innerHTML = fs.readFileSync(`${__dirname}/../../web-extension/options.html`);
    });

    test('updates storage', () => {
        options.init();
        options._onTextinputChange({ target: { id: 'muh', value: 'maeh' } });
        expect(global.browser.storage.sync.set.mock.calls).toEqual([[{ muh: 'maeh' }]]);
    });
});
