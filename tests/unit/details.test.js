'use strict';

const fs = require('fs');

jest.useFakeTimers();

document.body.innerHTML = fs.readFileSync(`${__dirname}/../../web-extension/gopassbridge.html`);

require('details.js');

const details = window.tests.details;

test('nothing', () => {
    expect(true).toBe(true);
});
