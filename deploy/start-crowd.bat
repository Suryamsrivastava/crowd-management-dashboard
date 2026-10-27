@echo off
rem Serves dist\ on http://localhost:%PORT% (default 8090). Output goes to deploy\logs\crowd.log.
setlocal
set "HERE=%~dp0"
if not defined PORT set "PORT=8090"

if not exist "%HERE%..\dist\index.html" (
  echo Missing dist\ - run deploy\build.bat first.
  exit /b 1
)

set "NODE=node"
where node >nul 2>&1 || if exist "C:\Program Files\nodejs\node.exe" set "NODE=C:\Program Files\nodejs\node.exe"
if not exist "%HERE%logs" mkdir "%HERE%logs"

echo Starting crowd dashboard on http://localhost:%PORT%  (log: deploy\logs\crowd.log)
"%NODE%" "%HERE%serve.mjs" >> "%HERE%logs\crowd.log" 2>&1
