'use strict';

module.exports = {
    setupFiles: [
        'jest-webextension-mock'
    ],
    verbose: true,
    modulePaths: [
        'web-extension'
    ],
    coverageDirectory: './coverage/',
    collectCoverage: true,
    testEnvironment: 'jest-environment-jsdom-global'
};
