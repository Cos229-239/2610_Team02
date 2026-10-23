@echo off
call "%~dp0build.cmd"
if errorlevel 1 exit /b 1
"%~dp0build\PartTests.exe"
if errorlevel 1 exit /b 1
"%~dp0build\OperationsTests.exe"
exit /b %errorlevel%

