#!/usr/bin/env node
// index.ts - Jira MCP Server Implementation
//
// This file implements a Model Context Protocol (MCP) server for Jira integration.
// It provides tools for fetching Jira issues, sprints, and sprint issues, exposing them as MCP tools.
//
// Usage:
//   node index.js <jiraBaseUrl> <jiraEmail> <jiraApiToken>
//
// Author: Vikrama Aditya Bharatula
// Date: 2025-06-24

import { Buffer } from 'node:buffer';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// ----------------------
// Parse Jira config from command line arguments
// ----------------------
// Usage: node index.js <jiraBaseUrl> <jiraEmail> <jiraApiToken>
const [,, jiraBaseUrl, jiraEmail, jiraApiToken] = process.argv;

if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
  console.error('Usage: node index.js <jiraBaseUrl> <jiraEmail> <jiraApiToken>');
  process.exit(1);
}
const encodedCredentials = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');

// ----------------------
// Jira Data Type Definitions
// ----------------------
interface JiraUser {
  displayName: string;
  emailAddress: string;
}

interface JiraStatus {
  name: string;
}

interface JiraStatusCategory {
  name: string;
}

interface JiraIssueType {
  name: string;
}

interface JiraProject {
  name: string;
}

interface JiraSprint {
  name: string;
}

interface JiraComment {
  created: string;
  author: JiraUser;
  body: string;
}

interface JiraParent {
  key: string;
  self: string;
  fields: {
    issuetype: JiraIssueType;
    summary: string;
  };
}

interface JiraFields {
  description: string;
  status: JiraStatus;
  statusCategory: JiraStatusCategory;
  assignee: JiraUser;
  reporter: JiraUser;
  creator: JiraUser;
  created: string;
  updated: string;
  issuetype: JiraIssueType;
  project: JiraProject;
  customfield_10016: JiraSprint[];
  summary: string;
  parent: JiraParent;
  comment: {
    comments: JiraComment[];
  };
}

interface JiraIssueJSON {
  key: string;
  fields: JiraFields;
}

interface ProcessedIssue {
  id: string;
  status: string;
  statusCatatory: string;
  description: string;
  parent: string;
  parentLink: string;
  assignee: string;
  reporter: string;
  creator: string;
  created: string;
  issuetype: string;
  project: string;
  sprints: string;
  summary: string;
  updated: string;
  comments: string[];
}

// ----------------------
// Utility: Convert Jira Issue JSON to Markdown
// ----------------------
/**
 * Converts a Jira issue JSON object to a markdown string for display.
 * Handles missing fields gracefully.
 * @param issueJSON Jira issue JSON object
 * @param isSub Whether this is a sub-issue (affects markdown heading)
 * @returns Markdown string
 */
function processIssue(issueJSON: JiraIssueJSON, isSub = false): string {
    const id = issueJSON.key;
    const description = issueJSON.fields.description;
    const status = issueJSON.fields.status?.name ?? '';
    const statusCatatory = issueJSON.fields.statusCategory?.name ?? '';
    const assignee = issueJSON.fields.assignee ? `${issueJSON.fields.assignee.displayName} (${issueJSON.fields.assignee.emailAddress})` : 'Unassigned';
    const reporter = issueJSON.fields.reporter ? `${issueJSON.fields.reporter.displayName} (${issueJSON.fields.reporter.emailAddress})` : '';
    const creator = issueJSON.fields.creator ? `${issueJSON.fields.creator.displayName} (${issueJSON.fields.creator.emailAddress})` : '';
    const created = issueJSON.fields.created;
    const updated = issueJSON.fields.updated;
    const issuetype = issueJSON.fields.issuetype?.name ?? '';
    const project = issueJSON.fields.project?.name ?? '';
    const sprints = Array.isArray(issueJSON.fields.customfield_10016)
        ? issueJSON.fields.customfield_10016.map(e => `${e.name} (id:${(e as any).id})`).join(',')
        : '';
    const summary = issueJSON.fields.summary;
    const parent = issueJSON.fields.parent ? `${issueJSON.fields.parent.fields.issuetype.name}:${issueJSON.fields.parent.key}:${issueJSON.fields.parent.fields.summary}` : '';
    const parentLink = issueJSON.fields.parent ? `${issueJSON.fields.parent.self}` : '';
    const comments = Array.isArray(issueJSON.fields.comment?.comments)
        ? issueJSON.fields.comment.comments.map(comment => `On ${comment.created} by ${comment.author.displayName} (${comment.author.emailAddress}):${comment.body}`)
        : [];
    const processedData: ProcessedIssue = {id,status,statusCatatory,description,parent, parentLink, assignee,reporter,creator, created, issuetype, project, sprints, summary, updated, comments};

    // Convert the processedData object to markdown
    let md = `\n${isSub ? "#" : ""}# Jira Issue: ${processedData.id}\n`;
    md += `**Status:** ${processedData.status} (${processedData.statusCatatory})\n`;
    md += `**Summary:** ${processedData.summary}\n`;
    md += `**Description:**\n${processedData.description}\n`;
    md += `**Parent:** [${processedData.parent}](${processedData.parentLink})\n`;
    md += `**Assignee:** ${processedData.assignee}\n`;
    md += `**Reporter:** ${processedData.reporter}\n`;
    md += `**Creator:** ${processedData.creator}\n`;
    md += `**Created:** ${processedData.created}\n`;
    md += `**Updated:** ${processedData.updated}\n`;
    md += `**Issue Type:** ${processedData.issuetype}\n`;
    md += `**Project:** ${processedData.project}\n`;
    md += `**Sprints:** ${processedData.sprints}\n`;
    md += `\n${isSub ? "#" : ""}## Comments\n`;
    if (processedData.comments && processedData.comments.length > 0) {
        md += processedData.comments.map(c => `- ${c}`).join("\n");
    } else {
        md += "No comments.";
    }
    return md+ "\n\n";
}

// ----------------------
// Utility: Fetch from Jira API
// ----------------------
/**
 * Fetches data from the Jira REST API.
 * @param url API endpoint (relative to base)
 * @param method HTTP method (default: GET)
 * @param body Optional request body
 * @returns Parsed JSON response
 */
async function fetchJiraAPI(url: string, method: string = 'GET', body: any = null): Promise<any> {
    return await fetch(`${jiraBaseUrl}/${url}`, {
        method: method,
        headers: {
            'Authorization': `Basic ${encodedCredentials}`,
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    });
}

// ----------------------
// Tool: Get Jira Issue by Key
// ----------------------
/**
 * Fetches details for a specific Jira issue.
 * @param ticket Jira issue key (e.g., AUS-232)
 * @returns Markdown string with issue details
 */
async function getIssue(ticket: string): Promise<string> {
    return await fetchJiraAPI(`/rest/api/2/issue/${ticket}`).then(data => {
        return processIssue(data);
    })
    .catch(error => {
        return `**Error fetching Jira issue:** ${error}\n\n`;
    });
}

// ----------------------
// Tool: Get Jira Sprint by ID
// ----------------------
/**
 * Fetches details for a specific Jira sprint.
 * @param sprintId Sprint ID
 * @returns Markdown string with sprint details
 */
async function getSprint(sprintId: string | number): Promise<string> {
    return await fetchJiraAPI(`/rest/agile/1.0/sprint/${sprintId}`).then(data => {
        let md = `\n# Jira Sprint: ${data.name} (ID: ${data.id})\n`;
        md += `**State:** ${data.state}\n`;
        md += `**Start Date:** ${data.startDate}\n`;
        md += `**End Date:** ${data.endDate}\n`;
        md += `**Complete Date:** ${data.completeDate || 'N/A'}\n`;
        md += `**Created Date:** ${data.createdDate}\n`;
        md += `**Board ID:** ${data.originBoardId}\n`;
        md += `**Goal:**\n${data.goal}\n\n`;
        return md;
    }).catch(error => {
        return `**Error fetching Jira sprint:** ${error}\n\n`;
    });
}

// ----------------------
// Tool: Get Active Sprint(s) for a Board
// ----------------------
/**
 * Fetches the currently active sprint(s) for a given Jira board.
 * @param boardId Board ID (default: 1197)
 * @returns Markdown string with active sprint(s) details
 */
async function getActiveSprint(boardId: number = 1197): Promise<string> {
    return await fetchJiraAPI(`/rest/agile/1.0/board/${boardId}/sprint?state=active`).then(data => {
        if (!data.values || data.values.length === 0) return "No active sprints.";
        return data.values.map((sprint: any) => {
            let md = `\n# Active Sprint: ${sprint.name} (ID: ${sprint.id})\n`;
            md += `**State:** ${sprint.state}\n`;
            md += `**Start Date:** ${sprint.startDate}\n`;
            md += `**End Date:** ${sprint.endDate}\n`;
            md += `**Created Date:** ${sprint.createdDate}\n`;
            md += `**Board ID:** ${sprint.originBoardId}\n`;
            md += `**Goal:**\n${sprint.goal}\n\n`;
            return md;
        }).join("\n\n");
    }).catch(error => {
        return `**Error fetching active sprint:** ${error}\n\n`;
    });
}

// ----------------------
// Tool: Get Issues for a Sprint
// ----------------------
/**
 * Fetches all issues for a given Jira sprint.
 * @param sprintId Sprint ID
 * @returns Markdown string with issues summary
 */
async function getSprintIssues(sprintId: string | number): Promise<string> {
    return await fetchJiraAPI(`/rest/agile/1.0/sprint/${sprintId}/issue`).then(data => {
        if (!data.issues || data.issues.length === 0) return "No issues found for this sprint.";
        let md = `\n# Issues for Sprint ID: ${sprintId}\n`;
        md += data.issues.map((issue: JiraIssueJSON) => {
            return processIssue(issue);
        }).join("\n\n---\n\n");
        return md;
    }).catch(error => {
        return `**Error fetching sprint issues:** ${error}`;
    });
}

// ----------------------
// Tool: Get Issues for Active Sprint of a Board
// ----------------------
/**
 * Fetches all issues for the active sprint of a given Jira board.
 * @param boardId Board ID (default: 1197)
 * @returns Markdown string with issues summary
 */
async function getActiveSprintIssues(boardId: number = 1197): Promise<string> {
    const sprintId = (await fetchJiraAPI(`/rest/agile/1.0/board/${boardId}/sprint?state=active`)).values[0]?.id;
    return await fetchJiraAPI(`/rest/agile/1.0/sprint/${sprintId}/issue`).then(data => {
        if (!data.issues || data.issues.length === 0) return "No issues found for this sprint.";
        let md = `\n# Issues for Sprint ID: ${sprintId}\n`;
        md += `Total Issues: ${data.issues.length}\n`;
        md += data.issues.map((issue: JiraIssueJSON) => {
            return processIssue(issue, true);
        }).join("\n\n---\n\n");
        return md;
    }).catch(error => {
        return `**Error fetching sprint issues:** ${error}`;
    });
}

// ----------------------
// JIRAServer: MCP Server Implementation
// ----------------------
/**
 * JIRAServer class implements the MCP server for Jira tools.
 * Handles tool registration and request handling for Jira issue/sprint queries.
 */
class JIRAServer {
  private server: Server;

    /**
     * Initializes the Jira MCP server.
     * Sets up tool handlers for listing tools and calling the Jira search tool.
     */
  constructor() {
    console.error('[Setup] Initializing Jira MCP server...');
    
    this.server = new Server(
      {
        name: 'jira-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Registers all Jira tool handlers for the MCP server.
   */
  private setupToolHandlers() {
    // If the API token is the default placeholder, prepend a warning to all tool descriptions
    const warning = jiraApiToken === 'YOURAPITOKEN'
      ? '!!WARNING: You have not specified your token!! Please update MCP.json with your token details before using this tool.!! '
      : '';
    if (warning) {
        console.warn('[Setup] Warning: Using default API token. Please update MCP.json with your token details before using this tool.!!');
    }
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'jira_issue',
          description: warning + 'Fetch details for a specific Jira issue by ticket key or ID and return as markdown.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The Jira ticket key or ID (e.g., AUS-232).'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'jira_sprint',
          description: warning + 'Fetch details for a specific Jira sprint by sprint ID and return as markdown.',
          inputSchema: {
            type: 'object',
            properties: {
              sprintId: {
                type: ['string', 'number'],
                description: 'The unique identifier of the Jira sprint.'
              }
            },
            required: ['sprintId']
          }
        },
        {
          name: 'jira_active_sprint',
          description: warning + 'Fetch the currently active sprint(s) for a given Jira board and return as markdown.',
          inputSchema: {
            type: 'object',
            properties: {
              boardId: {
                type: 'number',
                description: 'The unique identifier of the Jira board. Defaults to 1197 if not provided.'
              }
            },
            required: []
          }
        },
        {
          name: 'jira_sprint_issues',
          description: warning + 'Fetch all issues for a given Jira sprint and return as markdown.',
          inputSchema: {
            type: 'object',
            properties: {
              sprintId: {
                type: ['string', 'number'],
                description: 'The unique identifier of the Jira sprint.'
              }
            },
            required: ['sprintId']
          }
        },
        {
          name: 'jira_active_sprint_issues',
          description: warning + 'Fetch all issues for the active sprint of a given Jira board and return as markdown.',
          inputSchema: {
            type: 'object',
            properties: {
              boardId: {
                type: 'number',
                description: 'The unique identifier of the Jira board. Defaults to 1197 if not provided.'
              }
            },
            required: []
          }
        }
      ]
    }));

    // Tool call handler: routes tool calls to the correct implementation
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        if (request.params.name === 'jira_issue') {
          const args = request.params.arguments as { query: string };
          if (!args.query) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Missing required parameter: query'
            );
          }
          const md = await getIssue(args.query);
          return {
            content: [
              {
                type: 'text',
                text: md
              }
            ]
          };
        } else if (request.params.name === 'jira_sprint') {
          const args = request.params.arguments as { sprintId: string | number };
          if (!args.sprintId) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Missing required parameter: sprintId'
            );
          }
          const md = await getSprint(args.sprintId);
          return {
            content: [
              {
                type: 'text',
                text: md
              }
            ]
          };
        } else if (request.params.name === 'jira_active_sprint') {
          const args = request.params.arguments as { boardId?: number };
          const md = await getActiveSprint(args.boardId ?? 1197);
          return {
            content: [
              {
                type: 'text',
                text: md
              }
            ]
          };
        } else if (request.params.name === 'jira_sprint_issues') {
          const args = request.params.arguments as { sprintId: string | number };
          if (!args.sprintId) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Missing required parameter: sprintId'
            );
          }
          const md = await getSprintIssues(args.sprintId);
          return {
            content: [
              {
                type: 'text',
                text: md
              }
            ]
          };
        } else if (request.params.name === 'jira_active_sprint_issues') {
          const args = request.params.arguments as { boardId?: number };
          const md = await getActiveSprintIssues(args.boardId ?? 1197);
          return {
            content: [
              {
                type: 'text',
                text: md
              }
            ]
          };
        } else {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('[Error] Jira search failed:', error);
          throw new McpError(
            ErrorCode.InternalError,
            `Jira search failed: ${error.message}`
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
    console.error('Jira MCP server running on stdio');
  }
}

// ----------------------
// Entrypoint: Start the Jira MCP Server
// ----------------------
const server = new JIRAServer();
server.run().catch(console.error);