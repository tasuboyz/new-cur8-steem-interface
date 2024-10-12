let drafts = [];
let client;
let usernameSelected = '';

class ApiClient {
    constructor(baseUrl = 'https://imridd.eu.pythonanywhere.com/api/steem') {
        this.apiKey = 'your_secret_api_key';
        this.baseUrl = baseUrl;
    }

    async sendRequest(endpoint, method, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'API-Key': this.apiKey
            },
            body: data ? JSON.stringify(data) : null
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    async checkLogin(idTelegram) {
        return this.sendRequest('/check_login', 'POST', { id_telegram: idTelegram });
    }

    async login(idTelegram, username, postingKey) {
        return this.sendRequest('/login', 'POST', { id_telegram: idTelegram, username, posting_key: postingKey });
    }

    async logout(idTelegram, username) {
        return this.sendRequest('/logout', 'POST', { id_telegram: idTelegram, username });
    }

    async searchCommunty(){
        return this.sendRequest('/communities', 'GET');
    }
}

async function initializeApp(userId, fromOut) {
    client = new ApiClient();
    try {
        document.getElementById('spinner').classList.remove('hide');
        const result = await client.checkLogin(userId);
        console.log(result);
        if (fromOut && (!result.usernames || result.usernames.length === 0)) {
            document.getElementById('spinner').classList.add('hide');
            displayResult({ error: 'Nessun account trovato' }, 'error', true);
            return;
        }
        const usernames = result.usernames;
        enableNavigationButtons();
        showAccountList(usernames);
        initializeEnd(result);
    } catch (error) {
        showContent('account');
        displayResult({ error: 'Effettua il login' }, 'error', true);
        console.error('Error in initialize app:', error);
        document.getElementById('spinner').classList.add('hide');
    }
}

/////////////////////////////////////////////////////////////////////////////
//Account management

async function handleLogin() {
    const telegramId = await initializeTelegram();
    if (telegramId) {
        try {
            document.getElementById('spinner').classList.add('hide');
            const result = await client.checkLogin(telegramId);
            console.log(result);
            if (result.usernames && result.usernames.length > 0) {
                showAccountList(result.usernames);
                displayResult({ success: 'Login successful' }, 'success', true);
            } else {
                displayResult({ error: 'No accounts found' }, 'error', true);
            }
        } catch (error) {
            displayResult({ error: 'Login check failed: ' + error.message }, 'error', true);
        }
    } else {
        displayResult({ error: 'Telegram ID not available' }, 'error', true);
    }
}

function showAccountList(usernames) {
    console.log(usernames);
    const accountList = document.getElementById('accountList');
    accountList.innerHTML = '';
    usernames.forEach(username => {
        const listItem = document.createElement('div');
        listItem.className = 'container-username';
        
        const img = document.createElement('img');
        img.alt = `${username.username}'s profile image`;
        img.classList.add('profile-image-thumbnail');
        if (username.profile_image) {
            img.src = username.profile_image;
        } else {
            img.src = 'https://fonts.gstatic.com/s/i/materialiconsoutlined/account_circle/v6/24px.svg';
        }
        
        const usernameSpan = document.createElement('span');
        usernameSpan.textContent = username.username;
        
        listItem.appendChild(img);
        listItem.appendChild(usernameSpan);
        
        listItem.onclick = () => {
            usernameSelected = username.username;
            document.querySelectorAll('.container-username').forEach(item => item.classList.remove('selected'));
            listItem.classList.add('selected');
        };
        accountList.appendChild(listItem);
    });
    
    if (usernames.length > 0) {
        usernameSelected = usernames[0].username;
        accountList.firstChild.classList.add('selected');
    }
}

async function addNewAccount() {
    const loginForm = document.getElementById('loginForm');
    loginForm.style.display = 'block';
    document.getElementById('username').value = '';
    document.getElementById('postingKey').value = '';
}

async function logout() {
    if (!usernameSelected) {
        alert('Please select an account to logout');
        return;
    }

    const telegramId = await initializeTelegram();
    try {
        const result = await client.logout(telegramId, usernameSelected);
        console.log(result);
        if (result.message === 'Logout successful') {
            alert(`Logged out successfully: ${usernameSelected}`);
            
            // Recupera gli username memorizzati in sessionStorage
            let storedUsernames = JSON.parse(sessionStorage.getItem('usernames')) || [];
            
            // Rimuovi l'username disconnesso dalla lista
            storedUsernames = storedUsernames.filter(user => user.username !== usernameSelected);
            
            // Salva la lista aggiornata in sessionStorage
            sessionStorage.setItem('usernames', JSON.stringify(storedUsernames));
            
            await refreshAccountList(telegramId);
            usernameSelected = '';
        } else {
            alert('Logout failed: ' + result.error);
        }
    } catch (error) {
        alert('Logout failed: ' + error.message);
    }
}

async function refreshAccountList(telegramId) {
    try {
        // Recupera i dati memorizzati localmente
        const storedUsernames = JSON.parse(sessionStorage.getItem('usernames')) || [];
        console.log(storedUsernames);
        
        if (storedUsernames.length > 0) {
            showAccountList(storedUsernames);
        } else {
            document.getElementById('accountList').innerHTML = '';
            usernameSelected = '';
        }
    } catch (error) {
        console.error('Error refreshing account list:', error);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    flatpickr("#datetime", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
    });

    document.getElementById('publishForm').addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Post submitted for publication!');
    });

    const communities = await fetchCommunities();
    populateCommunityDropdown(communities);

    loadNavPosition();

    showContent('pubblica');

    const checkLoginBtn = document.getElementById('checkLoginBtn');
    if (checkLoginBtn) {
        checkLoginBtn.addEventListener('click', handleLogin);
    }

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const username = document.getElementById('username').value;
            const postingKey = document.getElementById('postingKey').value;
            const telegramId = await initializeTelegram();
            
            try {
                const loginResult = await client.login(telegramId, username, postingKey);
                console.log(loginResult);
                if (loginResult.message === 'User successfully logged in and saved to the database') {
                    alert('Login successful');
                    const result = await client.checkLogin(telegramId);
                    // Recupera gli username memorizzati in sessionStorage
                    let storedUsernames = JSON.parse(sessionStorage.getItem('usernames')) || [];
                    
                    // Aggiungi il nuovo username alla lista
                    storedUsernames.push({ username: username, profile_image: null }); // Aggiungi altre proprietà se necessario
                    
                    // Salva la lista aggiornata in sessionStorage
                    sessionStorage.setItem('usernames', JSON.stringify(storedUsernames));
                    
                    showAccountList(result.usernames);
                    document.getElementById('loginForm').style.display = 'none';
                } else {
                    console.error(loginResult);
                    alert('Login failed: ' + loginResult.error);
                }
            } catch (error) {
                console.error(error);
                alert('Login failed: ' + error.message);
            }
        });
    }

    const addAccountBtn = document.getElementById('addAccountBtn');
    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', addNewAccount);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    const telegramId = await initializeTelegram();
    if (telegramId) {
        await initializeApp(telegramId);
    }
});

//////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

function setNavPosition(position) {
  const nav = document.querySelector('.nav');
  nav.classList.remove('nav-top', 'nav-bottom');
  nav.classList.add(`nav-${position}`);
  localStorage.setItem('navPosition', position);
}

function loadNavPosition() {
  const position = localStorage.getItem('navPosition') || 'bottom';
  setNavPosition(position);
}

async function fetchCommunities() {
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        const response = await fetch('https://imridd.eu.pythonanywhere.com/api/steem/communities', {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error('Error fetching communities');
        }

        const data = await response.json();
        return data.map((item) => ({ name: item.name, title: item.title }));
    } catch (error) {
        console.error('Failed to fetch communities:', error);
        return [];
    }
}

function populateCommunityDropdown(communities) {
    const communitySelect = document.getElementById('community');
    communitySelect.innerHTML = '<option value="">Select a community</option>';
    
    communities.forEach((community) => {
        const option = document.createElement('option');
        option.value = community.name;
        option.textContent = community.title;
        communitySelect.appendChild(option);
    });
}

function showContent(id) {
    var contents = document.getElementsByClassName('content');
    for (var i = 0; i < contents.length; i++) {
        contents[i].style.display = 'none';
    }
    document.getElementById(id).style.display = 'block';
    if (id === 'bozze') {
        displayDrafts();
    }
}

function saveDraft() {
    const title = document.getElementById('title').value;
    const body = document.getElementById('body').value;
    const tags = document.getElementById('tags').value;
    const datetime = document.getElementById('datetime').value;
    const community = document.getElementById('community').value;

    const draft = {
        id: Date.now(),
        title,
        body,
        tags,
        datetime,
        community
    };

    drafts.push(draft);
    alert('Draft saved successfully!');
    clearForm();
}

function clearForm() {
    document.getElementById('publishForm').reset();
}

function displayDrafts() {
    const draftList = document.getElementById('draft-list');
    draftList.innerHTML = '';

    drafts.forEach(draft => {
        const draftItem = document.createElement('div');
        draftItem.className = 'draft-item';
        draftItem.innerHTML = `
          <h3>${draft.title}</h3>
          <p>${draft.body.substring(0, 100)}...</p>
          <div class="draft-actions">
            <button onclick="editDraft(${draft.id})">Edit</button>
            <button onclick="deleteDraft(${draft.id})">Delete</button>
          </div>
        `;
        draftList.appendChild(draftItem);
    });
}

function editDraft(id) {
    const draft = drafts.find(d => d.id === id);
    if (draft) {
        document.getElementById('title').value = draft.title;
        document.getElementById('body').value = draft.body;
        document.getElementById('tags').value = draft.tags;
        document.getElementById('datetime').value = draft.datetime;
        document.getElementById('community').value = draft.community;

        showContent('pubblica');
        deleteDraft(id);
    }
}

function deleteDraft(id) {
    drafts = drafts.filter(d => d.id !== id);
    displayDrafts();
}

async function initializeTelegram() {
    console.log(window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        document.getElementById('spinner').classList.add('hide');
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    return await getDialogTelegramId();
}

function createDialog() {
    return document.getElementById('telegramIdDialog');
}

function getDialogTelegramId() {
    return new Promise((resolve) => {
        const dialog = createDialog();
        dialog.showModal();

        const confirmButton = dialog.querySelector('#confirmButtonTelegramId');
        confirmButton.addEventListener('click', () => {
            document.getElementById('spinner').classList.remove('hide');
            const telegramId = document.getElementById('telegramId').value;
            closeAndResolve(dialog, telegramId, resolve);
        });

        dialog.addEventListener('close', () => {
            closeAndResolve(dialog, null, resolve);
        });
    });
}

async function closeAndResolve(dialog, value, resolve) {
    dialog.close();
    document.getElementById('spinner').classList.add('hide');
    resolve(value);
}

function setTheme(theme) {
    const root = document.documentElement;
    switch (theme) {
        case 'light':
            root.style.setProperty('--primary-color', '#333333');
            root.style.setProperty('--secondary-color', '#ffffff');
            root.style.setProperty('--accent-color', '#4CAF50');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--background-color', '#f0f0f0');
            break;
        case 'dark':
            root.style.setProperty('--primary-color', '#f0f0f0');
            root.style.setProperty('--secondary-color', '#333333');
            root.style.setProperty('--accent-color', '#4CAF50');
            root.style.setProperty('--text-color', '#f0f0f0');
            root.style.setProperty('--background-color', '#1a1a1a');
            break;
        case 'blue':
            root.style.setProperty('--primary-color', '#1565c0');
            root.style.setProperty('--secondary-color', '#ffffff');
            root.style.setProperty('--accent-color', '#ffc107');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--background-color', '#e6f3ff');
            break;
        case 'pink':
            root.style.setProperty('--primary-color', '#c2185b');
            root.style.setProperty('--secondary-color', '#ffffff');
            root.style.setProperty('--accent-color', '#8bc34a');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--background-color', '#fff0f5');
            break;
        case 'mint':
            root.style.setProperty('--primary-color', '#00796b');
            root.style.setProperty('--secondary-color', '#ffffff');
            root.style.setProperty('--accent-color', '#ff5722');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--background-color', '#f0fff0');
            break;
        case 'lemon':
            root.style.setProperty('--primary-color', '#fbc02d');
            root.style.setProperty('--secondary-color', '#ffffff');
            root.style.setProperty('--accent-color', '#3f51b5');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--background-color', '#fffacd');
            break;
        case 'peach':
            root.style.setProperty('--primary-color', '#ff7043');
            root.style.setProperty('--secondary-color', '#ffffff');
            root.style.setProperty('--accent-color', '#2196f3');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--background-color', '#ffe4b5');
            break;
        case 'lavender':
            root.style.setProperty('--primary-color', '#7e57c2');
            root.style.setProperty('--secondary-color', '#ffffff');
            root.style.setProperty('--accent-color', '#26a69a');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--background-color', '#e6e6fa');
            break;
        case 'wheat':
            root.style.setProperty('--primary-color', '#795548');
            root.style.setProperty('--secondary-color', '#ffffff');
            root.style.setProperty('--accent-color', '#009688');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--background-color', '#f5deb3');
            break;
        case 'sage':
            root.style.setProperty('--primary-color', '#558b2f');
            root.style.setProperty('--secondary-color', '#ffffff');
            root.style.setProperty('--accent-color', '#ff4081');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--background-color', '#d3ffce');
            break;
        case 'coral':
            root.style.setProperty('--primary-color', '#e64a19');
            root.style.setProperty('--secondary-color', '#ffffff');
            root.style.setProperty('--accent-color', '#00bcd4');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--background-color', '#ffdab9');
            break;
        case 'sky':
            root.style.setProperty('--primary-color', '#0288d1');
            root.style.setProperty('--secondary-color', '#ffffff');
            root.style.setProperty('--accent-color', '#ffd600');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--background-color', '#e0ffff');
            break;
        case 'sunset':
            root.style.setProperty('--primary-color', '#ff4500');
            root.style.setProperty('--secondary-color', '#ff6347');
            root.style.setProperty('--accent-color', '#ffd700');
            root.style.setProperty('--text-color', '#ffffff');
            root.style.setProperty('--background-color', '#ffdead');
            break;
        case 'forest':
            root.style.setProperty('--primary-color', '#228b22');
            root.style.setProperty('--secondary-color', '#8fbc8f');
            root.style.setProperty('--accent-color', '#deb887');
            root.style.setProperty('--text-color', '#ffffff');
            root.style.setProperty('--background-color', '#2e8b57');
            break;
        case 'ocean':
            root.style.setProperty('--primary-color', '#1e90ff');
            root.style.setProperty('--secondary-color', '#00ced1');
            root.style.setProperty('--accent-color', '#20b2aa');
            root.style.setProperty('--text-color', '#ffffff');
            root.style.setProperty('--background-color', '#afeeee');
            break;
        case 'autumn':
            root.style.setProperty('--primary-color', '#d2691e');
            root.style.setProperty('--secondary-color', '#ff7f50');
            root.style.setProperty('--accent-color', '#ff4500');
            root.style.setProperty('--text-color', '#ffffff');
            root.style.setProperty('--background-color', '#f4a460');
            break;
        case 'galaxy':
            root.style.setProperty('--primary-color', '#4b0082');
            root.style.setProperty('--secondary-color', '#8a2be2');
            root.style.setProperty('--accent-color', '#dda0dd');
            root.style.setProperty('--text-color', '#ffffff');
            root.style.setProperty('--background-color', '#483d8b');
            break;                                       
    }

    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`.theme-option[onclick="setTheme('${theme}')"]`).classList.add('active');
}

function saveNavPosition(position) {
  const nav = document.querySelector('.nav');
  nav.classList.remove('nav-top', 'nav-bottom');
  nav.classList.add(`nav-${position}`);
  localStorage.setItem('navPosition', position);
}

function displayResult(result, type, showMessage) {
    console.log('Result:', result);
    if (showMessage) {
        if (result.error) {
            alert(result.error);
        } else if (result.success) {
            alert(result.success);
        }
    }
}

function enableNavigationButtons() {
    console.log('Navigation buttons enabled');
}

function initializeEnd(result) {
    console.log('Initialization completed:', result);
}

function uploadImage(file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = function () {
        document.getElementById('spinner').classList.remove('hide');
        const base64Image = reader.result.split(',')[1];

        const payload = {
            image_base64: base64Image,
            username: usernameSelected
        };

        fetch('https://imridd.eu.pythonanywhere.com/api/steem/upload_base64_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(data => {
                const imageUrl = data.image_url;
                insertImageUrlInTextarea(imageUrl);
                document.getElementById('spinner').classList.add('hide');
            })
            .catch(error => {
                console.error('Errore durante il caricamento dell\'immagine:', error);
                displayResult({ error: error.message }, 'error', true);
            });
    };

    reader.onerror = function (error) {
        console.error('Errore durante la lettura del file:', error);
        displayResult({ error: error.message }, 'error', true);
    };
}

function insertImageUrlInTextarea(imageUrl) {
    const bodyTextarea = document.getElementById('body');
    const cursorPosition = bodyTextarea.selectionStart;
    const textBeforeCursor = bodyTextarea.value.substring(0, cursorPosition);
    const textAfterCursor = bodyTextarea.value.substring(cursorPosition);
    
    const markdownImage = `![Image](${imageUrl})`;
    
    bodyTextarea.value = textBeforeCursor + markdownImage + textAfterCursor;
    bodyTextarea.setSelectionRange(cursorPosition + markdownImage.length, cursorPosition + markdownImage.length);
    bodyTextarea.focus();
}