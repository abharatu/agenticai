/**
 * server.js - Express API Server for AI Model and MCP Integration
 *
 * This server exposes endpoints for health checks, model listing, configuration, chat, and MCP config.
 * It supports both direct model chat and MCP-based agent chat, with streaming and error handling.
 *
 * Author: Vikrama Aditya Bharatula
 * Date: 2025-06-24
 */

import express from 'express';
import RateLimit from 'express-rate-limit';
import cors from 'cors';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { concat } from "@langchain/core/utils/stream";
import { ollamaBaseUrl, ModelProvider, ModelConfig, Model, ModelWithMCPFile } from './Model.js';

/**
 * Initializes and returns an Express app with all API endpoints.
 * @returns {Promise<express.Application>}
 */
async function Server() {
    const app = express();

    // Enable CORS and JSON body parsing
    app.use(cors());
    app.use(express.json());

    // Set up rate limiter: maximum of 100 requests per 5 minutes
    const limiter = RateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: { error: "Too many requests, please try again later." }
    });

    // Apply rate limiter to all endpoints
    app.use(limiter);

    // =========================
    // Health Check Endpoint
    // =========================
    /**
     * @openapi
     * /:
     *   get:
     *     summary: Health check for the API
     *     responses:
     *       200:
     *         description: API is running
     */
    app.get('/', (req, res) => {
      res.send('AI Server API is running');
    });

    // =========================
    // Model Listing Endpoint (Ollama)
    // =========================
    /**
     * @openapi
     * /api/models:
     *   get:
     *     summary: Get available models from the provider
     *     responses:
     *       200:
     *         description: A list of available models
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 models:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       name:
     *                         type: string
     *                       model:
     *                         type: string
     *                       modified_at:
     *                         type: string
     *                       size:
     *                         type: integer
     *                       digest:
     *                         type: string
     *                       details:
     *                         type: object
     *                         properties:
     *                           parent_model:
     *                             type: string
     *                           format:
     *                             type: string
     *                           family:
     *                             type: string
     *                           families:
     *                             type: array
     *                             items:
     *                               type: string
     *                           parameter_size:
     *                             type: string
     *                           quantization_level:
     *                             type: string
     *       500:
     *         description: Failed to fetch models from the provider
     */
    app.get('/api/models', async (req, res) => {
      const { provider } = req.query;
      if (provider === "ollama") {
        try {
          const results = await fetch(`${ollamaBaseUrl}/api/tags`);
          if (!results.ok) {
            return res.status(404).json({ error: 'Failed to fetch models from Ollama' });
          }
          const models = await results.json();
          return res.json(models);
        } catch (err) {
          console.error('Error fetching models:', err.message);
          return res.status(404).json({ error: 'Failed to fetch models from Ollama' });
        }
      }
    });

    // =========================
    // Model Config Endpoint
    // =========================
    /**
     * @openapi
     * /api/config:
     *   get:
     *     summary: Get current model provider and config
     *     responses:
     *       200:
     *         description: Current provider and config
     */
    app.get('/api/config', (req, res) => {
      res.json({
        provider: ModelProvider,
        config: ModelConfig,
        mcp: process.env.USEMCP == "TRUE",
      });
    });

    // =========================
    // Model Chat Endpoint (Direct)
    // =========================
    /**
     * Handles chat requests using the direct model (no MCP).
     */
    const performModelChat = async (req, res) => {
      const { messages, modelConfig } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'No messages provided' });
      }
      const chat = await Model(modelConfig);
      // Convert messages to Langchain format
      const lcMessages = messages.map((msg) =>
        msg.role === 'user'
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      );
      // Streaming support
      if (ModelConfig.stream) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        let finalResult;
        try {
          const stream = await chat.stream(lcMessages);
          for await (const chunk of stream) {
            if (finalResult) {
              finalResult = concat(finalResult, chunk);
            } else {
              finalResult = chunk;
            }
            res.write(chunk.content);
          }
          res.end();
        } catch (err) {
          if (err.status_code === 404) {
            return res.status(404).json({ error: err.error || `${ModelProvider} resource not found` });
          } else {
            console.error('Error during streaming:', err);
            res.status(500).json({ error: err.message || `${ModelProvider} error` });
          }
        }
        return;
      }
      // Non-streaming
      try {
        const result = await chat.invoke(lcMessages);
        if (!result || !result.content) {
          return res.status(500).json({ error: 'No content in OpenAI response' });
        }
        // Forward chat reply only
        const response = { reply: result.content };
        res.json(response);
      } catch (err) {
        if (err.status_code === 404) {
          return res.status(404).json({ error: err.error || `${ModelProvider} resource not found` });
        } else {
          console.error('Error during chat:', err);
          res.status(500).json({ error: err.message || `${ModelProvider} error` });
        }
      }
    };

    // =========================
    // Model Chat Endpoint (MCP)
    // =========================
    /**
     * Handles chat requests using the MCP agent (with tools).
     */
    const performMCPModelChat = async (req, res) => {
      const { messages, modelConfig, mcpConfig } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'No messages provided' });
      }
      //console.log('Using MCP model with config:', modelConfig, mcpConfig);
      const chat = await ModelWithMCPFile(modelConfig, mcpConfig);
      // Convert messages to Langchain format
      let lcMessages = messages.map((msg) =>
        msg.role === 'user'
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      );
      console.log('Starting MCP client prompt:', lcMessages[-1]?.text || 'No content');
      // Streaming support
      if (ModelConfig.stream) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        let finalResult;
        try {
          // Use the MCP client to stream messages
          const stream = await chat.agent.stream({ messages: lcMessages });
          for await (const chunk of stream) {
            if (finalResult) {
              finalResult = concat(finalResult, chunk);
            } else {
              finalResult = chunk;
            }
            if (chunk.agent?.messages) {
              res.write(chunk.agent.messages.map(m => m.content).join(''));
            }
            if (chunk.tools?.messages) {
              res.write(`${chunk.tools.messages.map(m => `🔧${m.name}:${m.content}`).join('')}`);
            }
          }
          res.end();
        } catch (err) {
          if (err.status_code === 404) {
            return res.status(404).json({ error: err.error || `${ModelProvider} resource not found` });
          } else {
            console.error('Error during streaming:', err);
            res.write(`Error: ${err.message}` || `Error: ${ModelProvider} has an error`);
            res.end();
          }
        } finally {
          if (chat.client) {
            console.log('Closing MCP client connection');
            await chat.client.close();
          }
        }
        return;
      }
      // Non-streaming
      try {
        const result = await chat.agent.invoke({ messages: lcMessages });
        if (!result) {
          return res.status(500).json({ error: 'No content in OpenAI response' });
        }
        let content = "";
        if (result?.messages) {
          content = result.messages.map(m => m.content).join('');
        }
        // Forward chat reply only
        const response = { reply: content };
        res.json(response);
      } catch (err) {
        if (err.status_code === 404) {
          return res.status(404).json({ error: err.error || `${ModelProvider} resource not found` });
        } else {
          res.write({ error: err.message || `${ModelProvider} error` });
          res.end();
        }
      } finally {
        if (chat.client) {
          console.log('Closing MCP client connection');
          await chat.client.close();
        }
      }
    };

    // =========================
    // Chat API Endpoint
    // =========================
    /**
     * @openapi
     * /api/chat:
     *   post:
     *     summary: Send chat messages and get a model response
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               messages:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     role:
     *                       type: string
     *                     content:
     *                       type: string
     *               id:
     *                 type: string
     *               topic:
     *                 type: string
     *     responses:
     *       200:
     *         description: Model reply
     *       400:
     *         description: No messages provided
     *       500:
     *         description: Model error
     */
    app.post('/api/chat', async (req, res) => {
      if (process.env.USEMCP === "TRUE") {
        return await performMCPModelChat(req, res);
      }
      return await performModelChat(req, res);
    });

    // =========================
    // MCP Config Endpoint
    // =========================
    /**
     * @openapi
     * /api/mcpconfig:
     *   get:
     *     summary: Get the contents of MCP.json
     *     responses:
     *       200:
     *         description: MCP configuration file contents
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *       500:
     *         description: Failed to read MCP.json
     */
    app.get('/api/mcpconfig', async (req, res) => {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const mcpPath = path.resolve(process.cwd(), 'MCP.json');
        const data = await fs.readFile(mcpPath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
      } catch (err) {
        console.error('Failed to read MCP.json:', err);
        res.status(500).json({ error: 'Failed to read MCP.json' });
      }
    });
    return app;
}

// =========================
// Entrypoint: Start Server if Main Module
// =========================
console.log(`file://${process.argv[1]}=${import.meta.url}`);

if (import.meta.url === `file://${process.argv[1]}`) {
  // If this file is run directly, start the server
  const PORT = process.env.AIPORT || 8080;
  Server().then((app) => {
    app.listen(PORT, () => {
      console.log(`AI Server with Provider:${ModelProvider} is running on port:${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start server:', err);
  });
}

export default Server;