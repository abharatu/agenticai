@echo off
REM agent.bat: Run the example agent workflow (agent.js)
REM Usage: agent.bat [args]

set MODEL_PROVIDER=azureopenai
set USEMCP=TRUE

cd /d %~dp0..\ai

node agent.js %*
