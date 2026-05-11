import { spawn } from 'child_process';
import open from 'open';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PORT = process.env.SERVER_PORT || 3001;
const CLIENT_PORT = process.env.CLIENT_PORT || 3000;

function spawnPromise(command, args, options) {
    return new Promise((resolvePromise, reject) => {
        const child = spawn(command, args, options);
        child.on('close', (code) => {
            if (code === 0) resolvePromise();
            else reject(new Error(`Command failed with code ${code}`));
        });
        child.on('error', reject);
    });
}

async function main() {
    const isDev = process.argv.includes('--dev');
    
    // Server options
    const serverPath = resolve(__dirname, '../../server/server.js');
    const clientPath = resolve(__dirname, './client.js');

    console.log("Starting MCP Inspector...");

    const abort = new AbortController();
    process.on('SIGINT', () => abort.abort());

    // Spawn server
    const serverProcess = spawnPromise('node', [serverPath], {
        env: { ...process.env, SERVER_PORT, CLIENT_PORT },
        stdio: 'inherit',
        signal: abort.signal
    });

    // Spawn client
    let clientProcess;
    if (isDev) {
        clientProcess = spawnPromise('npx', ['vite', '--port', CLIENT_PORT], {
            cwd: resolve(__dirname, '..'),
            env: { ...process.env, CLIENT_PORT },
            stdio: 'inherit',
            signal: abort.signal
        });
    } else {
        clientProcess = spawnPromise('node', [clientPath], {
            env: { ...process.env, CLIENT_PORT, SERVER_PORT },
            stdio: 'inherit',
            signal: abort.signal
        });
    }

    const url = `http://localhost:${CLIENT_PORT}`;
    
    setTimeout(() => {
        console.log(`\n🚀 MCP Inspector is up and running at:\n   ${url}\n`);
        open(url).catch(err => console.error("Failed to automatically open browser", err));
    }, 2000);

    try {
        await Promise.all([serverProcess, clientProcess]);
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error(e);
            process.exit(1);
        }
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
