import express from 'express';
import cors from 'cors';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

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
            currentTransport = new SSEClientTransport(new URL(config.url));
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

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback for React Router (if used) or general SPA routing
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    const url = `http://localhost:${PORT}`;
    console.log(`MCP Inspector Backend running on ${url}`);
    
    // Automatically open the browser
    try {
        await open(url);
    } catch (err) {
        console.error("Failed to automatically open browser", err);
    }
});
