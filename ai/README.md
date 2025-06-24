# ai (Backend)

This folder contains the Node.js backend for the AI Agent Project. The backend provides model orchestration, agent workflows, and REST API endpoints for the frontend and other clients.

## Prerequisites

- **Node.js (v18+ recommended):**
  - Use [nvm](https://github.com/nvm-sh/nvm) for Node.js version management.
  - **Install nvm:**
    - **macOS/Linux:**
      ```bash
      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
      nvm install --lts
      nvm use --lts
      ```
    - **Windows:**
      - Use [nvm-windows](https://github.com/coreybutler/nvm-windows#installation--upgrades)
      - Download and run the installer, then in Command Prompt:
        ```cmd
        nvm install lts
        nvm use lts
        ```

## Features

- **Multi-provider LLM Support:**
  - Integrates with OpenAI, Azure OpenAI, Ollama, and more via [LangChain](https://js.langchain.com/).
  - Dynamic model selection and configuration.

- **Model Context Protocol (MCP) Integration:**
  - Supports MCP tool servers for advanced agent workflows (filesystem, Wikipedia, Jira, etc.).
  - Easily extendable with custom MCP tools (see `custommcp/`).

- **REST API via Express:**
  - `/api/config` - Get current model/provider config.
  - `/api/models` - List available models (Ollama, etc.).
  - `/api/chat` - Send chat messages and get model/agent responses (streaming and non-streaming).
  - `/api/mcpconfig` - Get MCP tool server configuration.

- **Agent Workflows:**
  - Example agent flows and prompts in `examples/` and `Agent.json`.
  - Visual agent designer supported in the frontend.

- **Custom Tool Servers:**
  - Add your own MCP tool servers in `custommcp/` (see `jira/`, `wikipedia/`).

## Project Structure

- `server.js` - Main Express API server (entry point).
- `Model.js` - Model and MCP client/agent factory utilities.
- `custommcp/` - Custom MCP tool servers (Jira, Wikipedia, etc.).
- `examples/` - Example agent workflows and prompts.
- `secrets/mode.config.*.json` - Model/provider configuration files.
- `MCP.json` - MCP tool server configuration.
- `agent.js` - Example standalone agent prompt and workflow.
- `agentlg.js` - Example agent prompt and workflow with checkpointing and langchain community tool instad of MCP.

## Quick Install

You can now install all backend dependencies in one step using the install script:

- **macOS/Linux/Windows (from project root):**
  ```bash
  ../bin/install
  ```
- **VS Code users:**
  > If you are running this project within Visual Studio Code, you can simply run `install` in the integrated terminal (no need for `../bin/`), as the `bin` folder is added to your PATH via `.vscode/settings.json`.

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the backend server:**
   - **macOS/Linux:**
     ```bash
     node server.js
     ```
   - **Windows (cmd):**
     ```cmd
     node server.js
     ```
3. **Alternatively, use the bin scripts:**
   - **macOS/Linux:**
     ```bash
     ../bin/backend
     ```
   - **Windows (cmd):**
     ```cmd
     ..\bin\backend.bat
     ```
4. **Configure models and tools:**
   - Edit `secrets/mode.config.openai.json`, `secrets/mode.config.ollama.json`, etc. for model settings.
   - Edit `MCP.json` to add or remove tool servers.

## Extending

- Add new MCP tool servers in `custommcp/` (see existing examples).
- Update REST API endpoints in `server.js` as needed.

## Author

Vikrama Aditya Bharatula
