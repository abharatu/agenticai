/**
 * App.jsx - Main React Application for Agent UI
 *
 * This file implements the main UI for the chat application, including theme switching,
 * provider/model selection, MCP config management, and routing between chat and agent designer views.
 *
 * Author: Vikram Aditya Bharatula
 * Date: 2025-06-24
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, IconButton, Tooltip, Menu, MenuItem, ClickAwayListener,
  Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ChatIcon from '@mui/icons-material/Chat';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import TryIcon from '@mui/icons-material/Try';
import AzureOpenAIIcon from './azureopenai.svg';
import OpenAIIcon from './openai.svg';
import OllamaIcon from './ollama.svg';
import McpIcon from './mcp.svg';
import AgentDesigner from './AgentDesigner.jsx';
import AgentUI from './AgentUI.jsx';
import './App.css';

// =========================
// Backend URL Configuration
// =========================
// Change this to your backend URL if different
// For local development, ensure your backend is running on this port
const backendUrl = "http://localhost:8080";

function App() {
  // =========================
  // State and Theme Management
  // =========================
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState('system'); // 'light', 'dark', or 'system'
  const [provider, setProvider] = useState('openai');
  const [useMCP, setUseMCP] = useState(false);
  const [mcpConfig, setMcpConfig] = useState(null);
  const [defaultMCPConfig, setDefaultMCPConfig] = useState(null);
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [thinkActive, setThinkActive] = useState(() => {
    const stored = localStorage.getItem('thinkActive');
    return (stored === null ? false : stored === 'true');
  });
  const [modelMenuAnchor, setModelMenuAnchor] = useState(null);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [modelConfig, setModelConfig] = useState(null);
  const [modelListError, setModelListError] = useState(null);
  const [modelListDialogOpen, setModelListDialogOpen] = useState(false);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [mcpConfigError, setMcpConfigError] = useState(null);
  const [model, setModel] = useState('Unknown Model');

  // System Message State
  const [systemMessage, setSystemMessage] = useState(() => localStorage.getItem('systemMessage') || 'You are a helpful assistant.');
  const [systemDialogOpen, setSystemDialogOpen] = useState(false);
  const [systemMessageDraft, setSystemMessageDraft] = useState(systemMessage);

  // =========================
  // Effects: Persist and Fetch Configs
  // =========================
  useEffect(() => {
    localStorage.setItem('thinkActive', thinkActive);
  }, [thinkActive]);

  // Persist system message in localStorage
  useEffect(() => {
    localStorage.setItem('systemMessage', systemMessage);
  }, [systemMessage]);

  // Fetch config on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(backendUrl + '/api/config');
        if (!res.ok) throw new Error('Failed to fetch config');
        const data = await res.json();
        setConfig(data);
        if (data.provider) setProvider(data.provider);
        if (data.mcp != undefined) setUseMCP(data.mcp);
        if (data.config && (data.config.model || data.config.modelName)) setModel(data.config.model || data.config.modelName);
      } catch (err) {
        setConfigError(err.message);
      }
    }
    fetchConfig();
  }, []);

  // Fetch MCP config on mount
  useEffect(() => {
    async function fetchMcpConfig() {
      try {
        const res = await fetch(backendUrl + '/api/mcpconfig');
        if (!res.ok) throw new Error('Failed to fetch MCP config');
        const data = await res.json();
        setDefaultMCPConfig(data);
        // Apply persisted filter to mcpConfig
        const stored = localStorage.getItem('selectedMcpServers');
        const selected = stored ? JSON.parse(stored) : ['filesystem'];
        const filteredServers = {};
        if (data.mcpServers) {
          for (const key of selected) {
            if (data.mcpServers[key]) {
              filteredServers[key] = data.mcpServers[key];
            }
          }
        }
        setMcpConfig({ ...data, mcpServers: filteredServers });
      } catch (err) {
        setMcpConfigError('Failed to fetch MCP config: ' + err.message);
      }
    }
    fetchMcpConfig();
  }, []);

  // =========================
  // Theme and UI Computation
  // =========================
  const themeMode = mode === 'system' ? (prefersDarkMode ? 'dark' : 'light') : mode;
  const theme = useMemo(() => createTheme({
    palette: { mode: themeMode },
  }), [themeMode]);
  const location = useLocation();
  const bulbBg = theme.palette.mode === 'dark' ? '#222' : '#f5f5f5';

  // Set data-mui-color-scheme on body for CSS dark/light mode support
  useEffect(() => {
    document.body.setAttribute('data-mui-color-scheme', themeMode);
    return () => {
      document.body.removeAttribute('data-mui-color-scheme');
    };
  }, [themeMode]);

  // =========================
  // Ollama Model Fetching and Selection
  // =========================
  const handleModelClick = async (event) => {
    if (provider === 'ollama') {
      setModelMenuAnchor(event.currentTarget);
      if (ollamaModels.length === 0) {
        try {
          const res = await fetch(backendUrl + '/api/models?provider=ollama');
          if (!res.ok) throw new Error('Failed to fetch Ollama models');
          const data = await res.json();
          setOllamaModels(Array.isArray(data.models) ? data.models : data);
        } catch (e) {
          setOllamaModels([]);
          setModelListError(e.message);
          setModelListDialogOpen(true);
          setModelMenuAnchor(null);
        }
      }
    }
  };
  const handleModelSelect = (m) => {
    setModel(m.name || m.model || m);
    setModelMenuAnchor(null);
    // modelConfig will update via useEffect
  };
  const handleModelMenuClose = () => {
    setModelMenuAnchor(null);
  };

  // =========================
  // Model Config Update on Provider/Model Change
  // =========================
  useEffect(() => {
    if (provider === 'ollama' && model) {
      setModelConfig({ ...config?.config, model });
    } else if (config?.config) {
      setModelConfig(config.config);
    }
  }, [provider, model, config]);

  // =========================
  // MCP Config Management
  // =========================
  const handleSaveMcpConfig = () => {
    if (!defaultMCPConfig || !defaultMCPConfig.mcpServers) return;
    const filteredServers = {};
    for (const key of selectedMcpServers) {
      if (defaultMCPConfig.mcpServers[key]) {
        filteredServers[key] = defaultMCPConfig.mcpServers[key];
      }
    }
    setMcpConfig({ ...defaultMCPConfig, mcpServers: filteredServers });
    setMcpDialogOpen(false);
  };

  // =========================
  // Utility Functions
  // =========================
  // Mask API keys in config for display
  function maskApiKeys(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(maskApiKeys);
    const masked = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key.toLowerCase().endsWith('apikey')) {
          masked[key] = '********';
        } else if (typeof obj[key] === 'object') {
          masked[key] = maskApiKeys(obj[key]);
        } else {
          masked[key] = obj[key];
        }
      }
    }
    return masked;
  }
  // Get available MCP servers as a list
  function getAvailableMcpServers(config) {
    if (!config || !config.mcpServers) return [];
    return Object.entries(config.mcpServers).map(([key, value]) => ({
      key,
      ...value
    }));
  }

  // =========================
  // MCP Server Selection State
  // =========================
  const [selectedMcpServers, setSelectedMcpServers] = useState(() => {
    const stored = localStorage.getItem('selectedMcpServers');
    return stored ? JSON.parse(stored) : ['filesystem'];
  });
  useEffect(() => {
    localStorage.setItem('selectedMcpServers', JSON.stringify(selectedMcpServers));
  }, [selectedMcpServers]);
  useEffect(() => {
    if (mcpConfig && mcpConfig.mcpServers) {
      setSelectedMcpServers(prev => {
        const available = Object.keys(mcpConfig.mcpServers);
        const filtered = prev.filter(key => available.includes(key));
        return filtered.length > 0 ? filtered : ['filesystem'];
      });
    }
  }, [mcpConfig]);
  const handleMcpServerToggle = (key) => {
    setSelectedMcpServers((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };

  // =========================
  // Main Render
  // =========================
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{
        height: '100vh',
        width: '100vw',
        overflow: 'auto',
        bgcolor: theme.palette.mode === 'dark' ? '#181a1b' : '#fafafa',
        p: 0,
        m: 0,
      }}>
        <Container sx={{
           p: 0,
           m: 0,
           height: '100vh',
         }} maxWidth={false}>
          <Paper elevation={3} sx={{ p: 2 }}>
            {/* Header Bar with Navigation and Provider/Model Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h4" align="center" gutterBottom className="app-header-title">Agent UI</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                {location.pathname !== '/agentdesigner' ? (
                  <Link to="/agentdesigner" style={{ textDecoration: 'none' }} className="mr-1">
                    <IconButton color="primary">
                      <PrecisionManufacturingIcon />
                    </IconButton>
                  </Link>
                ) : (
                  <Link to="/" style={{ textDecoration: 'none' }} className="mr-1">
                    <IconButton color="primary">
                      <ChatIcon />
                    </IconButton>
                  </Link>
                )}
                {/* Toggleable Think Bulb Icon for non-OpenAI providers */}
                {provider !== 'openai' && provider !== 'azureopenai' && (
                  <IconButton title='Toggle Think Mode (Works for reasoning models only)'
                    onClick={() => setThinkActive(a => !a)}
                    sx={{
                      mr: 1,
                      color: thinkActive ? '#fbc02d' : (theme.palette.mode === 'dark' ? '#bdbdbd' : '#757575'),
                      transition: 'color 0.2s',
                    }}
                    size="small"
                  >
                    <EmojiObjectsIcon fontSize="small" />
                  </IconButton>
                )}
                {/* System Message Icon */}
                <IconButton title='Set System Message'
                  onClick={() => { setSystemMessageDraft(systemMessage); setSystemDialogOpen(true); }}
                  sx={{ mr: 1 }}
                  size="small"
                  color={systemMessage ? 'primary' : 'default'}
                >
                  <TryIcon fontSize="small" />
                </IconButton>
                {/* Provider/Model Display and Selection */}
                {provider === 'openai' && (
                  <>
                    <img
                      src={OpenAIIcon}
                      alt="OpenAI"
                      title='OpenAI'
                      style={{
                        width: 20,
                        height: 20,
                        marginRight: 8,
                        filter: theme.palette.mode === 'dark' ? 'invert(1) grayscale(1) brightness(1.7)' : 'none',
                        transition: 'filter 0.2s',
                      }}
                    />
                    <Tooltip title={<pre style={{ margin: 0, fontSize: 12, maxWidth: 400, whiteSpace: 'pre-wrap' }}>{modelConfig ? JSON.stringify(maskApiKeys(modelConfig), null, 2) : ''}</pre>} placement="bottom" arrow>
                      <Typography variant="body2" sx={{ mr: 1, fontWeight: 500, cursor: 'pointer' }}>{model}</Typography>
                    </Tooltip>
                  </>
                )}
                {provider === 'azureopenai' && (
                  <>
                    <img
                      src={AzureOpenAIIcon}
                      alt="Azure OpenAI"
                      title='Azure OpenAI'
                      style={{
                        width: 20,
                        height: 20,
                        marginRight: 8,
                        filter: theme.palette.mode === 'dark' ? 'invert(1) grayscale(1) brightness(1.7)' : 'none',
                        transition: 'filter 0.2s',
                      }}
                    />
                    <Tooltip title={<pre style={{ margin: 0, fontSize: 12, maxWidth: 400, whiteSpace: 'pre-wrap' }}>{modelConfig ? JSON.stringify(maskApiKeys(modelConfig), null, 2) : ''}</pre>} placement="bottom" arrow>
                      <Typography variant="body2" sx={{ mr: 1, fontWeight: 500, cursor: 'pointer' }}>{model}</Typography>
                    </Tooltip>
                  </>
                )}
                {provider === 'ollama' && (
                  <>
                    <img
                      src={OllamaIcon}
                      alt="Ollama"
                      title='Ollama'
                      style={{
                        width: 20,
                        height: 20,
                        filter: theme.palette.mode === 'dark' ? 'invert(1) grayscale(1) brightness(1.7)' : 'none',
                        transition: 'filter 0.2s',
                      }}
                    />
                    <Tooltip title={<pre style={{ margin: 0, fontSize: 12, maxWidth: 400, whiteSpace: 'pre-wrap' }}>{modelConfig ? JSON.stringify(maskApiKeys(modelConfig), null, 2) : ''}</pre>} placement="bottom" arrow>
                      <Typography
                        variant="body2"
                        sx={{ mr: 1, fontWeight: 500, cursor: 'pointer' }}
                        onClick={handleModelClick}
                      >
                        {model}
                      </Typography>
                    </Tooltip>
                    <Menu
                      anchorEl={modelMenuAnchor}
                      open={Boolean(modelMenuAnchor)}
                      onClose={handleModelMenuClose}
                      MenuListProps={{ sx: { maxHeight: 300 } }}
                    >
                      <ClickAwayListener onClickAway={handleModelMenuClose}>
                        <Box>
                          {ollamaModels.length === 0 && !modelListError && <MenuItem disabled>Loading...</MenuItem>}
                          {ollamaModels.map((m, i) => (
                            <MenuItem key={m.name || m.model || i} onClick={() => handleModelSelect(m)}>
                              {m.name || m.model || m}
                            </MenuItem>
                          ))}
                        </Box>
                      </ClickAwayListener>
                    </Menu>
                  </>
                )}
                {/* MCP Toggle Icon */}
                {useMCP && (
                  <IconButton onClick={() => setMcpDialogOpen(true)} size="small" sx={{ p: 0, mr: 1 }}>
                    <img
                      src={McpIcon}
                      alt="MCP"
                      title='Model Context Protocol is enabled'
                      style={{
                        width: 20,
                        height: 20,
                        filter: theme.palette.mode === 'dark' ? 'invert(1) grayscale(1) brightness(1.7)' : 'none',
                        transition: 'filter 0.2s',
                      }}
                    />
                  </IconButton>
                )}
              </Box>
              {/* Theme Switcher */}
              <IconButton onClick={() => setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light')} color="inherit">
                {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Box>
            {/* Config Error Display */}
            {configError && <div style={{ color: 'red', marginBottom: 8 }}>Config Error: {configError}</div>}
            {/* Main App Routing */}
            <Routes>
              <Route path="/agentdesigner" element={<AgentDesigner theme={theme} />} />
              <Route path="/" element={<AgentUI theme={theme} config={config} configError={configError} thinkActive={thinkActive} modelConfig={modelConfig} useMCP={useMCP} mcpConfig={mcpConfig} onUpdateMcpConfig={setMcpConfig} systemMessage={systemMessage} />} />
            </Routes>
            {/* Error dialog for model list fetch */}
            <Dialog open={modelListDialogOpen} onClose={() => setModelListDialogOpen(false)}>
              <DialogTitle>Error</DialogTitle>
              <DialogContent>
                <Typography color="error">{modelListError}</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setModelListDialogOpen(false)} color="primary">Close</Button>
              </DialogActions>
            </Dialog>
            {/* MCP Config Edit Dialog */}
            <Dialog open={mcpDialogOpen} onClose={() => setMcpDialogOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>Select MCP Servers</DialogTitle>
              <DialogContent>
                {defaultMCPConfig && defaultMCPConfig.mcpServers ? (
                  <Box>
                    {Object.keys(defaultMCPConfig.mcpServers).map((key) => (
                      <Box key={key} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <input
                          type="checkbox"
                          checked={selectedMcpServers.includes(key)}
                          onChange={() => handleMcpServerToggle(key)}
                          id={`mcp-server-${key}`}
                        />
                        <label htmlFor={`mcp-server-${key}`} style={{ marginLeft: 8, fontWeight: 500 }}>
                          {key}
                        </label>
                        <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>
                          {defaultMCPConfig.mcpServers[key].command} {defaultMCPConfig.mcpServers[key].args?.join(' ')}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography>No MCP servers found in config.</Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setMcpDialogOpen(false)} color="secondary">Cancel</Button>
                <Button onClick={handleSaveMcpConfig} color="primary" variant="contained">Save</Button>
              </DialogActions>
            </Dialog>
            {/* System Message Dialog */}
            <Dialog open={systemDialogOpen} onClose={() => setSystemDialogOpen(false)}
                    PaperProps={{ sx: { width: '75vw', maxWidth: '75vw' } }}>
              <DialogTitle>Set System Message</DialogTitle>
              <DialogContent>
                <textarea
                  style={{ width: '100%', minHeight: 80, fontSize: 16, padding: 8 }}
                  value={systemMessageDraft}
                  onChange={e => setSystemMessageDraft(e.target.value)}
                  placeholder="Enter a system message to be sent as the first message in every chat."
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSystemDialogOpen(false)} color="secondary">Cancel</Button>
                <Button onClick={() => { setSystemMessage(systemMessageDraft); setSystemDialogOpen(false); }} color="primary" variant="contained">Save</Button>
              </DialogActions>
            </Dialog>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;

// Rename this file to App.jsx to enable JSX parsing in Vite
