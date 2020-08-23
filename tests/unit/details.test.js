'use strict';

const fs = require('fs');

jest.useFakeTimers();

global.LAST_DETAIL_VIEW_PREFIX = 'PREFIX';
global.copyToClipboard = jest.fn();
global.sendNativeAppMessage = jest.fn();
global.getLocalStorageKey = jest.fn();
global.setLocalStorageKey = jest.fn();
global.urlDomain = jest.fn(() => 'some.domain');
global.currentTabId = 42;
global.currentPageUrl = 'http://other.domain';
global.re_weburl = new RegExp('https://.*');
global.logAndDisplayError = jest.fn();
global.openURLOnEvent = jest.fn(event => {
    event.preventDefault();
});
global.getSettings = jest.fn();
global.getSettings.mockResolvedValue({ omitkeys: 'otpauth, muh' });
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

    describe('with already opened detail view', () => {
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

    describe('with closed detail view', () => {
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

        test('empty values', () => {
            expect.assertions(2);
            return details.onEntryData(loginElement, { hallo: null, welt: undefined, empty: '' }).then(() => {
                expect(document.getElementsByClassName('detail-key').length).toBe(0);
                expect(document.getElementsByClassName('detail-clickable-value').length).toBe(0);
            });
        });

        test('filtered keys', () => {
            expect.assertions(2);
            return details.onEntryData(loginElement, { muh: 'value' }).then(() => {
                expect(document.getElementsByClassName('detail-key').length).toBe(0);
                expect(document.getElementsByClassName('detail-clickable-value').length).toBe(0);
            });
        });

        test('filtered keys is case-insensitive', () => {
            expect.assertions(2);
            return details.onEntryData(loginElement, { MuH: 'value' }).then(() => {
                expect(document.getElementsByClassName('detail-key').length).toBe(0);
                expect(document.getElementsByClassName('detail-clickable-value').length).toBe(0);
            });
        });

        test('filtered keys always hides "password"', () => {
            expect.assertions(2);
            return details.onEntryData(loginElement, { password: 'value' }).then(() => {
                expect(document.getElementsByClassName('detail-key').length).toBe(0);
                expect(document.getElementsByClassName('detail-clickable-value').length).toBe(0);
            });
        });

        test('filtered keys always hides "Password"', () => {
            expect.assertions(2);
            return details.onEntryData(loginElement, { Password: 'value' }).then(() => {
                expect(document.getElementsByClassName('detail-key').length).toBe(0);
                expect(document.getElementsByClassName('detail-clickable-value').length).toBe(0);
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
            expect.assertions(9);
            return details
                .onEntryData(loginElement, { hallo: { holla: 'waldfee', list: ['wald', 'fee'] } })
                .then(() => {
                    let keys = document.getElementsByClassName('detail-key');
                    expect(keys.length).toBe(3);
                    expect(keys[0].innerText).toBe('hallo:');
                    expect(keys[1].innerText).toBe('holla:');
                    expect(keys[2].innerText).toBe('list:');

                    let values = document.getElementsByClassName('detail-clickable-value');
                    expect(values.length).toBe(3);
                    expect(values[0].innerText).toBe('waldfee');
                    expect(values[1].innerText).toBe('wald');
                    expect(values[2].innerText).toBe('fee');

                    expect(document.getElementsByClassName('detail-nested').length).toBe(2);
                });
        });
    });

    describe('click handlers', () => {
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
            global.openURLOnEvent.mockClear();
            document.getElementsByTagName('a')[0].click();
            expect(global.openURLOnEvent.mock.calls[0][0].target.href).toEqual('https://someurl/');
        });
    });

    describe('restoreDetailView', () => {
        test('does nothing if no matching login found', () => {
            expect.assertions(2);
            global.getLocalStorageKey.mockResolvedValue('another/key');
            return details.restoreDetailView().then(() => {
                expect(document.getElementsByClassName('detail-view').length).toBe(0);
                expect(global.getLocalStorageKey.mock.calls).toEqual([['PREFIXsome.domain']]);
            });
        });

        test('does nothing if no value is returned', () => {
            expect.assertions(2);
            global.getLocalStorageKey.mockResolvedValue(null);
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
