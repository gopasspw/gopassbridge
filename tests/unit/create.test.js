'use strict';

const fs = require('fs');

global.armSpinnerTimeout = jest.fn();
global.sendNativeAppMessage = jest.fn();
global.sendNativeAppMessage.mockResolvedValue({});
global.switchToSearch = jest.fn();
global.setStatusText = jest.fn();
global.urlDomain = jest.fn(() => 'some.domain');
global.searchHost = jest.fn();
global.logAndDisplayError = jest.fn();
global.currentPageUrl = 'http://some.domain';
global.searchTerm = '';
global.i18n = {
    getMessage: jest.fn(key => {
        return `__MSG_${key}__`;
    }),
};

document.body.innerHTML = fs.readFileSync(`${__dirname}/../../web-extension/gopassbridge.html`);
require('create.js');

let mockEvent, promise;
const create = window.tests.create;

describe('create', () => {
    afterEach(() => {
        global.armSpinnerTimeout.mockReset();
        global.sendNativeAppMessage.mockReset();
        global.searchHost.mockReset();
        global.urlDomain.mockReset();
        global.switchToSearch.mockReset();
        global.logAndDisplayError.mockReset();
    });

    test('doAbort switches to search', () => {
        create.onDoAbort();
        expect(global.switchToSearch).toHaveBeenCalledTimes(1);
        global.switchToSearch.mockReset();
    });

    describe('onDoCreate', () => {
        beforeEach(() => {
            mockEvent = { preventDefault: jest.fn() };
            global.sendNativeAppMessage.mockResolvedValue({});
            promise = create.onDoCreate(mockEvent);
        });

        test('prevents event bubbling', () => {
            expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
        });

        test('arms loading spinner', () => {
            expect(global.armSpinnerTimeout).toHaveBeenCalledTimes(1);
        });

        test('sends native message', () => {
            expect(global.sendNativeAppMessage.mock.calls).toEqual([
                [
                    {
                        entry_name: '',
                        generate: true,
                        length: 24,
                        login: '',
                        password: '',
                        type: 'create',
                        use_symbols: true,
                    },
                ],
            ]);
        });

        test('starts query after successful finishing', () => {
            expect.assertions(1);
            promise.then(() => {
                expect(global.searchHost).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('onCreateResult', () => {
        describe('response without error', () => {
            beforeEach(() => {
                create.onCreateResult({});
            });

            test('switches to search', () => {
                expect(global.switchToSearch).toHaveBeenCalledTimes(1);
            });

            test('triggers host search', () => {
                expect(global.searchHost).toHaveBeenCalledTimes(1);
            });

            test('does not set status text', () => {
                expect(global.setStatusText).toHaveBeenCalledTimes(0);
            });
        });

        describe('response with error', () => {
            beforeEach(() => {
                create.onCreateResult({ error: 'some error' });
            });

            afterEach(() => {
                global.setStatusText.mockClear();
            });

            test('switches to search', () => {
                expect(global.switchToSearch).toHaveBeenCalledTimes(1);
            });

            test('does not trigger host search', () => {
                expect(global.searchHost).toHaveBeenCalledTimes(0);
            });

            test('sets status text', () => {
                expect(global.setStatusText.mock.calls).toEqual([['some error']]);
            });
        });
    });

    describe('onGenerateCheckboxChange', () => {
        describe('uncheck and check rountrip generate password', () => {
            let password, length, use_symbols;

            beforeEach(() => {
                password = document.getElementById('create_password');
                length = document.getElementById('create_generate_length');
                use_symbols = document.getElementById('create_use_symbols');
                password.value = 'muh';
                create.onGenerateCheckboxChange({ target: { checked: false } });
                create.onGenerateCheckboxChange({ target: { checked: true } });
            });

            test('is checked', () => {
                expect(password.disabled).toBe(true);
            });

            test('has no value and placeholder is set to autogenerate', () => {
                expect(password.value).toBe('');
                expect(password.placeholder).toBe('__MSG_createPasswordAutogeneratePlaceholder__');
            });

            test('length and use symbols are enabled', () => {
                expect(length.disabled).toBe(false);
                expect(use_symbols.disabled).toBe(false);
            });
        });

        describe('uncheck generate password', () => {
            let password, length, use_symbols;

            beforeEach(() => {
                password = document.getElementById('create_password');
                length = document.getElementById('create_generate_length');
                use_symbols = document.getElementById('create_use_symbols');

                create.onGenerateCheckboxChange({ target: { checked: false } });

                password.value = 'muh';
            });

            test('is checked', () => {
                expect(password.disabled).toBe(false);
            });

            test('has value and placeholder is set to autogenerate', () => {
                expect(password.value).toBe('muh');
                expect(password.placeholder).toBe('__MSG_createPasswordPlaceholder__');
            });

            test('length and use symbols are disable', () => {
                expect(length.disabled).toBe(true);
                expect(use_symbols.disabled).toBe(true);
            });
        });
    });

    describe('initCreate', () => {
        ['create_docreate', 'create_doabort', 'create_generate'].forEach(id => {
            test(`registers eventhandler for ${id}`, () => {
                const element = document.getElementById('create_docreate');
                spyOn(element, 'addEventListener');
                create.initCreate();
                expect(element.addEventListener).toHaveBeenCalledTimes(1);
            });
        });
    });
});
