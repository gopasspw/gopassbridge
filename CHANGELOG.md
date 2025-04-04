## 2.1.0 / 2024-11-17

* Support dark mode (#266, #270)

## 2.0.0 / 2024-10-12

* Migrate Chrome extension to Manifest V3 (#261)
  * Note: Firefox extension will be migrated separately to reduce the risk in case of bugs
* Fix link to changelog from options (#260)
* Document security policy and supported versions: https://github.com/gopasspw/gopassbridge/security

## 1.0.0 / 2024-10-05

* Select first entry even if create login is shown (#223)
* Update setup error detection and installation help message (#257)
* Upgrade webextension-polyfill to v0.12.0 (#253)
* Upgrade regex-weburl.js to latest version (#255)
* Prepare for upcoming Manifest V3 changes

## 0.9.0 / 2022-04-08

* Fix a glitch in a German translation
* Add option to create new credentials against an already-saved site
* Hide password in detail view when using gopass v1.10

## 0.8.0 / 2020-08-20

* Copy passwords to clipboard directly via gopass, including auto-clearing of clipboard (#147)
* Prepare documentation for gopass v1.10 release (#165)
* Improve error handling for transition to separate gopass-jsonapi binary in gopass v1.10 (#166)
* Upgrade browser-polyfill.js to v0.6.0 (#162)

## 0.7.0 / 2020-03-25

* Improve error message when gopass setup is incomplete (#139)
* Better handling for secret paths on Windows (#122)
* Add tooltips to search results (#144)
* Reduce requested web extension permissions (#145)

## 0.6.2 / 2020-02-21

* Add option to append login name to gopass path during login creation (disabled by default) (#134)
* Omit "totp" from being displayed by default (#137)

## 0.6.1 / 2020-01-20

* Re-upload of 0.6.0 for Firefox (#135)

## 0.6.0 / 2019-12-29

* Do not display empty values in detail view, allow filtering (#114)
* Make urls absolute when opening them, fixes (#106)
* Add version check (currently minimum supported gopass version set to 1.8.5)
* Make default password length configurable and set to gopass default (#126)
* Add explanation how to change default shortcut (#124)

## 0.5.1 / 2019-01-06

* Set minimum supported browser versions to Chrome 63 and Firefox 60 (#102)
* Fix error handling and reporting when setup is not complete (#97, #93)
* Fix browser crash when jsonapi not configured (#104, #105)

## 0.5.0 / 2018-12-31

* Support filling in basic auth credentials (can be turned off in settings) (#99)
* Add button to open URL of entry in new tab (shortcut Ctrl+Click) (#71)
* Add feedback when saving a new secret (#84)
* Add saving indicator to settings (#61)
* Support frames similar to iframes (#77)
* Fix missing values after input events (#92)
* Document keyboard shortcut in "Usage Hints" (#80)

## 0.4.0 / 2018-06-16

* Detail view and buttons for copy
* Credentials are now inserted via background script to prevent closing via pinentry
* Tests added for most parts of the code

## 0.3.0 / 2018-05-03

* Fix focused case for iframes
* Fix focus of search field on firefox on open
* Store last search and replay if host query not found
* Simplify build process by binding functions to window for testing
* Setup i18n, translate to german

## 0.2.2 / 2018-03-03

* Remove module exports only required for tests on release bundling to prevent errors

## 0.2.1 / 2018-02-10

* Prefer password fields with larger tabIndex. Prevents selection of decoy fields

## 0.2 / 2018-02-05

* Prefer focused fields instead of taking the first one
* Also fill into iframes if iframes source starts with same domain

## 0.1.1 / 2018-01-02

* Bugfix. Fixes missing content script injection

## 0.1 / 2018-01-01

* Allow creating new secrets
* Bugfix if no input was found

## 0.0.7 / 2017-11-19

* Ignore list for input ids to fix login in jira and aws console
* Shift + click to copy secret in clipboard

## 0.0.6 / 2017-10-23

* Also partially match input ids if no input field with matching id was found

## 0.0.5 / 2017-09-29

* Renamed native app to com.justwatch.gopass to comply with native messaging setup functionality in gopass

## 0.0.4 / 2017-09-15

* Browser shortcut Ctrl+Shift+U added
* Improve host based search
* Settings for marking fields in blue and submit after fill
 
## 0.0.3 / 2017-09-10
