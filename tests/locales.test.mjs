import { beforeEach, describe, expect, test } from 'vitest';
import deMessages from '../web-extension/_locales/de/messages.json';
import enMessages from '../web-extension/_locales/en/messages.json';

let referenceKeys;

const messages = {
    de: deMessages,
    en: enMessages,
};

describe('Locales', () => {
    beforeEach(() => {
        referenceKeys = Object.keys(enMessages).sort();
    });

    ['de'].forEach((localeId) => {
        test(`${localeId} have same keys as reference`, () => {
            const localeKeys = Object.keys(messages[localeId]).sort();
            expect(localeKeys).toEqual(referenceKeys);
        });
    });

    ['en', 'de'].forEach((localeId) => {
        test(`${localeId} entries have message and description`, () => {
            const locale = messages[localeId];
            const localeKeys = Object.keys(locale).sort();
            localeKeys.forEach((key) => {
                expect(locale[key].message).toBeDefined();
                expect(locale[key].description).toBeDefined();
            });
        });
    });
});
