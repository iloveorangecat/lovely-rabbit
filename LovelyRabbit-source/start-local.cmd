@echo off
setlocal
cd /d "%~dp0"
if not exist "scripts\serve-local.mjs" cd /d "%~dp0.."
title Beauty Quest - Keep this window open
if not exist "scripts\serve-local.mjs" (
  echo Cannot find the Beauty Quest project. Keep this file in the project or outputs folder.
  pause
  exit /b 1
)
if exist "%ProgramFiles%\nodejs\node.exe" (
  "%ProgramFiles%\nodejs\node.exe" scripts\serve-local.mjs
) else (
  node scripts\serve-local.mjs
)
pause
