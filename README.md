# arunsiv-mcp-inspector

A modern, premium React-based graphical interface for connecting to and interacting with Model Context Protocol (MCP) servers. 

This client serves as a user-friendly alternative to the official CLI MCP Inspector. It provides dynamic forms based on tool schemas, rich text/image result rendering, and a beautiful dark-mode glassmorphism UI.

## Usage

You can launch the inspector from any terminal by simply running:

```bash
npx arunsiv-mcp-inspector
```

This will automatically download the package, boot the local inspector servers, and open the beautiful UI directly in your browser.

## Features

- **Protocol Agnostic Transport:** Connect to any MCP server via `stdio` (e.g., `npx`, `uvx`, `python`, `node`) or remote servers via `SSE`.
- **Dynamic Forms:** Automatically reads a tool's JSON `inputSchema` and generates user-friendly form fields (text inputs, numbers, dropdowns, checkboxes) so you never have to write raw JSON manually.
- **Rich Result Rendering:** Instead of dumping raw JSON payloads, the UI parses the MCP `content` array to display formatted text and native images.
- **Immediate Feedback:** Clear `SUCCESS` and `FAILURE` badges on tool execution.

## Architecture

This tool mirrors the robust architecture of the official MCP inspector. When you run the CLI, an orchestrator spins up two independent processes:

1. **Proxy Server (`server`)**: A lightweight Node.js/Express proxy using the official `@modelcontextprotocol/sdk`. It establishes the underlying protocol connections (`stdio` or `SSE`) and acts as an HTTP bridge for the UI.
2. **Frontend UI Server (`client`)**: A separate static file server that serves the compiled Vite + React Single Page Application (SPA), complete with a lightweight proxy to dynamically route `/api/*` traffic to the backend proxy.

## Local Development

If you want to run or modify the project locally:

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Start the local orchestrator:
   ```bash
   npm run start
   ```

## Connecting to an MCP Server

Once the UI is open, use the connection panel to connect to an MCP Server.

**Example 1: Using `npx` (Node.js)**
- **Transport Type**: `Stdio`
- **Command**: `npx`
- **Arguments**: `-y arunsiv-weather-mcp-server`

**Example 2: Using `uvx` (Python)**
- **Transport Type**: `Stdio`
- **Command**: `uvx`
- **Arguments**: `mcp-server-sqlite --db path/to/database.db`
