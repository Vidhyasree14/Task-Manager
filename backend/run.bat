@REM call venv-win\Scripts\activate.bat
@REM call python main.py

@echo off

set VENV_PATH=C:\Users\rjash\my-react-app\backend\venv-win
call "%VENV_PATH%\Scripts\activate.bat"

:: Force UTF-8 for Python output
set PYTHONUTF8=1

chcp 65001 > nul
echo Starting Uvicorn service on 0.0.0.0:8000...

uvicorn main:app --reload --port 8000 
