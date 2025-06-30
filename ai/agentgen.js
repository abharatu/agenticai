/**
 * agent.js - Filesystem MCP Server with LangGraph Example
 *
 * This script demonstrates how to use the Filesystem MCP server with LangGraph
 * to create a structured workflow for complex file operations using a graph-based agent.
 *
 * Features:
 * - Clear separation of reasoning (LLM) and execution (tools)
 * - Conditional routing for tool calls
 * - Handles multi-file operations and directory management
 *
 * Author: Vikrama Aditya Bharatula
 * Date: 2025-06-24
 */

/* eslint-disable no-console */
// =========================
// Imports
// =========================
import {
  StateGraph,
  END,
  START,
  MessagesAnnotation,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  isHumanMessage,
} from "@langchain/core/messages";
import fs from "fs";
import path from "path";
// MCP client imports
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';

// =========================
// Agent Configuration (inlined from Agent.json)
// =========================
const agentConfig = {
  "systemMessage": "You are an assistant that helps users with file operations.\nYou have access to tools that can read and write files, create directories,\nand perform other filesystem operations. Be careful with file operations,\nespecially writing and editing files. Always confirm the content and path before\nmaking changes.\n\nFor file writing operations, format the content properly based on the file type.\nFor reading multiple files, you can use the read_multiple_files tool.",
  "mcpServers": {
    "filesystem": {
      "transport": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "./agentfsexamples"
      ]
    }
  },
  "prompts": [
    {
      "name": "Write multiple files",
      "query": "Create two files: 'notes.txt' with content 'Important meeting on Thursday' and 'reminder.txt' with content 'Call John about the project'."
    },
    {
      "name": "Read multiple files",
      "query": "Read both notes.txt and reminder.txt files and create a summary file called 'summary.txt' that contains information from both files."
    }
  ]
};

// =========================
// Main Example Function
// =========================
/**
 * Demonstrates how to use MCP filesystem tools with LangGraph agent flows.
 * Focuses on file operations like reading and writing multiple files.
 * @param {MultiServerMCPClient} client Optional MCP client instance
 */
export async function runExample(client) {
  try {
    console.log("Initializing MCP client...");

    // Create a client with configurations for the filesystem server
    // eslint-disable-next-line no-param-reassign
    client =
      client ??
      new MultiServerMCPClient({
        mcpServers: agentConfig.mcpServers,
        useStandardContentBlocks: true,
      });

    console.log("Connected to server");

    // Get all tools (flattened array is the default now)
    const mcpTools = await client.getTools();

    if (mcpTools.length === 0) {
      throw new Error("No tools found");
    }

    console.log(
      `Loaded ${mcpTools.length} MCP tools: ${mcpTools
        .map((tool) => tool.name)
        .join(", ")}`
    );

    // =========================
    // Model Provider Selection
    // =========================
    // Model implementation logic (inlined from Model.js)
    const provider = process.env.MODEL_PROVIDER || 'openai';
    const configPath = path.join(process.cwd(), `/secrets/mode.config.${provider}.json`);
    let modelConfig = {};
    try {
      const configRaw = fs.readFileSync(configPath, 'utf-8');
      modelConfig = JSON.parse(configRaw);
    } catch (err) {
      console.error('Failed to load mode.config.json:', err);
    }

    function getModel() {
      if (provider === 'openai') {
        return new ChatOpenAI(modelConfig);
      } else if (provider === 'azureopenai') {
        return new AzureChatOpenAI(modelConfig);
      } else {
        return new ChatOllama(modelConfig);
      }
    }

    // Create an OpenAI model with tools attached
    const systemMessage = agentConfig.systemMessage || `You are an assistant that helps users with file operations.`;
    // Use the inlined getModel() instead of specific Provider Calls
    const model = getModel().bindTools(mcpTools);

    // =========================
    // Create a LangGraph agent flow
    // =========================
    console.log("\n=== CREATING LANGGRAPH AGENT FLOW ===");

    // Define the function that calls the model (LLM node)
    const llmNode = async (state) => {
      console.log(`Calling LLM with ${state.messages.length} messages`);

      // Add system message if it's the first call
      let { messages } = state;
      if (messages.length === 1 && isHumanMessage(messages[0])) {
        messages = [new SystemMessage(systemMessage), ...messages];
      }

      const response = await model.invoke(messages);
      return { messages: [response] };
    };

    // Tool node for executing tool calls
    const toolNode = new ToolNode(mcpTools);

    // Create a new graph with MessagesAnnotation
    const workflow = new StateGraph(MessagesAnnotation)
      // Add the nodes to the graph
      .addNode("llm", llmNode)
      .addNode("tools", toolNode)
      // Add edges - these define how nodes are connected
      .addEdge(START, "llm")
      .addEdge("tools", "llm")
      // Conditional routing to end or continue the tool loop
      .addConditionalEdges("llm", (state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        // Cast to AIMessage to access tool_calls property
        const aiMessage = lastMessage;
        if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
          console.log("Tool calls detected, routing to tools node");
          // Log what tools are being called
          const toolNames = aiMessage.tool_calls
            .map((tc) => tc.name)
            .join(", ");
          console.log(`Tools being called: ${toolNames}`);
          return "tools";
        }
        // If there are no tool calls, we're done
        console.log("No tool calls, ending the workflow");
        return END;
      });

    // Compile the graph
    const app = workflow.compile();

    // Use prompts from Agent.json
    const prompts = Array.isArray(agentConfig.prompts) ? agentConfig.prompts : [];

    // =========================
    // Run the prompts
    // =========================
    console.log("\n=== RUNNING LANGGRAPH AGENT ===");

    for (const example of prompts) {
      console.log(`\n--- Example: ${example.name} ---`);
      console.log(`Query: ${example.query}`);

      // Run the LangGraph agent
      const result = await app.invoke({
        messages: [new HumanMessage(example.query)],
      });

      // Display the final answer
      const finalMessage = result.messages[result.messages.length - 1];
      console.log(`\nResult: ${finalMessage.content}`);

      // Let's list the directory to see the changes
      console.log("\nDirectory listing after operations:");
      try {
        const listResult = await app.invoke({
          messages: [
            new HumanMessage(
              "List all files and directories in the current directory and show their structure."
            ),
          ],
        });
        const listMessage = listResult.messages[listResult.messages.length - 1];
        console.log(listMessage.content);
      } catch (error) {
        console.error("Error listing directory:", error);
      }
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1); // Exit with error code
  } finally {
    if (client) {
      await client.close();
      console.log("Closed all MCP connections");
    }
    // Exit process after a short delay to allow for cleanup
    setTimeout(() => {
      console.log("Example completed, exiting process.");
      process.exit(0);
    }, 500);
  }
}

// =========================
// Test Directory Setup
// =========================
/**
 * Create a directory for our tests if it doesn't exist yet
 */
async function setupTestDirectory() {
  const testDir = path.join("./agentfsexamples");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
    console.log(`Created test directory: ${testDir}`);
  }
}

// =========================
// Entrypoint: Run Example if Main Module
// =========================
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  setupTestDirectory()
    .then(() => runExample())
    .catch((error) => console.error("Setup error:", error));
}