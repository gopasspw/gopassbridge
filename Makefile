LOCAL_WEB_EXT=node_modules/.bin/web-ext

run-firefox: develop
		$(LOCAL_WEB_EXT) run -v --browser-console -s $(CURDIR)/firefox -u https://github.com/login

develop: format
		rm -rf chrome firefox
		mkdir chrome firefox
		cd chrome; cp ../manifests/chrome-manifest-dev.json manifest.json
		cd firefox; cp ../manifests/firefox-manifest.json manifest.json
		cd chrome; cp -R ../web-extension/* .
		cd firefox; cp -R ../web-extension/* .

package: format
		rm -rf chrome-release firefox-release
		mkdir chrome-release firefox-release
		cd chrome-release; cp ../manifests/chrome-manifest.json manifest.json
		cd firefox-release; cp ../manifests/firefox-manifest.json manifest.json
		cd chrome-release; cp -R ../web-extension/* .
		cd firefox-release; cp -R ../web-extension/* .

release: package
		cp chrome.pem chrome-release/key.pem

		rm -f chrome.zip
		cd chrome-release; zip -r ../chrome.zip .

		$(LOCAL_WEB_EXT) -s $(CURDIR)/firefox-release lint
		$(LOCAL_WEB_EXT) -s $(CURDIR)/firefox-release build --overwrite-dest

clean:
		rm -rf chrome firefox chrome-release firefox-release chrome.zip webextension-polyfill

format:
		npm run format

webextension-polyfill: clean
	    git clone https://github.com/mozilla/webextension-polyfill.git
		cd webextension-polyfill && yarn
		cp webextension-polyfill/dist/browser-polyfill.js web-extension/vendor/
		rm -rf webextension-polyfill
