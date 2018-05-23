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
    });
}

function switchToSearch() {
    document.getElementsByClassName('search')[0].style.display = 'block';
    document.getElementsByClassName('results')[0].style.display = 'block';
    document.getElementsByClassName('create')[0].style.display = 'none';
}

function logAndDisplayError(error) {
    console.log(error);
    switchToSearch();
    setStatusText(error.message);
}

window.tests = {
    popup: {
        armSpinnerTimeout,
        setStatusText,
        switchToCreateNewDialog,
        switchToSearch,
        logAndDisplayError,
    },
};
