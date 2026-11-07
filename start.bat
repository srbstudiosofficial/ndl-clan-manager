@echo off
title ClashManager Pro — Clan & War Command Center
echo =======================================================
echo    NDL CLASH COMMAND // BACKEND & DISCORD MONITOR
echo =======================================================
echo.
echo Starting local web server on port 3000...
echo.

start "" http://localhost:3000
node server.js

pause
