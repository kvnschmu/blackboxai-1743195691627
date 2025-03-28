const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Speicher für E-Mails, Benutzer und Domains
const emailStore = new Map(); // Speichert E-Mail -> Messages[]
const userStore = new Map();  // Speichert userId -> {email, domain, password}
const availableDomains = ['tempmail.local', 'tempbox.local', 'mailbox.local']; // Verfügbare Domains

// Hilfsfunktion zum Generieren einer zufälligen E-Mail-Adresse
function generateUsername() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Hilfsfunktion zum Hashen des Passworts
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/register - Neuen Benutzer registrieren
router.post('/register', async (req, res, next) => {
    try {
        const { username, domain, password } = req.body;
        
        if (!username || !domain || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Benutzername, Domain und Passwort sind erforderlich'
            });
        }

        if (!availableDomains.includes(domain)) {
            return res.status(400).json({
                status: 'error',
                message: 'Ungültige Domain'
            });
        }

        const email = `${username}@${domain}`;
        
        // Prüfen, ob die E-Mail bereits existiert
        if (Array.from(userStore.values()).some(user => user.email === email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Diese E-Mail-Adresse ist bereits vergeben'
            });
        }

        const userId = crypto.randomUUID();
        const hashedPassword = hashPassword(password);

        userStore.set(userId, {
            email,
            domain,
            password: hashedPassword
        });

        emailStore.set(email, []);

        res.json({
            status: 'success',
            userId,
            email
        });
    } catch (error) {
        console.error('Register Error:', error);
        next(error);
    }
});

// POST /api/login - Benutzer einloggen
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'E-Mail und Passwort sind erforderlich'
            });
        }

        const user = Array.from(userStore.entries()).find(([_, u]) => u.email === email);
        
        if (!user || user[1].password !== hashPassword(password)) {
            return res.status(401).json({
                status: 'error',
                message: 'Ungültige E-Mail oder Passwort'
            });
        }

        res.json({
            status: 'success',
            userId: user[0],
            email: user[1].email
        });
    } catch (error) {
        console.error('Login Error:', error);
        next(error);
    }
});

// GET /api/domains - Verfügbare Domains abrufen
router.get('/domains', async (req, res, next) => {
    try {
        res.json({
            status: 'success',
            domains: availableDomains
        });
    } catch (error) {
        console.error('Domains Error:', error);
        next(error);
    }
});

// POST /api/create-email - Neue temporäre E-Mail erstellen
router.post('/create-email', async (req, res, next) => {
    try {
        const { domain } = req.body;
        
        if (!domain || !availableDomains.includes(domain)) {
            return res.status(400).json({
                status: 'error',
                message: 'Ungültige Domain'
            });
        }

        const username = generateUsername();
        const email = `${username}@${domain}`;
        emailStore.set(email, []);
        
        res.json({ email });
    } catch (error) {
        console.error('Create Email Error:', error);
        next(error);
    }
});

// GET /api/inbox - Posteingang abrufen
router.get('/inbox', async (req, res, next) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'E-Mail-Adresse ist erforderlich' 
            });
        }

        const messages = emailStore.get(email) || [];
        res.json({ messages });
    } catch (error) {
        console.error('Inbox Error:', error);
        next(error);
    }
});

// POST /api/message - Test-Nachricht senden
router.post('/message', async (req, res, next) => {
    try {
        const { to, subject, text } = req.body;
        if (!to || !subject || !text) {
            return res.status(400).json({
                status: 'error',
                message: 'Empfänger, Betreff und Text sind erforderlich'
            });
        }

        const messages = emailStore.get(to) || [];
        const newMessage = {
            id: Date.now().toString(),
            fromAddr: 'test@sender.com',
            subject,
            text,
            html: `<p>${text}</p>`,
            timestamp: new Date().toISOString()
        };

        messages.push(newMessage);
        emailStore.set(to, messages);

        res.json({ status: 'success', message: 'Nachricht gesendet' });
    } catch (error) {
        console.error('Send Message Error:', error);
        next(error);
    }
});

// GET /api/message/:id - Spezifische Nachricht abrufen
router.get('/message/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: 'E-Mail-Adresse ist erforderlich'
            });
        }

        const messages = emailStore.get(email) || [];
        const message = messages.find(m => m.id === id);

        if (!message) {
            return res.status(404).json({
                status: 'error',
                message: 'Nachricht nicht gefunden'
            });
        }

        res.json(message);
    } catch (error) {
        console.error('Message Error:', error);
        next(error);
    }
});

// DELETE /api/message/:id - Nachricht löschen
router.delete('/message/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: 'E-Mail-Adresse ist erforderlich'
            });
        }

        const messages = emailStore.get(email) || [];
        const updatedMessages = messages.filter(m => m.id !== id);
        emailStore.set(email, updatedMessages);

        res.json({ status: 'success', message: 'Nachricht gelöscht' });
    } catch (error) {
        console.error('Delete Message Error:', error);
        next(error);
    }
});

module.exports = router;