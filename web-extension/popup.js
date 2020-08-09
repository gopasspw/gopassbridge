'use strict';

let spinnerTimeout;
const SETUP_URL = 'https://github.com/gopasspw/gopass/blob/master/docs/setup.md#filling-in-passwords-from-browser';
const SETUP_ERRORS = [
    'Access to the specified native messaging host is forbidden',
    'Attempt to postMessage on disconnected port',
    'Specified native messaging host not found',
    'Native host has exited', // Chrome: gopass-jsonapi not found or other error in gopass_wrapper.sh
    'An unexpected error occurred', // Firefox: gopass-jsonapi not found or other error in gopass_wrapper.sh
];

function armSpinnerTimeout() {
    clearTimeout(spinnerTimeout);
    spinnerTimeout = setTimeout(() => {
        document.getElementById('results').innerHTML = '<div class="loader"></div>';
    }, 200);
}

function setStatusText(text) {
    clearTimeout(spinnerTimeout);
    const results = document.getElementById('results');
    const element = document.createElement('div');
    element.textContent = text;
    element.className = 'status-text';
    results.innerHTML = '';
    results.appendChild(element);
    const setupErrorElement = _getSetupErrorElement(text);
    if (setupErrorElement) {
        results.append(setupErrorElement);
    }
}

function _getSetupErrorElement(text) {
    let element = null;
    let isSetupError = SETUP_ERRORS.some(msg => {
        return text.search(msg) > -1;
    });
    if (isSetupError) {
        element = document.createElement('div');
        element.className = 'status-text';
        const anchor = document.createElement('a');
        anchor.href = SETUP_URL;
        anchor.addEventListener('click', openURLOnEvent);
        anchor.textContent = i18n.getMessage('correctlySetup');
        element.append(anchor);
    }
    return element;
}

function switchToCreateNewDialog() {
    return getSettings().then(settings => {
        document.getElementsByClassName('search')[0].style.display = 'none';
        document.getElementsByClassName('results')[0].style.display = 'none';
        document.getElementsByClassName('create')[0].style.display = 'block';
        document.getElementById('create_name').value = `${settings['defaultfolder']}/${urlDomain(currentPageUrl)}`;
        document.getElementById('create_generate_length').value = settings['defaultpasswordlength'];
        document.getElementById('create_docreate').style.display = 'block';
        document.getElementById('create_doabort').style.display = 'block';
        document.getElementById('creating').style.display = 'none';
    }, logError);
}

function switchToSearch() {
    document.getElementsByClassName('search')[0].style.display = 'block';
    document.getElementsByClassName('results')[0].style.display = 'block';
    document.getElementsByClassName('create')[0].style.display = 'none';
    document.getElementById('create_docreate').style.display = 'none';
    document.getElementById('create_doabort').style.display = 'none';
    document.getElementById('creating').style.display = 'none';
}

function logAndDisplayError(error) {
    console.log(error);
    switchToSearch();
    setStatusText(error.message);
    throw error;
}

function copyToClipboard(text) {
    const element = document.getElementById('hidden_clipboard');
    const hiddenpass = document.createElement('span');
    hiddenpass.textContent = text;
    element.appendChild(hiddenpass);
    const tempinput = document.createElement('input');
    tempinput.value = text;
    element.appendChild(tempinput);
    tempinput.select();
    document.execCommand('copy');
    tempinput.remove();
    hiddenpass.remove();
}

window.tests = {
    popup: {
        armSpinnerTimeout,
        setStatusText,
        switchToCreateNewDialog,
        switchToSearch,
        logAndDisplayError,
        copyToClipboard,
        SETUP_URL,
    },
};
