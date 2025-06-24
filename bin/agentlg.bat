@echo off
REM agentlg.bat: Run the langchain-based agent workflow (agentlg.js)
REM Usage: agentlg.bat [args]

set MODEL_PROVIDER=azureopenai

cd /d %~dp0..\ai

node agentlg.js %*
