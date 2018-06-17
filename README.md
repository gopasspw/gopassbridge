[![Build Status](https://travis-ci.org/gopasspw/gopassbridge.svg?branch=master)](https://travis-ci.org/gopasspw/gopassbridge)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/gopasspw/gopass/blob/master/LICENSE)
[![codecov](https://codecov.io/gh/gopasspw/gopassbridge/branch/master/graph/badge.svg)](https://codecov.io/gh/gopasspw/gopassbridge)
[![Maintainability](https://api.codeclimate.com/v1/badges/2dc6eded0845ab008be7/maintainability)](https://codeclimate.com/github/gopasspw/gopassbridge/maintainability)

### Firefox:
[![Mozilla Add-on](https://img.shields.io/amo/v/gopass-bridge.svg?colorB=45bf1e)](https://addons.mozilla.org/firefox/addon/gopass-bridge/)
[![Mozilla Add-on](https://img.shields.io/amo/d/gopass-bridge.svg)](https://addons.mozilla.org/firefox/addon/gopass-bridge/)

### Chrome:
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/kkhfnlkhiapbiehimabddjbimfaijdhk.svg?colorB=45bf1e)](https://chrome.google.com/webstore/detail/gopass-bridge/kkhfnlkhiapbiehimabddjbimfaijdhk)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/users/kkhfnlkhiapbiehimabddjbimfaijdhk.svg)](https://chrome.google.com/webstore/detail/gopass-bridge/kkhfnlkhiapbiehimabddjbimfaijdhk)

# gopassbridge

A web extension for Firefox and Chrome to insert login credentials from [gopass](https://gopass.pw)

## Summary

[Gopass](https://github.com/gopasspw/gopass) is the awesome command line password manager. This plugin enables input of login credentials from gopass.
To access gopass, a native app has to be configured in the browser in addition to this plugin. 
The native app is a wrapper that calls gopass with the jsonapi parameter to communicate via stdin/stdout. 

## Quick impression

[![Watch the video](https://raw.github.com/gopasspw/gopassbridge/master/media/GopassBridgeWalkaroundPlaceholder.png)](https://youtu.be/ovOX_xP0d3s)

## Setup

### Install browser extension

#### Firefox Extension

https://addons.mozilla.org/en-US/firefox/addon/gopass-bridge/

#### Chrome / Chromium Extension

https://chrome.google.com/webstore/detail/gopass-bridge/kkhfnlkhiapbiehimabddjbimfaijdhk

#### Build and install browser extension from source

See `Makefile` release target. For Firefox, the development plugin can be installed only temporarily while for Chrome, the extracted extension can be installed permanently.

### Connect to gopass

The connection to gopass is achieved via the native messaging.
For this a native messaging manifest is necessary.

It is recommended that you set up the manifests with gopass as described in the [gopass documentation, "filling passwords from browser"](https://github.com/gopasspw/gopass/blob/master/docs/setup.md#filling-in-passwords-from-browser).
In most cases it is enough to run `gopass jsonapi configure` and follow the tutorial.

If you prefer a manual setup, example manifest configurations and a wrapper for gopass can be found in the `native-app` directory of this repository. 
Adapt the wrapper and manifest and copy them to the correct locations.

More details about Native Messaging can be found in the [Chrome](https://developer.chrome.com/apps/nativeMessaging) and [MDN](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging) documentation.

## Development

Contributions to this project are welcome!

To start with development of this extension
* clone the repo
* run `yarn` to install the dependencies
* run `make develop` to setup the development directories for Firefox and Chrome
* run `make package` to setup the release directories for Firefox and Chrome
* run `yarn test` to run all unit tests, linters and auto-formatters
* run `make run-firefox` to start an empty Firefox profile with the extension loaded and a debugger open
