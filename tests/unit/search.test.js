'use strict';

const fs = require('fs');

jest.useFakeTimers();

document.body.innerHTML = fs.readFileSync(`${__dirname}/../../web-extension/gopassbridge.html`);

global.LAST_DOMAIN_SEARCH_PREFIX = 'PREFIX_';
global.armSpinnerTimeout = jest.fn();
global.currentTab = { id: 42, url: 'http://some.host' };
global.sendNativeAppMessage = jest.fn();
global.sendNativeAppMessage.mockResolvedValue([]);
global.logAndDisplayError = jest.fn();
global.setStatusText = jest.fn();
global.i18n = {
    getMessage: jest.fn(messagekey => `__KEY_${messagekey}__`),
};
global.spinnerTimeout = 24;
global.urlDomain = jest.fn(url => 'some.host');
global.createButtonWithCallback = jest.fn(() => document.createElement('div'));
global.switchToCreateNewDialog = jest.fn();
global.setLocalStorageKey = jest.fn();
global.setLocalStorageKey.mockResolvedValue({});

require('search.js');

const search = window.tests.search;

describe('search method', function() {
    beforeEach(function() {
        browser.storage.local.remove.mockClear();
        global.armSpinnerTimeout.mockClear();
        global.sendNativeAppMessage.mockClear();
        global.sendNativeAppMessage.mockResolvedValue([]);
    });

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

    describe('search for term', () => {
        test('sets search input', () => {
            expect.assertions(2);
            document.getElementById('search_input').value = '';
            expect(document.getElementById('search_input').value).toEqual('');
            return search.search('muh').then(() => {
                expect(document.getElementById('search_input').value).toEqual('muh');
            });
        });

        test('sets search input', () => {
            expect.assertions(2);
            document.getElementById('search_input').value = '';
            expect(document.getElementById('search_input').value).toEqual('');
            return search.search('muh').then(() => {
                expect(document.getElementById('search_input').value).toEqual('muh');
            });
        });

        test('arms spinner timeout', () => {
            expect.assertions(1);
            return search.search('muh').then(() => {
                expect(global.armSpinnerTimeout.mock.calls.length).toBe(1);
            });
        });

        test('sends search message for term', () => {
            expect.assertions(1);
            return search.search('muh').then(() => {
                expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ query: 'muh', type: 'query' }]]);
            });
        });

        test('does not send search message for empty term', () => {
            expect.assertions(1);
            return search.search('').then(() => {
                expect(global.sendNativeAppMessage.mock.calls.length).toBe(0);
            });
        });
    });

    describe('search for host', () => {
        test('resets search input', () => {
            expect.assertions(2);
            document.getElementById('search_input').value = 'muh';
            expect(document.getElementById('search_input').value).toEqual('muh');
            return search.searchHost('some.host').then(() => {
                expect(document.getElementById('search_input').value).toEqual('');
            });
        });

        test('clears storage before and after search if result empty', () => {
            expect.assertions(1);
            return search.searchHost('some.host').then(() => {
                expect(browser.storage.local.remove.mock.calls).toEqual([['PREFIX_some.host'], ['PREFIX_some.host']]);
            });
        });

        test('clears storage before only once if results', () => {
            expect.assertions(1);
            global.sendNativeAppMessage.mockResolvedValueOnce(['some/entry', 'other/entry']);

            return search.searchHost('some.host').then(() => {
                expect(browser.storage.local.remove.mock.calls).toEqual([['PREFIX_some.host']]);
            });
        });

        test('sends search message for host', () => {
            expect.assertions(1);
            return search.search('muh').then(() => {
                expect(global.sendNativeAppMessage.mock.calls).toEqual([[{ query: 'muh', type: 'query' }]]);
            });
        });

        test('does not send search message for empty term', () => {
            expect.assertions(1);
            return search.searchHost('').then(() => {
                expect(global.sendNativeAppMessage.mock.calls.length).toBe(0);
            });
        });
    });
});
