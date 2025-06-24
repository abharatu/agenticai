/**
 * Model.js - Model and MCP Client Factory Utilities
 *
 * This module provides utilities for loading LLM model configurations, creating model instances,
 * and initializing MCP clients and agents with tool support. It supports OpenAI, Azure OpenAI, and Ollama providers.
 *
 * Author: Vikrama Aditya Bharatula
 * Date: 2025-06-24
 */

import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import fs from 'fs';
import path from 'path';

// Remove max listeners warning for large agent graphs
process.setMaxListeners(0);

// =========================
// Model Provider Selection
// =========================
// Use environment variable or default to 'openai'
const provider = process.env.MODEL_PROVIDER || 'openai';

// =========================
// Load Model Configuration
// =========================
// Loads the model config from /secrets/mode.config.<provider>.json
const configPath = path.join(process.cwd(), `/secrets/mode.config.${provider}.json`);
let modelConfig = {};
try {
  const configRaw = fs.readFileSync(configPath, 'utf-8');
  modelConfig = JSON.parse(configRaw);
} catch (err) {
  console.error('Failed to load mode.config.json:', err);
}

// =========================
// Model and MCP Client Factories
// =========================

/**
 * The model provider string (e.g., 'openai', 'azureopenai', 'ollama')
 */
export const ModelProvider = provider;

/**
 * The loaded model configuration object
 */
export const ModelConfig = modelConfig;

/**
 * Factory function to create a model instance for the selected provider.
 * @param {object} modelConfig - The model configuration object
 * @returns {ChatOpenAI|AzureChatOpenAI|ChatOllama}
 */
export const Model = (modelConfig = ModelConfig) => (
  provider === "openai"
    ? new ChatOpenAI(modelConfig)
    : (provider === "azureopenai"
      ? new AzureChatOpenAI(modelConfig)
      : new ChatOllama(modelConfig))
);

/**
 * Factory function to create a MultiServerMCPClient instance.
 * @param {object} mcpConfig - MCP client configuration
 * @returns {MultiServerMCPClient|null}
 */
export const CreatMCPClient = (mcpConfig = {}) => {
  try {
    return new MultiServerMCPClient(mcpConfig);
  } catch (err) {
    console.error('Failed to load MCP.json:', err);
  }
  return null;
};

/**
 * Creates a model and MCP client, loads tools, and returns a LangGraph agent with tools attached.
 * @param {object} modelConfig - Model configuration (optional)
 * @param {object} mcpConfig - MCP client configuration (optional)
 * @returns {Promise<{agent: any, client: MultiServerMCPClient}|null>}
 */
export const ModelWithMCPFile = async (modelConfig = ModelConfig, mcpConfig = {}) => {
  try {
    const client = CreatMCPClient(mcpConfig);
    // Create a model instance
    const model = Model(modelConfig);
    // Load tools from the MCP client
    const tools = await client.getTools();
    // Create a LangGraph agent with the model and tools
    const agent = await createReactAgent({
      llm: model,
      tools,
    });
    return { agent, client };
  } catch (err) {
    console.error('Failed to load Model with MCP File:', err);
  }
  return null;
};
