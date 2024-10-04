# Release new version

 1. Determine next version x.y.z. Follow semantic versioning to mark breaking changes.
 2. Create new commit "Release x.y.z" with updated version in following files:
    - chrome-manifest.json
    - chrome-manifest-dev.json
    - firefox-manifest.json
    - package.json
 3. Create release notes in `CHANGELOG.md` and push to your branch
 4. Create pull request for master branch
 5. Manually test state of pull request in Firefox and Chrome locally
 6. Merge pull request to master
 7. Create new `git tag vx.y.z` for release commit and push tag
 8. Create new GitHub release and include changelog
 9. Ensure you have the `chrome.pem` key for uploading to the Chrome Store
10. Run `make release` to build the release packages
11. Upload `web-ext-artifacts/*.zip` for Firefox: https://addons.mozilla.org/en-US/developers/addons
12. Upload `chrome.zip` for Chrome: https://chrome.google.com/webstore/developer/dashboard
