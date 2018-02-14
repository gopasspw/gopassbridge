[![Build Status](https://travis-ci.org/martinhoefling/gopassbridge.svg?branch=master)](https://travis-ci.org/martinhoefling/gopassbridge)
[![codecov](https://codecov.io/gh/martinhoefling/gopassbridge/branch/master/graph/badge.svg)](https://codecov.io/gh/martinhoefling/gopassbridge)

# gopassbridge

A web extension for firefox and chrome to insert login credentials from [gopass](https://github.com/justwatchcom/gopass)

## Summary

[Gopass](https://github.com/justwatchcom/gopass) is the awesome command line password manager. This plugin enables input of login credentials from gopass.
To access gopass, a native app has to be configured in the browser in addition to this plugin. 
The native app is a wrapper that calls gopass with the jsonapi parameter to communicate via stdin/stdout. 

## Setup

### Install browser extension

#### Firefox Extension

[https://addons.mozilla.org/en-US/firefox/addon/gopass-bridge/](https://addons.mozilla.org/en-US/firefox/addon/gopass-bridge/)

#### Chrome / Chromium Extension

[https://chrome.google.com/webstore/detail/gopass-bridge/kkhfnlkhiapbiehimabddjbimfaijdhk](https://chrome.google.com/webstore/detail/gopass-bridge/kkhfnlkhiapbiehimabddjbimfaijdhk)

### Build and install browser extension from source

See `Makefile` release target. For firefox, the development plugin can be installed only temporarily while for chrome, the extracted extension can be installed permanently.

### Native Messaging App Manifest Configuration

It is recommended that you set up the manifests with gopass as described in the [gopass documentation, "filling passwords from browser"](https://github.com/justwatchcom/gopass/blob/master/docs/setup.md#filling-in-passwords-from-browser).

If you prefer a manual setup, example manifest configurations and a wrapper for gopass can be found in the `native-app` directory of this repository. 
Adapt the wrapper and manifest and copy them to the correct locations.

More details about Native Messaging can be found in the [Chrome](https://developer.chrome.com/apps/nativeMessaging) and [MDN](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging) documentation.
