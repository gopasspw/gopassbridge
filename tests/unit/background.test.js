'use strict';

const fs = require('fs');

require('background.js');

const background = window.tests.background;

describe('background', function() {
    test('registers message processor on init', () => {
        browser.runtime.onMessage.addListener.mockClear();
        background.initBackground();
        expect(browser.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    });
});
