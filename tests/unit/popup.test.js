'use strict';

const fs = require('fs');
jest.useFakeTimers();

global.logError = jest.fn();
global.getSettings = jest.fn();
global.getSettings.mockResolvedValue({ defaultfolder: 'myfolder' });
global.urlDomain = jest.fn(() => 'some.domain');
global.currentTab = { url: 'http://some.domain' };

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
            popup.switchToCreateNewDialog().then(() => {
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
            switchToEditPromise.then(() => {
                expect(document.getElementsByClassName('search')[0].style.display).toBe('none');
                expect(document.getElementsByClassName('results')[0].style.display).toBe('none');
                expect(document.getElementsByClassName('create')[0].style.display).toBe('block');
            });
        });

        test('fills in name from url', () => {
            expect.assertions(1);
            switchToEditPromise.then(() => {
                expect(document.getElementById('create_name').value).toBe('myfolder/some.domain');
            });
        });
    });

    describe('logAndDisplayError', () => {
        test('displays message', () => {
            popup.logAndDisplayError({ message: 'sample error messsage' });
            expect(document.getElementsByClassName('status-text')[0].innerHTML).toBe('sample error messsage');
        });

        test('switches back to search', () => {
            expect.assertions(3);
            popup.switchToCreateNewDialog().then(() => {
                popup.logAndDisplayError({ message: 'sample error messsage' });
                expect(document.getElementsByClassName('search')[0].style.display).toBe('block');
                expect(document.getElementsByClassName('results')[0].style.display).toBe('block');
                expect(document.getElementsByClassName('create')[0].style.display).toBe('none');
            });
        });
    });
});
