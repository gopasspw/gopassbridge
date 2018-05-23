'use strict';

const fs = require('fs');

jest.useFakeTimers();

document.body.innerHTML = fs.readFileSync(`${__dirname}/../../web-extension/gopassbridge.html`);

require('search.js');

const search = window.tests.search;

describe('initSearch', function() {
    const input = document.getElementById('search_input');

    test('focuses input', () => {
        jest.runAllTimers();
        spyOn(input, 'focus');
        search.initSearch();
        expect(input.focus).toHaveBeenCalledTimes(0);
        jest.runAllTimers();
        expect(input.focus).toHaveBeenCalledTimes(1);
    });

    test(`registers eventhandlers for input`, () => {
        spyOn(input, 'addEventListener');
        search.initSearch();
        expect(input.addEventListener.calls.allArgs()).toEqual([
            ['input', search._onSearchInputEvent],
            ['keypress', search._onSearchKeypressEvent],
        ]);
        jest.runAllTimers();
    });
});
