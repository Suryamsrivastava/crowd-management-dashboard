@echo off
rem Stops whatever is listening on the dashboard port (default 8090).
setlocal
if not defined PORT set "PORT=8090"
set "FOUND="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  taskkill /pid %%P /f >nul && set "FOUND=1"
)
if defined FOUND (echo Crowd dashboard stopped.) else (echo Nothing is running on port %PORT%.)
