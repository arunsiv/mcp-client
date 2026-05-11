import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const app = express();
app.use(cors());
app.use(express.json());

// Proxy Authentication Middleware
const sessionToken = process.env.MCP_PROXY_AUTH_TOKEN;
const authMiddleware = (req, res, next) => {
    if (!sessionToken) return next(); // Fallback if no token configured

    const authHeader = req.headers["x-mcp-proxy-auth"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized", message: "Missing or invalid proxy auth token." });
    }

    const providedToken = authHeader.substring(7);
    const providedBuffer = Buffer.from(providedToken);
    const expectedBuffer = Buffer.from(sessionToken);

    if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
        return res.status(401).json({ error: "Unauthorized", message: "Invalid proxy auth token." });
    }

    next();
};

app.use('/api', authMiddleware);

let mcpClient = null;
let currentTransport = null;

// Helper to cleanup existing connection
const cleanupConnection = async () => {
    if (currentTransport) {
        try {
            await currentTransport.close();
        } catch (e) {
            console.error('Error closing transport:', e);
        }
    }
    mcpClient = null;
    currentTransport = null;
};

app.post('/api/connect', async (req, res) => {
    try {
        const { type, config } = req.body;

        await cleanupConnection();

        // 1. Initialize the client
        mcpClient = new Client(
            { name: "react-mcp-inspector", version: "1.0.0" },
            { capabilities: { tools: {}, resources: {}, prompts: {} } }
        );

        // 2. Configure transport
        if (type === 'stdio') {
            if (!config?.command) {
                return res.status(400).json({ error: "Missing command for stdio transport" });
            }
            currentTransport = new StdioClientTransport({
                command: config.command,
                args: config.args || [],
            });
        } else if (type === 'sse') {
            if (!config?.url) {
                return res.status(400).json({ error: "Missing URL for SSE transport" });
            }
            const headers = config.headers || {};
            currentTransport = new SSEClientTransport(new URL(config.url), {
                requestInit: { headers }
            });
        } else {
            return res.status(400).json({ error: "Invalid transport type" });
        }

        // 3. Connect
        await mcpClient.connect(currentTransport);

        res.json({ success: true, message: "Connected to MCP server successfully" });
    } catch (error) {
        await cleanupConnection();
        console.error("Connection error:", error);
        res.status(500).json({ error: error.message || "Failed to connect to MCP server" });
    }
});

app.post('/api/disconnect', async (req, res) => {
    await cleanupConnection();
    res.json({ success: true, message: "Disconnected" });
});

app.get('/api/status', (req, res) => {
    res.json({ connected: mcpClient !== null });
});

app.get('/api/tools', async (req, res) => {
    if (!mcpClient) {
        return res.status(400).json({ error: "Not connected to any MCP server" });
    }
    try {
        const tools = await mcpClient.listTools();
        res.json({ tools: tools.tools });
    } catch (error) {
        console.error("Error listing tools:", error);
        res.status(500).json({ error: error.message || "Failed to list tools" });
    }
});

app.post('/api/tools/:name', async (req, res) => {
    if (!mcpClient) {
        return res.status(400).json({ error: "Not connected to any MCP server" });
    }
    try {
        const toolName = req.params.name;
        const toolArgs = req.body || {};

        const result = await mcpClient.callTool({
            name: toolName,
            arguments: toolArgs
        });

        res.json(result);
    } catch (error) {
        console.error("Error calling tool:", error);
        res.status(500).json({ error: error.message || "Failed to call tool" });
    }
});

const PORT = process.env.SERVER_PORT || 6277;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`MCP Inspector Backend running on port ${PORT}`);
});
process.stdin.resume();
