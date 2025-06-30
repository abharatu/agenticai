# Jira MCP Tool

This directory contains a custom Model Context Protocol (MCP) tool server for integrating with Jira.

## Features
- Exposes Jira operations as MCP tools for use in agent workflows.
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
