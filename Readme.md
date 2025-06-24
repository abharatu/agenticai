# AI Agent Project

This project is a modular AI agent system with a Node.js backend for AI model orchestration and a modern React + Vite frontend chat UI.

Note: This project is for learning purpose only and is not designed for production use.

## Prerequisites

- **Node.js (v18+ recommended):**
  - Use [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager) for easy Node.js installation and version management.
  - **Install nvm:**
    - **macOS/Linux:**
      ```bash
      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
      # Restart your terminal, then:
      nvm install --lts
      nvm use --lts
      ```
    - **Windows:**
      - Use [nvm-windows](https://github.com/coreybutler/nvm-windows#installation--upgrades):
        1. Download and run the installer from the releases page.
        2. Open a new Command Prompt and run:
           ```cmd
           nvm install lts
           nvm use lts
           ```

- **npm** (comes with Node.js)

## Project Structure

- **ai/**  
  Node.js backend for AI model management, agent orchestration, and REST API.
  - Integrates with [LangChain](https://js.langchain.com/) for LLMs (OpenAI, Azure, Ollama, etc.).
  - Supports Model Context Protocol (MCP) for tool/server integration (filesystem, Wikipedia, Jira, etc.).
  - REST API via Express for model, agent, and tool operations.
  - Example agent workflows and prompts `agent.js or agentlg.js`.
  - Easily extendable with custom MCP tools in `custommcp/`.
  - Main entry: `server.js`.

- **chatui/**  
  React + Vite frontend for interactive chat with the AI agent and visual agent designer.
  - Modern UI with Material-UI (MUI), markdown/code highlighting, and math rendering.
  - Live chat interface with streaming/non-streaming model responses.
  - Visual drag-and-drop agent workflow designer.
  - Configuration panels for models and MCP tool servers.
  - Main entry: `src/App.jsx`.

- **bin/**  
  Scripts for backend and frontend build/deployment and quick start.
  - `backend`: Starts the backend server (equivalent to `cd ai && node server.js`).
  - `frontend`: Starts the frontend dev server (equivalent to `cd chatui && npm run dev`).
  - `agent`, `agentlg`: Run example agent workflows (see `ai/agent.js`, `ai/agentlg.js`).
  
  Usage examples:
  ```bash
  ./bin/backend      # Start backend API server
  ./bin/frontend     # Start frontend dev server
  ./bin/agent        # Run example agent workflow
  ./bin/agentlg      # Run langchain-based agent workflow
  ```

## Key Features

### Backend (ai/)
- **Multi-provider LLM support:** OpenAI, Azure OpenAI, Ollama, and more via LangChain.
- **MCP tool integration:** Filesystem, Wikipedia, Jira, and custom tools.
- **REST API Endpoints:**
  - `/api/config` - Get current model/provider config.
  - `/api/models` - List available models.
  - `/api/chat` - Send chat messages and get model/agent responses (streaming and non-streaming).
  - `/api/mcpconfig` - Get MCP tool server configuration.
- **Agent workflows:** Example prompts and flows in `examples/` and `Agent.json`.
- **Custom tool servers:** Add your own in `custommcp/`.

### Frontend (chatui/)
- **Live chat interface:** Rich markdown, code, and math rendering (KaTeX, highlight.js).
- **Streaming/non-streaming model responses.**
- **Visual agent designer:** Drag-and-drop workflow prototyping.
- **Configuration panels:** Model/provider and MCP tool server selection and editing.
- **Modern, responsive UI:** Built with MUI, dark/light/system theme support.

## Getting Started

### Option 1: Run each service manually

#### Backend (ai/)
- **macOS/Linux:**
  ```bash
  cd ai
  npm install
  node server.js
  ```
- **Windows (cmd):**
  ```cmd
  cd ai
  npm install
  node server.js
  ```

#### Frontend (chatui/)
- **macOS/Linux:**
  ```bash
  cd chatui
  npm install
  npm run dev
  ```
- **Windows (cmd):**
  ```cmd
  cd chatui
  npm install
  npm run dev
  ```

### Option 2: Run both services in parallel (from project root)
- **macOS/Linux:**
  ```bash
  ./bin/backend & ./bin/frontend
  ```
- **Windows (cmd):**
  ```cmd
  start bin\backend.bat
  start bin\frontend.bat
  ```

Open the frontend in your browser (default: http://localhost:5173).

## Configuration

- **Model and provider settings:** `ai/mode.config.*.json`
- **Agent and tool settings:** `ai/Agent.json`, `ai/MCP.json`
- **Example workflows:** `ai/examples/`
- **Frontend config:** Fetches from backend endpoints (`/api/config`, `/api/mcpconfig`).

## Extending

- Add new MCP tool servers in `ai/custommcp/` (see `jira/`, `wikipedia/`).
- Update REST API endpoints in `ai/server.js` as needed.
- Update frontend UI and agent designer in `chatui/src/`.

## Author

Vikrama Aditya Bharatula
