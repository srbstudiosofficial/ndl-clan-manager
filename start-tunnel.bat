@echo off
title NDL Clash Manager Live Cloud Bridge
echo =======================================================
echo    NDL CLAN COMMAND // LIVE CLOUD TUNNEL FOR NETLIFY
echo =======================================================
echo.
echo Connecting local port 3000 to public cloud tunnel...
echo Tunnel Address: https://ndl-clash-live.loca.lt
echo.
echo Keep this window OPEN while running Netlify to enable
echo live 10-second auto-sync whenever members join or attack!
echo =======================================================
echo.

npx --yes localtunnel --port 3000 --subdomain ndl-clash-live
pause
