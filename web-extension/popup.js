'use strict';

let spinnerTimeout;

function armSpinnerTimeout() {
    clearTimeout(spinnerTimeout);
    spinnerTimeout = setTimeout(() => {
        document.getElementById('results').innerHTML = '<div class="loader"></div>';
    }, 200);
}

function setStatusText(text) {
    const results = document.getElementById('results');
    const element = document.createElement('div');
    element.textContent = text;
    element.className = 'status-text';
    results.innerHTML = '';
    results.appendChild(element);
}

function switchToCreateNewDialog() {
    return getSettings().then(settings => {
        document.getElementsByClassName('search')[0].style.display = 'none';
        document.getElementsByClassName('results')[0].style.display = 'none';
        document.getElementsByClassName('create')[0].style.display = 'block';
        document.getElementById('create_name').value = `${settings['defaultfolder']}/${urlDomain(currentTab.url)}`;
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
    },
};
