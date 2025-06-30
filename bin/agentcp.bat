@echo off
REM agentcp.bat: Run the langchain-based agent workflow (agentcp.js)
REM Usage: agentcp.bat [args]

set MODEL_PROVIDER=azureopenai

cd /d %~dp0..\ai

node agentcp.js %*
