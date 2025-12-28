import { beforeEach, vi } from 'vitest';

beforeEach(() => {
    const mockBrowser = {
        runtime: {
            onMessage: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
            sendMessage: vi.fn().mockResolvedValue({}),
            sendNativeMessage: vi.fn(),
            getManifest: vi.fn(() => ({ version: '1.0.0' })),
            getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
        },
        tabs: {
            query: vi.fn(),
            sendMessage: vi.fn().mockResolvedValue({}),
            create: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
            onUpdated: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
            onActivated: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
        },
        windows: {
            create: vi.fn(),
            remove: vi.fn(),
            onRemoved: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
        },
        storage: {
            local: {
                get: vi.fn((key, callback) => {
                    const value = { [key]: `_mock_${key}_` };
                    return callback ? callback(value) : Promise.resolve(value);
                }),
                set: vi.fn((_items, callback) => (callback ? callback() : Promise.resolve())),
                remove: vi.fn((_keys, callback) => (callback ? callback() : Promise.resolve())),
                clear: vi.fn(() => Promise.resolve()),
            },
            sync: {
                get: vi.fn((_keys, callback) => (callback ? callback({}) : Promise.resolve({}))),
                set: vi.fn((_items, callback) => (callback ? callback() : Promise.resolve())),
                remove: vi.fn((_keys, callback) => (callback ? callback() : Promise.resolve())),
                clear: vi.fn(() => Promise.resolve()),
            },
            onChanged: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
        },
        i18n: {
            getMessage: vi.fn((key) => `__translated_${key}__`),
        },
        extension: {
            getViews: vi.fn(() => []),
            getBackgroundPage: vi.fn(),
        },
        webRequest: {
            onAuthRequired: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
        },
        notifications: {
            create: vi.fn(),
        },
    };

    vi.stubGlobal('browser', mockBrowser);
    vi.stubGlobal('chrome', mockBrowser);
    vi.stubGlobal('i18n', mockBrowser.i18n);
});
