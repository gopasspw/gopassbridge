# gopassbridge
A web extension for firefox and chrome to insert login credentials from [gopass](https://github.com/justwatch/gopass)

## Summary

[Gopass](https://github.com/justwatch/gopass) is the awesome command line password manager. This plugin enables input of login credentials from gopass. To access gopass, a native app has to be configured in the browser in addition to this plugin. The native app is a wrapper that calls gopass with the jsonapi parameter to communicate via stdin/stdout. 

## App Manifest configuration

Example manifest configurations and a wrapper for gopass can be found in the `native-app` directory. Adapt the wrapper and manifest and copy them to the correct locations.
More details can be found in the [Chrome](https://developer.chrome.com/apps/nativeMessaging) and [MDN](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging) documentation of native messaging.

More details for the native app config will follow ...

## Firefox Extension

https://addons.mozilla.org/en-US/firefox/addon/gopass-bridge/

## Chrome Extension

https://chrome.google.com/webstore/detail/gopass-bridge/kkhfnlkhiapbiehimabddjbimfaijdhk
