@echo off
REM agent: Install packages for the AI backend, custommcp servers and frontend

REM Change to the root directory of the project
cd /d %~dp0\..

REM Install backend dependencies
ECHO Installing backend dependencies...
cd ai
call npm install
# Create fsroot directory if it doesn't exist
if not exist "fsroot" (
  mkdir fsroot
)
REM Install custom MCP server dependencies
ECHO Installing custom MCP server dependencies...
cd custommcp

REM Loop through each custom MCP server directory and install dependencies
for /D %%d in (*) do (
  if exist "%%d\package.json" (
    ECHO Installing dependencies for %%d...
    pushd "%%d"
    call npm install
    popd
  ) else (
    ECHO No package.json found in %%d, skipping...
  )
)
cd ..\..

REM Install frontend dependencies
ECHO Installing frontend dependencies...
cd chatui
call npm install
