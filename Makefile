LOCAL_PRETTIER=node_modules/.bin/prettier

run-firefox: develop
		web-ext run -v --browser-console -s $(CURDIR)/firefox

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

		web-ext -s $(CURDIR)/firefox-release lint
		web-ext -s $(CURDIR)/firefox-release build --overwrite-dest

clean:
		rm -rf chrome firefox chrome-release firefox-release chrome.zip webextension-polyfill

format:
		PRETTIER_CMD=prettier; if [ -e $(LOCAL_PRETTIER) ]; then PRETTIER_CMD=$(LOCAL_PRETTIER); fi; \
		$$PRETTIER_CMD --write web-extension/*.js web-extension/*.css tests/**/*.js

webextension-polyfill: clean
	    git clone https://github.com/mozilla/webextension-polyfill.git
		cd webextension-polyfill && yarn
		cp webextension-polyfill/dist/browser-polyfill.js web-extension/vendor/
		rm -rf webextension-polyfill
