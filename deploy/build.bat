@echo off
rem Installs dependencies and builds the production bundle into dist\
setlocal
pushd "%~dp0.." || exit /b 1

call npm ci || goto :fail
call npm run build || goto :fail

popd
echo.
echo Build OK: dist\
echo Next: deploy\start-crowd.bat
exit /b 0

:fail
popd
echo.
echo BUILD FAILED - see the messages above.
exit /b 1
