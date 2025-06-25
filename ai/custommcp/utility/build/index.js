#!/usr/bin/env node
"use strict";
// index.ts - Utility MCP Server Implementation
//
// This file implements a Model Context Protocol (MCP) server for Utility integration.
// It provides tools for fetching Utility issues, sprints, and sprint issues, exposing them as MCP tools.
//
// Usage:
//   node index.js <utilityBaseUrl> <utilityEmail> <utilityApiToken>
//
// Author: Vikrama Aditya Bharatula
// Date: 2025-06-24
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
// ----------------------
// UtilityServer: MCP Server Implementation
// ----------------------
/**
 * UtilityServer class implements the MCP server for Utility tools.
 * Handles tool registration and request handling for Utility issue/sprint queries.
 */
class UtilityServer {
    server;
    /**
     * Initializes the Utility MCP server.
     * Sets up tool handlers for listing tools and calling the Utility search tool.
     */
    constructor() {
        console.error('[Setup] Initializing Utility MCP server...');
        this.server = new index_js_1.Server({
            name: 'utility-mcp-server',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        this.server.onerror = (error) => console.error('[Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    /**
     * Registers all Utility tool handlers for the MCP server.
     */
    setupToolHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'get_time',
                    description: 'Get the current time in India (IST)',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                }
            ]
        }));
        // Tool call handler: routes tool calls to the correct implementation
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            try {
                if (request.params.name === 'get_time') {
                    const time = new Date().toLocaleString('en-US', {
                        timeZone: 'Asia/Kolkata',
                    });
                    const md = `**Current Time in India (IST):** ${time}\n\n`;
                    return {
                        content: [
                            {
                                type: 'text',
                                text: md
                            }
                        ]
                    };
                }
                else {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('[Error] Utility search failed:', error);
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Utility search failed: ${error.message}`);
                }
                throw error;
            }
        });
    }
    /**
     * Starts the MCP server using stdio transport.
     */
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('Utility MCP server running on stdio');
    }
}
// ----------------------
// Entrypoint: Start the Utility MCP Server
// ----------------------
const server = new UtilityServer();
server.run().catch(console.error);
