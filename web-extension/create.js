'use strict';

document.getElementById('create_docreate').addEventListener('click', onDoCreate);
document.getElementById('create_doabort').addEventListener('click', onDoAbort);
document.getElementById('create_generate').addEventListener('change', onGenerateCheckboxChange);

function switchToSearch() {
    document.getElementsByClassName('search')[0].style.display = 'block';
    document.getElementsByClassName('results')[0].style.display = 'block';
    document.getElementsByClassName('create')[0].style.display = 'none';
}

function onDoCreate(event) {
    event.preventDefault();
    const message = {
        type: 'create',
        entry_name: document.getElementById('create_name').value,
        login: document.getElementById('create_login').value,
        password: document.getElementById('create_password').value,
        length: Number(document.getElementById('create_generate_length').value),
        generate: document.getElementById('create_generate').checked,
        use_symbols: document.getElementById('create_use_symbols').checked,
    };
    sendNativeMessage(message, onCreateResult, onCreateError);
}

function onDoAbort() {
    switchToSearch();
}

function onGenerateCheckboxChange(event) {
    const password = document.getElementById('create_password');
    if (event.target.checked) {
        password.value = '';
        password.placeholder = i18n.getMessage('createPasswordAutogeneratePlaceholder');
    } else {
        password.placeholder = i18n.getMessage('createPasswordPlaceholder');
    }
    password.disabled = event.target.checked;
    document.getElementById('create_generate_length').disabled = !event.target.checked;
    document.getElementById('create_use_symbols').disabled = !event.target.checked;
}

function onCreateResult(response) {
    switchToSearch();
    if (response.error) {
        setStatusText(response.error);
        return;
    }
    console.log('created');
    searchTerm = urlDomain(currentTab.url);
    searchHost(searchTerm);
}

function onCreateError(error) {
    console.log(error);
    switchToSearch();
    setStatusText(error.message);
}
