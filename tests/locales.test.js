'use strict';

let referenceKeys;

describe('Locales', () => {
    beforeEach(() => {
        const reference = require(`${__dirname}/../web-extension/_locales/en/messages.json`);
        referenceKeys = Object.keys(reference).sort();
    });

    ['de'].forEach(localeId => {
        test(`${localeId} have same keys as reference`, () => {
            const locale = require(`${__dirname}/../web-extension/_locales/${localeId}/messages.json`);
            const localeKeys = Object.keys(locale).sort();
            expect(localeKeys).toEqual(referenceKeys);
        });
    });

    ['en', 'de'].forEach(localeId => {
        test(`${localeId} entries have message and description`, () => {
            const locale = require(`${__dirname}/../web-extension/_locales/${localeId}/messages.json`);
            const localeKeys = Object.keys(locale).sort();
            localeKeys.forEach(key => {
                expect(locale[key].message);
                expect(locale[key].description);
            });
        });
    });
});

