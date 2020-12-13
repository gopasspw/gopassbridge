'use strict';

function initCreate() {
    document.getElementById('create_docreate').addEventListener('click', onDoCreate);
    document.getElementById('create_doabort').addEventListener('click', onDoAbort);
    document.getElementById('create_generate').addEventListener('change', onGenerateCheckboxChange);
}

function onDoCreate(event) {
    event.preventDefault();
    return getSettings().then((settings) => {
        let name = document.getElementById('create_name').value;
        if (settings['appendlogintoname']) {
            name = name + '/' + document.getElementById('create_login').value;
        }
        const message = {
            type: 'create',
            entry_name: name,
            login: document.getElementById('create_login').value,
            password: document.getElementById('create_password').value,
            length: Number(document.getElementById('create_generate_length').value),
            generate: document.getElementById('create_generate').checked,
            use_symbols: document.getElementById('create_use_symbols').checked,
        };
        armSpinnerTimeout();
        document.getElementById('create_docreate').style.display = 'none';
        document.getElementById('create_doabort').style.display = 'none';
        document.getElementById('creating').style.display = 'block';
        return sendNativeAppMessage(message).then(onCreateResult, logAndDisplayError);
    });
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
    searchTerm = urlDomain(currentPageUrl);
    searchHost(searchTerm);
}

initCreate();

window.tests = {
    create: {
        onDoCreate,
        onDoAbort,
        onGenerateCheckboxChange,
        onCreateResult,
        initCreate,
    },
};
