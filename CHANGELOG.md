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
