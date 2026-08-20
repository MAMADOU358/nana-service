const express = require('express');
const path    = require('path');
const app     = express();

// Sécurité headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Compression
try {
    const compression = require('compression');
    app.use(compression());
} catch(e) {}

// Fichiers statiques React build
app.use(express.static(path.join(__dirname, 'build'), {
    maxAge: '1d',
    etag:   true,
}));

// Toutes les routes → React (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ NANA SERVICE PRO démarré — Port ${PORT}`);
});