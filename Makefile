run-firefox:
		web-ext run -v --browser-console -s $(CURDIR)/firefox

develop:
		rm -rf chrome firefox
		mkdir chrome firefox
		cd chrome; ln -s ../manifests/chrome-manifest.json manifest.json
		cd firefox; ln -s ../manifests/firefox-manifest.json manifest.json
		cd chrome; ln -s ../web-extension/* .
		cd firefox; ln -s ../web-extension/* .

release:
		rm -rf chrome-release firefox-release
		mkdir chrome-release firefox-release
		cd chrome-release; cp ../manifests/chrome-manifest.json manifest.json
		cd firefox-release; cp ../manifests/firefox-manifest.json manifest.json
		cd chrome-release; cp -R ../web-extension/* .
		cd firefox-release; cp -R ../web-extension/* .

		cp chrome.pem chrome-release/key.pem

		rm -f chrome.zip
		cd chrome-release; zip -r ../chrome.zip .

		web-ext -s $(CURDIR)/firefox-release lint
		web-ext -s $(CURDIR)/firefox-release build
