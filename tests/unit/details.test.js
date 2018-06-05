'use strict';

const fs = require('fs');

jest.useFakeTimers();

global.LAST_DETAIL_VIEW_PREFIX = 'PREFIX';
global.copyToClipboard = jest.fn();
global.sendNativeAppMessage = jest.fn();
global.getLocalStorageKey = jest.fn();
global.setLocalStorageKey = jest.fn();
global.urlDomain = jest.fn(() => 'some.domain');
global.currentTab = { url: 'http://other.domain', id: 42 };
global.re_weburl = new RegExp('https://.*');
global.logAndDisplayError = jest.fn();

require('details.js');

const details = window.tests.details;
let loginElement;

describe('onEntryData', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        loginElement = document.createElement('div');
        loginElement.classList.add('login');
        loginElement.innerText = 'secret/entry';
        document.body.appendChild(loginElement);
        global.setLocalStorageKey.mockClear();
        browser.storage.local.remove.mockClear();
        global.copyToClipboard.mockClear();
        global.getLocalStorageKey.mockClear();
    });

    describe('with already opened detail view', function() {
        beforeEach(() => {
            const detailView = document.createElement('div');
            detailView.classList.add('detail-view');
            document.body.appendChild(detailView);
        });

        test('closes view', () => {
            expect.assertions(3);
            return details.onEntryData(loginElement, {}).then(() => {
                expect(document.getElementsByClassName('detail-view').length).toBe(0);
                expect(browser.storage.local.remove.mock.calls).toEqual([['PREFIXsome.domain']]);
                expect(global.setLocalStorageKey.mock.calls.length).toBe(0);
            });
        });
    });

    describe('with closed detail view', function() {
        test('creates new detail view', () => {
            expect.assertions(3);
            return details.onEntryData(loginElement, { hallo: 'welt' }).then(() => {
                expect(document.getElementsByClassName('detail-view').length).toBe(1);
                expect(browser.storage.local.remove.mock.calls).toEqual([['PREFIXsome.domain']]);
                expect(global.setLocalStorageKey.mock.calls).toEqual([['PREFIXsome.domain', 'secret/entry']]);
            });
        });

        test('string values', () => {
            expect.assertions(2);
            return details.onEntryData(loginElement, { hallo: 'welt' }).then(() => {
                expect(document.getElementsByClassName('detail-key')[0].innerText).toBe('hallo:');
                expect(document.getElementsByClassName('detail-clickable-value')[0].innerText).toBe('welt');
            });
        });

        test('url values', () => {
            expect.assertions(2);
            return details.onEntryData(loginElement, { hallo: 'https://hallo.welt' }).then(() => {
                expect(document.getElementsByClassName('detail-key')[0].innerText).toBe('hallo:');
                expect(document.getElementsByTagName('a')[0].innerText).toBe('https://hallo.welt');
            });
        });

        test('nested values', () => {
            expect.assertions(3);
            return details.onEntryData(loginElement, { hallo: { holla: 'waldfee' } }).then(() => {
                expect(document.getElementsByClassName('detail-key')[0].innerText).toBe('hallo:');
                expect(document.getElementsByClassName('detail-key')[1].innerText).toBe('holla:');
                expect(document.getElementsByClassName('detail-clickable-value')[0].innerText).toBe('waldfee');
            });
        });
    });

    describe('click handlers', function() {
        beforeEach(() => {
            global.browser.tabs.onUpdated = {
                addListener: jest.fn(),
                removeListener: jest.fn(),
            };
            return details.onEntryData(loginElement, { somevalue: 'avalue', somurl: 'https://someurl' });
        });

        test('handles value copy clicks', () => {
            document.getElementsByClassName('detail-clickable-value')[0].click();
            expect(global.copyToClipboard.mock.calls).toEqual([['avalue']]);
        });

        test('url clicks', () => {
            document.getElementsByTagName('a')[0].click();
            expect(browser.tabs.create.mock.calls).toEqual([[{ url: 'https://someurl/' }]]);
        });
    });

    describe('restoreDetailView', function() {
        test('does nothing if no matching login found', () => {
            expect.assertions(2);
            global.getLocalStorageKey.mockResolvedValue('another/key');
            return details.restoreDetailView().then(() => {
                expect(document.getElementsByClassName('detail-view').length).toBe(0);
                expect(global.getLocalStorageKey.mock.calls).toEqual([['PREFIXsome.domain']]);
            });
        });

        test('recreates detail-view if login matches', () => {
            expect.assertions(2);
            global.getLocalStorageKey.mockResolvedValue('secret/entry');
            global.sendNativeAppMessage.mockResolvedValue({ some: 'value' });
            return details.restoreDetailView().then(() => {
                expect(document.getElementsByClassName('detail-view').length).toBe(1);
                expect(global.getLocalStorageKey.mock.calls).toEqual([['PREFIXsome.domain']]);
            });
        });
    });
});
