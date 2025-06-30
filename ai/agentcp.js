// agentlg.js - LangGraph Agent Example (JavaScript Version)
//
// This script demonstrates how to build a simple LangGraph agent using OpenAI and TavilySearch tools.
// It uses a checkpointing mechanism to persist memory between agent runs (threaded conversations).
//
// Author: Vikrama Aditya Bharatula
// Date: 2025-06-24

// =========================
// Configuration: API Keys
// =========================
// Create your own agentlgconfig.js to store your API keys securely.
import config from "./secrets/agentlgconfig.js";

// Set environment variables for API keys
process.env.TAVILY_API_KEY = config.TAVILY_API_KEY;

// =========================
// Imports
// =========================
import { TavilySearch } from "@langchain/tavily";
import { Model } from "./Model.js";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// =========================
// Agent Setup
// =========================
// Define the tools for the agent to use (TavilySearch for web search)
const agentTools = [new TavilySearch({ maxResults: 3 })];
// Define the LLM (OpenAI, zero temperature for deterministic output)
const agentModel = Model();
// Initialize memory to persist state between graph runs (threaded conversations)
const agentCheckpointer = new MemorySaver();

// Create the LangGraph React agent
const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  checkpointSaver: agentCheckpointer,
});

// =========================
// Example Usage
// =========================
(async () => {
  // Start a new thread (thread_id: "42") and ask a question
  const agentFinalState = await agent.invoke(
    { messages: [new HumanMessage("What is the latest cricket news?")] },
    { configurable: { thread_id: "42" } },
  );

  // Print the agent's response
  console.log(
    agentFinalState.messages[agentFinalState.messages.length - 1].content,
  );

  // Continue the same thread with a follow-up question
  const agentNextState = await agent.invoke(
    { messages: [new HumanMessage("What are the latest scores from the last cricket match?")] },
    { configurable: { thread_id: "42" } },
  );

  // Print the agent's response
  console.log(
    agentNextState.messages[agentNextState.messages.length - 1].content,
  );
})();
