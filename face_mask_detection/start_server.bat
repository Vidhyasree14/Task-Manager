@echo off
set CURRENT_DIR=%~dp0
cd /d "%CURRENT_DIR%"
echo Starting AI Face Mask Detection Service on port 8001...
"%CURRENT_DIR%venv\Scripts\python.exe" server.py
