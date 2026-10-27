@echo off
rem Run once as Administrator: starts the dashboard automatically 1 minute after
rem every Windows boot, even with nobody logged in.
setlocal
set "START=%~dp0start-crowd.bat"

schtasks /create /tn "CrowdDashboard" /tr "\"%START%\"" /sc onstart /delay 0001:00 /ru SYSTEM /rl HIGHEST /f
if errorlevel 1 (
  echo Could not create the task. Right-click this file and choose "Run as administrator".
  exit /b 1
)
echo Auto-start registered (Task Scheduler task "CrowdDashboard").
echo Start it now without rebooting:  schtasks /run /tn "CrowdDashboard"
echo Remove it later:                 schtasks /delete /tn "CrowdDashboard" /f
