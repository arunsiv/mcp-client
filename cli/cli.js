#!/usr/bin/env node
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const startScript = resolve(__dirname, '../client/bin/start.js');

const abort = new AbortController();
process.on('SIGINT', () => abort.abort());

const child = spawn('node', [startScript, ...process.argv.slice(2)], {
    stdio: 'inherit',
    signal: abort.signal
});

child.on('close', (code) => {
    process.exit(code || 0);
});
child.on('error', (err) => {
    if (err.name !== 'AbortError') {
        console.error(err);
        process.exit(1);
    }
});
