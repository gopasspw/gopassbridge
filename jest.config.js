'use strict';

module.exports = {
    verbose: true,
    modulePaths: [
        'web-extension'
    ],
    coverageDirectory: "./coverage/",
    collectCoverage: true,
    testEnvironment: "jest-environment-jsdom-global"
};
