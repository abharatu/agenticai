/**
 * ChatUI.jsx - Main Chat Interface Component
 *
 * This component provides the chat interface for interacting with the AI model or agent.
 * It supports streaming and non-streaming responses, markdown and math rendering, and MCP config editing.
 *
 * Author: Vikrama Aditya Bharatula
 * Date: 2025-06-24
 */

import React, { useState } from 'react';
import {
  Box, List, ListItem, ListItemText, TextField, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Marked } from "marked";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.min.css';

// =========================
// Backend URL Configuration
// =========================
// Change this to your backend URL if different
// For local development, ensure your backend is running on this port
const backendUrl = "http://localhost:8080";

// =========================
// Markdown and Syntax Highlighting Setup
// =========================
const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

// =========================
// Helper Functions
// =========================
/**
 * Renders markdown and math expressions using marked and KaTeX.
 * @param {string} md - Markdown string
 * @returns {string} - HTML string
 */
function renderMarkdownWithMath(md) {
  let html = marked.parse(md);
  // Render block math ($$...$$)
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
    try {
      return katex.renderToString(tex, { displayMode: true });
    } catch {
      return match;
    }
  });
  // Render inline math ($...$)
  html = html.replace(/\$(.+?)\$/g, (match, tex) => {
    if (/<code>/.test(match)) return match;
    try {
      return katex.renderToString(tex, { displayMode: false });
    } catch {
      return match;
    }
  });
  return html;
}

/**
 * Renders message content, supporting <think> blocks with special styling and icons.
 * @param {string} content - Message content
 * @param {boolean} isStreaming - Whether streaming is active
 * @returns {JSX.Element[]}
 */
function renderMessageContent(content, isStreaming = false) {
  const thinkRegex = /<think>([\s\S]*?)(<\/think>|$)/g;
  let lastIndex = 0;
  let result = [];
  let match;
  let key = 0;
  while ((match = thinkRegex.exec(content)) !== null) {
    // Text before <think>
    if (match.index > lastIndex) {
      const before = content.slice(lastIndex, match.index);
      if (before) {
        result.push(
          <span key={key++} dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(before) }} />
        );
      }
    }
    // <think> content (highlighted with bulb icon)
    const thinkContent = match[1];
    const isClosed = match[2] === '</think>';
    if (thinkContent && thinkContent.trim().length > 0) {
      result.push(
        <span key={key++}>
          <EmojiObjectsIcon fontSize="small" sx={{ verticalAlign: 'middle', color: '#fbc02d' }} />
          <span style={{ fontSize: '0.9em', fontStyle: 'italic' }}>{thinkContent}</span>
          {isClosed && <EmojiObjectsIcon fontSize="small" sx={{ verticalAlign: 'middle', color: '#fbc02d' }} />}
        </span>
      );
    }
    lastIndex = thinkRegex.lastIndex;
    if (isStreaming && !isClosed) break;
  }
  // Remaining text after last <think>
  if (lastIndex < content.length) {
    const after = content.slice(lastIndex);
    if (after) {
      result.push(
        <span key={key++} dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(after) }} />
      );
    }
  }
  return result;
}

/**
 * Copy text to clipboard.
 * @param {string} text - Text to copy
 */
function copyToClipboard(text) {
  if (navigator && navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    // fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

// =========================
// Main Component
// =========================
/**
 * ChatUI component
 * @param {object} props
 * @param {object} theme - Theme object
 * @param {object} config - Model/server config
 * @param {string} configError - Config error message
 * @param {boolean} thinkActive - Whether to show <think> blocks
 * @param {object} modelConfig - Model configuration
 * @param {boolean} useMCP - Whether MCP is enabled
 * @param {object} mcpConfig - MCP configuration
 * @param {function} onUpdateMcpConfig - Handler to update MCP config
 * @param {string} systemMessage - System message to prepend to every chat (optional)
 */
export default function ChatUI({ theme, config, configError, thinkActive, modelConfig, useMCP, mcpConfig, onUpdateMcpConfig, systemMessage }) {
  // =========================
  // State
  // =========================
  const [messages, setMessages] = useState(() => {
    // If systemMessage is set, start with it as the first message
    if (systemMessage && systemMessage.trim()) {
      return [{ role: 'system', content: systemMessage.trim() }];
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [mcpConfigDraft, setMcpConfigDraft] = useState(JSON.stringify(mcpConfig, null, 2));
  const [mcpConfigError, setMcpConfigError] = useState('');

  // Streaming mode detection
  const isStreaming = config && config.config && (config.config.stream || config.config.streaming);

  // If systemMessage changes, reset chat with new system message
  React.useEffect(() => {
    setMessages((msgs) => {
      // If already has system message as first, replace it
      if (systemMessage && systemMessage.trim()) {
        if (msgs.length === 0 || msgs[0].role !== 'system' || msgs[0].content !== systemMessage.trim()) {
          return [{ role: 'system', content: systemMessage.trim() }];
        }
      } else if (msgs.length > 0 && msgs[0].role === 'system') {
        // Remove system message if cleared
        return msgs.slice(1);
      }
      return msgs;
    });
  }, [systemMessage]);

  // =========================
  // Message Send Handler
  // =========================
  /**
   * Handles sending a user message and receiving a response (streaming or not).
   */
  const handleSend = async () => {
    if (input.trim() === '') return;
    let userMessage = { role: 'user', content: input };
    // If first message and systemMessage is set, ensure system message is present
    let baseMessages = messages;
    if (systemMessage && systemMessage.trim() && (messages.length === 0 || messages[0].role !== 'system')) {
      baseMessages = [{ role: 'system', content: systemMessage.trim() }];
    }
    setMessages([...baseMessages, userMessage]);
    setInput('');
    setLoading(true);
    setStreamedText('');
    let sendContent = input;
    const provider = config && config.provider;
    if ((provider !== 'azureopenai' && provider !== 'openai') && thinkActive === false) {
      sendContent += ' /no_think';
    }
    const sendMessage = { role: 'user', content: sendContent };
    if (isStreaming) {
      try {
        const response = await fetch(backendUrl + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelConfig: modelConfig,
            mcpConfig: useMCP ? mcpConfig : undefined,
            messages: [
              ...baseMessages,
              sendMessage
            ]
          })
        });
        if (!response.ok || !response.body) {
          throw new Error('Server responded error');
        }
        const reader = response.body.getReader();
        let decoder = new TextDecoder();
        let done = false;
        let fullText = '';
        setMessages(msgs => [...msgs, { role: 'assistant', content: '' }]);
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            setStreamedText(fullText);
            setMessages(msgs => {
              const updated = [...msgs];
              updated[updated.length - 1] = { role: 'assistant', content: fullText };
              return updated;
            });
          }
        }
      } catch (err) {
        setMessages(msgs => [...msgs, { role: 'assistant', content: 'Error: ' + err.message }]);
      } finally {
        setLoading(false);
        setStreamedText('');
      }
    } else {
      try {
        const response = await fetch(backendUrl + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelConfig: modelConfig,
            messages: [
              ...baseMessages,
              userMessage
            ]
          })
        });
        if (!response.ok) {
          throw new Error('Server responded error');
        }
        const data = await response.json();
        setMessages(msgs => [...msgs, { role: 'assistant', content: data.reply || '[No reply]' }]);
      } catch (err) {
        setMessages(msgs => [...msgs, { role: 'assistant', content: 'Error: ' + err.message }]);
      } finally {
        setLoading(false);
      }
    }
  };

  // =========================
  // MCP Config Dialog Handlers
  // =========================
  /**
   * Opens the MCP config dialog for editing.
   */
  const handleOpenMcpDialog = () => {
    setMcpConfigDraft(JSON.stringify(mcpConfig, null, 2));
    setMcpConfigError('');
    setMcpDialogOpen(true);
  };
  /**
   * Saves the MCP config from the dialog.
   */
  const handleSaveMcpConfig = () => {
    try {
      const parsed = JSON.parse(mcpConfigDraft);
      setMcpDialogOpen(false);
      setMcpConfigError('');
      if (onUpdateMcpConfig) onUpdateMcpConfig(parsed);
    } catch (e) {
      setMcpConfigError('Invalid JSON: ' + e.message);
    }
  };

  // =========================
  // Render
  // =========================
  return (
    <Box>
      {/* Config Error Display */}
      {configError && <div className="chatui-error">Config Error: {configError}</div>}
      {/* Message List */}
      <Box className="chatui-message-list">
        <List>
          {/* Except system render all messages */}
          {messages.filter(msg=>msg.role !== "system").map((msg, idx) => (
            <ListItem
              key={idx}
              className={
                msg.role === 'user' ? 'chatui-message-item-user'
                : msg.role === 'system' ? 'chatui-message-item-system'
                : 'chatui-message-item-assistant'
              }
              sx={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', display: 'flex', alignItems: 'flex-start' }}
            >
            <ListItemText
                primary={
                  <span>
                    {msg.role === 'system' ? <><b>System:</b> </> : null}
                    {renderMessageContent(msg.content)}
                  </span>
                }
                className={
                  msg.role === 'user' ? 'chatui-message-bubble-user'
                  : msg.role === 'system' ? 'chatui-message-bubble-system'
                  : 'chatui-message-bubble-assistant'
                }
              />
            <IconButton
                size="small"
                aria-label="Copy message"
                onClick={() => copyToClipboard(msg.content)}
                sx={{ mr: 1, mt: 0.5 }}
              >
                <ContentCopyIcon fontSize="small" sx={{ opacity: 0.5 }} />
            </IconButton>
            </ListItem>
          ))}
          {loading && !isStreaming && (
            <ListItem className="chatui-message-item-assistant">
              <ListItemText primary={"..."} className="chatui-message-bubble-assistant" />
            </ListItem>
          )}
        </List>
      </Box>
      {/* Input Row */}
      <Box className="chatui-input-row">
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !loading) handleSend(); }}
          disabled={loading}
        />
        <IconButton color="primary" onClick={handleSend} sx={{ alignSelf: 'end' }} disabled={loading}>
          <SendIcon />
        </IconButton>
      </Box>
      {/* MCP Config Edit Dialog */}
      <Dialog open={mcpDialogOpen} onClose={() => setMcpDialogOpen(false)}>
        <DialogTitle>Edit MCP Config</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            fullWidth
            variant="outlined"
            placeholder="MCP Config JSON"
            value={mcpConfigDraft}
            onChange={e => setMcpConfigDraft(e.target.value)}
            error={!!mcpConfigError}
            helperText={mcpConfigError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMcpDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSaveMcpConfig} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
