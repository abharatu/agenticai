#!/usr/bin/env node
// index.ts - Wikipedia MCP Server Implementation
//
// This file implements a Model Context Protocol (MCP) server for Wikipedia integration.
// It exposes a tool for searching Wikipedia and returning the summary of the first result page.
//
// Author: Vikrama Aditya Bharatula
// Date: 2025-06-24

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import wikipedia from 'wikipedia';

// ----------------------
// WikipediaServer: MCP Server Implementation
// ----------------------
/**
 * WikipediaServer class implements the MCP server for Wikipedia tools.
 * Handles tool registration and request handling for Wikipedia search queries.
 */
class WikipediaServer {
  private server: Server;

  /**
   * Initializes the Wikipedia MCP server.
   * Sets up tool handlers for listing tools and calling the Wikipedia search tool.
   */
  constructor() {
    console.error('[Setup] Initializing Wikipedia MCP server...');
    // Create the MCP server instance
    this.server = new Server(
      {
        name: 'wikipedia-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    // Register tool handlers
    this.setupToolHandlers();
    // Error and shutdown handling
    this.server.onerror = (error) => console.error('[Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Registers the Wikipedia search tool and its handler.
   */
  private setupToolHandlers() {
    // Register the Wikipedia search tool for tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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

    // Register the handler for tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        // Only handle the search_wikipedia tool
        if (request.params.name !== 'search_wikipedia') {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
        }

        const args = request.params.arguments as { query: string };
        if (!args.query) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Missing required parameter: query'
          );
        }

        // Wikipedia search and summary fetch
        // 1. Search Wikipedia for the query
        const searchResults = await wikipedia.search(args.query);
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
        // 2. Get the first result's title
        const firstTitle = searchResults.results[0].title || searchResults.results[0];
        // 3. Fetch the page and its summary
        const page = await wikipedia.page(firstTitle);
        const summary = await page.summary();
        return {
          content: [
            {
              type: 'text',
              text: `${summary.extract} \n\n\n[Read more on Wikipedia](${summary.content_urls?.desktop?.page})`
            }
          ]
        };
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('[Error] Wikipedia search failed:', error);
          throw new McpError(
            ErrorCode.InternalError,
            `Wikipedia search failed: ${error.message}`
          );
        }
        throw error;
      }
    });
  }

  /**
   * Starts the MCP server using stdio transport.
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Wikipedia MCP server running on stdio');
  }
}

// ----------------------
// Entrypoint: Start the Wikipedia MCP Server
// ----------------------
const server = new WikipediaServer();
server.run().catch(console.error);