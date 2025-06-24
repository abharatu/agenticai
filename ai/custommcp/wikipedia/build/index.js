#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const wikipedia_1 = __importDefault(require("wikipedia"));
class WikipediaServer {
    server;
    /**
     * Initializes the Wikipedia MCP server.
     * Sets up tool handlers for listing tools and calling the Wikipedia search tool.
     */
    constructor() {
        console.error('[Setup] Initializing Wikipedia MCP server...');
        this.server = new index_js_1.Server({
            name: 'wikipedia-mcp-server',
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
    setupToolHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'search_wikipedia',
                    description: 'Search Wikipedia for a given term and return the first result page summary.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'The search term for Wikipedia.'
                            }
                        },
                        required: ['query']
                    }
                }
            ]
        }));
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            try {
                if (request.params.name !== 'search_wikipedia') {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }
                const args = request.params.arguments;
                if (!args.query) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Missing required parameter: query');
                }
                // Wikipedia search and summary fetch
                const searchResults = await wikipedia_1.default.search(args.query);
                if (!searchResults.results || searchResults.results.length === 0) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `No Wikipedia results found for "${args.query}".`
                            }
                        ]
                    };
                }
                const firstTitle = searchResults.results[0].title || searchResults.results[0];
                const page = await wikipedia_1.default.page(firstTitle);
                const summary = await page.summary();
                return {
                    content: [
                        {
                            type: 'text',
                            text: summary.extract
                        }
                    ]
                };
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('[Error] Wikipedia search failed:', error);
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Wikipedia search failed: ${error.message}`);
                }
                throw error;
            }
        });
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('Wikipedia MCP server running on stdio');
    }
}
const server = new WikipediaServer();
server.run().catch(console.error);
