// DOM Elements
const authSection = document.getElementById('authSection');
const emailSection = document.getElementById('emailSection');
const testEmailSection = document.getElementById('testEmailSection');
const inboxSection = document.getElementById('inboxSection');
const showLoginBtn = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const domainSelect = document.getElementById('domainSelect');
const generateEmailBtn = document.getElementById('generateEmail');
const emailDisplay = document.getElementById('emailDisplay');
const emailAddressElement = document.getElementById('emailAddress');
const testEmailForm = document.getElementById('testEmailForm');
const testEmailTo = document.getElementById('testEmailTo');
const testEmailSubject = document.getElementById('testEmailSubject');
const testEmailText = document.getElementById('testEmailText');
const refreshInboxBtn = document.getElementById('refreshInbox');
const inboxMessages = document.getElementById('inboxMessages');
const noMessages = document.getElementById('noMessages');
const messageModal = document.getElementById('messageModal');
const messageContent = document.getElementById('messageContent');
const loadingSpinner = document.getElementById('loadingSpinner');
const closeModalBtns = document.querySelectorAll('.closeModal');

// State
let currentEmail = null;
let checkInboxInterval = null;
let isLoggedIn = false;

// Hilfsfunktionen
const showLoading = () => {
    loadingSpinner.classList.add('show');
};

const hideLoading = () => {
    loadingSpinner.classList.remove('show');
};

const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const updateUIState = () => {
    showLoginBtn.classList.toggle('hidden', isLoggedIn);
    showRegisterBtn.classList.toggle('hidden', isLoggedIn);
    logoutBtn.classList.toggle('hidden', !isLoggedIn);
    emailSection.classList.toggle('hidden', !isLoggedIn);
    testEmailSection.classList.toggle('hidden', !isLoggedIn || !currentEmail);
    inboxSection.classList.toggle('hidden', !isLoggedIn || !currentEmail);
};

// API Funktionen
async function loadDomains() {
    try {
        const response = await fetch('/api/domains');
        const data = await response.json();
        
        if (data.domains) {
            const domains = data.domains;
            domainSelect.innerHTML = domains.map(domain => 
                `<option value="${domain}">${domain}</option>`
            ).join('');
            
            // Auch für das Registrierungsformular
            const registerDomainSelect = registerForm.querySelector('[name="domain"]');
            registerDomainSelect.innerHTML = domains.map(domain => 
                `<option value="${domain}">${domain}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Fehler beim Laden der Domains:', error);
        showToast('Fehler beim Laden der Domains', 'error');
    }
}

async function register(event) {
    event.preventDefault();
    
    try {
        showLoading();
        const formData = new FormData(registerForm);
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: formData.get('username'),
                domain: formData.get('domain'),
                password: formData.get('password')
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showToast('Registrierung erfolgreich');
            registerForm.reset();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        } else {
            throw new Error(data.message || 'Registrierung fehlgeschlagen');
        }
    } catch (error) {
        console.error('Registrierungsfehler:', error);
        showToast(error.message || 'Registrierung fehlgeschlagen', 'error');
    } finally {
        hideLoading();
    }
}

async function login(event) {
    event.preventDefault();
    
    try {
        showLoading();
        const formData = new FormData(loginForm);
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            isLoggedIn = true;
            currentEmail = data.email;
            emailAddressElement.textContent = currentEmail;
            emailDisplay.classList.add('show');
            testEmailTo.value = currentEmail;
            updateUIState();
            startCheckingInbox();
            showToast('Login erfolgreich');
            loginForm.reset();
            loginForm.classList.add('hidden');
        } else {
            throw new Error(data.message || 'Login fehlgeschlagen');
        }
    } catch (error) {
        console.error('Login-Fehler:', error);
        showToast(error.message || 'Login fehlgeschlagen', 'error');
    } finally {
        hideLoading();
    }
}

function logout() {
    isLoggedIn = false;
    currentEmail = null;
    if (checkInboxInterval) {
        clearInterval(checkInboxInterval);
    }
    emailDisplay.classList.remove('show');
    updateUIState();
    showToast('Logout erfolgreich');
}

async function generateEmail() {
    try {
        showLoading();
        const domain = domainSelect.value;
        const response = await fetch('/api/create-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ domain })
        });
        const data = await response.json();
        
        if (data.email) {
            currentEmail = data.email;
            emailAddressElement.textContent = currentEmail;
            testEmailTo.value = currentEmail;
            emailDisplay.classList.add('show');
            updateUIState();
            startCheckingInbox();
            showToast('E-Mail-Adresse wurde erfolgreich generiert');
        } else {
            throw new Error('Keine E-Mail-Adresse in der Antwort');
        }
    } catch (error) {
        console.error('Fehler beim Generieren der E-Mail:', error);
        showToast('Fehler beim Generieren der E-Mail-Adresse', 'error');
    } finally {
        hideLoading();
    }
}

async function sendTestEmail(event) {
    event.preventDefault();
    
    const to = testEmailTo.value;
    const subject = testEmailSubject.value;
    const text = testEmailText.value;

    if (!to || !subject || !text) {
        showToast('Bitte füllen Sie alle Felder aus', 'error');
        return;
    }

    try {
        showLoading();
        const response = await fetch('/api/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to, subject, text })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showToast('Test-E-Mail wurde erfolgreich gesendet');
            testEmailSubject.value = '';
            testEmailText.value = '';
            checkInbox();
        } else {
            throw new Error(data.message || 'Fehler beim Senden der Test-E-Mail');
        }
    } catch (error) {
        console.error('Fehler beim Senden der Test-E-Mail:', error);
        showToast('Fehler beim Senden der Test-E-Mail', 'error');
    } finally {
        hideLoading();
    }
}

async function checkInbox() {
    if (!currentEmail) return;

    try {
        const response = await fetch(`/api/inbox?email=${encodeURIComponent(currentEmail)}`);
        const data = await response.json();
        
        if (data.messages && Array.isArray(data.messages)) {
            updateInboxUI(data.messages);
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Nachrichten:', error);
        showToast('Fehler beim Abrufen der Nachrichten', 'error');
    }
}

async function getMessage(messageId) {
    try {
        showLoading();
        const response = await fetch(`/api/message/${messageId}?email=${encodeURIComponent(currentEmail)}`);
        const data = await response.json();
        
        if (data) {
            showMessageModal(data);
        } else {
            throw new Error('Keine Nachricht gefunden');
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Nachricht:', error);
        showToast('Fehler beim Abrufen der Nachrichtendetails', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteMessage(messageId) {
    try {
        showLoading();
        const response = await fetch(`/api/message/${messageId}?email=${encodeURIComponent(currentEmail)}`, {
            method: 'DELETE'
        });
        await response.json();
        
        // Nachricht aus UI entfernen
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.remove();
            showToast('Nachricht wurde gelöscht');
        }
        
        // Modal schließen
        closeModal();
        
        // Überprüfen, ob noch Nachrichten vorhanden sind
        if (inboxMessages.children.length <= 1) {
            noMessages.style.display = 'block';
        }
    } catch (error) {
        console.error('Fehler beim Löschen der Nachricht:', error);
        showToast('Fehler beim Löschen der Nachricht', 'error');
    } finally {
        hideLoading();
    }
}

// UI Funktionen
function updateInboxUI(messages) {
    if (messages.length === 0) {
        noMessages.style.display = 'block';
        return;
    }

    noMessages.style.display = 'none';
    const existingMessageIds = new Set(
        Array.from(inboxMessages.children)
            .map(el => el.dataset.messageId)
            .filter(id => id) // Filter out noMessages element
    );

    messages.forEach(message => {
        if (!existingMessageIds.has(message.id)) {
            const messageElement = createMessageElement(message);
            inboxMessages.insertBefore(messageElement, inboxMessages.firstChild);
        }
    });
}

function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'message-card bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200';
    div.dataset.messageId = message.id;
    
    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <p class="font-semibold text-gray-800">${message.fromAddr || 'Unbekannter Absender'}</p>
                <p class="text-gray-600 mt-1">${message.subject || 'Kein Betreff'}</p>
                <p class="text-sm text-gray-500 mt-2">${formatDate(message.timestamp)}</p>
            </div>
            <button class="delete-message-btn text-red-600 hover:text-red-800 p-2" title="Nachricht löschen">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

    // Event Listeners
    div.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-message-btn')) {
            getMessage(message.id);
        }
    });

    div.querySelector('.delete-message-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Möchten Sie diese Nachricht wirklich löschen?')) {
            deleteMessage(message.id);
        }
    });

    return div;
}

function showMessageModal(message) {
    messageContent.innerHTML = `
        <div class="space-y-4">
            <div class="border-b pb-4">
                <p class="text-sm text-gray-600">Von:</p>
                <p class="font-semibold">${message.fromAddr || 'Unbekannter Absender'}</p>
            </div>
            <div class="border-b pb-4">
                <p class="text-sm text-gray-600">Betreff:</p>
                <p class="font-semibold">${message.subject || 'Kein Betreff'}</p>
            </div>
            <div class="border-b pb-4">
                <p class="text-sm text-gray-600">Empfangen am:</p>
                <p>${formatDate(message.timestamp)}</p>
            </div>
            <div>
                <p class="text-sm text-gray-600 mb-2">Nachricht:</p>
                <div class="bg-gray-50 p-4 rounded-lg">
                    ${message.html || message.text || 'Kein Inhalt'}
                </div>
            </div>
        </div>
    `;
    messageModal.classList.add('show');
}

function closeModal() {
    messageModal.classList.remove('show');
}

function startCheckingInbox() {
    if (checkInboxInterval) {
        clearInterval(checkInboxInterval);
    }
    checkInbox(); // Sofort prüfen
    checkInboxInterval = setInterval(checkInbox, 10000); // Alle 10 Sekunden prüfen
}

// Event Listeners
showLoginBtn.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
});

showRegisterBtn.addEventListener('click', () => {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

logoutBtn.addEventListener('click', logout);
registerForm.addEventListener('submit', register);
loginForm.addEventListener('submit', login);
generateEmailBtn.addEventListener('click', generateEmail);
testEmailForm.addEventListener('submit', sendTestEmail);
refreshInboxBtn.addEventListener('click', checkInbox);
closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));

// Klick außerhalb des Modals schließt es
messageModal.addEventListener('click', (e) => {
    if (e.target === messageModal) {
        closeModal();
    }
});

// Escape-Taste schließt das Modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && messageModal.classList.contains('show')) {
        closeModal();
    }
});

// Initial setup
loadDomains();
updateUIState();