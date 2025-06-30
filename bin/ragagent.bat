@echo off
REM ragagent: Run the example ragagent workflow (ragagent.ts)
REM Usage: ragagent.bat [args]

REM Set environment variables (edit as needed)
set "OPENAI_API_KEY=sk-youropenaiapikey"

REM Change to backend directory
cd /d "%~dp0..\ai"

REM Run the ragagent workflow
npx tsx ragagent.ts %*
