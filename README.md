# React MCP Inspector Client

A modern, premium React-based graphical interface for connecting to and interacting with Model Context Protocol (MCP) servers. 

This client serves as a user-friendly alternative to the official CLI MCP Inspector. It provides dynamic forms based on tool schemas, rich text/image result rendering, and a beautiful dark-mode glassmorphism UI.

## Architecture

Because web browsers cannot directly spawn local command-line processes (which is required for `stdio` MCP servers), this application uses a **two-tier architecture**:

1. **Backend (`/backend`)**: A lightweight Node.js/Express proxy server using the official `@modelcontextprotocol/sdk`. It establishes the connections (`stdio` or `SSE`) and exposes a REST API.
2. **Frontend (`/frontend`)**: A Vite + React Single Page Application (SPA) that provides the user interface and communicates with the backend proxy.

## Features

- **Protocol Agnostic Transport:** Connect to any MCP server via `stdio` (e.g., `npx`, `uvx`, `python`, `node`) or remote servers via `SSE`.
- **Dynamic Forms:** Automatically reads a tool's JSON `inputSchema` and generates user-friendly form fields (text inputs, numbers, dropdowns, checkboxes) so you never have to write raw JSON manually.
- **Rich Result Rendering:** Instead of dumping raw JSON payloads, the UI parses the MCP `content` array to display formatted text and native images.
- **Immediate Feedback:** Clear `SUCCESS` and `FAILURE` badges on tool execution.

## Getting Started

The project is configured so you can build and run both the frontend and backend with a single command from the root directory.

### 1. Install Dependencies

Open a terminal in the root directory and run:

```bash
npm run install:all
```
*(This will automatically install dependencies for both the backend and frontend folders).*

### 2. Start the Application

```bash
npm start
```

This command will:
1. Compile the React frontend into static files.
2. Start the Express backend proxy on `http://localhost:3001`.
3. Automatically open your default web browser to the application interface.

## Connecting to a Server

Once the UI is open, use the connection panel to connect to an MCP Server.

**Example 1: Using `npx` (Node.js)**
- **Transport Type**: `Stdio`
- **Command**: `npx`
- **Arguments**: `-y arunsiv-weather-mcp-server`

**Example 2: Using `uvx` (Python)**
- **Transport Type**: `Stdio`
- **Command**: `uvx`
- **Arguments**: `mcp-server-sqlite --db path/to/database.db`
