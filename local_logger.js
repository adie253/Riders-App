const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3005;
const LOG_FILE = path.join(__dirname, 'debug_api_log.json');

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/log') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
                console.log('Logged data to debug_api_log.json');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid JSON');
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Debug server listening on port ${PORT}`);
});
