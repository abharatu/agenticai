# ChatUI (Frontend)

This folder contains the React + Vite frontend for the AI Agent Project. The ChatUI provides a modern, interactive interface for chatting with the AI agent, configuring models and tools, and visually designing agent workflows.

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

- **Live Chat Interface:**
  - Rich markdown, code, and math rendering (supports KaTeX and highlight.js).
  - Streaming and non-streaming model responses.
  - Supports OpenAI, Azure OpenAI, Ollama, and MCP tool servers.
  - Toggleable "think" mode for agent reasoning display.

- **Agent Designer:**
  - Visual drag-and-drop interface for designing agent flows.
  - Palette of blocks (Node, Edge, Start, End, Conditional) for workflow prototyping.

- **Configuration Panels:**
  - Model/provider selection and configuration display.
  - MCP tool server selection and editing (with JSON editor dialog).

- **Modern UI:**
  - Built with Material-UI (MUI) for responsive, accessible design.
  - Dark/light/system theme support.
  - Intuitive navigation and error dialogs.

## Project Structure

- `src/`
  - `App.jsx` - Main application shell, theme, routing, and provider/model controls.
  - `ChatUI.jsx` - Main chat interface component.
  - `AgentDesigner.jsx` - Visual agent workflow designer (WIP).
  - `public/` - Static assets (icons, manifest, etc.).
  - `index.js`, `main.jsx` - Entry points for Vite/React.
  - `App.css`, `index.css` - Styles.

## Quick Install

You can now install all frontend dependencies in one step using the install script:

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
2. **Start the development server:**
   - **macOS/Linux:**
     ```bash
     npm run dev
     ```
   - **Windows (cmd):**
     ```cmd
     npm run dev
     ```
3. **Alternatively, use the bin scripts from project root:**
   - **macOS/Linux:**
     ```bash
     ../bin/frontend
     ```
   - **Windows (cmd):**
     ```cmd
     ..\bin\frontend.bat
     ```
4. **Open the app:**
   Visit [http://localhost:5173](http://localhost:5173) in your browser.

## Configuration

- The frontend fetches model/provider and MCP tool server config from the backend (`/api/config`, `/api/mcpconfig`).
- To change available models, providers, or tools, edit the backend config files in `ai/`.

## Author

Vikrama Aditya Bharatula
