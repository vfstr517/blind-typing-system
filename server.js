const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./database');
const registerSocketHandlers = require('./socketHandlers');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Load admin credentials
let adminCreds = { id: 'admin', password: 'password123' };
try {
    const credsFile = fs.readFileSync(path.join(__dirname, 'admin-credentials.json'), 'utf8');
    adminCreds = JSON.parse(credsFile);
} catch (e) {
    console.warn("admin-credentials.json not found or invalid, using default credentials.");
}

// Basic Auth Middleware for admin dashboard
app.use('/admin.html', (req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === adminCreds.id && password === adminCreds.password) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Speed Typer Admin"');
    res.status(401).send('Authentication required.');
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API Routes
app.get('/api/passages', async (req, res) => {
    try {
        const passages = await db.getAllPassages();
        res.json(passages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/passages', async (req, res) => {
    const { text, active } = req.body;
    try {
        const id = await db.addPassage(text, active);
        res.status(201).json({ id, text, active });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/passages/:id', async (req, res) => {
    try {
        await db.deletePassage(req.params.id);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/passages/:id/active', async (req, res) => {
    try {
        await db.setActivePassage(req.params.id);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/results', async (req, res) => {
    try {
        const results = await db.getAllResults();
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Socket.io Connection
io.on('connection', (socket) => {
    registerSocketHandlers(io, socket, db);
});

// Initialize DB and start server
db.init().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(console.error);
