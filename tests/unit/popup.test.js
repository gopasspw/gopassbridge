'use strict';

const fs = require('node:fs');

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');

global.logError = jest.fn();
global.getSettings = jest.fn();
global.getSettings.mockResolvedValue({ defaultfolder: 'myfolder' });
global.urlDomain = jest.fn(() => 'some.domain');
global.currentPageUrl = 'http://some.domain';
global.openURLOnEvent = jest.fn();
global.i18n = {
    getMessage: jest.fn((key) => {
        return `__MSG_${key}__`;
    }),
};

require('popup.js');

const popup = window.tests.popup;
let switchToEditPromise;

describe('popup', () => {
    beforeEach(() => {
        document.body.innerHTML = fs.readFileSync(`${__dirname}/../../web-extension/gopassbridge.html`);
    });
    describe('armSpinnerTimeout', () => {
        beforeEach(() => {
            popup.armSpinnerTimeout();
            document.getElementsByClassName('loader')[0].remove();
        });
        test('sets timeout', () => {
            expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 200);
            jest.runAllTimers();
        });

        test('does not show spinner immediately', () => {
            expect(document.getElementsByClassName('loader').length).toBe(0);
            jest.runAllTimers();
            expect(document.getElementsByClassName('loader').length).toBe(1);
        });
    });

    describe('setStatusText', () => {
        beforeEach(() => {
            popup.setStatusText('an example text');
        });
        test('creates status text element in results', () => {
            expect(document.getElementsByClassName('status-text').length).toBe(1);
        });

        test('sets text content to provided message', () => {
            expect(document.getElementsByClassName('status-text')[0].innerHTML).toBe('an example text');
        });

        test('displays setup hint on certain messages', () => {
            popup.setStatusText('Attempt to postMessage on disconnected port');
            expect(document.getElementsByClassName('status-text')[1].innerHTML).toBe(
                `<a href="${popup.SETUP_URL}">__MSG_correctlySetup__</a>`
            );
        });
    });

    describe('switchToSearch', () => {
        test('does not modify dom in initial state', () => {
            const stateBefore = document.body.innerHTML;
            popup.switchToSearch();
            expect(document.body.innerHTML).toBe(stateBefore);
        });

        test('does not modify dom in initial state when switching to createNewDialog and back', () => {
            expect.assertions(1);

            const stateBefore = document.body.innerHTML;
            popup.switchToSearch();
            return popup.switchToCreateNewDialog().then(() => {
                popup.switchToSearch();
                expect(document.body.innerHTML).toBe(stateBefore);
            });
        });
    });

    describe('switchToCreateNewDialog', () => {
        beforeEach(() => {
            switchToEditPromise = popup.switchToCreateNewDialog();
        });

        test('hides search and results and shows create dialog', () => {
            expect.assertions(3);
            return switchToEditPromise.then(() => {
                expect(document.getElementsByClassName('search')[0].style.display).toBe('none');
                expect(document.getElementsByClassName('results')[0].style.display).toBe('none');
                expect(document.getElementsByClassName('create')[0].style.display).toBe('block');
            });
        });

        test('fills in name from url', () => {
            expect.assertions(1);
            return switchToEditPromise.then(() => {
                expect(document.getElementById('create_name').value).toBe('myfolder/some.domain');
            });
        });
    });

    describe('logAndDisplayError', () => {
        test('displays message', () => {
            expect(() => {
                popup.logAndDisplayError({ message: 'sample error messsage' });
            }).toThrow({ message: 'sample error messsage' });
            expect(document.getElementsByClassName('status-text')[0].innerHTML).toBe('sample error messsage');
        });

        test('switches back to search', () => {
            expect.assertions(4);
            return popup.switchToCreateNewDialog().then(() => {
                expect(() => {
                    popup.logAndDisplayError({ message: 'sample error messsage' });
                }).toThrow({ message: 'sample error messsage' });
                expect(document.getElementsByClassName('search')[0].style.display).toBe('block');
                expect(document.getElementsByClassName('results')[0].style.display).toBe('block');
                expect(document.getElementsByClassName('create')[0].style.display).toBe('none');
            });
        });
    });

    describe('copyToClipboard', () => {
        test('basic test - functionality will be removed in #49', () => {
            document.execCommand = jest.fn();
            popup.copyToClipboard('muh');
            expect(document.execCommand).toHaveBeenCalledTimes(1);
        });
    });
});
