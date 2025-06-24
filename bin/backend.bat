@echo off
REM backend.bat: Start the AI backend server (Express API)
REM Usage: backend.bat [args]

set MODEL_PROVIDER=ollama
set USEMCP=TRUE
set AIPORT=8080

cd /d %~dp0..\ai

node server.js %*
