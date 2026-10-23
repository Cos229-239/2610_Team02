@echo off
setlocal
cd /d "%~dp0"
set "vswhere=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%vswhere%" exit /b 1
for /f "usebackq tokens=*" %%i in (`"%vswhere%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "towerflowVS=%%i"
if not defined towerflowVS exit /b 1
call "%towerflowVS%\VC\Auxiliary\Build\vcvars64.bat" >nul
if errorlevel 1 exit /b 1
if not exist build mkdir build
cl /nologo /EHsc /std:c++17 /W4 /Zi /Od "TowerFlow (Malik version).cpp" /Fe:build\TowerFlow.exe /Fo:build\TowerFlow.obj /Fd:build\TowerFlow-compile.pdb /link /DEBUG /PDB:build\TowerFlow.pdb
if errorlevel 1 exit /b 1
cl /nologo /EHsc /std:c++17 /W4 /Zi /Od tests\CurrentPartTests.cpp /Fe:build\PartTests.exe /Fo:build\PartTests.obj /Fd:build\PartTests-compile.pdb /link /DEBUG /PDB:build\PartTests.pdb
if errorlevel 1 exit /b 1
cl /nologo /EHsc /std:c++17 /W4 /Zi /Od tests\OperationsTests.cpp /Fe:build\OperationsTests.exe /Fo:build\OperationsTests.obj /Fd:build\OperationsTests-compile.pdb /link /DEBUG /PDB:build\OperationsTests.pdb
exit /b %errorlevel%

