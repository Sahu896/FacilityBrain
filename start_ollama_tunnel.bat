@echo off
REM Expose the local Ollama server to the internet so the Render deployment
REM can use it as its AI backend (BACKEND=ollama).
REM
REM 1. Make sure Ollama is running locally (it serves on localhost:11434).
REM 2. Run this script. Copy the https://....trycloudflare.com URL it prints.
REM 3. In Render -> your service -> Environment, set:
REM       BACKEND    = ollama
REM       OLLAMA_URL = <the URL from step 2>
REM    The URL changes every time this script restarts, so update Render
REM    whenever you rerun it.
"C:\tools\cloudflared.exe" tunnel --url http://localhost:11434 --http-host-header localhost:11434
pause
