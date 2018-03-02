run-firefox: develop
		web-ext run -v --browser-console -s $(CURDIR)/firefox

develop: format
		rm -rf chrome firefox
		mkdir chrome firefox
		cd chrome; cp ../manifests/chrome-manifest-dev.json manifest.json
		cd firefox; cp ../manifests/firefox-manifest.json manifest.json
		cd chrome; cp -R ../web-extension/* .
		cd firefox; cp -R ../web-extension/* .

test_release:
		rm -rf chrome-release firefox-release
		mkdir chrome-release firefox-release
		cd chrome-release; cp ../manifests/chrome-manifest.json manifest.json
		cd firefox-release; cp ../manifests/firefox-manifest.json manifest.json
		cd chrome-release; cp -R ../web-extension/* .
		cd firefox-release; cp -R ../web-extension/* .

release: format
		rm -rf chrome-release firefox-release
		mkdir chrome-release firefox-release
		cd chrome-release; cp ../manifests/chrome-manifest.json manifest.json
		cd firefox-release; cp ../manifests/firefox-manifest.json manifest.json
		cd chrome-release; cp -R ../web-extension/* .;  gsed -i '/\/\/ Not required at runtime, only to access functions in tests/Q' *
		cd firefox-release; cp -R ../web-extension/* .;  gsed -i '/\/\/ Not required at runtime, only to access functions in tests/Q' *

		cp chrome.pem chrome-release/key.pem

		rm -f chrome.zip
		cd chrome-release; zip -r ../chrome.zip .

		web-ext -s $(CURDIR)/firefox-release lint
		web-ext -s $(CURDIR)/firefox-release build --overwrite-dest

clean:
		rm -rf chrome firefox chrome-release firefox-release chrome.zip

format:
		prettier --write web-extension/*.js web-extension/*.css tests/**/*.js
