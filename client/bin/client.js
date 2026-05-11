import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

import http from 'http';

app.use('/api', (req, res) => {
    const SERVER_PORT = process.env.SERVER_PORT || 3001;
    const proxyReq = http.request({
        hostname: '127.0.0.1',
        port: SERVER_PORT,
        path: '/api' + req.url,
        method: req.method,
        headers: req.headers
    }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });
    
    req.pipe(proxyReq, { end: true });
    
    proxyReq.on('error', (err) => {
        console.error('Proxy error:', err);
        res.status(502).send('Bad Gateway');
    });
});

app.use(express.static(path.join(__dirname, '../dist')));

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.CLIENT_PORT || 6274;
app.listen(PORT, () => {
    console.log(`Frontend static server running on port ${PORT}`);
});
process.stdin.resume();
