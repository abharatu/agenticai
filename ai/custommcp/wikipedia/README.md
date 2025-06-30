# Wikipedia MCP Tool

This directory contains a custom Model Context Protocol (MCP) tool server for Wikipedia integration.

## Features
- Exposes Wikipedia search and retrieval as MCP tools for agent workflows.
- Written in TypeScript (see `src/`).
- Built output in `build/`.

## Usage
- Build: `npm install && npx tsc`
- Run: Use as an MCP tool server from the main backend (`ai/`).
- Configure in `ai/MCP.json` to enable for agent workflows.

## Development
- Edit TypeScript source in `src/`.
- Update dependencies in `package.json` as needed.

## Author
Vikrama Aditya Bharatula
