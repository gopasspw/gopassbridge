'use strict';

require('generic.js');

const generic = window.tests.generic;

describe('getSyncStorage', () => {
    afterEach(() => {
        chrome.storage.sync.get = jest.fn((_, cb) => cb(null));
    });

    test('loads defaults if no entry provided', () => {
        const mockOnResult = jest.fn();
        const mockOnError = jest.fn();
        generic.getSyncStorage(mockOnResult, mockOnError);
        expect(mockOnResult.mock.calls[0]).toEqual([generic.DEFAULT_SETTINGS]);
        expect(mockOnError.mock.calls.length).toEqual(0);
    });

    test('calls error callback on error', () => {
        chrome.storage.sync.get = jest.fn((_, cb) => cb(null));
        const mockOnResult = jest.fn();
        const mockOnError = jest.fn();
        generic.getSyncStorage(mockOnResult, mockOnError);
        expect(mockOnResult.mock.calls[0]).toEqual(undefined);
        expect(mockOnError.mock.calls.length).toEqual(1);
    });

    test('mixes defaults and stored entries', () => {
        const changes = { defaultfolder: 'MySpecialFolder', anothersetting: false };
        chrome.storage.sync.get = jest.fn((_, cb) => cb(changes));
        const mockOnResult = jest.fn();
        const mockOnError = jest.fn();
        generic.getSyncStorage(mockOnResult, mockOnError);
        expect(mockOnResult.mock.calls[0]).toEqual([Object.assign(changes, generic.DEFAULT_SETTINGS)]);
    });
});

describe('executeOnSetting', () => {
    afterEach(() => {
        chrome.storage.sync.get = jest.fn();
    });

    test('executes callback when setting turned on', () => {
        chrome.storage.sync.get = jest.fn((_, cb) => cb({ mysetting: true }));
        const mockOnTrue = jest.fn();
        const mockOnFalse = jest.fn();
        generic.executeOnSetting('mysetting', mockOnTrue, mockOnFalse);
        expect(mockOnTrue.mock.calls.length).toEqual(1);
        expect(mockOnFalse.mock.calls.length).toEqual(0);
    });

    test('does not execute callback when setting turned off', () => {
        chrome.storage.sync.get = jest.fn((_, cb) => cb({ mysetting: false }));
        const mockOnTrue = jest.fn();
        const mockOnFalse = jest.fn();
        generic.executeOnSetting('mysetting', mockOnTrue, mockOnFalse);
        expect(mockOnTrue.mock.calls.length).toEqual(0);
        expect(mockOnFalse.mock.calls.length).toEqual(1);
    });

    test('does not execute callback when setting does not exist', () => {
        chrome.storage.sync.get = jest.fn((_, cb) => cb({ mysetting: false }));
        const mockOnTrue = jest.fn();
        const mockOnFalse = jest.fn();
        generic.executeOnSetting('nonexistent', mockOnTrue, mockOnFalse);
        expect(mockOnTrue.mock.calls.length).toEqual(0);
        expect(mockOnFalse.mock.calls.length).toEqual(1);
    });
});

describe('sendNativeMessage', () => {
    afterEach(() => {
        chrome.runtime.sendNativeMessage = jest.fn();
    });

    test('sends message with response on success', () => {
        chrome.runtime.sendNativeMessage = jest.fn((_, __, cb) => cb({ maeh: '123' }));
        const mockOnResult = jest.fn();
        const mockOnError = jest.fn();
        generic.sendNativeMessage({ payload: 'muh' }, mockOnResult, mockOnError);
        expect(mockOnResult.mock.calls[0]).toEqual([{ maeh: '123' }]);
        expect(mockOnError.mock.calls.length).toEqual(0);
    });

    test('calls error handler on failure', () => {
        chrome.runtime.sendNativeMessage = jest.fn((_, __, cb) => cb(null));
        const mockOnResult = jest.fn();
        const mockOnError = jest.fn();
        generic.sendNativeMessage({ payload: 'muh' }, mockOnResult, mockOnError);
        expect(mockOnResult.mock.calls[0]).toEqual(undefined);
        expect(mockOnError.mock.calls.length).toEqual(1);
    });
});

describe('urlDomain', () => {
    test('extracts hostname', () => {
        expect(generic.urlDomain('http://www.muh.maeh.de:80/some/path?maeh')).toEqual('www.muh.maeh.de');
    });
});

describe('localStorage wrappers', () => {
    test('set, get and remove key', () => {
        const mockOnSet = jest.fn();
        const mockOnGet = jest.fn();
        const mockOnRemove = jest.fn();

        generic.setLocalStorageKey('muh', 123, mockOnSet);
        expect(mockOnSet.mock.calls.length).toEqual(1);

        generic.getLocalStorage('muh', mockOnGet);
        expect(mockOnGet.mock.calls[0]).toEqual([{ muh: 123 }]);

        generic.removeLocalStorage('muh', mockOnRemove);
        expect(mockOnRemove.mock.calls.length).toEqual(1);

        generic.getLocalStorage('muh', mockOnGet);
        expect(mockOnGet.mock.calls[1]).toEqual([{ muh: undefined }]);
    });
});

describe('createButtonWithCallback', () => {
    test('callback works', () => {
        const buttonCbMock = jest.fn();
        const button = generic.createButtonWithCallback('myclass', 'the text', 'border: 5px red;', buttonCbMock);
        expect(buttonCbMock.mock.calls.length).toBe(0);
        button.click();
        expect(buttonCbMock.mock.calls.length).toBe(1);
        expect(button.style._values.border).toEqual('5px red');
    });
});
