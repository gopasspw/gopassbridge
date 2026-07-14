import fs from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('create', () => {
    let create;

    beforeEach(async () => {
        vi.stubGlobal('armSpinnerTimeout', vi.fn());
        vi.stubGlobal('sendNativeAppMessage', vi.fn());
        vi.stubGlobal('getSettings', vi.fn());
        global.getSettings.mockResolvedValue({ appendlogintoname: true });
        vi.stubGlobal('switchToSearch', vi.fn());
        vi.stubGlobal('setStatusText', vi.fn());
        vi.stubGlobal(
            'urlDomain',
            vi.fn(() => 'domain.test')
        );
        vi.stubGlobal('searchHost', vi.fn());
        vi.stubGlobal('logAndDisplayError', vi.fn());
        vi.stubGlobal('currentPageUrl', 'http://domain.test');
        vi.stubGlobal('searchTerm', '');

        document.body.innerHTML = fs.readFileSync(
            path.join(import.meta.dirname, '../../web-extension/gopassbridge.html'),
            'utf8'
        );
        create = await import('gopassbridge/web-extension/create.js');
    });

    test('doAbort switches to search', () => {
        create.onDoAbort();
        expect(global.switchToSearch).toHaveBeenCalledTimes(1);
    });

    describe('onDoCreate', () => {
        let mockEvent;
        let promise;

        beforeEach(() => {
            mockEvent = { preventDefault: vi.fn() };
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
                        entry_name: '/',
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

        test('sends native message without appended login if setting disabled', async () => {
            vi.stubGlobal('getSettings', vi.fn().mockResolvedValue({ appendlogintoname: false }));

            await create.onDoCreate(mockEvent);

            const lastCallArgs = global.sendNativeAppMessage.mock.lastCall;
            expect(lastCallArgs[0]).toEqual({
                entry_name: '',
                generate: true,
                length: 24,
                login: '',
                password: '',
                type: 'create',
                use_symbols: true,
            });
        });

        test('starts query after successful finishing', async () => {
            await promise;
            expect(global.searchHost).toHaveBeenCalledTimes(1);
            expect(global.getSettings).toHaveBeenCalledTimes(1);
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
                expect(password.placeholder).toBe('__translated_createPasswordAutogeneratePlaceholder__');
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
                expect(password.placeholder).toBe('__translated_createPasswordPlaceholder__');
            });

            test('length and use symbols are disable', () => {
                expect(length.disabled).toBe(true);
                expect(use_symbols.disabled).toBe(true);
            });
        });
    });

    describe('initCreate', () => {
        ['create_docreate', 'create_doabort', 'create_generate'].forEach((id) => {
            test(`registers eventhandler for ${id}`, () => {
                const element = document.getElementById('create_docreate');
                vi.spyOn(element, 'addEventListener');
                create.initCreate();
                expect(element.addEventListener).toHaveBeenCalledTimes(1);
            });
        });
    });
});
